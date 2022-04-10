import React from "react";
import type { Menu } from "./menu";

export type MenuContextValue = Menu | null;

export const MenuContext = React.createContext<MenuContextValue>(null);
