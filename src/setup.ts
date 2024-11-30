import * as Mobx from "mobx";
import { Translator } from "./vendors"; // FIXME: includes too much dependencies, e.g. "openai", "crypto-js", etc

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
