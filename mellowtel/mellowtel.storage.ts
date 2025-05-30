import { createStorage } from "../src/storage";

export const mellowtelOptOutTime = createStorage<number>("mellowtel_opt_out_timestamp", {
  defaultValue: 0,
});
