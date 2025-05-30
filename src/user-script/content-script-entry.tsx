import "../setup";
import "./content-script-entry.scss";
import { injectContentScript } from "../background/scripting.bgc";

// render app
await injectContentScript();
