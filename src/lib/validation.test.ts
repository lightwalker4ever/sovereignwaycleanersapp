import { describe, expect, it } from "vitest";
import {
  emailSchema,
  messageSchema,
  nameSchema,
  phoneSchema,
  requiredPhoneSchema,
  schemaFieldError,
} from "./validation";

describe("nameSchema", () => {
  it("accepts a plain name", () => {
    expect(nameSchema.safeParse("John").success).toBe(true);
  });

  it("accepts a two-word name with a space", () => {
    expect(nameSchema.safeParse("Mary Jane").success).toBe(true);
  });

  it("accepts a name with an apostrophe", () => {
    expect(nameSchema.safeParse("O'Brien").success).toBe(true);
  });

  it("rejects digits", () => {
    expect(nameSchema.safeParse("John123").success).toBe(false);
  });

  it("rejects a hyphen", () => {
    expect(nameSchema.safeParse("John-Paul").success).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(nameSchema.safeParse("").success).toBe(false);
  });
});

describe("emailSchema", () => {
  it("accepts a valid email", () => {
    expect(emailSchema.safeParse("test@example.com").success).toBe(true);
  });

  it("rejects a string with no @", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });
});

describe("phoneSchema (optional)", () => {
  it("accepts a valid UK number", () => {
    expect(phoneSchema.safeParse("01732711856").success).toBe(true);
  });

  it("accepts a valid UK number with spaces", () => {
    expect(phoneSchema.safeParse("01732 711 856").success).toBe(true);
  });

  it("accepts undefined (field not provided)", () => {
    expect(phoneSchema.safeParse(undefined).success).toBe(true);
  });

  it("accepts an empty string (falsy values skip the phone check entirely)", () => {
    expect(phoneSchema.safeParse("").success).toBe(true);
  });

  it("rejects a number that's too short", () => {
    expect(phoneSchema.safeParse("0173271185").success).toBe(false);
  });

  it("rejects a second digit outside 1/2/3/7/8/9", () => {
    expect(phoneSchema.safeParse("04732711856").success).toBe(false);
  });

  it("rejects the 0770-prefixed exclusion", () => {
    expect(phoneSchema.safeParse("07700123456").success).toBe(false);
  });

  it("rejects 5+ repeated digits", () => {
    expect(phoneSchema.safeParse("01111111111").success).toBe(false);
  });

  it("rejects the literal sequence 01234567", () => {
    expect(phoneSchema.safeParse("01234567890").success).toBe(false);
  });
});

describe("requiredPhoneSchema", () => {
  it("accepts a valid UK number", () => {
    expect(requiredPhoneSchema.safeParse("01732711856").success).toBe(true);
  });

  it("rejects an empty string (no falsy-value shortcut, unlike phoneSchema)", () => {
    expect(requiredPhoneSchema.safeParse("").success).toBe(false);
  });
});

describe("messageSchema", () => {
  it("accepts a message of exactly 50 characters", () => {
    expect(messageSchema.safeParse("a".repeat(50)).success).toBe(true);
  });

  it("rejects a message of 49 characters", () => {
    expect(messageSchema.safeParse("a".repeat(49)).success).toBe(false);
  });

  it("trims before measuring length", () => {
    const padded = `  ${"a".repeat(49)}  `;
    expect(messageSchema.safeParse(padded).success).toBe(false);
  });
});

describe("schemaFieldError", () => {
  it("returns null for a valid value", () => {
    expect(schemaFieldError(nameSchema, "John")).toBeNull();
  });

  it("returns the schema's issue message for an invalid value", () => {
    expect(schemaFieldError(nameSchema, "John123")).toBe("Invalid name provided");
  });

  it("trims the value before validating", () => {
    expect(schemaFieldError(nameSchema, "  John  ")).toBeNull();
  });
});
