import { describe, expect, it } from "vitest";
import { capitalize, cn } from "./utils";

describe("cn", () => {
  it("merges conflicting Tailwind classes, keeping the later one", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("drops a falsy conditional class", () => {
    expect(cn("text-red-500", false && "text-blue-500", "font-bold")).toBe("text-red-500 font-bold");
  });

  it("supports the clsx object-of-booleans form", () => {
    expect(cn({ foo: true, bar: false })).toBe("foo");
  });

  it("joins non-conflicting classes with a space", () => {
    expect(cn("a", "b")).toBe("a b");
  });
});

describe("capitalize", () => {
  it("uppercases the first letter", () => {
    expect(capitalize("cleaner")).toBe("Cleaner");
  });

  it("leaves an already-capitalized string unchanged", () => {
    expect(capitalize("Admin")).toBe("Admin");
  });

  it("returns an empty string unchanged", () => {
    expect(capitalize("")).toBe("");
  });
});
