import { useEffect, useState } from "react";
import contact from "../backend/contact";
import main from "../backend/main";

export default function useContactHistory(userId){

    const [contactHistory, setContactHistory] = useState(null);
    
    useEffect(async function(){

        const senderObj = await contact.getContactData({userId});
        const senderRows = senderObj.rows;
        const receiverObj = await main.getPrevResponseData({userId});
        const receiverRows = receiverObj.rows;
    
        const contacts = [...senderRows, ...receiverRows].sort();

        setContactHistory(contacts);

    }, [setContactHistory])
    return [contactHistory, setContactHistory];
}