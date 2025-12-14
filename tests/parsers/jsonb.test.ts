/**
 * Tests for JSONB parsing and type generation
 */

import { describe, it, expect } from "vitest";
import {
    parseJsonbColumns,
    parseJsonbBuildObject,
    generateTypeName,
    inferTypeFromValue,
    normalizeTypeDefinition,
    flattenTypes,
} from "../../src/parsers/jsonb.ts";

describe("parseJsonbColumns", () => {
    it("should parse JSONB column with default value", () => {
        const sql = `
      create table users (
        id uuid primary key,
        preferences jsonb default '{}'::jsonb
      );
    `;
        const result = parseJsonbColumns(sql, "test.sql");

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            table: "users",
            column: "preferences",
            defaultValue: "'{}'::jsonb",
        });
    });

    it("should parse JSONB with jsonb_build_object", () => {
        const sql = `
      create table users (
        id uuid,
        settings jsonb default jsonb_build_object('theme', 'dark', 'lang', 'en')
      );
    `;
        const result = parseJsonbColumns(sql, "test.sql");

        expect(result).toHaveLength(1);
        expect(result[0].defaultValue).toContain("jsonb_build_object");
    });

    it("should parse multiple JSONB columns", () => {
        const sql = `
      create table config (
        preferences jsonb default '{}'::jsonb,
        metadata jsonb default '{}'::jsonb
      );
    `;
        const result = parseJsonbColumns(sql, "test.sql");

        expect(result).toHaveLength(2);
        expect(result[0].column).toBe("preferences");
        expect(result[1].column).toBe("metadata");
    });

    it("should handle JSONB without default", () => {
        const sql = `
      create table users (
        data jsonb
      );
    `;
        const result = parseJsonbColumns(sql, "test.sql");

        expect(result).toHaveLength(0);
    });
});

describe("parseJsonbBuildObject", () => {
    it("should parse simple jsonb_build_object", () => {
        const sql = `jsonb_build_object('name', 'John', 'age', 30)`;
        const result = parseJsonbBuildObject(sql);

        expect(result).toEqual({
            name: "John",
            age: 30,
        });
    });

    it("should parse boolean values", () => {
        const sql = `jsonb_build_object('enabled', true, 'verified', false)`;
        const result = parseJsonbBuildObject(sql);

        expect(result).toEqual({
            enabled: true,
            verified: false,
        });
    });

    it("should parse nested objects", () => {
        const sql = `jsonb_build_object('user', jsonb_build_object('name', 'John', 'age', 30))`;
        const result = parseJsonbBuildObject(sql);

        expect(result).toEqual({
            user: {
                name: "John",
                age: 30,
            },
        });
    });

    it("should handle mixed types", () => {
        const sql = `jsonb_build_object('name', 'John', 'age', 30, 'active', true)`;
        const result = parseJsonbBuildObject(sql);

        expect(result).toEqual({
            name: "John",
            age: 30,
            active: true,
        });
    });
});

describe("generateTypeName", () => {
    it("should generate type name from table and column", () => {
        const result = generateTypeName("users", "preferences", "preserve");
        expect(result).toBe("users_preferences");
    });

    it("should apply naming convention", () => {
        expect(generateTypeName("users", "preferences", "PascalCase")).toBe(
            "UsersPreferences"
        );
        expect(generateTypeName("users", "preferences", "camelCase")).toBe(
            "usersPreferences"
        );
        expect(
            generateTypeName("users", "preferences", "SCREAMING_SNAKE_CASE")
        ).toBe("USERS_PREFERENCES");
    });
});

describe("inferTypeFromValue", () => {
    it("should infer string type", () => {
        expect(inferTypeFromValue("hello")).toBe("string");
    });

    it("should infer number type", () => {
        expect(inferTypeFromValue(42)).toBe("number");
    });

    it("should infer boolean type", () => {
        expect(inferTypeFromValue(true)).toBe("boolean");
    });

    it("should infer array type", () => {
        expect(inferTypeFromValue([1, 2, 3])).toBe("number[]");
        expect(inferTypeFromValue(["a", "b"])).toBe("string[]");
    });

    it("should infer object type", () => {
        const result = inferTypeFromValue({ name: "John", age: 30 });
        expect(result).toContain("name: string");
        expect(result).toContain("age: number");
    });

    it("should handle null and undefined", () => {
        expect(inferTypeFromValue(null)).toBe("unknown");
        expect(inferTypeFromValue(undefined)).toBe("unknown");
    });

    it("should handle empty array", () => {
        expect(inferTypeFromValue([])).toBe("unknown[]");
    });

    it("should handle nested objects", () => {
        const result = inferTypeFromValue({
            user: {
                name: "John",
                age: 30,
            },
        });
        expect(result).toContain("user:");
        expect(result).toContain("name: string");
        expect(result).toContain("age: number");
    });
});

describe("normalizeTypeDefinition", () => {
    it("should normalize whitespace", () => {
        const input = `{
      name:  string
      age:   number
    }`;
        const result = normalizeTypeDefinition(input);
        expect(result).toBe("{name:string age:number}");
    });

    it("should normalize braces and colons", () => {
        const input = "{ name : string , age : number }";
        const result = normalizeTypeDefinition(input);
        expect(result).toBe("{name:string,age:number}");
    });

    it("should handle complex nested types", () => {
        const input = `{
      user: {
        name: string
        age: number
      }
    }`;
        const normalized = normalizeTypeDefinition(input);
        expect(normalized).not.toContain("\n");
        expect(normalized).not.toContain("  ");
    });
});

describe("flattenTypes", () => {
    it("should flatten nested types", () => {
        const types = [
            {
                table: "users",
                column: "data",
                name: "UserData",
                typeDefinition: "{ profile: UserProfile }",
                nestedTypes: [
                    {
                        table: "",
                        column: "",
                        name: "UserProfile",
                        typeDefinition: "{ name: string }",
                        nestedTypes: [],
                    },
                ],
            },
        ];

        const result = flattenTypes(types);
        expect(result).toHaveLength(2);
        expect(result.map((t) => t.name)).toContain("UserProfile");
        expect(result.map((t) => t.name)).toContain("UserData");
    });

    it("should handle deeply nested types", () => {
        const types = [
            {
                table: "users",
                column: "data",
                name: "UserData",
                typeDefinition: "{}",
                nestedTypes: [
                    {
                        table: "",
                        column: "",
                        name: "Level1",
                        typeDefinition: "{}",
                        nestedTypes: [
                            {
                                table: "",
                                column: "",
                                name: "Level2",
                                typeDefinition: "{}",
                                nestedTypes: [],
                            },
                        ],
                    },
                ],
            },
        ];

        const result = flattenTypes(types);
        expect(result).toHaveLength(3);
        expect(result.map((t) => t.name)).toEqual([
            "Level2",
            "Level1",
            "UserData",
        ]);
    });

    it("should handle types without nested types", () => {
        const types = [
            {
                table: "users",
                column: "data",
                name: "UserData",
                typeDefinition: "{ name: string }",
                nestedTypes: [],
            },
        ];

        const result = flattenTypes(types);
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("UserData");
    });
});
