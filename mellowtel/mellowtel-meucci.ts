// Integration for https://docs.mellowtel.com/browser-plugins/optional-integrations/burke
// "Meucci" is a new brand name for MellowTel™'s Burke
import MellowtelMeucci from "@mellowtel/module-meucci";

const meucci = new MellowtelMeucci();
await meucci.init();
