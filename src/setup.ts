import * as Mobx from "mobx";
import * as Immer from "immer";
import { Translator } from "./vendors";

// Global packages (NPM, etc.)
Mobx.configure({
  enforceActions: "never",
  reactionRequiresObservable: true,
});

Immer.setAutoFreeze(false); // allow to merge deep observables
Immer.enableMapSet(); // allow usage of maps ans sets

// App's related init
Translator.createInstances();
