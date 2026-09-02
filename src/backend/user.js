import envVars from '../../envVars/vars';
import { Client, TablesDB, Query } from 'appwrite';

export class User {
    client = new Client();
    table;

    databaseId = envVars.eTakhzeenDatabaseId;
    tableId = envVars.eTakhzeenAllUsersTable;

    constructor() {
        this.client
            .setEndpoint(envVars.eTakhzeenURL)
            .setProject(envVars.eTakhzeenProjectId);
        this.table = new TablesDB(this.client);
    }

    async setUser({ username, email, phone, name, password, cart = "{}" }) {
        try {
            const row = await this.table.createRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: username, // matches the Auth account's $id (see auth.js signup) so userData['$id'] always resolves to the right row
                data: { username, email, phone, name, password, cart },
            });
            return row ? true : "Can't create user";
        } catch (error) {
            return false;
        }
    }

    async getCols({ properties = ['username', 'email', 'phone'] }) {
        try {
            const obj = {};
            properties.forEach((p) => (obj[p] = []));

            const pageSize = 100;
            let cursor = null;

            while (true) {
                const queries = [Query.select(properties), Query.limit(pageSize)];
                if (cursor) queries.push(Query.cursorAfter(cursor));

                const res = await this.table.listRows({
                    databaseId: this.databaseId,
                    tableId: this.tableId,
                    queries,
                });

                if (!res?.rows?.length) break;

                res.rows.forEach((r) => {
                    properties.forEach((p) => {
                        if (r[p] !== undefined) obj[p].push(r[p]);
                    });
                });

                if (res.rows.length < pageSize) break;
                cursor = res.rows[res.rows.length - 1].$id;
            }

            return obj;
        } catch (error) {
            throw error;
        }
    }

    async getUniqueUser({ property, value }) {
        try {
            const res = await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.tableId,
                queries: [Query.equal(property, value), Query.limit(1)],
            });
            return res?.rows?.length ? 'ok' : 'no';
        } catch (error) {
            return false;
        }
    }

    // ---------------------------------------------------------------
    // Single entry point for reading profile data, branched by role.
    //
    //   requesterLabels : the CALLER's own userData.labels (from the store)
    //   requesterId     : the CALLER's own $id / username (from the store)
    //   targetId        : optional — which user's row to fetch (admin only)
    //
    // - Admin, no targetId  -> returns ALL rows (paginated), as an array
    // - Admin, with targetId -> returns that one row
    // - Non-admin            -> always returns the caller's OWN row,
    //                           regardless of what targetId was passed
    // ---------------------------------------------------------------
    async getProfile({ requesterLabels = [], requesterId, targetId = null }) {
        const isAdmin = requesterLabels?.includes('admin');

        try {
            if (isAdmin && !targetId) {
                return await this._getAllRows();
            }

            const lookupId = isAdmin ? targetId : requesterId;

            if (!lookupId) return null;

            const res = await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.tableId,
                queries: [Query.equal('username', lookupId), Query.limit(1)],
            });

            return res?.rows?.length ? res.rows[0] : null;
        } catch (error) {
            console.error(error.message);
            return isAdmin && !targetId ? [] : null;
        }
    }

    // Set (or clear) the `blocked` flag on a user's row.
    // rowId is the Appwrite document $id — grab it from a profile row you
    // already fetched (e.g. via getProfile), not the username.
    async setBlocked({ rowId, blocked }) {
        try {
            const row = await this.table.updateRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId,
                data: { blocked },
            });
            return row ? row : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Internal helper — paginate through every row in the table.
    async _getAllRows() {
        const rows = [];
        const pageSize = 100;
        let cursor = null;

        while (true) {
            const queries = [Query.limit(pageSize)];
            if (cursor) queries.push(Query.cursorAfter(cursor));

            const res = await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.tableId,
                queries,
            });

            if (!res?.rows?.length) break;

            rows.push(...res.rows);

            if (res.rows.length < pageSize) break;
            cursor = res.rows[res.rows.length - 1].$id;
        }

        return rows;
    }

        // ---------- Cart ----------
    // `cart` is plain text on the user row: a JSON-stringified array of
    // { productId, quantity }. These two methods are the only place that
    // reads/writes that raw text — cartSlice.js handles all the
    // parsing/stringifying and object enrichment around them.

    async getUserCart({ userId }) {
        try {
            const user = await this.table.getRow({
                databaseId: this.databaseId, // ⚠️ confirm this matches your user.js's actual property name
                tableId: this.tableId,       // ⚠️ confirm this matches your user.js's actual property name
                rowId: userId,
            });
            return user?.cart ?? null;
        } catch (error) {
            console.error(error.message);
            return null;
        }
    }

    async updateUserCart({ userId, cart }) {
        try {
            // `cart` arrives already JSON.stringified — this just writes it.
            await this.table.updateRow({
                databaseId: this.databaseId, // ⚠️ same as above
                tableId: this.tableId,       // ⚠️ same as above
                rowId: userId,
                data: { cart },
            });
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // ---------- Address ----------
    // Address is intentionally the ONLY profile field the checkout flow is
    // allowed to write back to the user table. Name/email/phone entered on
    // an order are snapshots for that order's receipt only — they never
    // touch this table. See order-handling-system.md for the full rule.
    async updateUserAddress({ userId, address }) {
        try {
            await this.table.updateRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: userId,
                data: { address },
            });
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }
}

const user = new User();

export default user;