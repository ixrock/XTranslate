/**
 * Copyright (c) 2023 Mirantis, Inc. All rights reserved.
 * Licensed under MIT License. See LICENSE in package directory for more information.
 */

import { fuzzyMatch } from "./fuzzyMatch";

describe("fuzzy search", () => {
  it("by default just single chunk of the searching input enough to match", () => {
    const search = fuzzyMatch("test-123 blabla", "test--13");

    expect(search).toBeTruthy();
  });

  it("options.strict=true allows to check that every chunk is matched in area", () => {
    const search = fuzzyMatch("test-123 blabla", "_test__13", { strict: true });
    const search2 = fuzzyMatch("test-123 blabla", "test 12", { strict: true });

    expect(search).toBeFalsy();
    expect(search2).toBeTruthy();
  });

  it("order of matched chunks doesn't matter", () => {
    const search = fuzzyMatch("test-123 blabla", "123 test", { strict: true });
    const search2 = fuzzyMatch("test-123 blabla", "-123 bla-", {
      strict: true,
    });

    expect(search).toBeTruthy();
    expect(search2).toBeTruthy();
  });
});
