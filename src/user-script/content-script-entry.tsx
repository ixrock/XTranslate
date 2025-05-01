import "../setup";
import { ContentScript } from "./content-script";
import { initContentPage as initMellowtel } from "../../mellowtel/mellowtel.bgc";
import { mellowtelMeucciFilename } from "../../mellowtel/mellowtel.config";

// mellowtel integration
void initMellowtel({
  meucciFilePath: `${mellowtelMeucciFilename}.js`,
});

// render app
ContentScript.start();
