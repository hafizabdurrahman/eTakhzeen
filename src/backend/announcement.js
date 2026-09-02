import envVars from '../../envVars/vars'; // ⚠️ adjust path
import { Client, TablesDB, Storage, ID, Query } from 'appwrite';

/*
 * ANNOUNCEMENT SYSTEM
 *
 * Two tables:
 *   eTakhzeenAnnouncementTableId          — the announcements themselves
 *   eTakhzeenAnnouncementResponseTableId  — per-user read/reaction state
 *
 * Response rows use a DETERMINISTIC id (`${announcementId}__${username}`)
 * instead of ID.unique() — that makes "mark read" / "set reaction" a
 * single upsert (try update, create on 404) instead of a query-then-write,
 * and makes duplicate rows for the same user+announcement impossible.
 *
 * likesCount/dislikesCount on the announcement row are denormalized and
 * kept in sync by setReaction() below via read-modify-write. This is NOT
 * atomic (two simultaneous reactions could race), which is an acceptable
 * tradeoff for a reaction counter at this scale.
 *
 * ⚠️ PERMISSIONS: reacting writes to BOTH tables — the response row AND
 * the announcement row's likesCount/dislikesCount. The `users` role needs
 * Update permission on the announcement table, not just the response
 * table, or count updates will silently fail (caught + logged, not
 * thrown) while the response row still saves fine.
 */

export class AnnouncementService {
    client = new Client();
    table;
    storage;

    databaseId = envVars.eTakhzeenDatabaseId;
    announcementTableId = envVars.eTakhzeenAnnouncementTableId; // ⚠️ confirm this exists in vars.js
    responseTableId = envVars.eTakhzeenAnnouncementResponseTableId; // ⚠️ confirm this exists in vars.js
    bucketId = envVars.eTakhzeenAnnouncementBucketId; // ⚠️ confirm — or point this at your existing product bucket

    constructor() {
        this.client
            .setEndpoint(envVars.eTakhzeenURL)
            .setProject(envVars.eTakhzeenProjectId);
        this.table = new TablesDB(this.client);
        this.storage = new Storage(this.client);
    }

    // ---------- Images (cover images + inline images pasted into the editor) ----------

