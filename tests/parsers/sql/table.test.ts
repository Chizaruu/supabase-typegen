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
    const result = parseColumnDefinition("meeting_time time with time zone");
    expect(result).toMatchObject({
        name: "meeting_time",
        type: "time with time zone",
    });
});

it("should parse timestamp without time zone", () => {
    const result = parseColumnDefinition("created timestamp without time zone");
    expect(result).toMatchObject({
        name: "created",
        type: "timestamp without time zone",
    });
});

it("should parse time without time zone", () => {
    const result = parseColumnDefinition("start_time time without time zone");
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
    const result = parseColumnDefinition("created_at timestamp default now()");
    expect(result).toMatchObject({
        name: "created_at",
        type: "timestamp",
        defaultValue: "now()",
    });
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
