import envVars from '../../../envVars/vars'; // ⚠️ adjust path
import { Client, TablesDB, Query } from 'appwrite';

export class Faq {
    client = new Client();
    table;

    databaseId = envVars.eTakhzeenDatabaseId;
    tableId = envVars.eTakhzeenFAQTableId;

    constructor() {
        this.client
            .setEndpoint(envVars.eTakhzeenURL)
            .setProject(envVars.eTakhzeenProjectId);
        this.table = new TablesDB(this.client);
    }

    // department/productId are both optional filters — pass either, both, or neither.
    async listFor({ department = null, productId = null } = {}) {
        try {
            const queries = [Query.equal('isActive', true), Query.orderAsc('order'), Query.limit(50)];
            if (department) queries.push(Query.equal('department', department));
            if (productId) queries.push(Query.equal('productId', productId));
            const res = await this.table.listRows({ databaseId: this.databaseId, tableId: this.tableId, queries });
            return res?.rows || [];
        } catch (error) {
            console.error(error.message);
            return [];
        }
    }
}

const faq = new Faq();

export default faq;