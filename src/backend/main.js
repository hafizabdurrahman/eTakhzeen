import envVars from '../../envVars/vars';
import { Client, TablesDB, Query, ID } from 'appwrite';

export class Main{
    client = new Client();
    table;
    tableId = envVars.eTakhzeenResponseTable;
    databaseId = envVars.eTakhzeenDatabaseId;

    constructor(){
        
        this.client
                .setEndpoint(envVars.eTakhzeenURL)
                .setProject(envVars.eTakhzeenProjectId);
        this.table = new TablesDB(this.client);

    }

    async sendResponse({data}){
        try {
            await this.table.createRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: Date.now(),
                data
            })
        } catch (error) {
            return false;
        }
    }

    async getPrevResponseData({userId}){
        try {
            return await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.tableId,
                queries: [
                    Query.equal("receiverId", userId)
                ]
            })
        } catch (error) {
            return false;
        }
    }
}

const main = new Main();

export default main;