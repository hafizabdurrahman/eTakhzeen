import { createContext, useContext } from "react";

export const themeContext = createContext({
    themeMode: "dark",
    toggleTheme: () => {}
})

export const ThemeProvider = themeContext.Provider;

export default function useTheme(){
    return useContext(themeContext);
}