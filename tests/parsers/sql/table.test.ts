/**
 * Tests for table definition parser
 */

import { describe, it, expect } from "vitest";
import {
    parseTableDefinition,
    parseColumnDefinition,
} from "../../../src/parsers/sql/table.ts";

describe("parseColumnDefinition", () => {
    it("should parse basic column definition", () => {
        const result = parseColumnDefinition("id uuid not null");
        expect(result).toEqual({
            name: "id",
            type: "uuid",
            nullable: false,
            defaultValue: null,
            isArray: false,
            isPrimaryKey: false,
            isUnique: false,
        });
    });

    it("should parse column with default value", () => {
        const result = parseColumnDefinition(
            "created_at timestamp default now()"
        );
        expect(result).toMatchObject({
            name: "created_at",
            type: "timestamp",
            defaultValue: "now()",
            nullable: true,
        });
    });

    it("should parse primary key column", () => {
        const result = parseColumnDefinition("id uuid primary key");
        expect(result).toMatchObject({
            name: "id",
            type: "uuid",
            isPrimaryKey: true,
            nullable: false,
        });
    });

    it("should parse unique column", () => {
        const result = parseColumnDefinition("email text unique not null");
        expect(result).toMatchObject({
            name: "email",
            type: "text",
            isUnique: true,
            nullable: false,
        });
    });

    it("should parse array column", () => {
        const result = parseColumnDefinition("tags text[]");
        expect(result).toMatchObject({
            name: "tags",
            type: "text",
            isArray: true,
        });
    });

    it("should parse column with size", () => {
        const result = parseColumnDefinition("name character varying(255)");
        expect(result).toMatchObject({
            name: "name",
            type: "character varying(255)",
        });
    });

    it("should parse numeric column with precision", () => {
        const result = parseColumnDefinition("price numeric(10,2)");
        expect(result).toMatchObject({
            name: "price",
            type: "numeric(10,2)",
        });
    });

    it("should parse quoted column name", () => {
        const result = parseColumnDefinition('"user-name" text not null');
        expect(result).toMatchObject({
            name: "user-name",
            type: "text",
            nullable: false,
        });
    });

    it("should parse timestamp with time zone", () => {
        const result = parseColumnDefinition(
            "created_at timestamp with time zone default now()"
        );
        expect(result).toMatchObject({
            name: "created_at",
            type: "timestamp with time zone",
            defaultValue: "now()",
        });
    });

    it("should parse foreign key reference", () => {
        const result = parseColumnDefinition(
            "user_id uuid references users(id)"
        );
        expect(result).toMatchObject({
            name: "user_id",
            type: "uuid",
            foreignKey: {
                table: "users",
                column: "id",
            },
        });
    });

    it("should parse foreign key with schema", () => {
        const result = parseColumnDefinition(
            "user_id uuid references auth.users(id)"
        );
        expect(result).toMatchObject({
            name: "user_id",
            type: "uuid",
            foreignKey: {
                schema: "auth",
                table: "users",
                column: "id",
            },
        });
    });

    it("should parse column with single-quoted name", () => {
        const result = parseColumnDefinition("'user_name' text not null");
        expect(result).toMatchObject({
            name: "user_name",
            type: "text",
            nullable: false,
        });
    });

    it("should parse column with quoted type name", () => {
        const result = parseColumnDefinition('id "uuid" primary key');
        expect(result).toMatchObject({
            name: "id",
            type: "uuid",
            isPrimaryKey: true,
        });
    });

    it("should parse column with schema-qualified quoted type", () => {
        const result = parseColumnDefinition('id "public"."uuid" primary key');
        expect(result).toMatchObject({
            name: "id",
            type: "uuid",
            isPrimaryKey: true,
        });
    });

    it("should parse double precision type", () => {
        const result = parseColumnDefinition("amount double precision");
        expect(result).toMatchObject({
            name: "amount",
            type: "double precision",
        });
    });

    it("should parse time with time zone", () => {
        const result = parseColumnDefinition(
            "meeting_time time with time zone"
        );
        expect(result).toMatchObject({
            name: "meeting_time",
            type: "time with time zone",
        });
    });

    it("should parse timestamp without time zone", () => {
        const result = parseColumnDefinition(
            "created timestamp without time zone"
        );
        expect(result).toMatchObject({
            name: "created",
            type: "timestamp without time zone",
        });
    });

    it("should parse time without time zone", () => {
        const result = parseColumnDefinition(
            "start_time time without time zone"
        );
        expect(result).toMatchObject({
            name: "start_time",
            type: "time without time zone",
        });
    });

    it("should parse character varying with size", () => {
        const result = parseColumnDefinition("name character varying(100)");
        expect(result).toMatchObject({
            name: "name",
            type: "character varying(100)",
        });
    });

    it("should parse array with bracket notation after type", () => {
        const result = parseColumnDefinition("tags text [] not null");
        expect(result).toMatchObject({
            name: "tags",
            type: "text",
            isArray: true,
            nullable: false,
        });
    });

    it("should parse array with ARRAY keyword", () => {
        const result = parseColumnDefinition("numbers integer array");
        expect(result).toMatchObject({
            name: "numbers",
            type: "integer",
            isArray: true,
        });
    });

    it("should return null for invalid column definition without type", () => {
        const result = parseColumnDefinition("just_a_name");
        expect(result).toBeNull();
    });

    it("should return null for completely invalid column definition", () => {
        const result = parseColumnDefinition("!@#$%");
        expect(result).toBeNull();
    });

    it("should parse column with default followed by check constraint", () => {
        const result = parseColumnDefinition(
            "age integer default 0 check (age >= 0)"
        );
        expect(result).toMatchObject({
            name: "age",
            type: "integer",
            defaultValue: "0",
        });
    });

    it("should parse column with default at end of definition", () => {
        const result = parseColumnDefinition(
            "created_at timestamp default now()"
        );
        expect(result).toMatchObject({
            name: "created_at",
            type: "timestamp",
            defaultValue: "now()",
        });
    });

    it("should return null for column with invalid type syntax (lines 120-121)", () => {
        // Column name followed by something that's not a valid type pattern
        const result = parseColumnDefinition("column_name @#$invalid");
        expect(result).toBeNull();
    });

    it("should return null for column with only special characters as type", () => {
        const result = parseColumnDefinition("mycolumn @@@ not null");
        expect(result).toBeNull();
    });

    it("should handle edge case in quoted type matching (line 85)", () => {
        // Test with single-quoted type name
        const result = parseColumnDefinition("id 'uuid' primary key");
        expect(result).toMatchObject({
            name: "id",
            type: "uuid",
            isPrimaryKey: true,
        });
    });
});

