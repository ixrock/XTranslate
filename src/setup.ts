// Global packages configuration & setup
import * as Mobx from "mobx";

Mobx.configure({
  enforceActions: "never",
  reactionRequiresObservable: true,
  observableRequiresReaction: false, // TODO: enable in the future
  computedRequiresReaction: true,
  safeDescriptors: true,
});
