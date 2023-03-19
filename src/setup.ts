import * as Mobx from "mobx";
import { Translator } from "./vendors";

// Global packages (NPM, etc.)
Mobx.configure({
  enforceActions: "never",
  reactionRequiresObservable: true,
});

// App's related init
Translator.createInstances();