    async uploadImage({ file }) {
        try {
            const uploaded = await this.storage.createFile({
                bucketId: this.bucketId,
                fileId: ID.unique(),
                file,
            });
            return uploaded || false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Raw file URL — no image transformations, so this works on Appwrite's
    // free tier (getFilePreview() requires the paid Image Transformations
    // add-on and throws without it). getFileView() just streams the
    // original file back, which is all a static banner image needs.
    getImageUrl({ fileId }) {
        if (!fileId) return null;
        try {
            return this.storage.getFileView({ bucketId: this.bucketId, fileId });
        } catch (error) {
            console.error(error.message);
            return null;
        }
    }

    async deleteImage({ fileId }) {
        if (!fileId) return true;
        try {
            await this.storage.deleteFile({ bucketId: this.bucketId, fileId });
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // ---------- Admin: create / edit / delete ----------

    async createAnnouncement({ title, contentHtml, coverFileId, buttonLabel, buttonHref, active = true }) {
        try {
            if (!title || !contentHtml) throw new Error('Title and content are required.');

            const row = await this.table.createRow({
                databaseId: this.databaseId,
                tableId: this.announcementTableId,
                rowId: ID.unique(),
                data: {
                    title,
                    contentHtml,
                    coverFileId: coverFileId || '',
                    buttonLabel: buttonLabel || '',
                    buttonHref: buttonHref || '',
                    active,
                    likesCount: 0,
                    dislikesCount: 0,
                },
            });
            return row || false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async updateAnnouncement({ rowId, data }) {
        try {
            const updated = await this.table.updateRow({
                databaseId: this.databaseId,
                tableId: this.announcementTableId,
                rowId,
                data,
            });
            return updated || false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async deleteAnnouncement({ rowId, coverFileId }) {
        try {
            await this.table.deleteRow({
                databaseId: this.databaseId,
                tableId: this.announcementTableId,
                rowId,
            });
            if (coverFileId) this.deleteImage({ fileId: coverFileId }).catch(() => {});
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // ---------- Reading announcements ----------

    async getAllAnnouncements() {
        try {
            const rows = [];
            const pageSize = 100;
            let cursor = null;

            while (true) {
                const queries = [Query.orderDesc('$createdAt'), Query.limit(pageSize)];
                if (cursor) queries.push(Query.cursorAfter(cursor));

                const res = await this.table.listRows({
                    databaseId: this.databaseId,
                    tableId: this.announcementTableId,
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

    // What users/popup/sidebar actually fetch — only live announcements.
    async getActiveAnnouncements() {
        try {
            const res = await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.announcementTableId,
                queries: [Query.equal('active', true), Query.orderDesc('$createdAt'), Query.limit(100)],
            });
            return res?.rows || [];
        } catch (error) {
            console.error(error.message);
            return [];
        }
    }

    async getAnnouncement({ rowId }) {
        try {
            const row = await this.table.getRow({
                databaseId: this.databaseId,
                tableId: this.announcementTableId,
                rowId,
            });
            return row || null;
        } catch (error) {
            console.error(error.message);
            return null;
        }
    }

    // ---------- Per-user read / reaction state ----------

    _responseRowId({ announcementId, username }) {
        return `${announcementId}__${username}`;
    }

    async _upsertResponse({ announcementId, username, patch }) {
        const rowId = this._responseRowId({ announcementId, username });
        try {
            const updated = await this.table.updateRow({
                databaseId: this.databaseId,
                tableId: this.responseTableId,
                rowId,
                data: patch,
            });
            return updated;
        } catch {
            // Row doesn't exist yet — first time this user has touched
            // this announcement. Create it with defaults + the patch.
            try {
                const created = await this.table.createRow({
                    databaseId: this.databaseId,
                    tableId: this.responseTableId,
                    rowId,
                    data: { announcementId, username, read: false, reaction: 'none', ...patch },
                });
                return created;
            } catch (createError) {
                console.error(createError.message);
                return false;
            }
        }
    }

    // All of the CURRENT user's responses, for computing "unread"/"new"
    // client-side without a per-announcement round trip.
    async getUserResponses({ username }) {
        try {
            const res = await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.responseTableId,
                queries: [Query.equal('username', username), Query.limit(200)],
            });
            return res?.rows || [];
        } catch (error) {
            console.error(error.message);
            return [];
        }
    }

    async markRead({ announcementId, username }) {
        return this._upsertResponse({ announcementId, username, patch: { read: true } });
    }

    // Clicking the same reaction again toggles it off (back to "none").
    // Returns the response row merged with the announcement's fresh
    // likesCount/dislikesCount so callers don't need a second round trip
    // to display the updated counts.
    async setReaction({ announcementId, username, reaction }) {
        if (!['like', 'dislike', 'none'].includes(reaction)) {
            throw new Error(`Unknown reaction "${reaction}".`);
        }

        let oldReaction = 'none';
        try {
            const existing = await this.table.getRow({
                databaseId: this.databaseId,
                tableId: this.responseTableId,
                rowId: this._responseRowId({ announcementId, username }),
            });
            oldReaction = existing?.reaction || 'none';
        } catch {
            // no existing response row — first reaction from this user
        }

        const nextReaction = oldReaction === reaction ? 'none' : reaction;

        const updated = await this._upsertResponse({
            announcementId,
            username,
            patch: { reaction: nextReaction, read: true },
        });
        if (!updated) return false;

        const counts = await this._adjustCounts({ announcementId, oldReaction, newReaction: nextReaction });
        return { ...updated, likesCount: counts.likesCount, dislikesCount: counts.dislikesCount };
    }

    async _adjustCounts({ announcementId, oldReaction, newReaction }) {
        try {
            const current = await this.table.getRow({
                databaseId: this.databaseId,
                tableId: this.announcementTableId,
                rowId: announcementId,
            });

            let likesCount = current?.likesCount || 0;
            let dislikesCount = current?.dislikesCount || 0;

            if (oldReaction !== newReaction) {
                if (oldReaction === 'like') likesCount = Math.max(0, likesCount - 1);
                if (oldReaction === 'dislike') dislikesCount = Math.max(0, dislikesCount - 1);
                if (newReaction === 'like') likesCount += 1;
                if (newReaction === 'dislike') dislikesCount += 1;

                await this.table.updateRow({
                    databaseId: this.databaseId,
                    tableId: this.announcementTableId,
                    rowId: announcementId,
                    data: { likesCount, dislikesCount },
                });
            }

            return { likesCount, dislikesCount };
        } catch (error) {
            // Most likely cause: `users` role lacks Update permission on
            // the announcement table. The response row still saved fine
            // (that's a separate table/permission), which is why you'd
            // see the reaction recorded but the count frozen.
            console.error(error.message);
            return { likesCount: 0, dislikesCount: 0 };
        }
    }

    // ---------- Admin: who has responded to a given announcement ----------

    async getResponsesForAnnouncement({ announcementId }) {
        try {
            const rows = [];
            const pageSize = 100;
            let cursor = null;

            while (true) {
                const queries = [Query.equal('announcementId', announcementId), Query.limit(pageSize)];
                if (cursor) queries.push(Query.cursorAfter(cursor));

                const res = await this.table.listRows({
                    databaseId: this.databaseId,
                    tableId: this.responseTableId,
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
}

const announcementService = new AnnouncementService();

export default announcementService;