/**
 * Tests for composite type parser
 */

import { describe, it, expect } from "vitest";
import { parseCompositeType } from "../../../src/parsers/sql/composite.ts";

describe("parseCompositeType", () => {
    it("should parse basic composite type", () => {
        const sql = `create type address as (street text, city text, zip_code text)`;
        const result = parseCompositeType(sql);

        expect(result).toBeTruthy();
        expect(result!.name).toBe("address");
        expect(result!.schema).toBe("public");
        expect(result!.attributes).toHaveLength(3);
    });

    it("should parse composite type with schema", () => {
        const sql = `create type auth.credentials as (username text, password text)`;
        const result = parseCompositeType(sql);

        expect(result).toBeTruthy();
        expect(result!.schema).toBe("auth");
        expect(result!.name).toBe("credentials");
    });

    it("should parse attribute types correctly", () => {
        const sql = `create type person as (name text, age integer, active boolean)`;
        const result = parseCompositeType(sql);

        expect(result!.attributes[0]).toEqual({ name: "name", type: "text" });
        expect(result!.attributes[1]).toEqual({ name: "age", type: "integer" });
        expect(result!.attributes[2]).toEqual({
            name: "active",
            type: "boolean",
        });
    });

    it("should handle multi-line composite type", () => {
        const sql = `
      create type contact as (
        email text,
        phone text,
        address text
      )
    `;
        const result = parseCompositeType(sql);

        expect(result).toBeTruthy();
        expect(result!.attributes).toHaveLength(3);
    });

    it("should parse types with basic type names", () => {
        const sql = `create type limited as (code varchar, value numeric)`;
        const result = parseCompositeType(sql);

        expect(result!.attributes[0].type).toBe("varchar");
        expect(result!.attributes[1].type).toBe("numeric");
    });

    it("should parse quoted type name", () => {
        const sql = `create type "CustomType" as (field text)`;
        const result = parseCompositeType(sql);

        expect(result).toBeTruthy();
        expect(result!.name).toBe("CustomType");
    });

    it("should parse quoted attribute names", () => {
        const sql = `create type test as ("first-name" text, "last-name" text)`;
        const result = parseCompositeType(sql);

        expect(result).toBeTruthy();
        expect(result!.attributes).toHaveLength(2);
    });

    it("should handle array types in attributes", () => {
        const sql = `create type collection as (tags text[], values integer[])`;
        const result = parseCompositeType(sql);

        expect(result!.attributes[0].type).toBe("text[]");
        expect(result!.attributes[1].type).toBe("integer[]");
    });

    it("should return null for enum type", () => {
        const sql = `create type status as enum ('active', 'inactive')`;
        const result = parseCompositeType(sql);

        expect(result).toBeNull();
    });

    it("should return null for invalid SQL", () => {
        const sql = "not a type definition";
        const result = parseCompositeType(sql);

        expect(result).toBeNull();
    });

    it("should handle timestamp types", () => {
        const sql = `create type audit as (created_at timestamp, updated_at timestamptz)`;
        const result = parseCompositeType(sql);

        expect(result!.attributes[0].type).toBe("timestamp");
        expect(result!.attributes[1].type).toBe("timestamptz");
    });

    it("should handle single attribute composite", () => {
        const sql = `create type wrapper as (value text)`;
        const result = parseCompositeType(sql);

        expect(result).toBeTruthy();
        expect(result!.attributes).toHaveLength(1);
    });
});
