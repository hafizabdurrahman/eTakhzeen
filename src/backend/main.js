import envVars from '../../envVars/vars'; // ⚠️ adjust path
import { Client, TablesDB, ID, Query } from 'appwrite';
import { buildRowPermissions } from '../utils/permissions'; // ⚠️ adjust path

export class Main {
    client = new Client();
    table;

    databaseId = envVars.eTakhzeenDatabaseId;
    tableId = envVars.eTakhzeenResponseTable;

    constructor() {
        this.client
            .setEndpoint(envVars.eTakhzeenURL)
            .setProject(envVars.eTakhzeenProjectId);
        this.table = new TablesDB(this.client);
    }

    // `userId` here is the CONVERSATION OWNER (the customer), not the
    // admin — it's needed so the customer keeps read access to the
    // admin's reply row once Document Security is enforcing ownership.
    async send({ conversationId, userId, department, adminId, adminName = null, content, attachments = [] }) {
        try {
            const permissions = buildRowPermissions({ userId, department });
            const row = await this.table.createRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: ID.unique(),
                data: { conversationId, adminId, adminName, content, attachments, isRead: false },
                permissions,
            });
            return row || false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async listByConversation(conversationId) {
        try {
            const res = await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.tableId,
                queries: [Query.equal('conversationId', conversationId), Query.orderAsc('$createdAt'), Query.limit(200)],
            });
            return res?.rows || [];
        } catch (error) {
            console.error(error.message);
            return [];
        }
    }

    async markAllRead(conversationId) {
        try {
            const unread = await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.tableId,
                queries: [Query.equal('conversationId', conversationId), Query.equal('isRead', false), Query.limit(200)],
            });
            await Promise.all(
                (unread?.rows || []).map((row) =>
                    this.table.updateRow({ databaseId: this.databaseId, tableId: this.tableId, rowId: row.$id, data: { isRead: true } })
                )
            );
            return true;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }
}

const main = new Main();

export default main;