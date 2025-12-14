/**
 * Tests for constraint parser
 */

import { describe, it, expect } from "vitest";
import {
    parseAlterTableForeignKey,
    parseAlterTableUnique,
} from "../../../src/parsers/sql/constraint.js";

describe("parseAlterTableForeignKey", () => {
    it("should parse basic foreign key", () => {
        const sql = `alter table posts add constraint fk_user foreign key (user_id) references users(id)`;
        const result = parseAlterTableForeignKey(sql);

        expect(result).toBeTruthy();
        expect(result!.tableName).toBe("posts");
        expect(result!.relationship.foreignKeyName).toBe("fk_user");
        expect(result!.relationship.columns).toEqual(["user_id"]);
        expect(result!.relationship.referencedRelation).toBe("users");
        expect(result!.relationship.referencedColumns).toEqual(["id"]);
    });

    it("should parse foreign key with schema", () => {
        const sql = `alter table public.posts add constraint fk_author foreign key (author_id) references auth.users(id)`;
        const result = parseAlterTableForeignKey(sql);

        expect(result).toBeTruthy();
        expect(result!.tableName).toBe("posts");
        expect(result!.relationship.referencedRelation).toBe("users");
    });

    it("should parse multi-column foreign key", () => {
        const sql = `alter table order_items add constraint fk_order_product foreign key (order_id, product_id) references orders(id, product_id)`;
        const result = parseAlterTableForeignKey(sql);

        expect(result!.relationship.columns).toEqual([
            "order_id",
            "product_id",
        ]);
        expect(result!.relationship.referencedColumns).toEqual([
            "id",
            "product_id",
        ]);
    });

    it("should parse foreign key with on delete cascade", () => {
        const sql = `alter table posts add constraint fk_user foreign key (user_id) references users(id) on delete cascade`;
        const result = parseAlterTableForeignKey(sql);

        expect(result).toBeTruthy();
        expect(result!.relationship.foreignKeyName).toBe("fk_user");
    });

    it("should parse foreign key with on update", () => {
        const sql = `alter table posts add constraint fk_user foreign key (user_id) references users(id) on update cascade`;
        const result = parseAlterTableForeignKey(sql);

        expect(result).toBeTruthy();
    });

    it("should parse quoted table names", () => {
        const sql = `alter table "UserPosts" add constraint fk_user foreign key (user_id) references "Users"(id)`;
        const result = parseAlterTableForeignKey(sql);

        expect(result!.tableName).toBe("UserPosts");
        expect(result!.relationship.referencedRelation).toBe("Users");
    });

    it("should parse quoted column names", () => {
        const sql = `alter table posts add constraint fk_user foreign key ("userId") references users("id")`;
        const result = parseAlterTableForeignKey(sql);

        expect(result!.relationship.columns).toEqual(["userId"]);
        expect(result!.relationship.referencedColumns).toEqual(["id"]);
    });

    it("should return null for non-foreign key constraint", () => {
        const sql = `alter table users add constraint unique_email unique(email)`;
        const result = parseAlterTableForeignKey(sql);

        expect(result).toBeNull();
    });

    it("should return null for invalid SQL", () => {
        const sql = "not a constraint statement";
        const result = parseAlterTableForeignKey(sql);

        expect(result).toBeNull();
    });

    it("should parse foreign key without if exists", () => {
        const sql = `alter table posts add constraint fk_user foreign key (user_id) references users(id)`;
        const result = parseAlterTableForeignKey(sql);

        expect(result).toBeTruthy();
        expect(result!.tableName).toBe("posts");
    });
});

describe("parseAlterTableUnique", () => {
    it("should parse basic unique constraint", () => {
        const sql = `alter table users add constraint unique_email unique(email)`;
        const result = parseAlterTableUnique(sql);

        expect(result).toBeTruthy();
        expect(result!.tableName).toBe("users");
        expect(result!.columns).toEqual(["email"]);
    });

    it("should parse unique constraint with schema", () => {
        const sql = `alter table auth.users add constraint unique_username unique(username)`;
        const result = parseAlterTableUnique(sql);

        expect(result!.tableName).toBe("users");
    });

    it("should parse multi-column unique constraint", () => {
        const sql = `alter table users add constraint unique_name unique(first_name, last_name)`;
        const result = parseAlterTableUnique(sql);

        expect(result!.columns).toEqual(["first_name", "last_name"]);
    });

    it("should parse quoted table name", () => {
        const sql = `alter table "UserProfiles" add constraint unique_email unique(email)`;
        const result = parseAlterTableUnique(sql);

        expect(result!.tableName).toBe("UserProfiles");
    });

    it("should parse quoted column names", () => {
        const sql = `alter table users add constraint unique_name unique("firstName", "lastName")`;
        const result = parseAlterTableUnique(sql);

        expect(result!.columns).toEqual(["firstName", "lastName"]);
    });

    it("should parse unique constraint without if exists", () => {
        const sql = `alter table users add constraint unique_email unique(email)`;
        const result = parseAlterTableUnique(sql);

        expect(result).toBeTruthy();
        expect(result!.tableName).toBe("users");
    });

    it("should return null for non-unique constraint", () => {
        const sql = `alter table posts add constraint fk_user foreign key (user_id) references users(id)`;
        const result = parseAlterTableUnique(sql);

        expect(result).toBeNull();
    });

    it("should return null for invalid SQL", () => {
        const sql = "not a constraint statement";
        const result = parseAlterTableUnique(sql);

        expect(result).toBeNull();
    });

    it("should handle three-column unique constraint", () => {
        const sql = `alter table items add constraint unique_item unique(category, subcategory, name)`;
        const result = parseAlterTableUnique(sql);

        expect(result!.columns).toEqual(["category", "subcategory", "name"]);
    });

    it("should parse single column unique", () => {
        const sql = `alter table products add constraint unique_sku unique(sku)`;
        const result = parseAlterTableUnique(sql);

        expect(result!.columns).toHaveLength(1);
        expect(result!.columns[0]).toBe("sku");
    });
});
