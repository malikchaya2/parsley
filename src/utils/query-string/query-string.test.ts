import { CaseSensitivity, MatchType } from "constants/enums";
import {
  parseFilters,
  parseQueryString,
  stringifyFilters,
  stringifyQuery,
} from ".";

describe("filters", () => {
  describe("stringifyFilters", () => {
    it("can handle empty input", () => {
      expect(stringifyFilters([])).toStrictEqual([]);
    });
    it("stringifies a single filter correctly", () => {
      expect(
        stringifyFilters([
          {
            caseSensitive: CaseSensitivity.Insensitive,
            matchType: MatchType.Exact,
            name: "hello-i-am-a-filter",
            visible: true,
          },
        ])
      ).toStrictEqual(["100hello-i-am-a-filter"]);
    });
    it("stringifies multiple filters correctly", () => {
      expect(
        stringifyFilters([
          {
            caseSensitive: CaseSensitivity.Sensitive,
            matchType: MatchType.Inverse,
            name: "passed",
            visible: false,
          },
          {
            caseSensitive: CaseSensitivity.Insensitive,
            matchType: MatchType.Inverse,
            name: "failed",
            visible: true,
          },
          {
            caseSensitive: CaseSensitivity.Sensitive,
            matchType: MatchType.Exact,
            name: "running",
            visible: false,
          },
        ])
      ).toStrictEqual(["011passed", "101failed", "010running"]);
    });
    it("successfully encodes special characters", () => {
      expect(
        stringifyFilters([
          {
            caseSensitive: CaseSensitivity.Insensitive,
            matchType: MatchType.Exact,
            name: "ran in d{3,}",
            visible: true,
          },
        ])
      ).toStrictEqual(["100ran%20in%20d%7B3%2C%7D"]);
    });
  });
  describe("parseFilters", () => {
    it("can handle empty input", () => {
      expect(parseFilters([])).toStrictEqual([]);
    });
    it("parses a single filter correctly", () => {
      expect(parseFilters(["100hello-i-am-a-filter"])).toStrictEqual([
        {
          caseSensitive: CaseSensitivity.Insensitive,
          matchType: MatchType.Exact,
          name: "hello-i-am-a-filter",
          visible: true,
        },
      ]);
    });
    it("parses a single filter that resembles a number correctly", () => {
      expect(parseFilters(["10012345"])).toStrictEqual([
        {
          caseSensitive: CaseSensitivity.Insensitive,
          matchType: MatchType.Exact,
          name: "12345",
          visible: true,
        },
      ]);
    });
    it("successfully decodes special characters", () => {
      expect(parseFilters(["100ran%20in%20d%7B3%2C%7D"])).toStrictEqual([
        {
          caseSensitive: CaseSensitivity.Insensitive,
          matchType: MatchType.Exact,
          name: "ran in d{3,}",
          visible: true,
        },
      ]);
    });
    it("parses multiple filters correctly", () => {
      expect(
        parseFilters(["011passed", "101failed", "010running"])
      ).toStrictEqual([
        {
          caseSensitive: CaseSensitivity.Sensitive,
          matchType: MatchType.Inverse,
          name: "passed",
          visible: false,
        },
        {
          caseSensitive: CaseSensitivity.Insensitive,
          matchType: MatchType.Inverse,
          name: "failed",
          visible: true,
        },
        {
          caseSensitive: CaseSensitivity.Sensitive,
          matchType: MatchType.Exact,
          name: "running",
          visible: false,
        },
      ]);
    });
  });
});

describe("query-string", () => {
  describe("stringifyQuery", () => {
    it("ignores null", () => {
      expect(stringifyQuery({ a: "hello", b: null })).toBe("a=hello");
    });
    it("ignores emptyStrings", () => {
      expect(stringifyQuery({ a: "hello", b: "" })).toBe("a=hello");
    });
    it("should preserve empty strings if skipEmptyString is passed in", () => {
      let result = stringifyQuery(
        { foo: "", bar: null },
        { skipEmptyString: false }
      );
      expect(result).toBe("foo=");
      result = stringifyQuery({ foo: "", bar: 21 }, { skipEmptyString: false });
      expect(result).toBe("bar=21&foo=");
    });
    it("can handle empty input", () => {
      expect(stringifyQuery({})).toBe("");
    });
    it("stringifies a boolean correctly", () => {
      expect(stringifyQuery({ exists: true })).toBe("exists=true");
    });
    it("stringifies a number correctly", () => {
      expect(stringifyQuery({ files: 23 })).toBe("files=23");
    });
    it("stringifies an array correctly", () => {
      expect(
        stringifyQuery({ statuses: ["passed", "failed", "running"] })
      ).toBe("statuses=passed,failed,running");
    });
    it("stringifies an object containing many fields correctly", () => {
      expect(
        stringifyQuery({
          exists: true,
          files: 23,
          statuses: ["passed", "failed", "running"],
          variant: [1, 3, 5],
        })
      ).toBe(
        "exists=true&files=23&statuses=passed,failed,running&variant=1,3,5"
      );
    });
  });

  describe("parseQueryString", () => {
    it("parses a single query param with a string", () => {
      expect(parseQueryString("status=passed")).toMatchObject({
        status: "passed",
      });
    });
    it("parses multiple query params that are strings", () => {
      expect(
        parseQueryString("status=passed&variant=ubuntu1604")
      ).toMatchObject({
        status: "passed",
        variant: "ubuntu1604",
      });
    });
    it("parses a query param with an array as a value", () => {
      expect(parseQueryString("statuses=failed,passed,ehh")).toMatchObject({
        statuses: ["failed", "passed", "ehh"],
      });
    });
    it("parses a query param with multiple arrays as value", () => {
      expect(
        parseQueryString(
          "statuses=failed,passed,ehh&variants=ubuntu1604,GLADOS"
        )
      ).toMatchObject({
        statuses: ["failed", "passed", "ehh"],
        variants: ["ubuntu1604", "GLADOS"],
      });
    });
    it("parses a query param with a mixed array and a single string as a value", () => {
      expect(
        parseQueryString("status=failed&variants=ubuntu1604,GLADOS")
      ).toMatchObject({
        status: "failed",
        variants: ["ubuntu1604", "GLADOS"],
      });
    });
    it("parses a query param with a boolean as a value", () => {
      expect(parseQueryString("status=true")).toMatchObject({
        status: true,
      });
    });
    it("parses a query param with a number as a value", () => {
      expect(parseQueryString("status=1")).toMatchObject({
        status: 1,
      });
    });
    it("parses a query param with a number array as a value", () => {
      expect(parseQueryString("status=1,2,3")).toMatchObject({
        status: [1, 2, 3],
      });
    });
  });
});
