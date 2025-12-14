/**
 * Tests for JSONB parsing and type generation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    parseJsonbColumns,
    parseJsonbBuildObject,
    generateTypeName,
    inferTypeFromValue,
    normalizeTypeDefinition,
    flattenTypes,
} from "../../src/parsers/jsonb.js";

// Use vi.hoisted to create the mock function before hoisting
const { mockReadFileSync } = vi.hoisted(() => ({
    mockReadFileSync: vi.fn(),
}));

// Mock fs module at the top level (hoisted)
vi.mock("fs", () => ({
    readFileSync: mockReadFileSync,
}));

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
        expect(result[0]!.defaultValue).toContain("jsonb_build_object");
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
        expect(result[0]!.column).toBe("preferences");
        expect(result[1]!.column).toBe("metadata");
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

    it("should handle table with schema prefix", () => {
        const sql = `
      create table public.users (
        data jsonb default '{}'::jsonb
      );
    `;
        const result = parseJsonbColumns(sql, "test.sql");

        expect(result).toHaveLength(1);
        expect(result[0]!.table).toBe("users");
    });

    it("should handle quoted identifiers", () => {
        const sql = `
      create table "user_table" (
        "user_data" jsonb default '{}'::jsonb
      );
    `;
        const result = parseJsonbColumns(sql, "test.sql");

        expect(result).toHaveLength(1);
        expect(result[0]!.table).toBe("user_table");
        expect(result[0]!.column).toBe("user_data");
    });

    it("should handle quoted names with special characters", () => {
        const sql = `
      create table "table-with-dashes" (
        "user settings" jsonb default '{}'::jsonb
      );
    `;
        const result = parseJsonbColumns(sql, "test.sql");

        expect(result).toHaveLength(1);
        expect(result[0]!.table).toBe("table-with-dashes");
        expect(result[0]!.column).toBe("user settings");
    });

    it("should handle 'if not exists' clause", () => {
        const sql = `
      create table if not exists users (
        data jsonb default '{}'::jsonb
      );
    `;
        const result = parseJsonbColumns(sql, "test.sql");

        expect(result).toHaveLength(1);
    });

    it("should handle jsonb with NOT NULL constraint", () => {
        const sql = `
      create table users (
        data jsonb not null default '{}'::jsonb
      );
    `;
        const result = parseJsonbColumns(sql, "test.sql");

        expect(result).toHaveLength(1);
        expect(result[0]!.column).toBe("data");
    });

    it("should handle complex jsonb_build_object with nested parentheses", () => {
        const sql = `
      create table users (
        settings jsonb default jsonb_build_object(
          'config', jsonb_build_object('nested', true),
          'other', 'value'
        )
      );
    `;
        const result = parseJsonbColumns(sql, "test.sql");

        expect(result).toHaveLength(1);
        expect(result[0]!.defaultValue).toContain("jsonb_build_object");
    });

    it("should handle jsonb_build_object with strings containing parentheses", () => {
        const sql = `
      create table users (
        data jsonb default jsonb_build_object('expr', '(a + b)', 'val', 10)
      );
    `;
        const result = parseJsonbColumns(sql, "test.sql");

        expect(result).toHaveLength(1);
        expect(result[0]!.defaultValue).toContain("(a + b)");
    });

    it("should not match create table without jsonb columns", () => {
        const sql = `
      create table users (
        id uuid,
        name text
      );
    `;
        const result = parseJsonbColumns(sql, "test.sql");

        expect(result).toHaveLength(0);
    });

    it("should handle invalid SQL gracefully", () => {
        const sql = `create table incomplete (`;
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

    it("should handle malformed input gracefully", () => {
        const sql = `jsonb_build_object('incomplete`;
        const result = parseJsonbBuildObject(sql);

        // Malformed input that doesn't throw returns empty object
        expect(result).toEqual({});
    });

    it("should handle empty jsonb_build_object", () => {
        const sql = `jsonb_build_object()`;
        const result = parseJsonbBuildObject(sql);

        expect(result).toEqual({});
    });

    it("should handle odd number of arguments", () => {
        const sql = `jsonb_build_object('key1', 'value1', 'key2')`;
        const result = parseJsonbBuildObject(sql);

        expect(result).toEqual({ key1: "value1" });
    });

    it("should handle strings with commas", () => {
        const sql = `jsonb_build_object('name', 'Doe, John', 'age', 30)`;
        const result = parseJsonbBuildObject(sql);

        expect(result).toEqual({
            name: "Doe, John",
            age: 30,
        });
    });

    it("should return null when a runtime error occurs during parsing", () => {
        const originalTrim = String.prototype.trim;
        String.prototype.trim = function () {
            throw new Error("Forced error");
        } as any;

        try {
            const result = parseJsonbBuildObject(
                "jsonb_build_object('key', 'value')"
            );
            expect(result).toBeNull();
        } finally {
            String.prototype.trim = originalTrim;
        }
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

    it("should handle unknown types", () => {
        expect(inferTypeFromValue(() => {})).toBe("unknown");
        expect(inferTypeFromValue(Symbol("test"))).toBe("unknown");
        expect(inferTypeFromValue(BigInt(123))).toBe("unknown");
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
        expect(result[0]!.name).toBe("UserData");
    });
});

describe("extractNestedTypes", () => {
    it("should handle primitive types", async () => {
        const { extractNestedTypes } = await import(
            "../../src/parsers/jsonb.js"
        );

        expect(extractNestedTypes("hello", "test", 0, "preserve")).toEqual({
            typeDefinition: "string",
            nestedTypes: [],
        });

        expect(extractNestedTypes(42, "test", 0, "preserve")).toEqual({
            typeDefinition: "number",
            nestedTypes: [],
        });

        expect(extractNestedTypes(true, "test", 0, "preserve")).toEqual({
            typeDefinition: "boolean",
            nestedTypes: [],
        });
    });

    it("should handle null and undefined", async () => {
        const { extractNestedTypes } = await import(
            "../../src/parsers/jsonb.js"
        );

        expect(extractNestedTypes(null, "test", 0, "preserve")).toEqual({
            typeDefinition: "unknown",
            nestedTypes: [],
        });

        expect(extractNestedTypes(undefined, "test", 0, "preserve")).toEqual({
            typeDefinition: "unknown",
            nestedTypes: [],
        });
    });

    it("should handle arrays", async () => {
        const { extractNestedTypes } = await import(
            "../../src/parsers/jsonb.js"
        );

        const emptyResult = extractNestedTypes([], "test", 0, "preserve");
        expect(emptyResult.typeDefinition).toBe("unknown[]");
        expect(emptyResult.nestedTypes).toEqual([]);

        const primitivesResult = extractNestedTypes(
            [1, 2, 3],
            "test",
            0,
            "preserve"
        );
        expect(primitivesResult.typeDefinition).toBe("number[]");
        expect(primitivesResult.nestedTypes).toEqual([]);

        const objectsResult = extractNestedTypes(
            [{ name: "John", age: 30 }],
            "user",
            0,
            "preserve"
        );
        expect(objectsResult.typeDefinition).toContain("name: string");
        expect(objectsResult.typeDefinition).toContain("age: number");
        expect(objectsResult.typeDefinition).toContain("[]");
    });

    it("should extract nested object types", async () => {
        const { extractNestedTypes } = await import(
            "../../src/parsers/jsonb.js"
        );

        const data = {
            profile: {
                name: "John",
                age: 30,
            },
        };

        const result = extractNestedTypes(data, "user_data", 0, "preserve");

        expect(result.typeDefinition).toContain("profile: user_data_profile");
        expect(result.nestedTypes).toHaveLength(1);
        expect(result.nestedTypes![0].name).toBe("user_data_profile");
        expect(result.nestedTypes![0].typeDefinition).toContain("name: string");
        expect(result.nestedTypes![0].typeDefinition).toContain("age: number");
    });

    it("should apply naming conventions", async () => {
        const { extractNestedTypes } = await import(
            "../../src/parsers/jsonb.js"
        );

        const data = {
            user_profile: {
                full_name: "John",
            },
        };

        const result = extractNestedTypes(data, "user_data", 0, "PascalCase");

        expect(result.nestedTypes![0].name).toBe("UserDataUserProfile");
    });

    it("should handle deeply nested structures", async () => {
        const { extractNestedTypes } = await import(
            "../../src/parsers/jsonb.js"
        );

        const data = {
            level1: {
                level2: {
                    level3: "value",
                },
            },
        };

        const result = extractNestedTypes(data, "root", 0, "preserve");

        expect(result.nestedTypes).toHaveLength(1);
        expect(result.nestedTypes![0].name).toBe("root_level1");
        expect(result.nestedTypes![0].nestedTypes).toHaveLength(1);
        expect(result.nestedTypes![0]!.nestedTypes![0]!.name).toBe(
            "root_level1_level2"
        );
    });

    it("should handle mixed primitive and object fields", async () => {
        const { extractNestedTypes } = await import(
            "../../src/parsers/jsonb.js"
        );

        const data = {
            name: "John",
            age: 30,
            address: {
                city: "NYC",
                zip: 10001,
            },
        };

        const result = extractNestedTypes(data, "user", 0, "preserve");

        expect(result.typeDefinition).toContain("name: string");
        expect(result.typeDefinition).toContain("age: number");
        expect(result.typeDefinition).toContain("address: user_address");
        expect(result.nestedTypes).toHaveLength(1);
    });

    it("should handle function type as unknown", async () => {
        const { extractNestedTypes } = await import(
            "../../src/parsers/jsonb.js"
        );

        const func = () => {};
        const result = extractNestedTypes(func, "test", 0, "preserve");

        expect(result.typeDefinition).toBe("unknown");
        expect(result.nestedTypes).toEqual([]);
    });

    it("should handle symbol type as unknown", async () => {
        const { extractNestedTypes } = await import(
            "../../src/parsers/jsonb.js"
        );

        const sym = Symbol("test");
        const result = extractNestedTypes(sym, "test", 0, "preserve");

        expect(result.typeDefinition).toBe("unknown");
        expect(result.nestedTypes).toEqual([]);
    });

    it("should handle BigInt as unknown", async () => {
        const { extractNestedTypes } = await import(
            "../../src/parsers/jsonb.js"
        );

        const bigint = BigInt(999);
        const result = extractNestedTypes(bigint, "test", 0, "preserve");

        expect(result.typeDefinition).toBe("unknown");
        expect(result.nestedTypes).toEqual([]);
    });
});

describe("generateTypeDefinition", () => {
    it("should generate Record<string, unknown> for column without default", async () => {
        const { generateTypeDefinition } = await import(
            "../../src/parsers/jsonb.js"
        );

        const column = {
            table: "users",
            column: "data",
            fileName: "test.sql",
            defaultValue: null,
        };

        const result = generateTypeDefinition(column, false, "preserve");

        expect(result.name).toBe("users_data");
        expect(result.typeDefinition).toBe("Record<string, unknown>");
        expect(result.nestedTypes).toEqual([]);
    });

    it("should generate type from jsonb_build_object", async () => {
        const { generateTypeDefinition } = await import(
            "../../src/parsers/jsonb.js"
        );

        const column = {
            table: "users",
            column: "settings",
            defaultValue: "jsonb_build_object('theme', 'dark', 'lang', 'en')",
            fileName: "test.sql",
        };

        const result = generateTypeDefinition(column, false, "preserve");

        expect(result.name).toBe("users_settings");
        expect(result.typeDefinition).toContain("theme: string");
        expect(result.typeDefinition).toContain("lang: string");
        expect(result.example).toEqual({ theme: "dark", lang: "en" });
    });

    it("should generate type from JSON string default", async () => {
        const { generateTypeDefinition } = await import(
            "../../src/parsers/jsonb.js"
        );

        const column = {
            table: "users",
            column: "preferences",
            defaultValue: "'{\"notifications\": true}'::jsonb",
            fileName: "test.sql",
        };

        const result = generateTypeDefinition(column, false, "preserve");

        expect(result.typeDefinition).toContain("notifications: boolean");
        expect(result.example).toEqual({ notifications: true });
    });

    it("should extract nested types when enabled", async () => {
        const { generateTypeDefinition } = await import(
            "../../src/parsers/jsonb.js"
        );

        const column = {
            table: "users",
            column: "data",
            defaultValue:
                "jsonb_build_object('user', jsonb_build_object('name', 'John'))",
            fileName: "test.sql",
        };

        const result = generateTypeDefinition(column, true, "preserve");

        expect(result.nestedTypes!.length).toBeGreaterThan(0);
        expect(result.typeDefinition).toContain("user:");
    });

    it("should handle invalid JSON gracefully", async () => {
        const { generateTypeDefinition } = await import(
            "../../src/parsers/jsonb.js"
        );

        const column = {
            table: "users",
            column: "data",
            defaultValue: "'{invalid json}'::jsonb",
            fileName: "test.sql",
        };

        const result = generateTypeDefinition(column, false, "preserve");

        expect(result.typeDefinition).toBe("Record<string, unknown>");
    });

    it("should preserve comments", async () => {
        const { generateTypeDefinition } = await import(
            "../../src/parsers/jsonb.js"
        );

        const column = {
            table: "users",
            column: "data",
            defaultValue: "'{}'::jsonb",
            comment: "User preferences",
            fileName: "test.sql",
        };

        const result = generateTypeDefinition(column, false, "preserve");

        expect(result.comment).toBe("User preferences");
    });

    it("should apply naming conventions", async () => {
        const { generateTypeDefinition } = await import(
            "../../src/parsers/jsonb.js"
        );

        const column = {
            table: "user_accounts",
            column: "user_settings",
            defaultValue: "'{}'::jsonb",
            fileName: "test.sql",
        };

        expect(generateTypeDefinition(column, false, "PascalCase").name).toBe(
            "UserAccountsUserSettings"
        );

        expect(generateTypeDefinition(column, false, "camelCase").name).toBe(
            "userAccountsUserSettings"
        );
    });
});

describe("scanSchemas", () => {
    beforeEach(() => {
        mockReadFileSync.mockClear();
    });

    it("should scan files and generate type definitions", async () => {
        mockReadFileSync.mockReturnValue(`
            create table users (
                preferences jsonb default '{"theme": "dark"}'::jsonb
            );
        `);

        const { scanSchemas } = await import("../../src/parsers/jsonb.js");
        const result = scanSchemas(["/path/to/schema.sql"], false, "preserve");

        expect(result).toHaveLength(1);
        expect(result[0]!.table).toBe("users");
        expect(result[0]!.column).toBe("preferences");
    });

    it("should handle multiple schema files", async () => {
        mockReadFileSync.mockReturnValueOnce(`
                create table users (
                    preferences jsonb default '{"theme": "dark"}'::jsonb
                );
            `).mockReturnValueOnce(`
                create table posts (
                    meta jsonb default '{}'::jsonb
                );
            `);

        const { scanSchemas } = await import("../../src/parsers/jsonb.js");
        const result = scanSchemas(
            ["/path/to/schema1.sql", "/path/to/schema2.sql"],
            false,
            "preserve"
        );

        expect(result).toHaveLength(2);
        expect(result.map((r) => r.table)).toContain("users");
        expect(result.map((r) => r.table)).toContain("posts");
    });

    it("should ignore files that cannot be read", async () => {
        mockReadFileSync.mockImplementationOnce(() => {
            throw new Error("File not found");
        }).mockReturnValueOnce(`
                create table posts (
                    meta jsonb default '{}'::jsonb
                );
            `);

        const { scanSchemas } = await import("../../src/parsers/jsonb.js");
        const result = scanSchemas(
            ["/bad/path.sql", "/good/path.sql"],
            false,
            "preserve"
        );

        expect(result).toHaveLength(1);
        expect(result[0]!.table).toBe("posts");
    });

    it("should return empty array when no JSONB columns found", async () => {
        mockReadFileSync.mockReturnValue(`
            create table users (
                id uuid primary key
            );
        `);

        const { scanSchemas } = await import("../../src/parsers/jsonb.js");
        const result = scanSchemas(["/path/to/schema.sql"], false, "preserve");

        expect(result).toEqual([]);
    });

    it("should extract nested types when flag is true", async () => {
        mockReadFileSync.mockReturnValue(`
            create table users (
                data jsonb default '{"user": {"name": "test"}}'::jsonb
            );
        `);

        const { scanSchemas } = await import("../../src/parsers/jsonb.js");
        const result = scanSchemas(["/path/to/schema.sql"], true, "preserve");

        expect(result).toHaveLength(1);
        expect(result[0]!.nestedTypes!.length).toBeGreaterThan(0);
    });

    it("should apply naming convention", async () => {
        mockReadFileSync.mockReturnValue(`
            create table user_accounts (
                user_data jsonb default '{}'::jsonb
            );
        `);

        const { scanSchemas } = await import("../../src/parsers/jsonb.js");
        const result = scanSchemas(
            ["/path/to/schema.sql"],
            false,
            "PascalCase"
        );

        expect(result[0]!.name).toBe("UserAccountsUserData");
    });

    it("should handle file path ending with slash (fileName fallback)", async () => {
        mockReadFileSync.mockReturnValue(`
            create table users (
                preferences jsonb default '{}'::jsonb
            );
        `);

        const { scanSchemas } = await import("../../src/parsers/jsonb.js");
        const result = scanSchemas(["/path/to/"], false, "preserve");

        // When path ends with /, .pop() returns "", so fallback to schemaPath is used
        expect(result).toHaveLength(1);
        expect(result[0]!.table).toBe("users");
    });
});