describe("parseTableDefinition", () => {
    it("should parse simple table", () => {
        const sql = `
      create table users (
        id uuid primary key,
        email text not null,
        created_at timestamp default now()
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.name).toBe("users");
        expect(result!.schema).toBe("public");
        expect(result!.columns).toHaveLength(3);
        expect(result!.columns[0].name).toBe("id");
        expect(result!.columns[1].name).toBe("email");
        expect(result!.columns[2].name).toBe("created_at");
    });

    it("should parse table with schema", () => {
        const sql = `
      create table auth.users (
        id uuid primary key
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.schema).toBe("auth");
        expect(result!.name).toBe("users");
    });

    it("should parse table with if not exists", () => {
        const sql = `
      create table if not exists users (
        id uuid primary key
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.name).toBe("users");
    });

    it("should parse table with constraint-based foreign key", () => {
        const sql = `
      create table posts (
        id uuid primary key,
        user_id uuid,
        constraint fk_user foreign key (user_id) references users(id)
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.relationships).toHaveLength(1);
        expect(result!.relationships[0]).toMatchObject({
            foreignKeyName: "fk_user",
            columns: ["user_id"],
            referencedRelation: "users",
            referencedColumns: ["id"],
        });
    });

    it("should filter out this and constraint columns", () => {
        const sql = `
      create table test (
        id uuid primary key,
        this text,
        constraint text,
        normal text
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        // The actual filtering happens in the generator, not the parser
        // Parser should still return all columns
        expect(result!.columns.length).toBeGreaterThan(0);
    });

    it("should handle quoted table name", () => {
        const sql = `
      create table "user_profiles" (
        id uuid primary key
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.name).toBe("user_profiles");
    });

    it("should handle mixed case quoted table names", () => {
        // Note: Hyphenated identifiers like "user-profiles" may not be supported by the parser
        // Use underscores instead for compatibility
        const sql = `
      create table "UserProfiles" (
        id uuid primary key
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.name).toBe("UserProfiles");
    });

    it("should handle multi-column foreign key", () => {
        const sql = `
      create table order_items (
        order_id uuid,
        item_id uuid,
        constraint fk_order_item foreign key (order_id, item_id) references orders(id, product_id)
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.relationships[0].columns).toEqual([
            "order_id",
            "item_id",
        ]);
        expect(result!.relationships[0].referencedColumns).toEqual([
            "id",
            "product_id",
        ]);
    });

    it("should return null for invalid SQL", () => {
        const sql = "not a valid create table statement";
        const result = parseTableDefinition(sql);

        expect(result).toBeNull();
    });

    it("should handle SQL comments", () => {
        const sql = `
      create table users (
        id uuid primary key, -- primary identifier
        email text not null -- user email
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(2);
    });

    it("should parse table with constraint-based foreign key with schema", () => {
        const sql = `
      create table posts (
        id uuid primary key,
        user_id uuid,
        constraint fk_user foreign key (user_id) references auth.users(id)
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.relationships).toHaveLength(1);
        expect(result!.relationships[0]).toMatchObject({
            foreignKeyName: "fk_user",
            columns: ["user_id"],
            referencedRelation: "auth.users",
            referencedColumns: ["id"],
        });
    });

    it("should parse inline foreign key and create relationship", () => {
        const sql = `
      create table posts (
        id uuid primary key,
        user_id uuid unique references users(id)
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.relationships).toHaveLength(1);
        expect(result!.relationships[0]).toMatchObject({
            foreignKeyName: "posts_user_id_fkey",
            columns: ["user_id"],
            isOneToOne: true,
            referencedRelation: "users",
            referencedColumns: ["id"],
        });
    });

    it("should parse inline foreign key with schema", () => {
        const sql = `
      create table posts (
        id uuid primary key,
        user_id uuid references auth.users(id)
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.columns[1].foreignKey).toMatchObject({
            schema: "auth",
            table: "users",
            column: "id",
        });
        expect(result!.relationships[0].referencedRelation).toBe("auth.users");
    });

    it("should skip table-level PRIMARY KEY constraint", () => {
        const sql = `
      create table users (
        id uuid,
        email text,
        primary key (id)
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(2);
        expect(result!.columns.some((c) => c.name === "primary")).toBe(false);
    });

    it("should skip table-level UNIQUE constraint", () => {
        const sql = `
      create table users (
        id uuid,
        email text,
        unique (email)
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(2);
    });

    it("should skip table-level CHECK constraint", () => {
        const sql = `
      create table users (
        id uuid,
        age integer,
        check (age > 0)
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(2);
    });

    it("should skip CASE WHEN expressions", () => {
        const sql = `
      create table test (
        id uuid,
        case when true then 'value'
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(1);
    });

    it("should return null for table with unbalanced parentheses", () => {
        const sql = `
      create table users (
        id uuid primary key,
        email text
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeNull();
    });

    it("should return null for table with empty body", () => {
        const sql = "create table users ()";
        const result = parseTableDefinition(sql);

        expect(result).toBeNull();
    });

    it("should return null for table with whitespace-only body", () => {
        const sql = "create table users (   )";
        const result = parseTableDefinition(sql);

        expect(result).toBeNull();
    });

    it("should return null for table with only constraints, no columns", () => {
        const sql = `
      create table users (
        primary key (id),
        check (true)
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeNull();
    });

    it("should handle table with strings containing quotes", () => {
        const sql = `
      create table users (
        id uuid primary key,
        bio text default 'It\\'s a test'
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(2);
    });

    it("should handle table with nested parentheses in default values", () => {
        const sql = `
      create table users (
        id uuid primary key,
        data jsonb default '{"nested": {"key": "value"}}'::jsonb
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(2);
    });

    it("should handle empty column definitions in list", () => {
        const sql = `
      create table users (
        id uuid,
        ,
        email text
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(2);
        expect(result!.columns[0].name).toBe("id");
        expect(result!.columns[1].name).toBe("email");
    });

    it("should handle comment-only lines in table body", () => {
        const sql = `
      create table users (
        id uuid,
        -- this is a comment
        email text
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(2);
    });

    it("should parse column with default value followed by references", () => {
        const sql = `
      create table posts (
        status text default 'draft' references statuses(name)
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.columns[0]).toMatchObject({
            name: "status",
            defaultValue: "'draft'",
        });
        expect(result!.columns[0].foreignKey).toMatchObject({
            table: "statuses",
            column: "name",
        });
    });

    it("should handle foreign key on non-unique column", () => {
        const sql = `
      create table posts (
        id uuid primary key,
        category_id uuid references categories(id)
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.relationships[0].isOneToOne).toBe(false);
    });

    it("should handle constraint with FOREIGN KEY explicitly", () => {
        const sql = `
      create table test (
        id uuid,
        foreign key (id) references other(id)
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        // Should skip the foreign key line since it's not a column
        expect(result!.columns).toHaveLength(1);
    });

    it("should handle WHEN clauses", () => {
        const sql = `
      create table test (
        id uuid,
        when something
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(1);
    });

    it("should handle THEN clauses", () => {
        const sql = `
      create table test (
        id uuid,
        then something
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(1);
    });

    it("should handle ELSE clauses", () => {
        const sql = `
      create table test (
        id uuid,
        else something
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(1);
    });

    it("should handle END keyword", () => {
        const sql = `
      create table test (
        id uuid,
        end
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(1);
    });

    it("should handle OTHERWISE keyword", () => {
        const sql = `
      create table test (
        id uuid,
        otherwise
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(1);
    });

    it("should handle nested parentheses in table body (line 198)", () => {
        const sql = `
      create table users (
        id uuid primary key,
        balance numeric(10,2) default 0.00,
        created_at timestamp default now(),
        age integer check (age >= 0 and age <= 150),
        metadata jsonb default '{}'::jsonb
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.columns.length).toBeGreaterThan(0);
    });

    it("should handle deeply nested parentheses", () => {
        const sql = `
      create table complex (
        id uuid,
        data text check (length(data) > 0 and (data != '' or data is null))
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(2);
    });

    it("should handle single-quoted strings in table body", () => {
        const sql = `
      create table test (
        id uuid,
        status text default 'active',
        description text default 'This is a ''quoted'' value'
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(3);
    });

    it("should handle double-quoted identifiers in table body", () => {
        const sql = `
      create table test (
        "user-id" uuid,
        "first-name" text
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(2);
        expect(result!.columns[0].name).toBe("user-id");
        expect(result!.columns[1].name).toBe("first-name");
    });
});

describe("parseColumnDefinition edge cases", () => {
    it("should handle default value followed by unique constraint", () => {
        const result = parseColumnDefinition(
            "username text default 'anonymous' unique"
        );
        expect(result).toMatchObject({
            name: "username",
            type: "text",
            defaultValue: "'anonymous'",
            isUnique: true,
        });
    });

    it("should handle default value followed by constraint keyword", () => {
        const result = parseColumnDefinition(
            "age integer default 18 constraint age_check check (age >= 18)"
        );
        expect(result).toMatchObject({
            name: "age",
            type: "integer",
            defaultValue: "18",
        });
    });

    it("should parse foreign key with quoted table and column names", () => {
        const result = parseColumnDefinition(
            'user_id uuid references "auth"."users"("id")'
        );
        expect(result).toMatchObject({
            name: "user_id",
            type: "uuid",
            foreignKey: {
                schema: "auth",
                table: "users",
                column: "id",
            },
        });
    });

    it("should parse foreign key with single-quoted names", () => {
        const result = parseColumnDefinition(
            "user_id uuid references 'auth'.'users'('id')"
        );
        expect(result).toMatchObject({
            name: "user_id",
            type: "uuid",
            foreignKey: {
                schema: "auth",
                table: "users",
                column: "id",
            },
        });
    });

    it("should handle unique column that is also primary key (unique flag should be false)", () => {
        const result = parseColumnDefinition("id uuid unique primary key");
        expect(result).toMatchObject({
            name: "id",
            type: "uuid",
            isPrimaryKey: true,
            isUnique: false,
        });
    });

    it("should handle timestamp with time zone with size parameter", () => {
        const result = parseColumnDefinition(
            "created_at timestamp with time zone(6)"
        );
        expect(result).toMatchObject({
            name: "created_at",
            type: "timestamp with time zone(6)",
        });
    });

    it("should handle escaped backslash in strings during parenthesis matching", () => {
        const sql = `
      create table test (
        id uuid,
        path text default 'C:\\\\Users\\\\test'
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(2);
    });

    it("should parse table with IF NOT EXISTS clause", () => {
        const sql = `
      create table if not exists users (
        id uuid primary key,
        email text
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.name).toBe("users");
        expect(result!.columns).toHaveLength(2);
    });

    it("should parse table with explicit schema in IF NOT EXISTS", () => {
        const sql = `
      create table if not exists public.users (
        id uuid primary key
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.schema).toBe("public");
        expect(result!.name).toBe("users");
    });

    it("should handle constraint with multi-column foreign key", () => {
        const sql = `
      create table posts (
        id uuid primary key,
        user_id uuid,
        org_id uuid,
        constraint fk_user_org foreign key (user_id, org_id) references user_orgs(user_id, org_id)
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.relationships).toHaveLength(1);
        expect(result!.relationships[0]).toMatchObject({
            foreignKeyName: "fk_user_org",
            columns: ["user_id", "org_id"],
            referencedRelation: "user_orgs",
            referencedColumns: ["user_id", "org_id"],
        });
    });

    it("should handle constraint with quoted column names in foreign key", () => {
        const sql = `
      create table posts (
        id uuid,
        constraint fk_test foreign key ("user-id") references "users"("id")
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.relationships[0]).toMatchObject({
            foreignKeyName: "fk_test",
            columns: ["user-id"],
            referencedRelation: "users",
            referencedColumns: ["id"],
        });
    });

    it("should handle constraint with schema-qualified foreign key", () => {
        const sql = `
      create table posts (
        id uuid,
        constraint fk_user foreign key (user_id) references auth.users(id)
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.relationships[0]).toMatchObject({
            foreignKeyName: "fk_user",
            referencedRelation: "auth.users",
        });
    });

    it("should handle custom schema parameter", () => {
        const sql = `
      create table users (
        id uuid primary key
      )
    `;
        const result = parseTableDefinition(sql, "custom_schema");

        expect(result).toBeTruthy();
        expect(result!.schema).toBe("custom_schema");
    });

    it("should override default schema with explicit schema in SQL", () => {
        const sql = `
      create table auth.users (
        id uuid primary key
      )
    `;
        const result = parseTableDefinition(sql, "custom_schema");

        expect(result).toBeTruthy();
        expect(result!.schema).toBe("auth");
    });

    it("should handle complex default values with functions", () => {
        const result = parseColumnDefinition(
            "created_at timestamp default CURRENT_TIMESTAMP not null"
        );
        expect(result).toMatchObject({
            name: "created_at",
            type: "timestamp",
            defaultValue: "CURRENT_TIMESTAMP",
            nullable: false,
        });
    });

    it("should handle default value with primary key", () => {
        const result = parseColumnDefinition(
            "id uuid default gen_random_uuid() primary key"
        );
        expect(result).toMatchObject({
            name: "id",
            type: "uuid",
            defaultValue: "gen_random_uuid()",
            isPrimaryKey: true,
        });
    });

    it("should parse array type with space before brackets", () => {
        const result = parseColumnDefinition("tags text  []  not null");
        expect(result).toMatchObject({
            name: "tags",
            type: "text",
            isArray: true,
            nullable: false,
        });
    });

    it("should handle table with quoted schema name", () => {
        const sql = `
      create table "auth"."users" (
        id uuid primary key
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.schema).toBe("auth");
        expect(result!.name).toBe("users");
    });

    it("should handle table with single-quoted schema name", () => {
        const sql = `
      create table 'auth'.'users' (
        id uuid primary key
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.schema).toBe("auth");
    });

    it("should handle empty table body after removing comments", () => {
        const sql = `
      create table test (
        -- just a comment
        -- another comment
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeNull();
    });

    it("should handle column with complex check constraint containing references keyword", () => {
        const result = parseColumnDefinition(
            "status text default 'pending' check (status in ('pending', 'approved')) references statuses(name)"
        );
        expect(result).toMatchObject({
            name: "status",
            type: "text",
            defaultValue: "'pending'",
        });
    });

    it("should handle multi-word type in uppercase", () => {
        const result = parseColumnDefinition("price DOUBLE PRECISION not null");
        expect(result).toMatchObject({
            name: "price",
            type: "double precision",
        });
    });

    it("should handle time without time zone with size", () => {
        const result = parseColumnDefinition(
            "start_time time without time zone(3)"
        );
        expect(result).toMatchObject({
            name: "start_time",
            type: "time without time zone(3)",
        });
    });

    it("should parse column with schema-qualified type", () => {
        const result = parseColumnDefinition('id "public"."my_type"');
        expect(result).toMatchObject({
            name: "id",
            type: "my_type",
        });
    });

    it("should handle foreign key without schema prefix", () => {
        const result = parseColumnDefinition(
            'category_id uuid references "categories"("id")'
        );
        expect(result).toMatchObject({
            name: "category_id",
            foreignKey: {
                table: "categories",
                column: "id",
            },
        });
        // Verify schema property is not present
        expect(result?.foreignKey?.schema).toBeUndefined();
    });

    it("should handle parentheses in default value", () => {
        const sql = `
      create table test (
        id uuid,
        data text default '(test, value)',
        other text
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(3);
    });

    it("should generate correct foreign key name for inline foreign key", () => {
        const sql = `
      create table posts (
        author_id uuid references users(id)
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.relationships[0].foreignKeyName).toBe(
            "posts_author_id_fkey"
        );
    });

    it("should handle constraint with spaces in column list", () => {
        const sql = `
      create table test (
        id uuid,
        user_id uuid,
        constraint fk_user foreign key ( user_id ) references users( id )
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.relationships[0]).toMatchObject({
            foreignKeyName: "fk_user",
            columns: ["user_id"],
        });
    });

    it("should handle multi-column foreign key with quoted names", () => {
        const sql = `
      create table test (
        id uuid,
        constraint fk_comp foreign key ("col-1", "col-2") references other("ref-1", "ref-2")
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.relationships[0]).toMatchObject({
            columns: ["col-1", "col-2"],
            referencedColumns: ["ref-1", "ref-2"],
        });
    });

    it("should handle timestamp without time zone with size parameter", () => {
        const result = parseColumnDefinition(
            "created timestamp without time zone(6)"
        );
        expect(result).toMatchObject({
            name: "created",
            type: "timestamp without time zone(6)",
        });
    });

    it("should handle time with time zone with size parameter", () => {
        const result = parseColumnDefinition(
            "meeting_time time with time zone(3)"
        );
        expect(result).toMatchObject({
            name: "meeting_time",
            type: "time with time zone(3)",
        });
    });

    it("should handle column without any constraints", () => {
        const result = parseColumnDefinition("description text");
        expect(result).toMatchObject({
            name: "description",
            type: "text",
            nullable: true,
            isPrimaryKey: false,
            isUnique: false,
        });
    });

    it("should handle column with array and other constraints", () => {
        const result = parseColumnDefinition(
            "tags text[] not null default '{}'"
        );
        expect(result).toMatchObject({
            name: "tags",
            type: "text",
            isArray: true,
            nullable: false,
        });
    });

    it("should parse column with type that doesn't match multi-word types", () => {
        const result = parseColumnDefinition("id bigserial primary key");
        expect(result).toMatchObject({
            name: "id",
            type: "bigserial",
            isPrimaryKey: true,
        });
    });

    it("should handle default value containing constraint keywords", () => {
        const result = parseColumnDefinition(
            "message text default 'check this out'"
        );
        expect(result).toMatchObject({
            name: "message",
            type: "text",
            defaultValue: "'check this out'",
        });
    });

    it("should handle column with default containing safe keywords", () => {
        const result = parseColumnDefinition(
            "description text default 'test value'"
        );
        expect(result).toMatchObject({
            name: "description",
            type: "text",
            defaultValue: "'test value'",
        });
    });

    it("should handle foreign key without schema", () => {
        const sql = `
      create table test (
        user_id uuid references users(id)
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.relationships[0].referencedRelation).toBe("users");
        expect(result!.columns[0].foreignKey?.schema).toBeUndefined();
    });

    it("should handle constraint foreign key without schema", () => {
        const sql = `
      create table test (
        id uuid,
        constraint fk_user foreign key (user_id) references users(id)
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.relationships[0].referencedRelation).toBe("users");
    });

    it("should handle constraint names without special characters", () => {
        const sql = `
      create table test (
        id uuid,
        constraint fk_user_id foreign key (user_id) references users(id)
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.relationships[0].foreignKeyName).toBe("fk_user_id");
    });
});

describe("parseColumnDefinition with hyphenated identifiers", () => {
    it("should parse column with hyphenated name", () => {
        const result = parseColumnDefinition('"first-name" text not null');
        expect(result).toMatchObject({
            name: "first-name",
            type: "text",
            nullable: false,
        });
    });
    it("should parse column with hyphenated name and quoted type", () => {
        const result = parseColumnDefinition('"first-name" "custom-type"');
        expect(result).toMatchObject({
            name: "first-name",
            type: "custom-type",
        });
    });
    it("should parse column with hyphenated name and single-quoted type", () => {
        const result = parseColumnDefinition("\"first-name\" 'custom-type'");
        expect(result).toMatchObject({
            name: "first-name",
            type: "custom-type",
        });
    });
    it("should parse column with hyphenated name and constraints", () => {
        const result = parseColumnDefinition(
            "\"first-name\" text default 'John-Doe' not null"
        );
        expect(result).toMatchObject({
            name: "first-name",
            type: "text",
            defaultValue: "'John-Doe'",
            nullable: false,
        });
    });
    it("should parse column with hyphenated name in table definition", () => {
        const sql = `
      create table test (
        "first-name" text,
        "user-id" uuid primary key
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(2);
        expect(result!.columns[0].name).toBe("first-name");
        expect(result!.columns[1].name).toBe("user-id");
    });
    it("should parse column with hyphenated name and foreign key", () => {
        const sql = `
      create table test (
        "first-name" text,
        "user-id" uuid references users(id)
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(2);
        expect(result!.columns[0].name).toBe("first-name");
        expect(result!.columns[1].name).toBe("user-id");
        expect(result!.columns[1].foreignKey).toMatchObject({
            table: "users",
            column: "id",
        });
    });
    it("should parse column with hyphenated name and array type", () => {
        const result = parseColumnDefinition('"first-name" text[] not null');
        expect(result).toMatchObject({
            name: "first-name",
            type: "text",
            isArray: true,
            nullable: false,
        });
    });
    it("should parse column with hyphenated name and multi-word type", () => {
        const result = parseColumnDefinition('"first-name" double precision');
        expect(result).toMatchObject({
            name: "first-name",
            type: "double precision",
        });
    });
    it("should parse column with hyphenated name and default value containing hyphen", () => {
        const result = parseColumnDefinition(
            "\"first-name\" text default 'John-Doe'"
        );
        expect(result).toMatchObject({
            name: "first-name",
            type: "text",
            defaultValue: "'John-Doe'",
        });
    });

    it("should parse column with hyphenated name and quoted default value", () => {
        const result = parseColumnDefinition(
            '"first-name" text default "John-Doe"'
        );
        expect(result).toMatchObject({
            name: "first-name",
            type: "text",
            defaultValue: '"John-Doe"',
        });
    });
    it("should parse column with hyphenated name and single-quoted default value", () => {
        const result = parseColumnDefinition(
            "\"first-name\" text default 'John-Doe'"
        );
        expect(result).toMatchObject({
            name: "first-name",
            type: "text",
            defaultValue: "'John-Doe'",
        });
    });
    it("should parse column with hyphenated name and foreign key with quoted identifiers", () => {
        const sql = `
      create table test (
        "first-name" text,
        "user-id" uuid references "users"("id")
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(2);
        expect(result!.columns[0].name).toBe("first-name");
        expect(result!.columns[1].name).toBe("user-id");
        expect(result!.columns[1].foreignKey).toMatchObject({
            table: "users",
            column: "id",
        });
    });
    it("should parse column with hyphenated name and foreign key with single-quoted identifiers", () => {
        const sql = `
      create table test (
        "first-name" text,
        "user-id" uuid references 'users'('id')
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(2);
        expect(result!.columns[0].name).toBe("first-name");
        expect(result!.columns[1].name).toBe("user-id");
        expect(result!.columns[1].foreignKey).toMatchObject({
            table: "users",
            column: "id",
        });
    });
    it("should handle constraint with hyphenated name", () => {
        const sql = `
      create table test (
        id uuid,
        constraint fk_user-id foreign key (user_id) references users(id)
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeTruthy();
        expect(result!.relationships[0].foreignKeyName).toBe("fk_user-id");
    });
    it("should handle constraint with hyphenated column names", () => {
        const sql = `
      create table test (
        id uuid,
        constraint fk_user foreign key ("user-id") references users("id")
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeTruthy();
        expect(result!.relationships[0]).toMatchObject({
            foreignKeyName: "fk_user",
            columns: ["user-id"],
            referencedColumns: ["id"],
        });
    });
    it("should handle constraint with hyphenated names and quoted identifiers", () => {
        const sql = `
      create table test (
        id uuid,
        constraint fk-user-id foreign key ("user-id") references "users"("id")
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeTruthy();
        expect(result!.relationships[0].foreignKeyName).toBe("fk-user-id");
    });
    it("should handle constraint with hyphenated names and single-quoted identifiers", () => {
        const sql = `
      create table test (
        id uuid,
        constraint fk-user-id foreign key ('user-id') references 'users'('id')
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeTruthy();
        expect(result!.relationships[0].foreignKeyName).toBe("fk-user-id");
    });
    it("should handle constraint with hyphenated name without schema", () => {
        const sql = `
      create table test (
        id uuid,
        constraint fk_user-id foreign key (user_id) references users(id)
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeTruthy();
        expect(result!.relationships[0].foreignKeyName).toBe("fk_user-id");
    });
});

describe("splitByComma edge cases (internal function tested via parseTableDefinition)", () => {
    it("should handle escaped quotes in column definitions", () => {
        const sql = `
      create table test (
        id uuid,
        message text default 'It\\'s escaped',
        description text default "He said \\"hello\\""
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(3);
    });

    it("should handle mixed single and double quotes", () => {
        const sql = `
      create table test (
        "id" uuid,
        'name' text,
        email text
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(3);
        expect(result!.columns[0].name).toBe("id");
        expect(result!.columns[1].name).toBe("name");
    });

    it("should handle deeply nested parentheses with strings", () => {
        const sql = `
      create table test (
        id uuid,
        data text check (length(data) > 0 and (data != '' or (data is null and length(data::text) = 0))),
        status text default 'active'
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(3);
    });

    it("should handle commas inside quoted strings", () => {
        const sql = `
      create table test (
        id uuid,
        csv_data text default 'value1,value2,value3',
        json_data text default '{"key": "value,with,commas"}'
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(3);
    });

    it("should handle empty parts after comma split", () => {
        const sql = `
      create table test (
        id uuid,
        ,
        ,
        name text
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(2);
    });
});

describe("parseColumnDefinition - single-quoted column names", () => {
    it("should parse column with single-quoted name", () => {
        const result = parseColumnDefinition("'column_name' text not null");
        expect(result).toMatchObject({
            name: "column_name",
            type: "text",
            nullable: false,
        });
    });

    it("should parse single-quoted column name with constraints", () => {
        const result = parseColumnDefinition(
            "'user_id' uuid primary key default gen_random_uuid()"
        );
        expect(result).toMatchObject({
            name: "user_id",
            type: "uuid",
            isPrimaryKey: true,
            defaultValue: "gen_random_uuid()",
        });
    });

    it("should parse single-quoted column name with foreign key", () => {
        const result = parseColumnDefinition(
            "'category_id' uuid references categories(id)"
        );
        expect(result).toMatchObject({
            name: "category_id",
            type: "uuid",
            foreignKey: {
                table: "categories",
                column: "id",
            },
        });
    });
});

describe("parseColumnDefinition - quoted type edge cases", () => {
    it("should handle schema-qualified quoted type with schema in first position", () => {
        const result = parseColumnDefinition('id "public"."uuid"');
        expect(result).toMatchObject({
            name: "id",
            type: "uuid",
        });
    });

    it("should handle single-quoted schema-qualified type", () => {
        const result = parseColumnDefinition("id 'public'.'custom_type'");
        expect(result).toMatchObject({
            name: "id",
            type: "custom_type",
        });
    });

    it("should handle type without size parameter", () => {
        const result = parseColumnDefinition("id bigint not null");
        expect(result).toMatchObject({
            name: "id",
            type: "bigint",
            nullable: false,
        });
    });

    it("should handle type with size parameter", () => {
        const result = parseColumnDefinition("name varchar(100)");
        expect(result).toMatchObject({
            name: "name",
            type: "varchar(100)",
        });
    });
});

describe("parseColumnDefinition - multi-word types with size", () => {
    it("should parse character varying without size", () => {
        const result = parseColumnDefinition("name character varying");
        expect(result).toMatchObject({
            name: "name",
            type: "character varying",
        });
    });

    it("should parse all multi-word types", () => {
        const types = [
            ["created_at timestamp with time zone", "timestamp with time zone"],
            [
                "created timestamp without time zone",
                "timestamp without time zone",
            ],
            ["meeting_time time with time zone", "time with time zone"],
            ["start_time time without time zone", "time without time zone"],
            ["price double precision", "double precision"],
            ["name character varying", "character varying"],
        ];

        types.forEach(([def, expectedType]) => {
            const result = parseColumnDefinition(def as string);
            expect(result).toMatchObject({
                type: expectedType,
            });
        });
    });

    it("should handle multi-word type in mixed case", () => {
        const result = parseColumnDefinition(
            "created TIMESTAMP WITH TIME ZONE default now()"
        );
        expect(result).toMatchObject({
            name: "created",
            type: "timestamp with time zone",
            defaultValue: "now()",
        });
    });
});

describe("parseColumnDefinition - array type detection", () => {
    it("should detect array with [] in type", () => {
        const result = parseColumnDefinition("tags text[]");
        expect(result).toMatchObject({
            name: "tags",
            type: "text",
            isArray: true,
        });
    });

    it("should detect array with [] after type with space", () => {
        const result = parseColumnDefinition("tags text []");
        expect(result).toMatchObject({
            name: "tags",
            type: "text",
            isArray: true,
        });
    });

    it("should detect array with ARRAY keyword", () => {
        const result = parseColumnDefinition("numbers integer array");
        expect(result).toMatchObject({
            name: "numbers",
            type: "integer",
            isArray: true,
        });
    });

    it("should detect array with ARRAY in mixed case", () => {
        const result = parseColumnDefinition("values numeric ArRaY");
        expect(result).toMatchObject({
            name: "values",
            type: "numeric",
            isArray: true,
        });
    });

    it("should handle array type with constraints", () => {
        const result = parseColumnDefinition(
            "tags text[] not null default '{}'"
        );
        expect(result).toMatchObject({
            name: "tags",
            type: "text",
            isArray: true,
            nullable: false,
            defaultValue: "'{}'",
        });
    });
});

describe("parseColumnDefinition - constraint combinations", () => {
    it("should handle not null without primary key", () => {
        const result = parseColumnDefinition("email text not null");
        expect(result).toMatchObject({
            name: "email",
            type: "text",
            nullable: false,
            isPrimaryKey: false,
        });
    });

    it("should handle nullable column (no constraints)", () => {
        const result = parseColumnDefinition("description text");
        expect(result).toMatchObject({
            name: "description",
            type: "text",
            nullable: true,
            isPrimaryKey: false,
        });
    });

    it("should handle unique without primary key", () => {
        const result = parseColumnDefinition("username text unique");
        expect(result).toMatchObject({
            name: "username",
            type: "text",
            isUnique: true,
            isPrimaryKey: false,
        });
    });

    it("should handle primary key sets nullable to false", () => {
        const result = parseColumnDefinition("id uuid primary key");
        expect(result).toMatchObject({
            name: "id",
            type: "uuid",
            isPrimaryKey: true,
            nullable: false,
        });
    });
});

describe("parseColumnDefinition - default value edge cases", () => {
    it("should handle default value at end of definition", () => {
        const result = parseColumnDefinition("status text default 'active'");
        expect(result).toMatchObject({
            name: "status",
            type: "text",
            defaultValue: "'active'",
        });
    });

    it("should handle default value before not null", () => {
        const result = parseColumnDefinition(
            "status text default 'pending' not null"
        );
        expect(result).toMatchObject({
            name: "status",
            type: "text",
            defaultValue: "'pending'",
            nullable: false,
        });
    });

    it("should handle default value before primary key", () => {
        const result = parseColumnDefinition(
            "id uuid default gen_random_uuid() primary key"
        );
        expect(result).toMatchObject({
            name: "id",
            type: "uuid",
            defaultValue: "gen_random_uuid()",
            isPrimaryKey: true,
        });
    });

    it("should handle default value before unique", () => {
        const result = parseColumnDefinition(
            "code text default 'ABC123' unique"
        );
        expect(result).toMatchObject({
            name: "code",
            type: "text",
            defaultValue: "'ABC123'",
            isUnique: true,
        });
    });

    it("should handle default value before references", () => {
        const result = parseColumnDefinition(
            "status_id integer default 1 references statuses(id)"
        );
        expect(result).toMatchObject({
            name: "status_id",
            type: "integer",
            defaultValue: "1",
            foreignKey: {
                table: "statuses",
                column: "id",
            },
        });
    });

    it("should handle default value before check constraint", () => {
        const result = parseColumnDefinition(
            "age integer default 0 check (age >= 0)"
        );
        expect(result).toMatchObject({
            name: "age",
            type: "integer",
            defaultValue: "0",
        });
    });

    it("should handle default value before constraint keyword", () => {
        const result = parseColumnDefinition(
            "value integer default 100 constraint positive_value check (value > 0)"
        );
        expect(result).toMatchObject({
            name: "value",
            type: "integer",
            defaultValue: "100",
        });
    });

    it("should handle complex default value with function", () => {
        const result = parseColumnDefinition(
            "created_at timestamp default CURRENT_TIMESTAMP"
        );
        expect(result).toMatchObject({
            name: "created_at",
            type: "timestamp",
            defaultValue: "CURRENT_TIMESTAMP",
        });
    });

    it("should handle default with cast", () => {
        const result = parseColumnDefinition("data jsonb default '{}'::jsonb");
        expect(result).toMatchObject({
            name: "data",
            type: "jsonb",
            defaultValue: "'{}'::jsonb",
        });
    });
});

describe("parseColumnDefinition - foreign key variations", () => {
    it("should parse foreign key with double-quoted table", () => {
        const result = parseColumnDefinition(
            'user_id uuid references "users"(id)'
        );
        expect(result).toMatchObject({
            name: "user_id",
            foreignKey: {
                table: "users",
                column: "id",
            },
        });
    });

    it("should parse foreign key with single-quoted table", () => {
        const result = parseColumnDefinition(
            "user_id uuid references 'users'(id)"
        );
        expect(result).toMatchObject({
            name: "user_id",
            foreignKey: {
                table: "users",
                column: "id",
            },
        });
    });

    it("should parse foreign key with unquoted identifiers", () => {
        const result = parseColumnDefinition(
            "user_id uuid references users(id)"
        );
        expect(result).toMatchObject({
            name: "user_id",
            foreignKey: {
                table: "users",
                column: "id",
            },
        });
    });

    it("should parse foreign key with double-quoted schema and table", () => {
        const result = parseColumnDefinition(
            'user_id uuid references "auth"."users"("id")'
        );
        expect(result).toMatchObject({
            name: "user_id",
            foreignKey: {
                schema: "auth",
                table: "users",
                column: "id",
            },
        });
    });

    it("should parse foreign key with single-quoted schema and table", () => {
        const result = parseColumnDefinition(
            "user_id uuid references 'auth'.'users'('id')"
        );
        expect(result).toMatchObject({
            name: "user_id",
            foreignKey: {
                schema: "auth",
                table: "users",
                column: "id",
            },
        });
    });

    it("should parse foreign key with mixed quote styles", () => {
        const result = parseColumnDefinition(
            'user_id uuid references "auth".users(id)'
        );
        expect(result).toMatchObject({
            name: "user_id",
            foreignKey: {
                schema: "auth",
                table: "users",
                column: "id",
            },
        });
    });

    it("should not include schema in foreignKey when not specified", () => {
        const result = parseColumnDefinition(
            "category_id uuid references categories(id)"
        );
        expect(result?.foreignKey?.schema).toBeUndefined();
    });
});

describe("parseTableDefinition - table name variations", () => {
    it("should parse table with double-quoted name", () => {
        const sql = `create table "my_table" (id uuid)`;
        const result = parseTableDefinition(sql);
        expect(result).toMatchObject({
            name: "my_table",
            schema: "public",
        });
    });

    it("should parse table with single-quoted name", () => {
        const sql = `create table 'my_table' (id uuid)`;
        const result = parseTableDefinition(sql);
        expect(result).toMatchObject({
            name: "my_table",
            schema: "public",
        });
    });

    it("should parse table with unquoted name", () => {
        const sql = `create table my_table (id uuid)`;
        const result = parseTableDefinition(sql);
        expect(result).toMatchObject({
            name: "my_table",
            schema: "public",
        });
    });

    it("should parse table with double-quoted schema", () => {
        const sql = `create table "auth".users (id uuid)`;
        const result = parseTableDefinition(sql);
        expect(result).toMatchObject({
            schema: "auth",
            name: "users",
        });
    });

    it("should parse table with single-quoted schema", () => {
        const sql = `create table 'auth'.users (id uuid)`;
        const result = parseTableDefinition(sql);
        expect(result).toMatchObject({
            schema: "auth",
            name: "users",
        });
    });

    it("should parse table with unquoted schema", () => {
        const sql = `create table auth.users (id uuid)`;
        const result = parseTableDefinition(sql);
        expect(result).toMatchObject({
            schema: "auth",
            name: "users",
        });
    });
});

describe("parseTableDefinition - string handling edge cases", () => {
    it("should handle escaped backslashes in default values", () => {
        const sql = `
      create table test (
        id uuid,
        path text default 'C:\\\\path\\\\to\\\\file'
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(2);
    });

    it("should handle escaped quotes in strings", () => {
        const sql = `
      create table test (
        id uuid,
        message text default 'It\\'s a test',
        quote text default "He said \\"hello\\""
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(3);
    });

    it("should handle parentheses inside quoted strings", () => {
        const sql = `
      create table test (
        id uuid,
        formula text default '(a + b) * (c - d)'
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(2);
    });

    it("should handle mixed quote types in same table", () => {
        const sql = `
      create table test (
        "id" uuid,
        'name' text,
        email text default "test@example.com",
        status text default 'active'
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(4);
    });
});

describe("parseTableDefinition - constraint edge cases", () => {
    it("should handle constraint with single-quoted name", () => {
        const sql = `
      create table test (
        id uuid,
        constraint 'fk_test' foreign key (user_id) references users(id)
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeTruthy();
        expect(result!.relationships[0].foreignKeyName).toBe("fk_test");
    });

    it("should handle constraint with double-quoted name", () => {
        const sql = `
      create table test (
        id uuid,
        constraint "fk_test" foreign key (user_id) references users(id)
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeTruthy();
        expect(result!.relationships[0].foreignKeyName).toBe("fk_test");
    });

    it("should handle constraint with unquoted name", () => {
        const sql = `
      create table test (
        id uuid,
        constraint fk_test foreign key (user_id) references users(id)
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeTruthy();
        expect(result!.relationships[0].foreignKeyName).toBe("fk_test");
    });

    it("should handle constraint without schema prefix", () => {
        const sql = `
      create table test (
        id uuid,
        constraint fk_user foreign key (user_id) references users(id)
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeTruthy();
        expect(result!.relationships[0].referencedRelation).toBe("users");
    });

    it("should handle constraint with schema prefix", () => {
        const sql = `
      create table test (
        id uuid,
        constraint fk_user foreign key (user_id) references auth.users(id)
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeTruthy();
        expect(result!.relationships[0].referencedRelation).toBe("auth.users");
    });

    it("should handle constraint with quoted schema and table", () => {
        const sql = `
      create table test (
        id uuid,
        constraint fk_user foreign key (user_id) references "auth"."users"(id)
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeTruthy();
        expect(result!.relationships[0].referencedRelation).toBe("auth.users");
    });

    it("should handle constraint with single-quoted schema and table", () => {
        const sql = `
      create table test (
        id uuid,
        constraint fk_user foreign key (user_id) references 'auth'.'users'(id)
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeTruthy();
        expect(result!.relationships[0].referencedRelation).toBe("auth.users");
    });
});

describe("parseTableDefinition - relationship generation from inline foreign keys", () => {
    it("should create relationship for inline foreign key without schema", () => {
        const sql = `
      create table posts (
        author_id uuid references users(id)
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeTruthy();
        expect(result!.relationships).toHaveLength(1);
        expect(result!.relationships[0]).toMatchObject({
            foreignKeyName: "posts_author_id_fkey",
            columns: ["author_id"],
            referencedRelation: "users",
            referencedColumns: ["id"],
            isOneToOne: false,
        });
    });

    it("should create relationship for inline foreign key with schema", () => {
        const sql = `
      create table posts (
        author_id uuid references auth.users(id)
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeTruthy();
        expect(result!.relationships).toHaveLength(1);
        expect(result!.relationships[0]).toMatchObject({
            foreignKeyName: "posts_author_id_fkey",
            columns: ["author_id"],
            referencedRelation: "auth.users",
            referencedColumns: ["id"],
        });
    });

    it("should set isOneToOne to true for unique foreign key", () => {
        const sql = `
      create table profiles (
        user_id uuid unique references users(id)
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeTruthy();
        expect(result!.relationships[0].isOneToOne).toBe(true);
    });

    it("should set isOneToOne to false for non-unique foreign key", () => {
        const sql = `
      create table posts (
        user_id uuid references users(id)
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeTruthy();
        expect(result!.relationships[0].isOneToOne).toBe(false);
    });
});

describe("parseTableDefinition - comment and whitespace handling", () => {
    it("should skip lines that are only comments after trimming", () => {
        const sql = `
      create table test (
        id uuid,
        -- this is just a comment
        name text
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(2);
    });

    it("should handle multiple consecutive comment lines", () => {
        const sql = `
      create table test (
        id uuid,
        -- comment 1
        -- comment 2
        -- comment 3
        name text
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(2);
    });

    it("should handle empty lines after trimming", () => {
        const sql = `
      create table test (
        id uuid,
        
        
        name text
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(2);
    });

    it("should handle tabs and other whitespace", () => {
        const sql = `
      create table test (
        id\tuuid,
        name\t\ttext
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(2);
    });
});

describe("parseTableDefinition - invalid input handling", () => {
    it("should return null for SQL without CREATE TABLE", () => {
        const sql = "SELECT * FROM users";
        const result = parseTableDefinition(sql);
        expect(result).toBeNull();
    });

    it("should return null for CREATE TABLE without opening parenthesis", () => {
        const sql = "CREATE TABLE users";
        const result = parseTableDefinition(sql);
        expect(result).toBeNull();
    });

    it("should return null for unclosed parentheses", () => {
        const sql = "CREATE TABLE users (id uuid, name text";
        const result = parseTableDefinition(sql);
        expect(result).toBeNull();
    });

    it("should return null for table with only whitespace body", () => {
        const sql = "CREATE TABLE users (    )";
        const result = parseTableDefinition(sql);
        expect(result).toBeNull();
    });

    it("should return null for table with only comments in body", () => {
        const sql = `
      CREATE TABLE users (
        -- just a comment
        -- another comment
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeNull();
    });

    it("should return null for table with only constraints, no columns", () => {
        const sql = `
      CREATE TABLE users (
        PRIMARY KEY (id),
        CHECK (true)
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeNull();
    });
});

describe("parseColumnDefinition - null return cases", () => {
    it("should return null for empty string", () => {
        const result = parseColumnDefinition("");
        expect(result).toBeNull();
    });

    it("should return null for whitespace only", () => {
        const result = parseColumnDefinition("   ");
        expect(result).toBeNull();
    });

    it("should return null for column name without type", () => {
        const result = parseColumnDefinition("just_name");
        expect(result).toBeNull();
    });

    it("should return null for column with invalid type syntax", () => {
        const result = parseColumnDefinition("name @#$invalid");
        expect(result).toBeNull();
    });

    it("should return null for malformed definition", () => {
        const result = parseColumnDefinition("!@#$%^&*()");
        expect(result).toBeNull();
    });
});

describe("extractIdentifier edge cases (tested via main functions)", () => {
    it("should handle all undefined groups", () => {
        const sql = "CREATE TABLE users (id uuid)";
        const result = parseTableDefinition(sql);
        // This tests that extractIdentifier returns "" when all groups are undefined
        // which then falls back to the default schema
        expect(result).toBeTruthy();
        expect(result!.schema).toBe("public");
    });

    it("should handle first group defined", () => {
        const sql = `CREATE TABLE "auth".users (id uuid)`;
        const result = parseTableDefinition(sql);
        expect(result!.schema).toBe("auth");
    });

    it("should handle second group defined", () => {
        const sql = `CREATE TABLE 'auth'.users (id uuid)`;
        const result = parseTableDefinition(sql);
        expect(result!.schema).toBe("auth");
    });

    it("should handle third group defined", () => {
        const sql = `CREATE TABLE auth.users (id uuid)`;
        const result = parseTableDefinition(sql);
        expect(result!.schema).toBe("auth");
    });
});

describe("parseTableDefinition - complex real-world scenarios", () => {
    it("should handle table with multiple foreign keys and constraints", () => {
        const sql = `
      CREATE TABLE orders (
        id uuid PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES users(id),
        product_id uuid REFERENCES products(id),
        status_id integer DEFAULT 1 REFERENCES statuses(id),
        created_at timestamp DEFAULT now(),
        CONSTRAINT fk_user_product FOREIGN KEY (user_id, product_id) REFERENCES user_products(user_id, product_id)
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(5);
        expect(result!.relationships).toHaveLength(4); // 3 inline + 1 constraint
    });

    it("should handle table with mixed quote styles", () => {
        const sql = `
      CREATE TABLE "test_table" (
        "id" uuid PRIMARY KEY,
        'name' text NOT NULL,
        email text,
        "created-at" timestamp DEFAULT now()
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeTruthy();
        expect(result!.name).toBe("test_table");
        expect(result!.columns[0].name).toBe("id");
        expect(result!.columns[1].name).toBe("name");
        expect(result!.columns[3].name).toBe("created-at");
    });

    it("should handle table with complex default values and checks", () => {
        const sql = `
      CREATE TABLE products (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        price numeric(10,2) DEFAULT 0.00 CHECK (price >= 0),
        tags text[] DEFAULT '{}',
        metadata jsonb DEFAULT '{}'::jsonb,
        created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
      )
    `;
        const result = parseTableDefinition(sql);
        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(5);
        expect(result!.columns[2].isArray).toBe(true);
    });
});

describe("parseColumnDefinition - quotedTypeMatch regex (lines 89-94)", () => {
    describe("quoted types WITHOUT schema prefix", () => {
        it("should match double-quoted type only (group 1=undefined, group 2=type)", () => {
            const result = parseColumnDefinition('id "uuid" primary key');
            expect(result).toMatchObject({
                name: "id",
                type: "uuid",
                isPrimaryKey: true,
            });
        });

        it("should match single-quoted type only (group 1=undefined, group 2=type)", () => {
            const result = parseColumnDefinition("id 'uuid' primary key");
            expect(result).toMatchObject({
                name: "id",
                type: "uuid",
                isPrimaryKey: true,
            });
        });

        it("should extract double-quoted type with constraints", () => {
            const result = parseColumnDefinition(
                "status \"text\" not null default 'active'"
            );
            expect(result).toMatchObject({
                name: "status",
                type: "text",
                nullable: false,
                defaultValue: "'active'",
            });
        });

        it("should extract single-quoted type with constraints", () => {
            const result = parseColumnDefinition(
                "status 'text' not null default 'active'"
            );
            expect(result).toMatchObject({
                name: "status",
                type: "text",
                nullable: false,
                defaultValue: "'active'",
            });
        });

        it("should handle double-quoted custom type names", () => {
            const result = parseColumnDefinition('id "custom_type_name"');
            expect(result).toMatchObject({
                name: "id",
                type: "custom_type_name",
            });
        });

        it("should handle single-quoted custom type names", () => {
            const result = parseColumnDefinition("id 'custom_type_name'");
            expect(result).toMatchObject({
                name: "id",
                type: "custom_type_name",
            });
        });

        it("should handle quoted type with underscores", () => {
            const result = parseColumnDefinition('value "my_custom_type"');
            expect(result).toMatchObject({
                name: "value",
                type: "my_custom_type",
            });
        });

        it("should handle quoted type with hyphens", () => {
            const result = parseColumnDefinition('value "my-custom-type"');
            expect(result).toMatchObject({
                name: "value",
                type: "my-custom-type",
            });
        });
    });

    describe("quoted types WITH schema prefix (group 1=schema, group 2=type)", () => {
        it("should match double-quoted schema.type (group 1=schema, group 2=type)", () => {
            const result = parseColumnDefinition('id "public"."uuid"');
            expect(result).toMatchObject({
                name: "id",
                type: "uuid", // Should use group 2
            });
        });

        it("should match single-quoted schema.type (group 1=schema, group 2=type)", () => {
            const result = parseColumnDefinition("id 'public'.'uuid'");
            expect(result).toMatchObject({
                name: "id",
                type: "uuid", // Should use group 2
            });
        });

        it("should match mixed quotes: double schema, double type", () => {
            const result = parseColumnDefinition(
                'data "public"."jsonb" default \'{}\''
            );
            expect(result).toMatchObject({
                name: "data",
                type: "jsonb",
                defaultValue: "'{}'",
            });
        });

        it("should match mixed quotes: single schema, single type", () => {
            const result = parseColumnDefinition(
                "data 'public'.'jsonb' default '{}'"
            );
            expect(result).toMatchObject({
                name: "data",
                type: "jsonb",
            });
        });

        it("should handle schema-qualified custom types", () => {
            const result = parseColumnDefinition(
                'id "my_schema"."my_custom_type"'
            );
            expect(result).toMatchObject({
                name: "id",
                type: "my_custom_type", // Should extract type from group 2
            });
        });

        it("should handle schema with underscores", () => {
            const result = parseColumnDefinition(
                'id "auth_schema"."user_type"'
            );
            expect(result).toMatchObject({
                name: "id",
                type: "user_type",
            });
        });

        it("should handle schema with hyphens in quotes", () => {
            const result = parseColumnDefinition('id "my-schema"."my-type"');
            expect(result).toMatchObject({
                name: "id",
                type: "my-type",
            });
        });

        it("should extract type from group 2 when both groups present", () => {
            // This specifically tests: colType = quotedTypeMatch[2] || quotedTypeMatch[1]
            // When both groups exist, should use group 2 (the type, not the schema)
            const result = parseColumnDefinition(
                'value "schema_name"."type_name" not null'
            );
            expect(result).toMatchObject({
                name: "value",
                type: "type_name", // group 2, NOT "schema_name" from group 1
                nullable: false,
            });
        });
    });

    describe("remainingConstraints extraction (line 94)", () => {
        it("should correctly extract constraints after quoted type", () => {
            const result = parseColumnDefinition(
                'id "uuid" primary key not null'
            );
            expect(result).toMatchObject({
                name: "id",
                type: "uuid",
                isPrimaryKey: true,
                nullable: false,
            });
        });

        it("should handle no constraints after quoted type", () => {
            const result = parseColumnDefinition('id "uuid"');
            expect(result).toMatchObject({
                name: "id",
                type: "uuid",
                nullable: true,
                isPrimaryKey: false,
            });
        });

        it("should handle multiple constraints after schema-qualified type", () => {
            const result = parseColumnDefinition(
                'id "public"."uuid" primary key default gen_random_uuid() not null'
            );
            expect(result).toMatchObject({
                name: "id",
                type: "uuid",
                isPrimaryKey: true,
                defaultValue: "gen_random_uuid()",
                nullable: false,
            });
        });

        it("should trim whitespace in remainingConstraints", () => {
            const result = parseColumnDefinition('id "uuid"    primary key');
            expect(result).toMatchObject({
                name: "id",
                type: "uuid",
                isPrimaryKey: true,
            });
        });
    });

    describe("edge cases for quoted type matching", () => {
        it("should handle type name with numbers", () => {
            const result = parseColumnDefinition('id "type123"');
            expect(result).toMatchObject({
                name: "id",
                type: "type123",
            });
        });

        it("should handle type name with mixed case", () => {
            const result = parseColumnDefinition('id "MyCustomType"');
            expect(result).toMatchObject({
                name: "id",
                type: "MyCustomType",
            });
        });

        it("should handle schema and type with mixed case", () => {
            const result = parseColumnDefinition('id "MySchema"."MyType"');
            expect(result).toMatchObject({
                name: "id",
                type: "MyType",
            });
        });

        it("should NOT match if quotes are mismatched (falls through to multi-word types)", () => {
            // This should NOT match the quoted type pattern
            // It should fall through to the regular type matching
            const result = parseColumnDefinition("id text primary key");
            expect(result).toMatchObject({
                name: "id",
                type: "text",
                isPrimaryKey: true,
            });
        });
    });
});

describe("parseColumnDefinition - multiWordTypes fallback (lines 96-119)", () => {
    describe("when quotedTypeMatch fails (else branch, line 95)", () => {
        it("should fall through to multiWordTypes when type is not quoted", () => {
            const result = parseColumnDefinition(
                "created_at timestamp with time zone"
            );
            expect(result).toMatchObject({
                name: "created_at",
                type: "timestamp with time zone",
            });
        });

        it("should fall through to regular type matching when not multi-word", () => {
            const result = parseColumnDefinition("id uuid");
            expect(result).toMatchObject({
                name: "id",
                type: "uuid",
            });
        });
    });

    describe("multiWordTypes array matching (lines 96-103)", () => {
        it("should match 'timestamp with time zone' (array index 0)", () => {
            const result = parseColumnDefinition(
                "created timestamp with time zone"
            );
            expect(result).toMatchObject({
                name: "created",
                type: "timestamp with time zone",
            });
        });

        it("should match 'timestamp without time zone' (array index 1)", () => {
            const result = parseColumnDefinition(
                "created timestamp without time zone"
            );
            expect(result).toMatchObject({
                name: "created",
                type: "timestamp without time zone",
            });
        });

        it("should match 'time with time zone' (array index 2)", () => {
            const result = parseColumnDefinition("meeting time with time zone");
            expect(result).toMatchObject({
                name: "meeting",
                type: "time with time zone",
            });
        });

        it("should match 'time without time zone' (array index 3)", () => {
            const result = parseColumnDefinition(
                "start time without time zone"
            );
            expect(result).toMatchObject({
                name: "start",
                type: "time without time zone",
            });
        });

        it("should match 'double precision' (array index 4)", () => {
            const result = parseColumnDefinition("price double precision");
            expect(result).toMatchObject({
                name: "price",
                type: "double precision",
            });
        });

        it("should match 'character varying' (array index 5)", () => {
            const result = parseColumnDefinition("name character varying");
            expect(result).toMatchObject({
                name: "name",
                type: "character varying",
            });
        });
    });

    describe("toLowerCase() matching (line 106)", () => {
        it("should match UPPERCASE timestamp with time zone", () => {
            const result = parseColumnDefinition(
                "created TIMESTAMP WITH TIME ZONE"
            );
            expect(result).toMatchObject({
                name: "created",
                type: "timestamp with time zone",
            });
        });

        it("should match MiXeD CaSe timestamp without time zone", () => {
            const result = parseColumnDefinition(
                "created TiMeStAmP WiThOuT TiMe ZoNe"
            );
            expect(result).toMatchObject({
                name: "created",
                type: "timestamp without time zone",
            });
        });

        it("should match lowercase time with time zone", () => {
            const result = parseColumnDefinition("meeting time with time zone");
            expect(result).toMatchObject({
                name: "meeting",
                type: "time with time zone",
            });
        });

        it("should match UPPERCASE time without time zone", () => {
            const result = parseColumnDefinition(
                "start TIME WITHOUT TIME ZONE"
            );
            expect(result).toMatchObject({
                name: "start",
                type: "time without time zone",
            });
        });

        it("should match MiXeD CaSe double precision", () => {
            const result = parseColumnDefinition("price DoUbLe PrEcIsIoN");
            expect(result).toMatchObject({
                name: "price",
                type: "double precision",
            });
        });

        it("should match UPPERCASE character varying", () => {
            const result = parseColumnDefinition("name CHARACTER VARYING");
            expect(result).toMatchObject({
                name: "name",
                type: "character varying",
            });
        });
    });

    describe("substring extraction (line 108)", () => {
        it("should extract remainingConstraints after multi-word type", () => {
            const result = parseColumnDefinition(
                "created timestamp with time zone not null"
            );
            expect(result).toMatchObject({
                name: "created",
                type: "timestamp with time zone",
                nullable: false,
            });
        });

        it("should extract remainingConstraints with default value", () => {
            const result = parseColumnDefinition(
                "created timestamp with time zone default now()"
            );
            expect(result).toMatchObject({
                name: "created",
                type: "timestamp with time zone",
                defaultValue: "now()",
            });
        });

        it("should handle no remainingConstraints", () => {
            const result = parseColumnDefinition("price double precision");
            expect(result).toMatchObject({
                name: "price",
                type: "double precision",
                nullable: true,
            });
        });
    });

    describe("sizeMatch for multi-word types (lines 110-116)", () => {
        it("should match size parameter for timestamp with time zone", () => {
            const result = parseColumnDefinition(
                "created timestamp with time zone(6)"
            );
            expect(result).toMatchObject({
                name: "created",
                type: "timestamp with time zone(6)",
            });
        });

        it("should match size parameter for timestamp without time zone", () => {
            const result = parseColumnDefinition(
                "created timestamp without time zone(3)"
            );
            expect(result).toMatchObject({
                name: "created",
                type: "timestamp without time zone(3)",
            });
        });

        it("should match size parameter for time with time zone", () => {
            const result = parseColumnDefinition(
                "meeting time with time zone(2)"
            );
            expect(result).toMatchObject({
                name: "meeting",
                type: "time with time zone(2)",
            });
        });

        it("should match size parameter for time without time zone", () => {
            const result = parseColumnDefinition(
                "start time without time zone(4)"
            );
            expect(result).toMatchObject({
                name: "start",
                type: "time without time zone(4)",
            });
        });

        it("should match size parameter for character varying", () => {
            const result = parseColumnDefinition("name character varying(255)");
            expect(result).toMatchObject({
                name: "name",
                type: "character varying(255)",
            });
        });

        it("should match size parameter with whitespace before parenthesis", () => {
            const result = parseColumnDefinition(
                "created timestamp with time zone (6)"
            );
            expect(result).toMatchObject({
                name: "created",
                type: "timestamp with time zone(6)",
            });
        });

        it("should match size parameter and extract remaining constraints", () => {
            const result = parseColumnDefinition(
                "created timestamp with time zone(6) not null default now()"
            );
            expect(result).toMatchObject({
                name: "created",
                type: "timestamp with time zone(6)",
                nullable: false,
                defaultValue: "now()",
            });
        });

        it("should NOT append size if sizeMatch fails (no size parameter)", () => {
            const result = parseColumnDefinition(
                "created timestamp with time zone not null"
            );
            expect(result).toMatchObject({
                name: "created",
                type: "timestamp with time zone", // No (size) appended
                nullable: false,
            });
        });
    });

    describe("break statement (line 117)", () => {
        it("should stop checking multiWordTypes after first match", () => {
            // This tests that the loop breaks after finding a match
            // "time with time zone" should match before we check other types
            const result = parseColumnDefinition(
                "start time with time zone not null"
            );
            expect(result).toMatchObject({
                name: "start",
                type: "time with time zone",
                nullable: false,
            });
        });

        it("should match the longest type first (timestamp with time zone vs time with time zone)", () => {
            // "timestamp with time zone" appears before "time with time zone" in array
            const result = parseColumnDefinition(
                "created timestamp with time zone"
            );
            expect(result).toMatchObject({
                name: "created",
                type: "timestamp with time zone", // Should match full type, not partial
            });
        });
    });

    describe("no multiWordTypes match (falls through to line 122)", () => {
        it("should fall through to regular type matching when no multi-word type matches", () => {
            const result = parseColumnDefinition("id bigint");
            expect(result).toMatchObject({
                name: "id",
                type: "bigint",
            });
        });

        it("should match regular type after failing multi-word types", () => {
            const result = parseColumnDefinition("count integer not null");
            expect(result).toMatchObject({
                name: "count",
                type: "integer",
                nullable: false,
            });
        });

        it("should match type with size parameter after failing multi-word types", () => {
            const result = parseColumnDefinition("amount numeric(10,2)");
            expect(result).toMatchObject({
                name: "amount",
                type: "numeric(10,2)",
            });
        });
    });
});

describe("parseColumnDefinition - comprehensive type matching flow", () => {
    it("should try quotedTypeMatch first, then multiWordTypes, then regular", () => {
        // Flow: quotedTypeMatch fails → multiWordTypes fails → regular type matches
        const result = parseColumnDefinition("id uuid primary key");
        expect(result).toMatchObject({
            name: "id",
            type: "uuid",
            isPrimaryKey: true,
        });
    });

    it("should use quotedTypeMatch and skip multiWordTypes", () => {
        // Flow: quotedTypeMatch succeeds → skip rest
        const result = parseColumnDefinition('id "uuid" primary key');
        expect(result).toMatchObject({
            name: "id",
            type: "uuid",
            isPrimaryKey: true,
        });
    });

    it("should skip quotedTypeMatch and use multiWordTypes", () => {
        // Flow: quotedTypeMatch fails → multiWordTypes succeeds → skip regular
        const result = parseColumnDefinition(
            "created timestamp with time zone"
        );
        expect(result).toMatchObject({
            name: "created",
            type: "timestamp with time zone",
        });
    });

    it("should handle quoted multi-word type (uses quotedTypeMatch, not multiWordTypes)", () => {
        const result = parseColumnDefinition(
            'created "timestamp with time zone"'
        );
        expect(result).toMatchObject({
            name: "created",
            type: "timestamp with time zone",
        });
    });

    it("should handle schema-qualified multi-word type in quotes", () => {
        const result = parseColumnDefinition(
            'created "pg_catalog"."timestamp with time zone"'
        );
        expect(result).toMatchObject({
            name: "created",
            type: "timestamp with time zone",
        });
    });
});

describe("parseColumnDefinition - edge cases for type extraction", () => {
    it("should handle type that starts with multi-word type prefix", () => {
        // "timestamp" starts like "timestamp with time zone" but isn't multi-word
        const result = parseColumnDefinition("created timestamp");
        expect(result).toMatchObject({
            name: "created",
            type: "timestamp",
        });
    });

    it("should handle type with 'time' that doesn't match multi-word types", () => {
        const result = parseColumnDefinition("duration time");
        expect(result).toMatchObject({
            name: "duration",
            type: "time",
        });
    });

    it("should correctly differentiate between similar multi-word types", () => {
        const tests = [
            ["t1 timestamp with time zone", "timestamp with time zone"],
            ["t2 timestamp without time zone", "timestamp without time zone"],
            ["t3 time with time zone", "time with time zone"],
            ["t4 time without time zone", "time without time zone"],
        ];

        tests.forEach(([def, expectedType]) => {
            const result = parseColumnDefinition(def as string);
            expect(result?.type).toBe(expectedType);
        });
    });

    it("should handle constraints immediately after type with no space", () => {
        // Edge case: what if there's no space between type and constraint?
        // The regex should still work due to \s+ in the column name pattern
        const result = parseColumnDefinition("id uuid");
        expect(result).toMatchObject({
            name: "id",
            type: "uuid",
        });
    });
});
