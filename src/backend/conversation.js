import envVars from '../../envVars/vars'; // ⚠️ adjust path to match your project
import { Client, TablesDB, ID, Query } from 'appwrite';
import { buildRowPermissions } from '../utils/permissions'; // ⚠️ adjust path to match your project

export class Conversation {
    client = new Client();
    table;

    databaseId = envVars.eTakhzeenDatabaseId;
    // Per your vars.js: eTakhzeenConversionTableId is the Conversations table
    // (the env var names got cross-mapped with eTakhzeenContactTableId —
    // this is intentional per your own comment there, not a typo here).
    tableId = envVars.eTakhzeenConversionTableId;

    constructor() {
        this.client
            .setEndpoint(envVars.eTakhzeenURL)
            .setProject(envVars.eTakhzeenProjectId);
        this.table = new TablesDB(this.client);
    }

    /**
     * Returns the user's existing open/pending thread for this department,
     * or creates a new one. This is what keeps ONE continuous thread per
     * department per user, instead of spawning a new thread every visit.
     */
    async getOrCreate({ userId, userName = null, userEmail = null, department, productId = null, productName = null }) {
        try {
            const existing = await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.tableId,
                queries: [
                    Query.equal('userId', userId),
                    Query.equal('department', department),
                    Query.notEqual('status', 'closed'),
                    Query.limit(1),
                ],
            });
            if (existing?.rows?.length) return existing.rows[0];

            const permissions = buildRowPermissions({ userId, department });

            const row = await this.table.createRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: ID.unique(),
                data: {
                    userId,
                    userName,
                    userEmail,
                    department,
                    productId,
                    productName,
                    subject: null,
                    status: 'open',
                    lastMessage: '',
                    lastMessageAt: new Date().toISOString(),
                    lastSenderRole: 'user',
                    unreadByAdmin: 0,
                    unreadByUser: 0,
                    assignedAdminId: null,
                },
                permissions,
            });
            return row || false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async getById(conversationId) {
        try {
            const row = await this.table.getRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: conversationId,
            });
            return row || false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Every thread a given user has ever opened — for their profile panel.
    async listForUser(userId) {
        try {
            const res = await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.tableId,
                queries: [Query.equal('userId', userId), Query.orderDesc('lastMessageAt'), Query.limit(100)],
            });
            return res?.rows || [];
        } catch (error) {
            console.error(error.message);
            return [];
        }
    }

    // Admin inbox — optionally scoped by department tab and/or status filter.
    async listForAdmin({ department = null, status = null } = {}) {
        try {
            const queries = [Query.orderDesc('lastMessageAt'), Query.limit(100)];
            if (department) queries.push(Query.equal('department', department));
            if (status) queries.push(Query.equal('status', status));
            const res = await this.table.listRows({ databaseId: this.databaseId, tableId: this.tableId, queries });
            return res?.rows || [];
        } catch (error) {
            console.error(error.message);
            return [];
        }
    }

    // Call after a new USER message is created.
    async markUserMessage({ conversationId, preview }) {
        try {
            const current = await this.getById(conversationId);
            const nextUnreadByAdmin = (current?.unreadByAdmin ?? 0) + 1;
            await this.table.updateRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: conversationId,
                data: {
                    lastMessage: preview,
                    lastMessageAt: new Date().toISOString(),
                    lastSenderRole: 'user',
                    unreadByAdmin: nextUnreadByAdmin,
                    unreadByUser: 0,
                },
            });
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Call after a new ADMIN message is created.
    async markAdminMessage({ conversationId, preview }) {
        try {
            const current = await this.getById(conversationId);
            const nextUnreadByUser = (current?.unreadByUser ?? 0) + 1;
            await this.table.updateRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: conversationId,
                data: {
                    lastMessage: preview,
                    lastMessageAt: new Date().toISOString(),
                    lastSenderRole: 'admin',
                    unreadByUser: nextUnreadByUser,
                    unreadByAdmin: 0,
                },
            });
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    // Call when the user opens the thread (forRole: 'user') or admin opens
    // it in the admin panel (forRole: 'admin').
    async resetUnread({ conversationId, forRole }) {
        try {
            const field = forRole === 'admin' ? 'unreadByAdmin' : 'unreadByUser';
            await this.table.updateRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: conversationId,
                data: { [field]: 0 },
            });
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async updateStatus({ conversationId, status }) {
        try {
            await this.table.updateRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: conversationId,
                data: { status },
            });
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async assign({ conversationId, adminId }) {
        try {
            await this.table.updateRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: conversationId,
                data: { assignedAdminId: adminId },
            });
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }
}

const conversation = new Conversation();

export default conversation;