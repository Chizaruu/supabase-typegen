/**
 * Tests for enum definition parser
 */

import { describe, it, expect } from "vitest";
import { parseEnumDefinition } from "../../../src/parsers/sql/enum.ts";

describe("parseEnumDefinition", () => {
    it("should parse basic enum", () => {
        const sql = `create type user_role as enum ('admin', 'user', 'guest')`;
        const result = parseEnumDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.name).toBe("user_role");
        expect(result!.schema).toBe("public");
        expect(result!.values).toEqual(["admin", "user", "guest"]);
    });

    it("should parse enum with schema", () => {
        const sql = `create type auth.role as enum ('admin', 'user')`;
        const result = parseEnumDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.schema).toBe("auth");
        expect(result!.name).toBe("role");
    });

    it("should parse quoted enum name", () => {
        const sql = `create type "user_role" as enum ('admin', 'user')`;
        const result = parseEnumDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.name).toBe("user_role");
    });

    it("should handle standard quoted identifiers", () => {
        // Note: Hyphenated identifiers like "user-role" may not be supported
        // Use underscores instead: "user_role"
        const sql = `create type "UserRole" as enum ('admin', 'user')`;
        const result = parseEnumDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.name).toBe("UserRole");
    });

    it("should parse enum with double quotes", () => {
        const sql = `create type status as enum ("active", "inactive", "pending")`;
        const result = parseEnumDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.values).toEqual(["active", "inactive", "pending"]);
    });

    it("should handle multi-line enum", () => {
        const sql = `
      create type status as enum (
        'active',
        'inactive',
        'pending'
      )
    `;
        const result = parseEnumDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.values).toEqual(["active", "inactive", "pending"]);
    });

    it("should handle values with spaces", () => {
        const sql = `create type priority as enum ('very high', 'high', 'medium', 'low')`;
        const result = parseEnumDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.values).toEqual(["very high", "high", "medium", "low"]);
    });

    it("should return null for non-enum type", () => {
        const sql = `create type address as (street text, city text)`;
        const result = parseEnumDefinition(sql);

        expect(result).toBeNull();
    });

    it("should return null for invalid SQL", () => {
        const sql = `not a valid enum definition`;
        const result = parseEnumDefinition(sql);

        expect(result).toBeNull();
    });

    it("should handle single value enum", () => {
        const sql = `create type singleton as enum ('only')`;
        const result = parseEnumDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.values).toEqual(["only"]);
    });

    it("should handle empty enum (returns null)", () => {
        const sql = `create type empty as enum ()`;
        const result = parseEnumDefinition(sql);

        expect(result).toBeNull();
    });
});
