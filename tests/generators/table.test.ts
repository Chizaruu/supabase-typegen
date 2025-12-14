/**
 * Tests for table type generation
 */

import { describe, it, expect } from "vitest";
import { generateTableType } from "../../src/generators/table.js";
import type { TableDefinition } from "../../src/types/index.js";

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

    it("should handle empty indexes array", () => {
        const tableWithNoIndexes: TableDefinition = {
            ...basicTable,
            indexes: [],
        };

        const result = generateTableType(
            tableWithNoIndexes,
            "preserve",
            2,
            true,
            false
        );

        expect(result).toContain("Indexes: []");
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

    it("should handle indexes without method field", () => {
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
            true,
            false
        );

        expect(result).toContain("Indexes:");
        expect(result).toContain('name: "idx_users_email"');
        expect(result).not.toContain("method:");
    });

    it("should handle indexes with where clause", () => {
        const tableWithIndexes: TableDefinition = {
            ...basicTable,
            indexes: [
                {
                    name: "idx_active_users",
                    tableName: "users",
                    columns: ["email"],
                    isUnique: false,
                    method: "btree",
                    whereClause: "deleted_at IS NULL",
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
        expect(result).toContain('where: "deleted_at IS NULL"');
    });

    it("should escape quotes in where clause", () => {
        const tableWithIndexes: TableDefinition = {
            ...basicTable,
            indexes: [
                {
                    name: "idx_status_users",
                    tableName: "users",
                    columns: ["email"],
                    isUnique: false,
                    whereClause: 'status = "active"',
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

        expect(result).toContain('where: "status = \\"active\\""');
    });

    it("should use custom schema for enums", () => {
        const enums = new Set(["custom_enum"]);
        const tableWithEnum: TableDefinition = {
            ...basicTable,
            schema: "custom_schema",
            columns: [
                {
                    name: "status",
                    type: "custom_enum",
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
            enums,
            "custom_schema"
        );

        expect(result).toContain(
            'Database["custom_schema"]["Enums"]["custom_enum"]'
        );
    });

    it("should handle geometric types when enabled", () => {
        const tableWithGeometric: TableDefinition = {
            ...basicTable,
            columns: [
                {
                    name: "location",
                    type: "point",
                    nullable: true,
                    defaultValue: null,
                    isArray: false,
                    isPrimaryKey: false,
                    isUnique: false,
                },
            ],
        };

        const resultWithGeometric = generateTableType(
            tableWithGeometric,
            "preserve",
            2,
            false,
            false,
            new Set(),
            "public",
            true
        );

        const resultWithoutGeometric = generateTableType(
            tableWithGeometric,
            "preserve",
            2,
            false,
            false,
            new Set(),
            "public",
            false
        );

        expect(resultWithGeometric).toContain("location: Point | null");
        expect(resultWithoutGeometric).toContain("location: string | null");
    });
});
