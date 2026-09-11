import envVars from '../../envVars/vars'; // ⚠️ adjust path to match where envVars actually lives relative to this file
import { Client, TablesDB, ID, Query } from 'appwrite';
import orderService from './order';

export const RETURN_STATUSES = ['Requested', 'Approved', 'Rejected', 'Denied'];

// Statuses that block a NEW return request on the same order.
// - Requested: already awaiting a decision.
// - Approved: already returned, done.
// - Denied: permanent block ("reject for all time").
// "Rejected" is deliberately NOT here — a soft rejection allows re-applying.
const BLOCKING_STATUSES = ['Requested', 'Approved', 'Denied'];

// Order statuses that can never be returned.
const RETURN_INELIGIBLE_ORDER_STATUSES = ['Pending', 'Cancelled', 'Returned'];

export const RETURN_WINDOW_DAYS = 2;

export class ReturnService {
    client = new Client();
    table;

    databaseId = envVars.eTakhzeenDatabaseId;
    returnTableId = envVars.eTakhzeenReturnTableId;

    constructor() {
        this.client
            .setEndpoint(envVars.eTakhzeenURL)
            .setProject(envVars.eTakhzeenProjectId);
        this.table = new TablesDB(this.client);
    }

    // ---------- pure helpers (no network — safe to call from UI render) ----------

    isWithinReturnWindow(order) {
        if (!order?.$createdAt) return false;
        const placedAt = new Date(order.$createdAt).getTime();
        const deadline = placedAt + RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000;
        return Date.now() <= deadline;
    }

    isOrderStatusReturnable(order) {
        return !!order && !RETURN_INELIGIBLE_ORDER_STATUSES.includes(order.status);
    }

    // Cheap synchronous check for "should the Return button even render".
    // Does NOT check for an existing blocking return doc (that needs a
    // network call) — the real gate is createReturnRequest() below, which
    // re-verifies everything server-side-ish so a stale UI can't slip through.
    canAttemptReturn({ order, isProductReturnable }) {
        if (!order) return { eligible: false, reason: 'No order.' };
        if (!isProductReturnable) return { eligible: false, reason: 'This product is not returnable.' };
        if (!this.isOrderStatusReturnable(order)) {
            return { eligible: false, reason: 'This order is not eligible for return in its current status.' };
        }
        if (!this.isWithinReturnWindow(order)) {
            return { eligible: false, reason: `Returns must be requested within ${RETURN_WINDOW_DAYS} days of the order date.` };
        }
        return { eligible: true, reason: null };
    }

    // ---------- reads ----------

