import { formatTime } from "./formatTime";

describe("formatTime", () => {
  test("formats seconds to HH:MM:SS", () => {
    expect(formatTime(0)).toBe("00:00:00");
    expect(formatTime(59)).toBe("00:00:59");
    expect(formatTime(60)).toBe("00:01:00");
    expect(formatTime(3600)).toBe("01:00:00");
    expect(formatTime(3661)).toBe("01:01:01");
    expect(formatTime(86400)).toBe("24:00:00");
    expect(formatTime(359999)).toBe("99:59:59");
  });
});
