import { createContext, useContext } from "react";

export const HeaderPortalContext = createContext<HTMLElement | null>(null);
export const useHeaderPortal = () => useContext(HeaderPortalContext);