    // Every return doc for one order, most recent first.
    async getReturnsForOrder({ orderId }) {
        try {
            const res = await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.returnTableId,
                queries: [Query.equal('orderId', orderId), Query.orderDesc('$createdAt')],
            });
            return res?.rows || [];
        } catch (error) {
            console.error(error.message);
            return [];
        }
    }

    async getLatestReturnForOrder({ orderId }) {
        const rows = await this.getReturnsForOrder({ orderId });
        return rows[0] || null;
    }

    async getReturn({ rowId }) {
        try {
            const row = await this.table.getRow({
                databaseId: this.databaseId,
                tableId: this.returnTableId,
                rowId,
            });
            return row || null;
        } catch (error) {
            console.error(error.message);
            return null;
        }
    }

    // All returns for one user, most recent first — "My returns" panel.
    async getUserReturns({ username }) {
        try {
            const res = await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.returnTableId,
                queries: [Query.equal('username', username), Query.orderDesc('$createdAt')],
            });
            return res?.rows || [];
        } catch (error) {
            console.error(error.message);
            return [];
        }
    }

    // ---------- admin reads ----------

    // Paginates internally, same pattern as order.js's getAllOrders().
    async getAllReturns() {
        try {
            const rows = [];
            const pageSize = 100;
            let cursor = null;

            while (true) {
                const queries = [Query.orderDesc('$createdAt'), Query.limit(pageSize)];
                if (cursor) queries.push(Query.cursorAfter(cursor));

                const res = await this.table.listRows({
                    databaseId: this.databaseId,
                    tableId: this.returnTableId,
                    queries,
                });

                if (!res?.rows?.length) break;
                rows.push(...res.rows);

                if (res.rows.length < pageSize) break;
                cursor = res.rows[res.rows.length - 1].$id;
            }

            return rows;
        } catch (error) {
            console.error(error.message);
            return [];
        }
    }

    // ⚠️ Query.search() needs a Fulltext index on each of these columns
    // in the Appwrite console, same caveat as order.js's searchOrders().
    async searchReturns({ term }) {
        const trimmed = (term || '').trim();
        if (!trimmed) return this.getAllReturns();

        const fields = ['orderId', 'username', 'reason', 'status'];

        try {
            const resultsPerField = await Promise.all(
                fields.map((field) =>
                    this.table
                        .listRows({
                            databaseId: this.databaseId,
                            tableId: this.returnTableId,
                            queries: [Query.search(field, trimmed), Query.orderDesc('$createdAt'), Query.limit(100)],
                        })
                        .then((res) => res?.rows || [])
                        .catch(() => []) // one missing index shouldn't sink the whole search
                )
            );
            const merged = new Map();
            resultsPerField.flat().forEach((row) => merged.set(row.$id, row));
            return Array.from(merged.values());
        } catch (error) {
            console.error(error.message);
            return [];
        }
    }

    // ---------- writes ----------

    // `order` should be the full order row already loaded in Redux (needs
    // $id, $createdAt, status). Every eligibility rule is re-checked here
    // so this can't be bypassed just because a button was visible.
    async createReturnRequest({ order, username, reason }) {
        try {
            if (!order || !order['$id']) throw new Error('Order is required.');
            if (!reason || !reason.trim()) throw new Error('A reason is required.');

            if (!this.isOrderStatusReturnable(order)) {
                throw new Error('This order is not eligible for return in its current status.');
            }
            if (!this.isWithinReturnWindow(order)) {
                throw new Error(`Returns must be requested within ${RETURN_WINDOW_DAYS} days of the order date.`);
            }

            const existing = await this.getReturnsForOrder({ orderId: order['$id'] });
            const blocking = existing.find((r) => BLOCKING_STATUSES.includes(r.status));
            if (blocking) {
                throw new Error(
                    blocking.status === 'Denied'
                        ? 'This order was permanently denied for return.'
                        : 'A return request is already in progress for this order.'
                );
            }

            // Climbs only across Rejected -> re-apply cycles, since
            // Requested/Approved/Denied are already blocked above.
            const attemptNumber = existing.length > 0
                ? Math.max(...existing.map((r) => r.attemptNumber || 1)) + 1
                : 1;

            const created = await this.table.createRow({
                databaseId: this.databaseId,
                tableId: this.returnTableId,
                rowId: ID.unique(),
                data: {
                    orderId: order['$id'],
                    username,
                    status: 'Requested',
                    reason: reason.trim(),
                    attemptNumber,
                },
            });
            return created || false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Single entry point for admin/support decisions.
    // decision: 'Approved' | 'Rejected' | 'Denied'
    async decideReturn({ rowId, decision, adminNote, decidedBy }) {
        try {
            if (!['Approved', 'Rejected', 'Denied'].includes(decision)) {
                throw new Error(`Invalid decision "${decision}".`);
            }

            const returnDoc = await this.getReturn({ rowId });
            if (!returnDoc) throw new Error('Return request not found.');
            if (returnDoc.status !== 'Requested') {
                throw new Error('This return request has already been decided.');
            }

            const updated = await this.table.updateRow({
                databaseId: this.databaseId,
                tableId: this.returnTableId,
                rowId,
                data: {
                    status: decision,
                    adminNote: adminNote || '',
                    decidedBy: decidedBy || '',
                    decidedAt: new Date().toISOString(),
                },
            });
            if (!updated) return false;

            // Approval flips the order to "Returned" — AdminFinance already
            // treats that as a loss status, so no Finance changes are needed.
            if (decision === 'Approved') {
                const orderUpdated = await orderService.adminUpdateOrder({
                    rowId: returnDoc.orderId,
                    data: { status: 'Returned' },
                });
                if (!orderUpdated) {
                    console.error('Return approved but failed to flip order status to Returned.');
                }
            }

            return updated;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async deleteReturn({ rowId }) {
        try {
            await this.table.deleteRow({
                databaseId: this.databaseId,
                tableId: this.returnTableId,
                rowId,
            });
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }
}

const returnService = new ReturnService();
export default returnService;