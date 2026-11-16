import { describe, expect, it } from "vitest";
import { textFromHtml } from "~/text";

describe("textFromHtml", () => {
  it("should keep the words and drop the markup", () => {
    expect(textFromHtml("<p>Your code is <strong>519204</strong>.</p>")).toBe(
      "Your code is 519204.",
    );
  });

  it("should put a blank line where a block ended", () => {
    expect(textFromHtml("<p>One</p><p>Two</p>")).toBe("One\n\nTwo");
  });

  it("should break a line on a br", () => {
    expect(textFromHtml("<p>One<br>Two<br />Three</p>")).toBe("One\nTwo\nThree");
  });

  it("should print a link so a reader of the text can follow it", () => {
    expect(textFromHtml('<a href="https://acme.example/r/1">Reset your password</a>')).toBe(
      "Reset your password (https://acme.example/r/1)",
    );
  });

  it("should print a link once when its text is already the url", () => {
    expect(textFromHtml('<a href="https://acme.example">https://acme.example</a>')).toBe(
      "https://acme.example",
    );
  });

  it("should print a mail link as the address alone", () => {
    expect(textFromHtml('<a href="mailto:ada@example.com">ada@example.com</a>')).toBe(
      "ada@example.com",
    );
  });

  it("should take the href out of single quotes and out of none", () => {
    expect(textFromHtml("<a href='https://one.example'>One</a>")).toBe("One (https://one.example)");
    expect(textFromHtml("<a href=https://two.example>Two</a>")).toBe("Two (https://two.example)");
  });

  it("should mark list items", () => {
    expect(textFromHtml("<ul><li>2 Adult</li><li>1 Child</li></ul>")).toBe("- 2 Adult\n- 1 Child");
  });

  it("should drop a style block rather than printing the css", () => {
    expect(textFromHtml("<style>.a { color: red }</style><p>Hi</p>")).toBe("Hi");
  });

  it("should drop a script block rather than printing the code", () => {
    expect(textFromHtml("<script>alert(1)</script><p>Hi</p>")).toBe("Hi");
  });

  it("should drop a comment", () => {
    expect(textFromHtml("<p>Hi<!-- a note --></p>")).toBe("Hi");
  });

  it("should decode the entities an email body carries", () => {
    expect(textFromHtml("<p>Fish&nbsp;&amp;&nbsp;Chips &lt;3 &#39;yes&#39; &#x2026;</p>")).toBe(
      "Fish & Chips <3 'yes' …",
    );
  });

  it("should leave an entity it does not know as it was written", () => {
    expect(textFromHtml("<p>&bogus; &#1114112;</p>")).toBe("&bogus; &#1114112;");
  });

  it("should collapse the whitespace a layout is indented with", () => {
    const html = ["<html>", "  <body>", "    <p>", "      Hello", "    </p>", "  </body>"].join(
      "\n",
    );

    expect(textFromHtml(html)).toBe("Hello");
  });

  it("should give nothing for markup that carried no words", () => {
    expect(textFromHtml('<img src="cid:logo" alt="">')).toBe("");
  });

  it("should give nothing for an empty body", () => {
    expect(textFromHtml("")).toBe("");
  });

  it("should read a whole letter the way a reader would", () => {
    const html = [
      "<html><head><title>Receipt</title></head>",
      "<body>",
      '  <img src="cid:logo" alt="Acme">',
      "  <h1>Receipt REF-4182</h1>",
      "  <p>Thank you, Ada. <b>CHF 125.00</b> paid.</p>",
      "  <ul><li>2 Adult</li><li>1 Child</li></ul>",
      '  <p><a href="https://acme.example/i/4182">Download your invoice</a></p>',
      "</body></html>",
    ].join("\n");

    expect(textFromHtml(html)).toBe(
      [
        "Receipt REF-4182",
        "",
        "Thank you, Ada. CHF 125.00 paid.",
        "",
        "- 2 Adult",
        "- 1 Child",
        "",
        "Download your invoice (https://acme.example/i/4182)",
      ].join("\n"),
    );
  });
});
