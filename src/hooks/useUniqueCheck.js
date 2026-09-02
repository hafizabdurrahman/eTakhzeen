import { useEffect, useState } from "react";
import { user } from "../backend";
// import { useDispatch } from "react-redux";

function useUniqueCheck(property = ["username", "email", "number"], val = ["username", "abdurrahman"]){
    
    const [unique, setUnique] = useState("no");
    // const [properties, setProperties] = useState(property); 
    // const [value, setValue] = useState(val);
    // const dispatch = useDispatch();
    const p = JSON.stringify(property);
    const v = JSON.stringify(val);
    useEffect(() => {

        async function checkUniqueness(){
            try {
                const currentProperties = JSON.parse(p);
                const currentValue = JSON.parse(v);

                const allCols = await user.getCols(currentProperties);
        // dispatch(setUser(allCols));
                if(allCols){
                    setUnique(allCols[currentValue[0]]?.includes(currentValue[1]) ? 'no' : 'yes')
                }
            } catch (error) {
                console.log(error);
            }
        }
        checkUniqueness()
    }, [p, v])
    return unique;
}

export default useUniqueCheck;