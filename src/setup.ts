import * as Mobx from "mobx";
import { Translator } from "./vendors";

// Global packages (NPM, etc.)
Mobx.configure({
  enforceActions: "never",
  reactionRequiresObservable: true,
  observableRequiresReaction: false, // TODO: enable in the future
  computedRequiresReaction: false,  // TODO: enable in the future
  safeDescriptors: true,
});

// App's related init
Translator.createInstances();
