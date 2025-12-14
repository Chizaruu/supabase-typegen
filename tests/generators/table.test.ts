/**
 * Tests for table type generation
 */

import { describe, it, expect } from "vitest";
import { generateTableType } from "../../src/generators/table.ts";
import type { TableDefinition } from "../../src/types/index.ts";

describe("generateTableType", () => {
    const basicTable: TableDefinition = {
        schema: "public",
        name: "users",
        columns: [
            {
                name: "id",
                type: "uuid",
                nullable: false,
                defaultValue: null,
                isArray: false,
                isPrimaryKey: true,
                isUnique: false,
            },
            {
                name: "email",
                type: "text",
                nullable: false,
                defaultValue: null,
                isArray: false,
                isPrimaryKey: false,
                isUnique: true,
            },
            {
                name: "created_at",
                type: "timestamp with time zone",
                nullable: true,
                defaultValue: "now()",
                isArray: false,
                isPrimaryKey: false,
                isUnique: false,
            },
        ],
        relationships: [],
        indexes: [],
    };

    it("should generate basic table type", () => {
        const result = generateTableType(
            basicTable,
            "preserve",
            2,
            false,
            false
        );

        expect(result).toContain("users: {");
        expect(result).toContain("Row: {");
        expect(result).toContain("Insert: {");
        expect(result).toContain("Update: {");
        expect(result).toContain("Relationships:");
    });

    it("should include column types in Row", () => {
        const result = generateTableType(
            basicTable,
            "preserve",
            2,
            false,
            false
        );

        expect(result).toContain("id: string");
        expect(result).toContain("email: string");
        expect(result).toContain("created_at: string | null");
    });

    it("should make columns with defaults optional in Insert", () => {
        const result = generateTableType(
            basicTable,
            "preserve",
            2,
            false,
            false
        );

        expect(result).toContain("id: string"); // no default, required
        expect(result).toContain("email: string"); // no default, required
        expect(result).toContain("created_at?: string | null"); // has default, optional
    });

    it("should make all columns optional in Update", () => {
        const result = generateTableType(
            basicTable,
            "preserve",
            2,
            false,
            false
        );

        expect(result).toContain("id?: string");
        expect(result).toContain("email?: string");
        expect(result).toContain("created_at?: string | null");
    });

    it("should apply naming convention", () => {
        const result = generateTableType(
            basicTable,
            "PascalCase",
            2,
            false,
            false
        );

        expect(result).toContain("Users: {");
        expect(result).toContain("Id: string");
        expect(result).toContain("Email: string");
        expect(result).toContain("CreatedAt: string | null");
    });

    it('should filter out "this" and "constraint" columns', () => {
        const tableWithReserved: TableDefinition = {
            ...basicTable,
            columns: [
                ...basicTable.columns,
                {
                    name: "this",
                    type: "text",
                    nullable: true,
                    defaultValue: null,
                    isArray: false,
                    isPrimaryKey: false,
                    isUnique: false,
                },
                {
                    name: "constraint",
                    type: "text",
                    nullable: true,
                    defaultValue: null,
                    isArray: false,
                    isPrimaryKey: false,
                    isUnique: false,
                },
            ],
        };

        const result = generateTableType(
            tableWithReserved,
            "preserve",
            2,
            false,
            false
        );

        expect(result).not.toContain("this:");
        expect(result).not.toContain("constraint:");
        expect(result).toContain("id: string");
        expect(result).toContain("email: string");
    });

    it("should include relationships", () => {
        const tableWithRelations: TableDefinition = {
            ...basicTable,
            relationships: [
                {
                    foreignKeyName: "users_role_id_fkey",
                    columns: ["role_id"],
                    isOneToOne: false,
                    referencedRelation: "roles",
                    referencedColumns: ["id"],
                },
            ],
        };

        const result = generateTableType(
            tableWithRelations,
            "preserve",
            2,
            false,
            false
        );

        expect(result).toContain('foreignKeyName: "users_role_id_fkey"');
        expect(result).toContain('columns: ["role_id"]');
        expect(result).toContain('referencedRelation: "roles"');
        expect(result).toContain("isOneToOne: false");
    });

    it("should include indexes when enabled", () => {
        const tableWithIndexes: TableDefinition = {
            ...basicTable,
            indexes: [
                {
                    name: "idx_users_email",
                    tableName: "users",
                    columns: ["email"],
                    isUnique: true,
                    method: "btree",
                },
            ],
        };

        const result = generateTableType(
            tableWithIndexes,
            "preserve",
            2,
            true,
            false
        );

        expect(result).toContain("Indexes:");
        expect(result).toContain('name: "idx_users_email"');
        expect(result).toContain('columns: ["email"]');
        expect(result).toContain("isUnique: true");
        expect(result).toContain('method: "btree"');
    });

    it("should not include indexes when disabled", () => {
        const tableWithIndexes: TableDefinition = {
            ...basicTable,
            indexes: [
                {
                    name: "idx_users_email",
                    tableName: "users",
                    columns: ["email"],
                    isUnique: true,
                },
            ],
        };

        const result = generateTableType(
            tableWithIndexes,
            "preserve",
            2,
            false,
            false
        );

        expect(result).not.toContain("Indexes:");
    });

    it("should include table comments as JSDoc", () => {
        const tableWithComment: TableDefinition = {
            ...basicTable,
            comment: "Application users table",
        };

        const result = generateTableType(
            tableWithComment,
            "preserve",
            2,
            false,
            true
        );

        expect(result).toContain("/**");
        expect(result).toContain("* Application users table");
        expect(result).toContain("*/");
    });

    it("should include column comments as JSDoc", () => {
        const tableWithColumnComments: TableDefinition = {
            ...basicTable,
            columns: [
                {
                    ...basicTable.columns[0],
                    comment: "Unique identifier",
                },
                {
                    ...basicTable.columns[1],
                    comment: "User email address",
                },
            ],
        };

        const result = generateTableType(
            tableWithColumnComments,
            "preserve",
            2,
            false,
            true
        );

        expect(result).toContain("/** Unique identifier */");
        expect(result).toContain("/** User email address */");
    });

    it("should handle custom indentation", () => {
        const result4Spaces = generateTableType(
            basicTable,
            "preserve",
            4,
            false,
            false
        );
        const result2Spaces = generateTableType(
            basicTable,
            "preserve",
            2,
            false,
            false
        );

        expect(result4Spaces).toContain("    "); // 4 spaces
        expect(result2Spaces).toContain("  "); // 2 spaces
        expect(result4Spaces.length).toBeGreaterThan(result2Spaces.length);
    });

    it("should handle array columns", () => {
        const tableWithArray: TableDefinition = {
            ...basicTable,
            columns: [
                {
                    name: "tags",
                    type: "text",
                    nullable: true,
                    defaultValue: null,
                    isArray: true,
                    isPrimaryKey: false,
                    isUnique: false,
                },
            ],
        };

        const result = generateTableType(
            tableWithArray,
            "preserve",
            2,
            false,
            false
        );

        expect(result).toContain("tags: string[] | null");
    });

    it("should handle enum columns", () => {
        const enums = new Set(["user_role"]);
        const tableWithEnum: TableDefinition = {
            ...basicTable,
            columns: [
                {
                    name: "role",
                    type: "user_role",
                    nullable: false,
                    defaultValue: null,
                    isArray: false,
                    isPrimaryKey: false,
                    isUnique: false,
                },
            ],
        };

        const result = generateTableType(
            tableWithEnum,
            "preserve",
            2,
            false,
            false,
            enums
        );

        expect(result).toContain('Database["public"]["Enums"]["user_role"]');
    });
});
