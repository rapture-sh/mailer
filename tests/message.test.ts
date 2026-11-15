import { describe, expect, it } from "vitest";
import { formatAddress } from "~/message";

describe("formatAddress", () => {
  it("should give the bare address when there is no name", () => {
    expect(formatAddress({ email: "ada@example.com" })).toBe("ada@example.com");
  });

  it("should give the bare address when the name is empty", () => {
    expect(formatAddress({ email: "ada@example.com", name: "" })).toBe("ada@example.com");
  });

  it("should put the name in front of the address", () => {
    expect(formatAddress({ email: "ada@example.com", name: "Ada" })).toBe(
      '"Ada" <ada@example.com>',
    );
  });

  it("should quote a name with a comma in it, which would otherwise read as two addresses", () => {
    expect(formatAddress({ email: "ada@example.com", name: "Lovelace, Ada" })).toBe(
      '"Lovelace, Ada" <ada@example.com>',
    );
  });

  it("should escape a quote inside a name", () => {
    expect(formatAddress({ email: "ada@example.com", name: 'Ada "The Enchantress"' })).toBe(
      '"Ada \\"The Enchantress\\"" <ada@example.com>',
    );
  });
});
