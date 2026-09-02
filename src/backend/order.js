import envVars from '../../envVars/vars'; // ⚠️ adjust path to match where envVars actually lives relative to this file
import { Client, TablesDB, ID, Query } from 'appwrite';

/*
 * ORDER TABLE — redesigned for cart-aware checkout.
 * Full write-up: order-handling-system.md (send that to whoever needs the
 * big picture). Short version here:
 *
 * One row = one checkout (whether it was a single "Order Now" or a full
 * cart checkout with several products) — NOT one row per product anymore.
 *
 * Required columns on `eTakhzeenOrderTableId`:
 *   username      (string)   — buyer's username at order time (snapshot)
 *   email         (string)   — snapshot
 *   phone         (string)   — snapshot
 *   name          (string)   — snapshot
 *   address       (string)   — delivery address for THIS order (snapshot)
 *   orderDetails  (string)   — JSON.stringify([{ productId, name, price, quantity, fileId }])
 *                              ⚠️ make this column generous in size (e.g. 5000+ chars) —
 *                              it has to hold every line item of a full-cart checkout.
 *   total         (float)    — sum(price * quantity) across orderDetails, in PKR, computed here at order time
 *   paymentMethod (string)   — "Advance" | "COD"  ⚠️ confirm this column still exists on your table
 *   status        (string)   — "Pending" | "Out for Delivery" | "Delivered" | "Cancelled"
 *                              defaults to "Pending" on every new row.
 *                              ⚠️ confirm this column still exists on your table
 *
 * Snapshot fields (name/email/phone/address/product name+price) are
 * intentionally NOT re-synced from live user/product data later — an order
 * is a receipt, not a live view. Only `status` ever changes after creation,
 * and only through cancelOrder()/updateOrderStatus() below.
 *
 * Currency: all prices/totals are in PKR (no decimal subunits used in the UI).
 */

// "Processing" = the request has been reviewed and is being worked on —
// sits between Pending and Delivered. "Returned" covers post-delivery
// returns. Order here doubles as the priority order for the admin list.
export const ORDER_STATUSES = ['Pending', 'Processing', 'Delivered', 'Returned', 'Cancelled'];

// Lower number = surfaced first in the admin order list. Orders needing
// attention (Pending, then Processing) float to the top; resolved/dead
// orders (Cancelled) sink to the bottom.
export const ORDER_STATUS_PRIORITY = {
    Pending: 0,
    Processing: 1,
    Delivered: 2,
    Returned: 3,
    Cancelled: 4,
};

export class OrderService {
    client = new Client();
    table;

    databaseId = envVars.eTakhzeenDatabaseId;
    orderTableId = envVars.eTakhzeenOrderTableId; // ⚠️ confirm this exists in vars.js

    constructor() {
        this.client
            .setEndpoint(envVars.eTakhzeenURL)
            .setProject(envVars.eTakhzeenProjectId);
        this.table = new TablesDB(this.client);
    }

