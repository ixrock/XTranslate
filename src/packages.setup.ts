// Configuration for global packages (NPM, etc.)
import * as Mobx from "mobx";
import * as Immer from "immer";

Mobx.configure({
  enforceActions: "never",
  reactionRequiresObservable: true,
});

Immer.setAutoFreeze(false); // allow to merge deep observables
Immer.enableMapSet(); // allow usage of maps ans sets
