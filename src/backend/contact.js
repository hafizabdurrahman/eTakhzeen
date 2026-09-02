import envVars from '../../envVars/vars'
import { Client, TablesDB, Query } from "appwrite";

export class Contact{
    client = new Client();
    table;
    databaseId = envVars.eTakhzeenDatabaseId;
    tableId = envVars.eTakhzeenContactTableId;

    constructor(){

        this.client
                .setEndpoint(envVars.eTakhzeenURL)
                .setProject(envVars.eTakhzeenProjectId);

        this.table = new TablesDB(this.client);
    }
    
    // sending message to the admin
    async contact({data}){
        try {
            await this.table.createRow({
                databaseId: this.databaseId,
                tableId: this.tableId,
                rowId: Date.now(),
                data
            })
            return true;
        } catch (error) {
            return false;
        }
    }

    async getContactData({userId}){
        try {
            return await this.table.listRows({
                databaseId: this.databaseId,
                tableId: this.tableId,
                queries: [
                    Query.equal('senderId', userId)
                ]
            })
        } catch (error) {
            return false;
        }
    }

}


const contact = new Contact();

export default contact;