    // orderDetails: [{ productId, name, price, quantity, fileId }] — works
    // for a single-product "Order Now" (one entry) or a full cart checkout
    // (many). `price` is PKR.
    async createOrder({ username, email, phone, name, address, orderDetails, paymentMethod }) {
        try {
            if (!Array.isArray(orderDetails) || orderDetails.length === 0) {
                throw new Error('An order needs at least one item.');
            }

            const total = orderDetails.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);

            const order = await this.table.createRow({
                databaseId: this.databaseId,
                tableId: this.orderTableId,
                rowId: ID.unique(),
                data: {
                    username,
                    email,
                    phone,
                    name,
                    address,
                    orderDetails: JSON.stringify(orderDetails),
                    total,
                    paymentMethod,
                    status: 'Pending',
                },
            });
            return order ? order : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // All orders for one user, most recent first, with `orderDetails`
    // already parsed back into an array for the caller.
    async getUserOrders({ username }) {
        try {
            const res = await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.orderTableId,
                queries: [Query.equal('username', username), Query.orderDesc('$createdAt')],
            });
            return (res?.rows || []).map((row) => ({
                ...row,
                orderDetails: this._safeParseOrderDetails(row.orderDetails),
            }));
        } catch (error) {
            console.error(error.message);
            return [];
        }
    }

    async getOrder({ rowId }) {
        try {
            const row = await this.table.getRow({
                databaseId: this.databaseId,
                tableId: this.orderTableId,
                rowId,
            });
            return row ? { ...row, orderDetails: this._safeParseOrderDetails(row.orderDetails) } : null;
        } catch (error) {
            console.error(error.message);
            return null;
        }
    }

    // User-initiated cancel — allowed ONLY while the order is still
    // "Pending". Re-checks the current status server-side first (rather
    // than trusting the button being hidden in the UI) so a stale page
    // can't cancel an order that's already moved past Pending.
    async cancelOrder({ rowId }) {
        try {
            const current = await this.table.getRow({
                databaseId: this.databaseId,
                tableId: this.orderTableId,
                rowId,
            });
            if (!current || current.status !== 'Pending') {
                return false; // too late — already progressed past Pending
            }
            const updated = await this.table.updateRow({
                databaseId: this.databaseId,
                tableId: this.orderTableId,
                rowId,
                data: { status: 'Cancelled' },
            });
            return updated ? updated : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Admin-side status progression (Pending -> Out for Delivery -> Delivered).
    // Not wired to any UI yet — here for the future admin orders panel.
    async updateOrderStatus({ rowId, status }) {
        try {
            if (!ORDER_STATUSES.includes(status)) {
                throw new Error(`Unknown status "${status}".`);
            }
            const updated = await this.table.updateRow({
                databaseId: this.databaseId,
                tableId: this.orderTableId,
                rowId,
                data: { status },
            });
            return updated ? updated : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    _safeParseOrderDetails(raw) {
        try {
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return []; // corrupt/legacy value — fail safe instead of crashing
        }
    }

        // ---------- Admin ----------

    // Every order, most recent first. Paginates internally the same way
    // user.js's _getAllRows() does, since listRows caps at 100/call.
    async getAllOrders() {
        try {
            const rows = [];
            const pageSize = 100;
            let cursor = null;

            while (true) {
                const queries = [Query.orderDesc('$createdAt'), Query.limit(pageSize)];
                if (cursor) queries.push(Query.cursorAfter(cursor));

                const res = await this.table.listRows({
                    databaseId: this.databaseId,
                    tableId: this.orderTableId,
                    queries,
                });

                if (!res?.rows?.length) break;
                rows.push(...res.rows);

                if (res.rows.length < pageSize) break;
                cursor = res.rows[res.rows.length - 1].$id;
            }

            return rows.map((row) => ({ ...row, orderDetails: this._safeParseOrderDetails(row.orderDetails) }));
        } catch (error) {
            console.error(error.message);
            return [];
        }
    }

    // Admin free-text search across name / email / username / address /
    // product names (orderDetails is a JSON string, so a fulltext index
    // on it still matches product names inside the raw text).
    // ⚠️ Query.search() requires a Fulltext index on each of these
    // columns — set that up in the Appwrite console (Tables →
    // eTakhzeenOrderTableId → Indexes) or that field's query throws.
    async searchOrders({ term }) {
        const trimmed = (term || '').trim();
        if (!trimmed) return this.getAllOrders();

        const fields = ['name', 'email', 'username', 'address', 'orderDetails'];

        try {
            const resultsPerField = await Promise.all(
                fields.map((field) =>
                    this.table
                        .listRows({
                            databaseId: this.databaseId,
                            tableId: this.orderTableId,
                            queries: [Query.search(field, trimmed), Query.orderDesc('$createdAt'), Query.limit(100)],
                        })
                        .then((res) => res?.rows || [])
                        // one field missing its fulltext index shouldn't
                        // sink the whole search — just skip that field
                        .catch(() => [])
                )
            );

            const merged = new Map();
            resultsPerField.flat().forEach((row) => merged.set(row.$id, row));

            return Array.from(merged.values()).map((row) => ({
                ...row,
                orderDetails: this._safeParseOrderDetails(row.orderDetails),
            }));
        } catch (error) {
            console.error(error.message);
            return [];
        }
    }

    // Full-field admin edit — status, recipient details, payment method,
    // even orderDetails/total for a manual correction. Unlike the
    // user-facing cancelOrder(), this is NOT restricted to Pending orders:
    // admin can move any order to any status at any time.
    async adminUpdateOrder({ rowId, data }) {
        try {
            if (data.status && !ORDER_STATUSES.includes(data.status)) {
                throw new Error(`Unknown status "${data.status}".`);
            }

            const payload = { ...data };
            // If orderDetails was edited, keep total in sync so they never drift.
            if (Array.isArray(payload.orderDetails)) {
                payload.total = payload.orderDetails.reduce(
                    (sum, i) => sum + Number(i.price) * i.quantity,
                    0
                );
                payload.orderDetails = JSON.stringify(payload.orderDetails);
            }

            const updated = await this.table.updateRow({
                databaseId: this.databaseId,
                tableId: this.orderTableId,
                rowId,
                data: payload,
            });
            return updated
                ? { ...updated, orderDetails: this._safeParseOrderDetails(updated.orderDetails) }
                : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Permanent delete — admin only, no status restriction.
    async deleteOrder({ rowId }) {
        try {
            await this.table.deleteRow({
                databaseId: this.databaseId,
                tableId: this.orderTableId,
                rowId,
            });
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }
}

const orderService = new OrderService();

export default orderService;