/**
 * Tests for index definition parser
 */

import { describe, it, expect } from "vitest";
import { parseIndexDefinition } from "../../../src/parsers/sql/index.ts";

describe("parseIndexDefinition", () => {
    it("should parse basic index", () => {
        const sql = `create index idx_users_email on users(email)`;
        const result = parseIndexDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.name).toBe("idx_users_email");
        expect(result!.tableName).toBe("users");
        expect(result!.columns).toEqual(["email"]);
        expect(result!.isUnique).toBe(false);
    });

    it("should parse unique index", () => {
        const sql = `create unique index idx_unique_email on users(email)`;
        const result = parseIndexDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.isUnique).toBe(true);
    });

    it("should parse index with multiple columns", () => {
        const sql = `create index idx_user_name on users(first_name, last_name)`;
        const result = parseIndexDefinition(sql);

        expect(result!.columns).toEqual(["first_name", "last_name"]);
    });

    it("should parse index with USING clause", () => {
        const sql = `create index idx_users_data on users using gin(data)`;
        const result = parseIndexDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.method).toBe("gin");
    });

    it("should parse index with btree method", () => {
        const sql = `create index idx_users_id on users using btree(id)`;
        const result = parseIndexDefinition(sql);

        expect(result!.method).toBe("btree");
    });

    it("should parse index with WHERE clause", () => {
        const sql = `create index idx_active_users on users(email) where active = true`;
        const result = parseIndexDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.whereClause).toBe("active = true");
    });

    it("should parse index with complex WHERE clause", () => {
        const sql = `create index idx_recent_posts on posts(created_at) where created_at > '2024-01-01' and published = true`;
        const result = parseIndexDefinition(sql);

        expect(result!.whereClause).toBe(
            "created_at > '2024-01-01' and published = true"
        );
    });

    it("should parse if not exists index", () => {
        const sql = `create index if not exists idx_users_email on users(email)`;
        const result = parseIndexDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.name).toBe("idx_users_email");
    });

    it("should parse index with quoted names without hyphens", () => {
        const sql = `create index "idx_users_email" on "users"("email")`;
        const result = parseIndexDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.name).toBe("idx_users_email");
        expect(result!.tableName).toBe("users");
    });

    it("should parse index with schema-qualified table", () => {
        const sql = `create index idx_auth_users on auth.users(email)`;
        const result = parseIndexDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.tableName).toBe("users");
    });

    it("should return null for invalid SQL", () => {
        const sql = "not an index definition";
        const result = parseIndexDefinition(sql);

        expect(result).toBeNull();
    });

    it("should parse index with hash method", () => {
        const sql = `create index idx_users_id on users using hash(id)`;
        const result = parseIndexDefinition(sql);

        expect(result!.method).toBe("hash");
    });

    it("should parse index with gist method", () => {
        const sql = `create index idx_locations on locations using gist(coordinates)`;
        const result = parseIndexDefinition(sql);

        expect(result!.method).toBe("gist");
    });

    it("should handle simple column names in indexes", () => {
        const sql = `create index idx_users_email on users(email)`;
        const result = parseIndexDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.columns).toContain("email");
    });

    it("should parse index without concurrent keyword", () => {
        const sql = `create index idx_users_email on users(email)`;
        const result = parseIndexDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.name).toBe("idx_users_email");
    });

    it("should parse unique index with where clause", () => {
        const sql = `create unique index idx_active_emails on users(email) where active = true`;
        const result = parseIndexDefinition(sql);

        expect(result!.isUnique).toBe(true);
        expect(result!.whereClause).toBe("active = true");
    });

    it("should parse index with CONCURRENTLY keyword", () => {
        const sql = `create index concurrently idx_users_email on users(email)`;
        const result = parseIndexDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.name).toBe("idx_users_email");
        expect(result!.tableName).toBe("users");
    });

    it("should parse unique index concurrently", () => {
        const sql = `create unique index concurrently idx_users_email on users(email)`;
        const result = parseIndexDefinition(sql);

        expect(result!.isUnique).toBe(true);
        expect(result!.name).toBe("idx_users_email");
    });

    it("should parse index with function expression", () => {
        const sql = `create index idx_lower_email on users(lower(email))`;
        const result = parseIndexDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.columns).toEqual(["lower(email)"]);
    });

    it("should parse index with multiple function expressions", () => {
        const sql = `create index idx_names on users(lower(first_name), upper(last_name))`;
        const result = parseIndexDefinition(sql);

        expect(result!.columns).toEqual([
            "lower(first_name)",
            "upper(last_name)",
        ]);
    });

    it("should parse index with nested parentheses in expression", () => {
        const sql = `create index idx_date on posts((created_at::date))`;
        const result = parseIndexDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.columns).toEqual(["(created_at::date)"]);
    });

    it("should parse index with complex json expression", () => {
        const sql = `create index idx_json_field on users((data->>'email'))`;
        const result = parseIndexDefinition(sql);

        expect(result!.columns).toEqual(["(data->>'email')"]);
    });

    it("should parse index with mixed expressions and columns", () => {
        const sql = `create index idx_mixed on users(id, lower(email), created_at)`;
        const result = parseIndexDefinition(sql);

        expect(result!.columns).toEqual(["id", "lower(email)", "created_at"]);
    });

    it("should handle extra whitespace", () => {
        const sql = `create   index    idx_users_email   on   users  (  email  )`;
        const result = parseIndexDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.name).toBe("idx_users_email");
        expect(result!.tableName).toBe("users");
        expect(result!.columns).toEqual(["email"]);
    });

    it("should parse index with quoted identifier containing special characters", () => {
        const sql = `create index "idx-users-email" on "users"("email")`;
        const result = parseIndexDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.name).toBe("idx-users-email");
    });

    it("should parse index with mixed quoted and unquoted identifiers", () => {
        const sql = `create index idx_users on "users"(email, "first_name")`;
        const result = parseIndexDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.columns).toEqual(["email", "first_name"]);
    });

    it("should parse GIN index with jsonb operations", () => {
        const sql = `create index idx_data on users using gin(data jsonb_path_ops)`;
        const result = parseIndexDefinition(sql);

        expect(result!.method).toBe("gin");
        expect(result!.columns).toEqual(["data jsonb_path_ops"]);
    });

    it("should parse index with WHERE clause containing OR", () => {
        const sql = `create index idx_status on users(status) where status = 'active' or status = 'pending'`;
        const result = parseIndexDefinition(sql);

        expect(result!.whereClause).toBe(
            "status = 'active' or status = 'pending'"
        );
    });

    it("should parse index with WHERE clause containing IS NOT NULL", () => {
        const sql = `create index idx_not_null_email on users(email) where email is not null`;
        const result = parseIndexDefinition(sql);

        expect(result!.whereClause).toBe("email is not null");
    });

    it("should parse index with WHERE clause containing subquery-like syntax", () => {
        const sql = `create index idx_dates on events(date) where date >= current_date`;
        const result = parseIndexDefinition(sql);

        expect(result!.whereClause).toBe("date >= current_date");
    });

    it("should handle case insensitivity in keywords", () => {
        const sql = `CREATE UNIQUE INDEX idx_users ON users(email) WHERE active = TRUE`;
        const result = parseIndexDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.isUnique).toBe(true);
        expect(result!.whereClause).toBe("active = TRUE");
    });

    it("should parse BRIN index", () => {
        const sql = `create index idx_created on events using brin(created_at)`;
        const result = parseIndexDefinition(sql);

        expect(result!.method).toBe("brin");
    });

    it("should parse SP-GiST index", () => {
        const sql = `create index idx_ranges on events using spgist(date_range)`;
        const result = parseIndexDefinition(sql);

        expect(result!.method).toBe("spgist");
    });

    it("should parse index with table having schema prefix", () => {
        const sql = `create index idx_users on public.users(email)`;
        const result = parseIndexDefinition(sql);

        expect(result!.tableName).toBe("users");
    });

    it("should parse index with quoted schema and table", () => {
        const sql = `create index idx_users on "auth"."users"(email)`;
        const result = parseIndexDefinition(sql);

        expect(result!.tableName).toBe("users");
    });

    it("should parse index with single quote in WHERE clause", () => {
        const sql = `create index idx_type on items(type) where type = 'user''s item'`;
        const result = parseIndexDefinition(sql);

        expect(result!.whereClause).toBe("type = 'user''s item'");
    });

    it("should return null for CREATE TABLE statement", () => {
        const sql = "create table users (id int primary key)";
        const result = parseIndexDefinition(sql);

        expect(result).toBeNull();
    });

    it("should return null for empty string", () => {
        const sql = "";
        const result = parseIndexDefinition(sql);

        expect(result).toBeNull();
    });

    it("should parse all keywords combined", () => {
        const sql = `create unique index concurrently if not exists idx_users on schema.users using btree(lower(email)) where active = true`;
        const result = parseIndexDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.isUnique).toBe(true);
        expect(result!.name).toBe("idx_users");
        expect(result!.tableName).toBe("users");
        expect(result!.method).toBe("btree");
        expect(result!.columns).toEqual(["lower(email)"]);
        expect(result!.whereClause).toBe("active = true");
    });

    it("should parse index with date_trunc function", () => {
        const sql = `create index idx_date_truncated on events(date_trunc('day', created_at))`;
        const result = parseIndexDefinition(sql);

        expect(result!.columns).toEqual(["date_trunc('day', created_at)"]);
    });

    it("should parse index with coalesce function", () => {
        const sql = `create index idx_coalesced on users(coalesce(email, username))`;
        const result = parseIndexDefinition(sql);

        expect(result!.columns).toEqual(["coalesce(email, username)"]);
    });

    it("should handle index on expression with operators", () => {
        const sql = `create index idx_calc on products((price * quantity))`;
        const result = parseIndexDefinition(sql);

        expect(result!.columns).toEqual(["(price * quantity)"]);
    });

    it("should return null for unclosed parenthesis in column list", () => {
        const sql = `create index idx_users on users(email, first_name`;
        const result = parseIndexDefinition(sql);

        expect(result).toBeNull();
    });

    it("should return null for extra opening parenthesis", () => {
        const sql = `create index idx_users on users((email)`;
        const result = parseIndexDefinition(sql);

        expect(result).toBeNull();
    });

    it("should return null for missing opening parenthesis", () => {
        const sql = `create index idx_users on users email)`;
        const result = parseIndexDefinition(sql);

        expect(result).toBeNull();
    });

    it("should return null for unbalanced nested parentheses", () => {
        const sql = `create index idx_calc on products((price * (quantity + 1))`;
        const result = parseIndexDefinition(sql);

        expect(result).toBeNull();
    });

    it("should return null for column list that never closes", () => {
        const sql = `create index idx_users on users(lower(email), upper(username`;
        const result = parseIndexDefinition(sql);

        expect(result).toBeNull();
    });

    it("should return null for malformed expression with unclosed function", () => {
        const sql = `create index idx_dates on events(date_trunc('day', created_at`;
        const result = parseIndexDefinition(sql);

        expect(result).toBeNull();
    });
});
