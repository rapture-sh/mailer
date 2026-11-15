import { describe, expect, it } from "vitest";
import { parseHeader, splitFile } from "~/build/frontmatter";

describe("splitFile", () => {
  it("should split a letter into its header and its body", () => {
    const file = ["---", "subject: Hi", "---", "<p>Hello</p>", ""].join("\n");

    expect(splitFile(file)).toEqual({ header: "subject: Hi", body: "<p>Hello</p>\n" });
  });

  it("should read a file with no header as a partial", () => {
    expect(splitFile("<p>Hello</p>")).toEqual({ header: undefined, body: "<p>Hello</p>" });
  });

  it("should read carriage returns as well, since a letter may come from Windows", () => {
    const file = ["---", "subject: Hi", "---", "<p>Hello</p>"].join("\r\n");

    expect(splitFile(file)).toEqual({ header: "subject: Hi", body: "<p>Hello</p>" });
  });

  it("should ignore a byte order mark", () => {
    expect(splitFile("﻿---\nsubject: Hi\n---\n<p>x</p>").header).toBe("subject: Hi");
  });

  it("should refuse a header that never closes", () => {
    expect(() => splitFile("---\nsubject: Hi\n")).toThrow(/never closes/);
  });
});

describe("parseHeader", () => {
  it("should read every key it knows", () => {
    const header = [
      "from: auth",
      "inbox: feedback@example.com",
      "subject: Hi",
      "reply-to: email",
      "fields:",
      "  count: number",
      "sample:",
      "  email: ada@example.com",
    ].join("\n");

    expect(parseHeader(header)).toEqual({
      from: "auth",
      inbox: "feedback@example.com",
      subject: { text: "Hi" },
      replyTo: "email",
      fields: { count: "number" },
      sample: { email: "ada@example.com" },
    });
  });

  it("should read a subject written as a copy key", () => {
    expect(parseHeader("subject:\n  key: welcome.subject").subject).toEqual({
      key: "welcome.subject",
    });
  });

  it("should leave out what was not written", () => {
    expect(parseHeader("subject: Hi")).toEqual({
      from: undefined,
      inbox: undefined,
      subject: { text: "Hi" },
      replyTo: undefined,
      fields: {},
      sample: undefined,
    });
  });

  it("should refuse a header with no subject", () => {
    expect(() => parseHeader("from: auth")).toThrow(/needs a subject/);
  });

  it("should refuse a key it does not know, which is usually a typo", () => {
    expect(() => parseHeader("subject: Hi\nsendor: auth")).toThrow(/'sendor' is not a header key/);
  });

  it("should refuse a subject that is neither text nor a key", () => {
    expect(() => parseHeader("subject:\n  - Hi")).toThrow(/a copy key as \{ key: some.key \}/);
  });

  it("should refuse a field type that is not written as a string", () => {
    expect(() => parseHeader("subject: Hi\nfields:\n  count: 7")).toThrow(
      /the type of field 'count' has to be a string/,
    );
  });

  it("should refuse fields that are not a map", () => {
    expect(() => parseHeader("subject: Hi\nfields: count")).toThrow(
      /fields has to be a map of name to type/,
    );
  });

  it("should refuse a sample that is not a map", () => {
    expect(() => parseHeader("subject: Hi\nsample: code")).toThrow(
      /sample has to be a map of field names to values/,
    );
  });

  it("should refuse a from that is not a string", () => {
    expect(() => parseHeader("subject: Hi\nfrom:\n  - auth")).toThrow(/from has to be a string/);
  });

  it("should refuse a header that is not a map at all", () => {
    expect(() => parseHeader("- auth")).toThrow(/has to be a map of keys to values/);
  });
});
