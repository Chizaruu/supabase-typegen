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

    it("should handle types with precision and scale", () => {
        const sql = `create type measurements as (length numeric(10,2), width decimal(8,3))`;
        const result = parseCompositeType(sql);

        expect(result).toBeTruthy();
        expect(result!.attributes[0].type).toBe("numeric(10,2)");
        expect(result!.attributes[1].type).toBe("decimal(8,3)");
    });

    it("should handle types with spaces", () => {
        const sql = `create type dates as (created timestamp with time zone, modified timestamp without time zone)`;
        const result = parseCompositeType(sql);

        expect(result).toBeTruthy();
        expect(result!.attributes[0].type).toBe("timestamp with time zone");
        expect(result!.attributes[1].type).toBe("timestamp without time zone");
    });

    it("should handle case insensitive CREATE TYPE", () => {
        const sql = `CREATE TYPE person AS (name TEXT, age INTEGER)`;
        const result = parseCompositeType(sql);

        expect(result).toBeTruthy();
        expect(result!.name).toBe("person");
        expect(result!.attributes).toHaveLength(2);
    });

    it("should override schema parameter when schema in SQL", () => {
        const sql = `create type auth.credentials as (token text)`;
        const result = parseCompositeType(sql, "custom_schema");

        expect(result).toBeTruthy();
        expect(result!.schema).toBe("auth");
        expect(result!.name).toBe("credentials");
    });

    it("should handle extra whitespace between elements", () => {
        const sql = `create   type   person   as   (   name   text   ,   age   integer   )`;
        const result = parseCompositeType(sql);

        expect(result).toBeTruthy();
        expect(result!.attributes).toHaveLength(2);
    });

    it("should return null for empty attribute list", () => {
        const sql = `create type empty as ()`;
        const result = parseCompositeType(sql);

        expect(result).toBeNull();
    });

    it("should return null for CREATE TABLE statement", () => {
        const sql = `CREATE TABLE users (id integer, name text)`;
        const result = parseCompositeType(sql);

        expect(result).toBeNull();
    });

    it("should return null for unbalanced parentheses", () => {
        const sql = `create type broken as (field text, value numeric(10,2`;
        const result = parseCompositeType(sql);

        expect(result).toBeNull();
    });

    it("should handle double commas (empty attributes)", () => {
        const sql = `create type test as (field1 text,, field2 integer)`;
        const result = parseCompositeType(sql);

        expect(result).toBeTruthy();
        expect(result!.attributes).toHaveLength(2);
        expect(result!.attributes[0].name).toBe("field1");
        expect(result!.attributes[1].name).toBe("field2");
    });

    it("should handle multiple trailing commas", () => {
        const sql = `create type test as (name text, age integer,,,)`;
        const result = parseCompositeType(sql);

        expect(result).toBeTruthy();
        expect(result!.attributes).toHaveLength(2);
    });
});
