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

    it("should parse array column with brackets", () => {
        const result = parseColumnDefinition("tags text[]");
        expect(result).toMatchObject({
            name: "tags",
            type: "text",
            isArray: true,
        });
    });

    it("should parse array column with ARRAY keyword", () => {
        const result = parseColumnDefinition("numbers integer array");
        expect(result).toMatchObject({
            name: "numbers",
            type: "integer",
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

    it("should parse multi-word type with size parameter", () => {
        const result = parseColumnDefinition(
            "created timestamp with time zone(6)"
        );
        expect(result).toMatchObject({
            name: "created",
            type: "timestamp with time zone(6)",
        });
    });

    it("should parse multi-word type in mixed case", () => {
        const result = parseColumnDefinition(
            "created TIMESTAMP WITH TIME ZONE default now()"
        );
        expect(result).toMatchObject({
            name: "created",
            type: "timestamp with time zone",
            defaultValue: "now()",
        });
    });

    it("should return null for invalid column definition without type", () => {
        const result = parseColumnDefinition("just_a_name");
        expect(result).toBeNull();
    });

    it("should return null for invalid column definition", () => {
        const result = parseColumnDefinition("column_name @#$invalid");
        expect(result).toBeNull();
    });

    it("should handle default value followed by check constraint", () => {
        const result = parseColumnDefinition(
            "age integer default 0 check (age >= 0)"
        );
        expect(result).toMatchObject({
            name: "age",
            type: "integer",
            defaultValue: "0",
        });
    });

    it("should handle unique column that is also primary key", () => {
        const result = parseColumnDefinition("id uuid unique primary key");
        expect(result).toMatchObject({
            name: "id",
            type: "uuid",
            isPrimaryKey: true,
            isUnique: false,
        });
    });

    it("should parse foreign key with quoted identifiers", () => {
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

    it("should not include schema in foreignKey when not specified", () => {
        const result = parseColumnDefinition(
            "category_id uuid references categories(id)"
        );
        expect(result?.foreignKey?.schema).toBeUndefined();
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
        expect(result!.relationships[0]).toMatchObject({
            foreignKeyName: "fk_user",
            referencedRelation: "auth.users",
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

    it("should skip table-level constraints", () => {
        const sql = `
      create table users (
        id uuid,
        email text,
        primary key (id),
        unique (email),
        check (true)
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

    it("should return null for invalid SQL", () => {
        const sql = "not a valid create table statement";
        const result = parseTableDefinition(sql);

        expect(result).toBeNull();
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

    it("should handle SQL comments", () => {
        const sql = `
      create table users (
        id uuid primary key,
        email text not null
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.columns).toHaveLength(2);
    });

    it("should handle table with strings containing escaped quotes", () => {
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

    it("should handle quoted table and column names", () => {
        const sql = `
      create table "user-profiles" (
        "user-id" uuid,
        "first-name" text
      )
    `;
        const result = parseTableDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.name).toBe("user-profiles");
        expect(result!.columns[0].name).toBe("user-id");
        expect(result!.columns[1].name).toBe("first-name");
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

    it("should handle constraint with quoted column names", () => {
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

    it("should handle complex real-world table", () => {
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
        expect(result!.relationships).toHaveLength(4);
    });

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
});

describe("parseColumnDefinition - quotedTypeMatch extraction", () => {
    it("should extract type from group 2 when both schema and type are present", () => {
        const result = parseColumnDefinition('id "public"."uuid"');
        expect(result).toMatchObject({
            name: "id",
            type: "uuid",
        });
    });

    it("should extract type from group 2 when only type is quoted", () => {
        const result = parseColumnDefinition('id "uuid" primary key');
        expect(result).toMatchObject({
            name: "id",
            type: "uuid",
            isPrimaryKey: true,
        });
    });

    it("should never use schema as type when both exist", () => {
        const result = parseColumnDefinition('id "auth"."uuid"');
        expect(result?.type).toBe("uuid");
        expect(result?.type).not.toBe("auth");
    });
});
