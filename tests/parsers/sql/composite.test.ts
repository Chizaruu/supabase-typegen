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

    // Additional test cases

    it("should handle types with precision and scale", () => {
        const sql = `create type measurements as (length numeric(10,2), width decimal(8,3))`;
        const result = parseCompositeType(sql);

        expect(result).toBeTruthy();
        expect(result!.attributes[0].type).toBe("numeric(10,2)");
        expect(result!.attributes[1].type).toBe("decimal(8,3)");
    });

    it("should handle varchar with length", () => {
        const sql = `create type strings as (code varchar(50), name varchar(255))`;
        const result = parseCompositeType(sql);

        expect(result!.attributes[0].type).toBe("varchar(50)");
        expect(result!.attributes[1].type).toBe("varchar(255)");
    });

    it("should handle character varying type", () => {
        const sql = `create type data as (field character varying(100))`;
        const result = parseCompositeType(sql);

        expect(result).toBeTruthy();
        expect(result!.attributes[0].type).toBe("character varying(100)");
    });

    it("should handle types with spaces", () => {
        const sql = `create type dates as (created timestamp with time zone, modified timestamp without time zone)`;
        const result = parseCompositeType(sql);

        expect(result).toBeTruthy();
        expect(result!.attributes[0].type).toBe("timestamp with time zone");
        expect(result!.attributes[1].type).toBe("timestamp without time zone");
    });

    it("should handle double precision type", () => {
        const sql = `create type numbers as (value double precision, rate real)`;
        const result = parseCompositeType(sql);

        expect(result!.attributes[0].type).toBe("double precision");
        expect(result!.attributes[1].type).toBe("real");
    });

    it("should handle case insensitive CREATE TYPE", () => {
        const sql = `CREATE TYPE person AS (name TEXT, age INTEGER)`;
        const result = parseCompositeType(sql);

        expect(result).toBeTruthy();
        expect(result!.name).toBe("person");
        expect(result!.attributes).toHaveLength(2);
    });

    it("should handle mixed case in type definition", () => {
        const sql = `CrEaTe TyPe mixed As (Field TeXt)`;
        const result = parseCompositeType(sql);

        expect(result).toBeTruthy();
        expect(result!.name).toBe("mixed");
    });

    it("should use custom schema parameter when no schema in SQL", () => {
        const sql = `create type user_data as (id integer, name text)`;
        const result = parseCompositeType(sql, "custom_schema");

        expect(result).toBeTruthy();
        expect(result!.schema).toBe("custom_schema");
        expect(result!.name).toBe("user_data");
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

    it("should handle trailing comma in attributes", () => {
        const sql = `create type data as (field1 text, field2 integer,)`;
        const result = parseCompositeType(sql);

        expect(result).toBeTruthy();
        // Should have 2 attributes, ignoring the trailing comma
        expect(result!.attributes).toHaveLength(2);
    });

    it("should handle UUID type", () => {
        const sql = `create type identifiers as (id uuid, external_id uuid)`;
        const result = parseCompositeType(sql);

        expect(result!.attributes[0].type).toBe("uuid");
        expect(result!.attributes[1].type).toBe("uuid");
    });

    it("should handle JSON and JSONB types", () => {
        const sql = `create type json_data as (metadata json, settings jsonb)`;
        const result = parseCompositeType(sql);

        expect(result!.attributes[0].type).toBe("json");
        expect(result!.attributes[1].type).toBe("jsonb");
    });

    it("should handle bytea type", () => {
        const sql = `create type binary as (data bytea, signature bytea)`;
        const result = parseCompositeType(sql);

        expect(result!.attributes[0].type).toBe("bytea");
        expect(result!.attributes[1].type).toBe("bytea");
    });

    it("should handle interval type", () => {
        const sql = `create type durations as (elapsed interval, timeout interval)`;
        const result = parseCompositeType(sql);

        expect(result!.attributes[0].type).toBe("interval");
        expect(result!.attributes[1].type).toBe("interval");
    });

    it("should handle money type", () => {
        const sql = `create type financial as (price money, cost money)`;
        const result = parseCompositeType(sql);

        expect(result!.attributes[0].type).toBe("money");
        expect(result!.attributes[1].type).toBe("money");
    });

    it("should handle bit varying type", () => {
        const sql = `create type bits as (flags bit(8), mask bit varying(16))`;
        const result = parseCompositeType(sql);

        expect(result).toBeTruthy();
        expect(result!.attributes[0].type).toBe("bit(8)");
        expect(result!.attributes[1].type).toBe("bit varying(16)");
    });

    it("should handle multidimensional arrays", () => {
        const sql = `create type arrays as (matrix integer[][], data text[][])`;
        const result = parseCompositeType(sql);

        expect(result!.attributes[0].type).toBe("integer[][]");
        expect(result!.attributes[1].type).toBe("text[][]");
    });

    it("should handle quoted schema name", () => {
        const sql = `create type "my-schema"."my-type" as (field text)`;
        const result = parseCompositeType(sql);

        expect(result).toBeTruthy();
    });

    it("should return null for empty attribute list", () => {
        const sql = `create type empty as ()`;
        const result = parseCompositeType(sql);

        expect(result).toBeNull();
    });

    it("should handle composite type with newlines and tabs", () => {
        const sql = `create type indented as (
\t\tfield1\ttext,
\t\tfield2\tinteger
\t)`;
        const result = parseCompositeType(sql);

        expect(result).toBeTruthy();
        expect(result!.attributes).toHaveLength(2);
    });

    it("should handle composite type referencing another composite type", () => {
        const sql = `create type nested as (location address, contact contact_info)`;
        const result = parseCompositeType(sql);

        expect(result).toBeTruthy();
        expect(result!.attributes[0].type).toBe("address");
        expect(result!.attributes[1].type).toBe("contact_info");
    });

    it("should handle serial and bigserial types", () => {
        const sql = `create type sequences as (id serial, big_id bigserial)`;
        const result = parseCompositeType(sql);

        expect(result!.attributes[0].type).toBe("serial");
        expect(result!.attributes[1].type).toBe("bigserial");
    });

    it("should handle smallint and bigint types", () => {
        const sql = `create type integers as (small smallint, big bigint)`;
        const result = parseCompositeType(sql);

        expect(result!.attributes[0].type).toBe("smallint");
        expect(result!.attributes[1].type).toBe("bigint");
    });

    it("should return null for CREATE DOMAIN statement", () => {
        const sql = `CREATE DOMAIN email_address AS VARCHAR(255) CHECK (VALUE ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}$')`;
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

    it("should return null for missing closing parenthesis", () => {
        const sql = `create type incomplete as (name text, age integer`;
        const result = parseCompositeType(sql);

        expect(result).toBeNull();
    });

    it("should return null for extra closing parenthesis", () => {
        const sql = `create type extra as (field text))`;
        const result = parseCompositeType(sql);

        expect(result).toBeTruthy();
        expect(result!.attributes).toHaveLength(1);
    });

    it("should handle double commas (empty attributes)", () => {
        const sql = `create type test as (field1 text,, field2 integer)`;
        const result = parseCompositeType(sql);

        expect(result).toBeTruthy();
        // Should skip the empty entry and only have 2 attributes
        expect(result!.attributes).toHaveLength(2);
        expect(result!.attributes[0].name).toBe("field1");
        expect(result!.attributes[1].name).toBe("field2");
    });

    it("should handle trailing comma with whitespace", () => {
        const sql = `create type data as (field text,   )`;
        const result = parseCompositeType(sql);

        expect(result).toBeTruthy();
        expect(result!.attributes).toHaveLength(1);
        expect(result!.attributes[0].name).toBe("field");
    });

    it("should handle multiple trailing commas", () => {
        const sql = `create type test as (name text, age integer,,,)`;
        const result = parseCompositeType(sql);

        expect(result).toBeTruthy();
        expect(result!.attributes).toHaveLength(2);
    });

    it("should handle whitespace-only lines between commas", () => {
        const sql = `create type test as (
            field1 text,
            
            ,
            field2 integer
        )`;
        const result = parseCompositeType(sql);

        expect(result).toBeTruthy();
        expect(result!.attributes).toHaveLength(2);
    });
});
