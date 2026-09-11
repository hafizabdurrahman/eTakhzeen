import { Client, TablesDB, Query, ID } from 'appwrite';
import envVars from '../../envVars/vars';

/**
 * ReviewService — product reviews, stored in their own table but sharing
 * the same Appwrite project/database as the main product Service.
 *
 * Row shape expected in the reviews table:
 *   - productId     (string, required)  — the product row's $id
 *   - rating        (integer, 1-5, required)
 *   - comment       (string, optional)
 *   - reviewerName  (string, optional)
 */
export class ReviewService {
    client = new Client();
    table;

    databaseId = envVars.eTakhzeenDatabaseId;
    tableId = envVars.eTakhzeenReviewsTableId;

    constructor() {
        this.client
            .setEndpoint(envVars.eTakhzeenURL)
            .setProject(envVars.eTakhzeenProjectId);
        this.table = new TablesDB(this.client);
    }

    // ---------- Write ----------

    async addReview({ productId, rating, comment = '', reviewerName = '' }) {
        if (!productId || !rating || rating < 1 || rating > 5) {
            console.error('ReviewService.addReview: productId and a rating between 1-5 are required.');
            return false;
        }
        try {
            const review = await this.table.createRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: ID.unique(),
                data: {
                    productId,
                    rating,
                    comment: comment.trim(),
                    reviewerName: reviewerName.trim() || 'Anonymous',
                },
            });
            return review || false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // ---------- Read ----------

    // One page of reviews for a product, newest first.
    async getReviews({ productId, limit = 5, offset = 0 } = {}) {
        try {
            const res = await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.tableId,
                queries: [
                    Query.equal('productId', productId),
                    Query.orderDesc('$createdAt'),
                    Query.limit(limit),
                    Query.offset(offset),
                ],
            });
            return { rows: res?.rows || [], total: res?.total || 0 };
        } catch (error) {
            console.error(error.message);
            return { rows: [], total: 0 };
        }
    }

    // Count + average rating for a product. Appwrite has no server-side
    // aggregation, so this pages through every review row for the product
    // and reduces client-side — fine for per-product review volumes.
    async getReviewStats({ productId }) {
        try {
            const rows = [];
            const pageSize = 100;
            let cursor = null;

            while (true) {
                const queries = [Query.equal('productId', productId), Query.limit(pageSize)];
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

            const count = rows.length;
            const average = count ? rows.reduce((sum, r) => sum + Number(r.rating || 0), 0) / count : 0;
            return { count, average };
        } catch (error) {
            console.error(error.message);
            return { count: 0, average: 0 };
        }
    }
}

const reviewService = new ReviewService();
export default reviewService;