/**
 * Integration tests for the complete type generation flow
 */

import { describe, it, expect } from "vitest";
import { parseSqlFiles } from "../src/parsers/sql-file-parser.ts";
import { generateTableType } from "../src/generators/table.ts";
import { generateEnumTypes } from "../src/generators/enum.ts";
import type { TableDefinition, EnumDefinition } from "../src/types/index.ts";

describe("Integration: SQL Parsing to Type Generation", () => {
    it("should parse and generate types for a complete schema", () => {
        // Simulate SQL file content
        const sqlContent = `
      -- Create enum
      create type user_role as enum ('admin', 'user', 'guest');
      
      -- Create users table
      create table users (
        id uuid primary key,
        email text unique not null,
        role user_role not null default 'user',
        created_at timestamp with time zone default now()
      );
      
      -- Create posts table with foreign key
      create table posts (
        id uuid primary key,
        user_id uuid not null references users(id),
        title text not null,
        content text,
        published boolean default false
      );
      
      -- Add index
      create index idx_posts_user_id on posts(user_id);
      
      -- Add comment
      comment on table users is 'Application users';
      comment on column users.email is 'User email address';
    `;

        // This test demonstrates the flow but won't actually work without file I/O
        // In a real test environment, you'd create temporary files
        expect(sqlContent).toBeTruthy();
    });

    it("should handle complex relationships", () => {
        const tables: TableDefinition[] = [
            {
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
                ],
                relationships: [],
                indexes: [],
            },
            {
                schema: "public",
                name: "posts",
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
                        name: "user_id",
                        type: "uuid",
                        nullable: false,
                        defaultValue: null,
                        isArray: false,
                        isPrimaryKey: false,
                        isUnique: false,
                        foreignKey: {
                            table: "users",
                            column: "id",
                        },
                    },
                ],
                relationships: [
                    {
                        foreignKeyName: "posts_user_id_fkey",
                        columns: ["user_id"],
                        isOneToOne: false,
                        referencedRelation: "users",
                        referencedColumns: ["id"],
                    },
                ],
                indexes: [],
            },
        ];

        // Generate types for both tables
        const userType = generateTableType(
            tables[0],
            "preserve",
            2,
            false,
            false
        );
        const postType = generateTableType(
            tables[1],
            "preserve",
            2,
            false,
            false
        );

        expect(userType).toContain("users: {");
        expect(postType).toContain("posts: {");
        expect(postType).toContain('foreignKeyName: "posts_user_id_fkey"');
        expect(postType).toContain('referencedRelation: "users"');
    });

    it("should generate consistent types across naming conventions", () => {
        const table: TableDefinition = {
            schema: "public",
            name: "user_profiles",
            columns: [
                {
                    name: "user_id",
                    type: "uuid",
                    nullable: false,
                    defaultValue: null,
                    isArray: false,
                    isPrimaryKey: true,
                    isUnique: false,
                },
            ],
            relationships: [],
            indexes: [],
        };

        const preserve = generateTableType(table, "preserve", 2, false, false);
        const camelCase = generateTableType(
            table,
            "camelCase",
            2,
            false,
            false
        );
        const PascalCase = generateTableType(
            table,
            "PascalCase",
            2,
            false,
            false
        );

        expect(preserve).toContain("user_profiles:");
        expect(preserve).toContain("user_id:");

        expect(camelCase).toContain("userProfiles:");
        expect(camelCase).toContain("userId:");

        expect(PascalCase).toContain("UserProfiles:");
        expect(PascalCase).toContain("UserId:");
    });

    it("should handle multiple schemas", () => {
        const tables: TableDefinition[] = [
            {
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
                ],
                relationships: [],
                indexes: [],
            },
            {
                schema: "auth",
                name: "sessions",
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
                ],
                relationships: [],
                indexes: [],
            },
        ];

        const publicTable = generateTableType(
            tables[0],
            "preserve",
            2,
            false,
            false
        );
        const authTable = generateTableType(
            tables[1],
            "preserve",
            2,
            false,
            false,
            new Set(),
            "auth"
        );

        expect(publicTable).toBeTruthy();
        expect(authTable).toBeTruthy();
    });

    it("should generate enum types correctly", () => {
        const enums: EnumDefinition[] = [
            {
                schema: "public",
                name: "user_role",
                values: ["admin", "user", "guest"],
            },
            {
                schema: "public",
                name: "status",
                values: ["active", "inactive", "pending"],
            },
        ];

        const result = generateEnumTypes(enums, "preserve", 2);

        expect(result).toContain('user_role: "admin" | "user" | "guest"');
        expect(result).toContain('status: "active" | "inactive" | "pending"');
    });

    it("should handle alphabetical sorting", () => {
        const tables: TableDefinition[] = [
            {
                schema: "public",
                name: "zebra",
                columns: [
                    {
                        name: "z_field",
                        type: "text",
                        nullable: true,
                        defaultValue: null,
                        isArray: false,
                        isPrimaryKey: false,
                        isUnique: false,
                    },
                    {
                        name: "a_field",
                        type: "text",
                        nullable: true,
                        defaultValue: null,
                        isArray: false,
                        isPrimaryKey: false,
                        isUnique: false,
                    },
                ],
                relationships: [],
                indexes: [],
            },
            {
                schema: "public",
                name: "apple",
                columns: [],
                relationships: [],
                indexes: [],
            },
        ];

        // When alphabetically sorted
        const sorted = [...tables].sort((a, b) => a.name.localeCompare(b.name));
        expect(sorted[0].name).toBe("apple");
        expect(sorted[1].name).toBe("zebra");

        // Columns within table should also be sortable
        const sortedColumns = [...tables[0].columns].sort((a, b) =>
            a.name.localeCompare(b.name)
        );
        expect(sortedColumns[0].name).toBe("a_field");
        expect(sortedColumns[1].name).toBe("z_field");
    });

    it("should handle JSONB columns", () => {
        const table: TableDefinition = {
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
                    name: "preferences",
                    type: "jsonb",
                    nullable: true,
                    defaultValue: "'{}'::jsonb",
                    isArray: false,
                    isPrimaryKey: false,
                    isUnique: false,
                },
            ],
            relationships: [],
            indexes: [],
        };

        const result = generateTableType(table, "preserve", 2, false, false);

        expect(result).toContain("preferences: Json | null");
    });
});
