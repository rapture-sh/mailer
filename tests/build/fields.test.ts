import { describe, expect, it } from "vitest";
import { type Fields, inferBody, subjectPlaceholders, typeOf } from "~/build/fields";

/** The fields a body asks for, as the types they would be written as. */
function fieldsOf(body: string): Record<string, string> {
  const { fields } = inferBody(body);

  return Object.fromEntries(
    Object.entries(fields).map(([name, field]) => [
      `${name}${field.optional ? "?" : ""}`,
      typeOf(field),
    ]),
  );
}

describe("inferBody", () => {
  it("should read a bare placeholder as a string", () => {
    expect(fieldsOf("<p>{{ code }}</p>")).toEqual({ code: "string" });
  });

  it("should read nothing from a body with no placeholders", () => {
    expect(fieldsOf("<p>Hello</p>")).toEqual({});
  });

  it("should leave the context alone", () => {
    expect(fieldsOf("<p>{{ reader.name }} {{ locale }}</p>")).toEqual({});
  });

  it("should treat what an if guards as optional, field and contents alike", () => {
    expect(fieldsOf("{{#if voucher}}<p>{{ voucher }} {{ note }}</p>{{/if}}")).toEqual({
      "voucher?": "string",
      "note?": "string",
    });
  });

  it("should treat an unless the same way", () => {
    expect(fieldsOf("{{#unless paid}}<p>{{ amount }}</p>{{/unless}}")).toEqual({
      "paid?": "string",
      "amount?": "string",
    });
  });

  it("should keep a field required when it is also used outside the if", () => {
    expect(fieldsOf("<p>{{ name }}</p>{{#if name}}<p>again</p>{{/if}}")).toEqual({
      name: "string",
    });
  });

  it("should read an each block over values as a list of strings", () => {
    expect(fieldsOf("{{#each tickets}}<li>{{ this }}</li>{{/each}}")).toEqual({
      tickets: "readonly string[]",
    });
  });

  it("should read an each block over objects as the shape its body reads", () => {
    expect(fieldsOf("{{#each tickets}}<li>{{ quantity }} {{ name }}</li>{{/each}}")).toEqual({
      tickets: "readonly { name: string; quantity: string }[]",
    });
  });

  it("should reach the outer scope from inside an each", () => {
    expect(fieldsOf("{{#each rows}}<li>{{ label }} {{ ../total }}</li>{{/each}}")).toEqual({
      rows: "readonly { label: string }[]",
      total: "string",
    });
  });

  it("should leave handlebars' own data variables alone", () => {
    expect(fieldsOf("{{#each rows}}<li>{{ @index }} {{ label }}</li>{{/each}}")).toEqual({
      rows: "readonly { label: string }[]",
    });
  });

  it("should read the type a helper implies for its argument", () => {
    expect(
      fieldsOf(
        "<p>{{ dateTime startsAt zone=timezone }} {{ money total currency }} {{ list parts }}</p>",
      ),
    ).toEqual({
      startsAt: "number | Date",
      timezone: "string",
      total: "number",
      currency: "string",
      parts: "readonly string[]",
    });
  });

  it("should let a helper's type beat the string a bare placeholder implies", () => {
    expect(fieldsOf("<p>{{ total }} {{ money total currency }}</p>")).toMatchObject({
      total: "number",
    });
  });

  it("should take fields out of a copy key's values, and out of a nested helper", () => {
    const body = '<p>{{ t "paid" who=name amount=(money total currency) }}</p>';

    expect(fieldsOf(body)).toEqual({ name: "string", total: "number", currency: "string" });
  });

  it("should collect the copy keys a body asks for", () => {
    const body = '<p>{{ t "one" }}{{ t "two" who=name }}</p>';

    expect(inferBody(body).copy).toEqual([
      { key: "one", values: [] },
      { key: "two", values: ["who"] },
    ]);
  });

  it("should collect the partials a body uses, and not handlebars' own", () => {
    const body = "{{#> layout }}{{> @partial-block }}{{> footer }}{{/layout}}";

    expect(inferBody(body).partials).toEqual(["layout", "footer"]);
  });

  it("should find a partial used inside a block", () => {
    expect(inferBody("{{#if x}}{{> footer }}{{/if}}").partials).toEqual(["footer"]);
  });

  it("should take fields off a partial's arguments", () => {
    expect(fieldsOf('{{#> layout heading=title closing="bye" }}{{/layout}}')).toEqual({
      title: "string",
    });
  });
});

describe("what inferBody refuses", () => {
  it("should refuse a helper that is not part of the language", () => {
    expect(() => inferBody("<p>{{ uppercase name }}</p>")).toThrow(
      /the helper 'uppercase' is not part of the body language/,
    );
  });

  it("should refuse a block helper that is not part of the language", () => {
    expect(() => inferBody("{{#with user}}{{ name }}{{/with}}")).toThrow(
      /the block helper 'with' is not part of the body language/,
    );
  });

  it("should refuse a block with nothing to work on", () => {
    expect(() => inferBody('{{#if "yes"}}<p>x</p>{{/if}}')).toThrow(/#if needs a field to work on/);
  });

  it("should refuse a copy key that is not written out", () => {
    expect(() => inferBody("<p>{{ t key }}</p>")).toThrow(/t needs a copy key written out/);
    expect(() => inferBody("<p>{{ t }}</p>")).toThrow(/t needs a copy key written out/);
  });

  it("should refuse too many arguments to a helper", () => {
    expect(() => inferBody("<p>{{ money a b c }}</p>")).toThrow(/money takes 2 arguments/);
  });

  it("should refuse reading through a field, which would have to be guessed at", () => {
    expect(() => inferBody("<p>{{ booking.reference }}</p>")).toThrow(
      /declare 'booking' under fields: in the header/,
    );
  });

  it("should refuse reaching further out than the letter's own fields", () => {
    expect(() => inferBody("<p>{{ ../total }}</p>")).toThrow(/reaches further out/);
  });
});

describe("subjectPlaceholders", () => {
  it("should find the placeholders in a subject line", () => {
    expect(subjectPlaceholders("Your booking for {activityName} on {day}")).toEqual([
      "activityName",
      "day",
    ]);
  });

  it("should find none in a plain subject", () => {
    expect(subjectPlaceholders("Welcome to Acme")).toEqual([]);
  });
});

describe("typeOf", () => {
  it("should write a type the header gave as it was written", () => {
    const fields: Fields = {
      tickets: {
        type: { kind: "written", type: "{ name: string; quantity: number }[]" },
        optional: false,
      },
    };

    const field = fields.tickets;

    expect(field === undefined ? "" : typeOf(field)).toBe("{ name: string; quantity: number }[]");
  });

  it("should mark an optional key inside a row", () => {
    const body = "{{#each rows}}<li>{{ label }}{{#if note}}{{ note }}{{/if}}</li>{{/each}}";

    expect(fieldsOf(body)).toEqual({
      rows: "readonly { label: string; note?: string }[]",
    });
  });
});
