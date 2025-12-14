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

    it("should parse index with quoted names", () => {
        const sql = `create index "idx-users-email" on "users"("email")`;
        const result = parseIndexDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.name).toBe("idx-users-email");
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

    it("should handle expression-based index columns", () => {
        const sql = `create index idx_users_lower_email on users(lower(email))`;
        const result = parseIndexDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.columns).toContain("lower(email)");
    });

    it("should handle concurrent index creation", () => {
        const sql = `create index concurrently idx_users_email on users(email)`;
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
});
