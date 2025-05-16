import * as Mobx from "mobx";
import { Translator } from "./providers";

// Global packages (NPM, etc.)
Mobx.configure({
  enforceActions: "never",
  reactionRequiresObservable: true,
  observableRequiresReaction: false, // TODO: enable in the future
  computedRequiresReaction: true,
  safeDescriptors: true,
});

// App's related init
Translator.createInstances();
