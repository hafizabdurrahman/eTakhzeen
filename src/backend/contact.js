import envVars from '../../envVars/vars'; // ⚠️ adjust path
import { Client, TablesDB, ID, Query } from 'appwrite';
import { buildRowPermissions } from '../utils/permissions'; // ⚠️ adjust path

export class Contact {
    client = new Client();
    table;

    databaseId = envVars.eTakhzeenDatabaseId;
    tableId = envVars.eTakhzeenContactTableId;

    constructor() {
        this.client
            .setEndpoint(envVars.eTakhzeenURL)
            .setProject(envVars.eTakhzeenProjectId);
        this.table = new TablesDB(this.client);
    }

    // `department` isn't a column on this table — it's only used to decide
    // which staff label also gets read/update on this specific message.
    async send({ conversationId, userId, department, content, type = 'text', quickQuestionId = null, attachments = [] }) {
        try {
            const permissions = buildRowPermissions({ userId, department });
            const row = await this.table.createRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: ID.unique(),
                data: { conversationId, userId, content, type, quickQuestionId, attachments, isRead: false },
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

    // Called when admin opens a thread — marks the user's messages read.
    // Needs UPDATE permission on these rows, which the admin/department
    // label already has via buildRowPermissions above.
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

const contact = new Contact();

export default contact;