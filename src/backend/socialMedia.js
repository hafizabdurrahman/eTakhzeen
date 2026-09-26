import envVars from '../../envVars/vars';
import { Client, TablesDB, ID, Query } from 'appwrite';

// NOTE / ASSUMPTIONS (please verify against your project before using):
// 1. This assumes your Appwrite SDK exposes the TablesDB API (tables /
//    rows / columns) — matching the "table" / "cols" wording you used.
//    If your project is still on the older Databases/Collections/Documents
//    API, swap `TablesDB` for `Databases` and rename `createRow` ->
//    `createDocument`, `listRows` -> `listDocuments`, `getRow` ->
//    `getDocument`, `updateRow` -> `updateDocument`, `deleteRow` ->
//    `deleteDocument`, `rowId` -> `documentId`, and `page.rows` -> `page.documents`.
// 2. This assumes `envVars.eTakhzeenDatabaseId` already exists (used by
//    your other tables, e.g. products/user). Rename below if yours differs.

export class SocialMedia {
    client = new Client();
    tablesDB;

    constructor() {
        this.client
            .setEndpoint(envVars.eTakhzeenURL)
            .setProject(envVars.eTakhzeenProjectId);
        this.tablesDB = new TablesDB(this.client);
    }

    // Creates one social media post row.
    // - platform: e.g. 'youtube' | 'tiktok' | 'instagram' | 'whatsappstatus' | 'facebook'
    // - postData: HTML string (stored as text, rendered as HTML when displayed)
    // - products: array of product IDs the post was generated for
    async createPost({ platform, postData, products = [] }) {
        try {
            const row = await this.tablesDB.createRow({
                databaseId: envVars.eTakhzeenDatabaseId,
                tableId: envVars.eTakhzeenSocialMediaTableId,
                rowId: ID.unique(),
                data: { platform, postData, products },
            });
            return row;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async updatePost({ rowId, platform, postData, products }) {
        try {
            const data = {};
            if (platform !== undefined) data.platform = platform;
            if (postData !== undefined) data.postData = postData;
            if (products !== undefined) data.products = products;

            const row = await this.tablesDB.updateRow({
                databaseId: envVars.eTakhzeenDatabaseId,
                tableId: envVars.eTakhzeenSocialMediaTableId,
                rowId,
                data,
            });
            return row;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async deletePost(rowId) {
        try {
            await this.tablesDB.deleteRow({
                databaseId: envVars.eTakhzeenDatabaseId,
                tableId: envVars.eTakhzeenSocialMediaTableId,
                rowId,
            });
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async getPost(rowId) {
        try {
            return await this.tablesDB.getRow({
                databaseId: envVars.eTakhzeenDatabaseId,
                tableId: envVars.eTakhzeenSocialMediaTableId,
                rowId,
            });
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // One page of posts, newest first. `platform` is optional — pass it to
    // drive a single platform tab (e.g. 'youtube'); omit it to get everything.
    async getPosts({ platform, limit = 20, offset = 0 } = {}) {
        try {
            const queries = [
                Query.orderDesc('$createdAt'),
                Query.limit(limit),
                Query.offset(offset),
            ];
            if (platform) queries.push(Query.equal('platform', platform));

            const result = await this.tablesDB.listRows({
                databaseId: envVars.eTakhzeenDatabaseId,
                tableId: envVars.eTakhzeenSocialMediaTableId,
                queries,
            });
            return result; // { total, rows }
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // The Overview tab's graphs (heatmap, timeline, per-platform counts)
    // need every row, not just one page — this pages through listRows
    // internally so the caller doesn't have to. `maxRows` is a safety cap
    // against runaway loops if something unexpected happens with paging.
    async getAllPosts({ platform, maxRows = 2000, pageSize = 100 } = {}) {
        try {
            let offset = 0;
            let all = [];
            let total = Infinity;

            while (offset < total && all.length < maxRows) {
                const queries = [
                    Query.orderDesc('$createdAt'),
                    Query.limit(pageSize),
                    Query.offset(offset),
                ];
                if (platform) queries.push(Query.equal('platform', platform));

                const page = await this.tablesDB.listRows({
                    databaseId: envVars.eTakhzeenDatabaseId,
                    tableId: envVars.eTakhzeenSocialMediaTableId,
                    queries,
                });

                all = all.concat(page.rows);
                total = page.total;
                offset += pageSize;

                if (page.rows.length === 0) break; // safety: avoid spinning forever
            }

            return { rows: all, total };
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }
}

const socialMedia = new SocialMedia();
export default socialMedia;