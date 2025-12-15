/**
 * Tests for view type generation
 *
 * Coverage targets:
 * - generateViewType: single view type generation with all options
 * - generateViewTypes: multiple view types generation
 */

import { describe, it, expect } from "vitest";
import {
    generateViewType,
    generateViewTypes,
} from "../../src/generators/view.js";
import type {
    ViewDefinition,
    ColumnDefinition,
} from "../../src/types/index.js";

describe("View Type Generator", () => {
    describe("generateViewType", () => {
        describe("Basic view generation", () => {
            it("should generate basic view type with columns", () => {
                const view: ViewDefinition = {
                    schema: "public",
                    name: "user_summary",
                    columns: [
                        {
                            name: "id",
                            type: "uuid",
                            nullable: false,
                            defaultValue: null,
                            isArray: false,
                            isPrimaryKey: false,
                            isUnique: false,
                        },
                        {
                            name: "name",
                            type: "text",
                            nullable: false,
                            defaultValue: null,
                            isArray: false,
                            isPrimaryKey: false,
                            isUnique: false,
                        },
                    ],
                    isMaterialized: false,
                };

                const result = generateViewType(view, "snake_case");

                expect(result).toContain("user_summary: {");
                expect(result).toContain("Row: {");
                expect(result).toContain("id: string");
                expect(result).toContain("name: string");
                expect(result).toContain("Relationships: []");
            });

            it("should generate view type without columns (placeholder)", () => {
                const view: ViewDefinition = {
                    schema: "public",
                    name: "unknown_view",
                    columns: [],
                    isMaterialized: false,
                };

                const result = generateViewType(view, "snake_case");

                expect(result).toContain("unknown_view: {");
                expect(result).toContain("Row: {");
                expect(result).toContain(
                    "// Column types could not be inferred from SQL"
                );
                expect(result).toContain(
                    "// Use database introspection or manually define columns"
                );
                expect(result).toContain("[key: string]: unknown");
            });

            it("should only generate Row type (not Insert/Update)", () => {
                const view: ViewDefinition = {
                    schema: "public",
                    name: "test_view",
                    columns: [
                        {
                            name: "id",
                            type: "integer",
                            nullable: false,
                            defaultValue: null,
                            isArray: false,
                            isPrimaryKey: false,
                            isUnique: false,
                        },
                    ],
                    isMaterialized: false,
                };

                const result = generateViewType(view, "snake_case");

                expect(result).toContain("Row: {");
                expect(result).not.toContain("Insert:");
                expect(result).not.toContain("Update:");
            });
        });

        describe("Naming conventions", () => {
            const view: ViewDefinition = {
                schema: "public",
                name: "user_posts",
                columns: [
                    {
                        name: "user_id",
                        type: "integer",
                        nullable: false,
                        defaultValue: null,
                        isArray: false,
                        isPrimaryKey: false,
                        isUnique: false,
                    },
                ],
                isMaterialized: false,
            };

            it("should apply camelCase convention", () => {
                const result = generateViewType(view, "camelCase");

                expect(result).toContain("userPosts: {");
                expect(result).toContain("userId: number");
            });

            it("should apply PascalCase convention", () => {
                const result = generateViewType(view, "PascalCase");

                expect(result).toContain("UserPosts: {");
                expect(result).toContain("UserId: number");
            });

            it("should apply snake_case convention", () => {
                const result = generateViewType(view, "snake_case");

                expect(result).toContain("user_posts: {");
                expect(result).toContain("user_id: number");
            });
        });

        describe("Column types", () => {
            it("should map PostgreSQL types to TypeScript", () => {
                const view: ViewDefinition = {
                    schema: "public",
                    name: "type_test",
                    columns: [
                        {
                            name: "text_col",
                            type: "text",
                            nullable: false,
                            defaultValue: null,
                            isArray: false,
                            isPrimaryKey: false,
                            isUnique: false,
                        },
                        {
                            name: "int_col",
                            type: "integer",
                            nullable: false,
                            defaultValue: null,
                            isArray: false,
                            isPrimaryKey: false,
                            isUnique: false,
                        },
                        {
                            name: "bool_col",
                            type: "boolean",
                            nullable: false,
                            defaultValue: null,
                            isArray: false,
                            isPrimaryKey: false,
                            isUnique: false,
                        },
                        {
                            name: "json_col",
                            type: "jsonb",
                            nullable: false,
                            defaultValue: null,
                            isArray: false,
                            isPrimaryKey: false,
                            isUnique: false,
                        },
                    ],
                    isMaterialized: false,
                };

                const result = generateViewType(view, "snake_case");

                expect(result).toContain("text_col: string");
                expect(result).toContain("int_col: number");
                expect(result).toContain("bool_col: boolean");
                expect(result).toContain("json_col: Json");
            });

            it("should handle nullable columns", () => {
                const view: ViewDefinition = {
                    schema: "public",
                    name: "nullable_test",
                    columns: [
                        {
                            name: "required",
                            type: "text",
                            nullable: false,
                            defaultValue: null,
                            isArray: false,
                            isPrimaryKey: false,
                            isUnique: false,
                        },
                        {
                            name: "optional",
                            type: "text",
                            nullable: true,
                            defaultValue: null,
                            isArray: false,
                            isPrimaryKey: false,
                            isUnique: false,
                        },
                    ],
                    isMaterialized: false,
                };

                const result = generateViewType(view, "snake_case");

                expect(result).toContain("required: string");
                expect(result).not.toContain("required: string | null");
                expect(result).toContain("optional: string | null");
            });

            it("should handle array columns", () => {
                const view: ViewDefinition = {
                    schema: "public",
                    name: "array_test",
                    columns: [
                        {
                            name: "tags",
                            type: "text",
                            nullable: false,
                            defaultValue: null,
                            isArray: true,
                            isPrimaryKey: false,
                            isUnique: false,
                        },
                    ],
                    isMaterialized: false,
                };

                const result = generateViewType(view, "snake_case");

                expect(result).toContain("tags: string[]");
            });

            it("should handle nullable array columns", () => {
                const view: ViewDefinition = {
                    schema: "public",
                    name: "nullable_array_test",
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
                    isMaterialized: false,
                };

                const result = generateViewType(view, "snake_case");

                expect(result).toContain("tags: string[] | null");
            });
        });

        describe("Comments", () => {
            it("should include view comment when includeComments is true", () => {
                const view: ViewDefinition = {
                    schema: "public",
                    name: "commented_view",
                    columns: [],
                    isMaterialized: false,
                    comment: "This is a test view",
                };

                const result = generateViewType(view, "snake_case", 2, true);

                expect(result).toContain("/**");
                expect(result).toContain("* This is a test view");
                expect(result).toContain("*/");
            });

            it("should not include view comment when includeComments is false", () => {
                const view: ViewDefinition = {
                    schema: "public",
                    name: "no_comment_view",
                    columns: [],
                    isMaterialized: false,
                    comment: "This comment should not appear",
                };

                const result = generateViewType(view, "snake_case", 2, false);

                expect(result).not.toContain("/**");
                expect(result).not.toContain("This comment should not appear");
            });

            it("should include column comments when includeComments is true", () => {
                const view: ViewDefinition = {
                    schema: "public",
                    name: "column_comments",
                    columns: [
                        {
                            name: "id",
                            type: "integer",
                            nullable: false,
                            defaultValue: null,
                            isArray: false,
                            isPrimaryKey: false,
                            isUnique: false,
                            comment: "User identifier",
                        },
                    ],
                    isMaterialized: false,
                };

                const result = generateViewType(view, "snake_case", 2, true);

                expect(result).toContain("/** User identifier */");
            });

            it("should not include column comments when includeComments is false", () => {
                const view: ViewDefinition = {
                    schema: "public",
                    name: "no_column_comments",
                    columns: [
                        {
                            name: "id",
                            type: "integer",
                            nullable: false,
                            defaultValue: null,
                            isArray: false,
                            isPrimaryKey: false,
                            isUnique: false,
                            comment: "This should not appear",
                        },
                    ],
                    isMaterialized: false,
                };

                const result = generateViewType(view, "snake_case", 2, false);

                expect(result).not.toContain("This should not appear");
            });

            it("should include materialized view indicator in comment", () => {
                const view: ViewDefinition = {
                    schema: "public",
                    name: "mat_view",
                    columns: [],
                    isMaterialized: true,
                };

                const result = generateViewType(view, "snake_case", 2, true);

                expect(result).toContain("/**");
                expect(result).toContain("* Materialized View");
                expect(result).toContain("*/");
            });

            it("should include both materialized indicator and custom comment", () => {
                const view: ViewDefinition = {
                    schema: "public",
                    name: "mat_view_commented",
                    columns: [],
                    isMaterialized: true,
                    comment: "Custom description",
                };

                const result = generateViewType(view, "snake_case", 2, true);

                expect(result).toContain("* Materialized View");
                expect(result).toContain("* Custom description");
            });
        });

        describe("Materialized views", () => {
            it("should generate materialized view type", () => {
                const view: ViewDefinition = {
                    schema: "public",
                    name: "mat_summary",
                    columns: [
                        {
                            name: "id",
                            type: "integer",
                            nullable: false,
                            defaultValue: null,
                            isArray: false,
                            isPrimaryKey: false,
                            isUnique: false,
                        },
                    ],
                    isMaterialized: true,
                };

                const result = generateViewType(view, "snake_case");

                expect(result).toContain("mat_summary: {");
                expect(result).toContain("Row: {");
                expect(result).toContain("id: number");
            });

            it("should not differentiate materialized view structure (only comment)", () => {
                const regularView: ViewDefinition = {
                    schema: "public",
                    name: "regular",
                    columns: [
                        {
                            name: "id",
                            type: "integer",
                            nullable: false,
                            defaultValue: null,
                            isArray: false,
                            isPrimaryKey: false,
                            isUnique: false,
                        },
                    ],
                    isMaterialized: false,
                };

                const materializedView: ViewDefinition = {
                    ...regularView,
                    name: "materialized",
                    isMaterialized: true,
                };

                const regularResult = generateViewType(
                    regularView,
                    "snake_case",
                    2,
                    false
                );
                const matResult = generateViewType(
                    materializedView,
                    "snake_case",
                    2,
                    false
                );

                const regularNormalized = regularResult
                    .replace("regular", "test")
                    .trim();
                const matNormalized = matResult
                    .replace("materialized", "test")
                    .trim();

                expect(regularNormalized).toBe(matNormalized);
            });
        });

        describe("Column filtering", () => {
            it("should filter out 'this' column", () => {
                const view: ViewDefinition = {
                    schema: "public",
                    name: "filtered_view",
                    columns: [
                        {
                            name: "id",
                            type: "integer",
                            nullable: false,
                            defaultValue: null,
                            isArray: false,
                            isPrimaryKey: false,
                            isUnique: false,
                        },
                        {
                            name: "this",
                            type: "text",
                            nullable: false,
                            defaultValue: null,
                            isArray: false,
                            isPrimaryKey: false,
                            isUnique: false,
                        },
                    ],
                    isMaterialized: false,
                };

                const result = generateViewType(view, "snake_case");

                expect(result).toContain("id: number");
                expect(result).not.toContain("this:");
            });

            it("should filter out 'constraint' column", () => {
                const view: ViewDefinition = {
                    schema: "public",
                    name: "filtered_view",
                    columns: [
                        {
                            name: "id",
                            type: "integer",
                            nullable: false,
                            defaultValue: null,
                            isArray: false,
                            isPrimaryKey: false,
                            isUnique: false,
                        },
                        {
                            name: "constraint",
                            type: "text",
                            nullable: false,
                            defaultValue: null,
                            isArray: false,
                            isPrimaryKey: false,
                            isUnique: false,
                        },
                    ],
                    isMaterialized: false,
                };

                const result = generateViewType(view, "snake_case");

                expect(result).toContain("id: number");
                expect(result).not.toContain("constraint:");
            });

            it("should filter case-insensitively", () => {
                const view: ViewDefinition = {
                    schema: "public",
                    name: "case_filter",
                    columns: [
                        {
                            name: "id",
                            type: "integer",
                            nullable: false,
                            defaultValue: null,
                            isArray: false,
                            isPrimaryKey: false,
                            isUnique: false,
                        },
                        {
                            name: "THIS",
                            type: "text",
                            nullable: false,
                            defaultValue: null,
                            isArray: false,
                            isPrimaryKey: false,
                            isUnique: false,
                        },
                        {
                            name: "Constraint",
                            type: "text",
                            nullable: false,
                            defaultValue: null,
                            isArray: false,
                            isPrimaryKey: false,
                            isUnique: false,
                        },
                    ],
                    isMaterialized: false,
                };

                const result = generateViewType(view, "snake_case");

                expect(result).toContain("id: number");
                expect(result).not.toContain("THIS:");
                expect(result).not.toContain("Constraint:");
            });

            it("should generate placeholder when all columns are filtered", () => {
                const view: ViewDefinition = {
                    schema: "public",
                    name: "all_filtered",
                    columns: [
                        {
                            name: "this",
                            type: "text",
                            nullable: false,
                            defaultValue: null,
                            isArray: false,
                            isPrimaryKey: false,
                            isUnique: false,
                        },
                        {
                            name: "constraint",
                            type: "text",
                            nullable: false,
                            defaultValue: null,
                            isArray: false,
                            isPrimaryKey: false,
                            isUnique: false,
                        },
                    ],
                    isMaterialized: false,
                };

                const result = generateViewType(view, "snake_case");

                expect(result).toContain(
                    "// Column types could not be inferred from SQL"
                );
                expect(result).toContain("[key: string]: unknown");
            });
        });

        describe("Indentation", () => {
            it("should use default 2-space indentation", () => {
                const view: ViewDefinition = {
                    schema: "public",
                    name: "indent_test",
                    columns: [
                        {
                            name: "id",
                            type: "integer",
                            nullable: false,
                            defaultValue: null,
                            isArray: false,
                            isPrimaryKey: false,
                            isUnique: false,
                        },
                    ],
                    isMaterialized: false,
                };

                const result = generateViewType(view, "snake_case");

                expect(result).toContain("      indent_test: {");
                expect(result).toContain("        Row: {");
                expect(result).toContain("          id: number");
            });

            it("should use custom 4-space indentation", () => {
                const view: ViewDefinition = {
                    schema: "public",
                    name: "indent_test",
                    columns: [
                        {
                            name: "id",
                            type: "integer",
                            nullable: false,
                            defaultValue: null,
                            isArray: false,
                            isPrimaryKey: false,
                            isUnique: false,
                        },
                    ],
                    isMaterialized: false,
                };

                const result = generateViewType(view, "snake_case", 4);

                expect(result).toContain("            indent_test: {");
                expect(result).toContain("                Row: {");
                expect(result).toContain("                    id: number");
            });
        });

        describe("Enum handling", () => {
            it("should use enum types when available", () => {
                const view: ViewDefinition = {
                    schema: "public",
                    name: "enum_view",
                    columns: [
                        {
                            name: "status",
                            type: "user_status",
                            nullable: false,
                            defaultValue: null,
                            isArray: false,
                            isPrimaryKey: false,
                            isUnique: false,
                        },
                    ],
                    isMaterialized: false,
                };

                const availableEnums = new Set(["user_status"]);
                const result = generateViewType(
                    view,
                    "snake_case",
                    2,
                    true,
                    availableEnums
                );

                expect(result).toContain(
                    'status: Database["public"]["Enums"]["user_status"]'
                );
            });

            it("should use unknown type when enum not available", () => {
                const view: ViewDefinition = {
                    schema: "public",
                    name: "enum_view",
                    columns: [
                        {
                            name: "status",
                            type: "user_status",
                            nullable: false,
                            defaultValue: null,
                            isArray: false,
                            isPrimaryKey: false,
                            isUnique: false,
                        },
                    ],
                    isMaterialized: false,
                };

                const result = generateViewType(view, "snake_case");

                expect(result).toContain("status: unknown");
            });
        });

        describe("Schema parameter", () => {
            it("should use custom schema in enum references", () => {
                const view: ViewDefinition = {
                    schema: "custom_schema",
                    name: "enum_view",
                    columns: [
                        {
                            name: "status",
                            type: "user_status",
                            nullable: false,
                            defaultValue: null,
                            isArray: false,
                            isPrimaryKey: false,
                            isUnique: false,
                        },
                    ],
                    isMaterialized: false,
                };

                const availableEnums = new Set(["user_status"]);
                const result = generateViewType(
                    view,
                    "snake_case",
                    2,
                    true,
                    availableEnums,
                    "custom_schema"
                );

                expect(result).toContain(
                    'Database["custom_schema"]["Enums"]["user_status"]'
                );
            });
        });

        describe("Geometric types", () => {
            it("should use geometric types when enabled", () => {
                const view: ViewDefinition = {
                    schema: "public",
                    name: "geo_view",
                    columns: [
                        {
                            name: "location",
                            type: "point",
                            nullable: false,
                            defaultValue: null,
                            isArray: false,
                            isPrimaryKey: false,
                            isUnique: false,
                        },
                    ],
                    isMaterialized: false,
                };

                const result = generateViewType(
                    view,
                    "snake_case",
                    2,
                    true,
                    new Set(),
                    "public",
                    true
                );

                expect(result).toContain("location: Point");
            });

            it("should use string for geometric types when disabled", () => {
                const view: ViewDefinition = {
                    schema: "public",
                    name: "geo_view",
                    columns: [
                        {
                            name: "location",
                            type: "point",
                            nullable: false,
                            defaultValue: null,
                            isArray: false,
                            isPrimaryKey: false,
                            isUnique: false,
                        },
                    ],
                    isMaterialized: false,
                };

                const result = generateViewType(
                    view,
                    "snake_case",
                    2,
                    true,
                    new Set(),
                    "public",
                    false
                );

                expect(result).toContain("location: string");
            });
        });
    });

    describe("generateViewTypes", () => {
        describe("Multiple views", () => {
            it("should generate types for multiple views", () => {
                const views: ViewDefinition[] = [
                    {
                        schema: "public",
                        name: "view_one",
                        columns: [
                            {
                                name: "id",
                                type: "integer",
                                nullable: false,
                                defaultValue: null,
                                isArray: false,
                                isPrimaryKey: false,
                                isUnique: false,
                            },
                        ],
                        isMaterialized: false,
                    },
                    {
                        schema: "public",
                        name: "view_two",
                        columns: [
                            {
                                name: "name",
                                type: "text",
                                nullable: false,
                                defaultValue: null,
                                isArray: false,
                                isPrimaryKey: false,
                                isUnique: false,
                            },
                        ],
                        isMaterialized: false,
                    },
                ];

                const result = generateViewTypes(views, "snake_case");

                expect(result).toContain("view_one: {");
                expect(result).toContain("view_two: {");
                expect(result).toContain("id: number");
                expect(result).toContain("name: string");
            });

            it("should join views with newlines", () => {
                const views: ViewDefinition[] = [
                    {
                        schema: "public",
                        name: "view_one",
                        columns: [],
                        isMaterialized: false,
                    },
                    {
                        schema: "public",
                        name: "view_two",
                        columns: [],
                        isMaterialized: false,
                    },
                ];

                const result = generateViewTypes(views, "snake_case");
                const lines = result.split("\n");

                expect(lines.length).toBeGreaterThan(10);
            });
        });

        describe("Empty array handling", () => {
            it("should return empty string for empty views array", () => {
                const result = generateViewTypes([], "snake_case");
                expect(result).toBe("");
            });
        });

        describe("Parameter passing", () => {
            it("should pass all parameters to generateViewType", () => {
                const views: ViewDefinition[] = [
                    {
                        schema: "custom_schema",
                        name: "test_view",
                        columns: [
                            {
                                name: "status",
                                type: "user_status",
                                nullable: false,
                                defaultValue: null,
                                isArray: false,
                                isPrimaryKey: false,
                                isUnique: false,
                            },
                        ],
                        isMaterialized: true,
                        comment: "Test view",
                    },
                ];

                const availableEnums = new Set(["user_status"]);
                const result = generateViewTypes(
                    views,
                    "camelCase",
                    4,
                    true,
                    availableEnums,
                    "custom_schema",
                    true
                );

                expect(result).toContain("testView: {");
                expect(result).toContain("* Materialized View");
                expect(result).toContain("* Test view");
                expect(result).toContain(
                    'Database["custom_schema"]["Enums"]["user_status"]'
                );
            });

            it("should respect includeComments parameter", () => {
                const views: ViewDefinition[] = [
                    {
                        schema: "public",
                        name: "test_view",
                        columns: [],
                        isMaterialized: true,
                        comment: "Should not appear",
                    },
                ];

                const result = generateViewTypes(views, "snake_case", 2, false);

                expect(result).not.toContain("/**");
                expect(result).not.toContain("Should not appear");
                expect(result).not.toContain("Materialized View");
            });
        });

        describe("Mixed view types", () => {
            it("should generate regular and materialized views together", () => {
                const views: ViewDefinition[] = [
                    {
                        schema: "public",
                        name: "regular_view",
                        columns: [],
                        isMaterialized: false,
                    },
                    {
                        schema: "public",
                        name: "mat_view",
                        columns: [],
                        isMaterialized: true,
                    },
                ];

                const result = generateViewTypes(views, "snake_case", 2, true);

                expect(result).toContain("regular_view: {");
                expect(result).toContain("mat_view: {");
                expect(result).toContain("* Materialized View");
            });

            it("should generate views with and without columns", () => {
                const views: ViewDefinition[] = [
                    {
                        schema: "public",
                        name: "with_columns",
                        columns: [
                            {
                                name: "id",
                                type: "integer",
                                nullable: false,
                                defaultValue: null,
                                isArray: false,
                                isPrimaryKey: false,
                                isUnique: false,
                            },
                        ],
                        isMaterialized: false,
                    },
                    {
                        schema: "public",
                        name: "without_columns",
                        columns: [],
                        isMaterialized: false,
                    },
                ];

                const result = generateViewTypes(views, "snake_case");

                expect(result).toContain("with_columns: {");
                expect(result).toContain("id: number");
                expect(result).toContain("without_columns: {");
                expect(result).toContain(
                    "// Column types could not be inferred from SQL"
                );
            });
        });
    });
});
