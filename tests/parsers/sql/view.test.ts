/**
 * Tests for view definition parsing
 *
 * Coverage targets:
 * - parseViewDefinition: CREATE VIEW and CREATE MATERIALIZED VIEW parsing
 * - parseViewComment: COMMENT ON VIEW parsing
 * - createViewWithColumns: Manual view creation helper
 */

import { describe, it, expect } from "vitest";
import {
    parseViewDefinition,
    parseViewComment,
    createViewWithColumns,
} from "../../../src/parsers/sql/view.js";
import type { ColumnDefinition } from "../../../src/types/index.js";

describe("View Parser", () => {
    describe("parseViewDefinition", () => {
        describe("Basic view parsing", () => {
            it("should parse a simple CREATE VIEW statement", () => {
                const sql =
                    "CREATE VIEW user_summary AS SELECT id, name FROM users;";
                const result = parseViewDefinition(sql, "public");

                expect(result).not.toBeNull();
                expect(result?.schema).toBe("public");
                expect(result?.name).toBe("user_summary");
                expect(result?.isMaterialized).toBe(false);
                expect(result?.definition).toBe("SELECT id, name FROM users");
                expect(result?.columns).toEqual([]);
            });

            it("should parse CREATE VIEW without semicolon", () => {
                const sql =
                    "CREATE VIEW active_users AS SELECT * FROM users WHERE active = true";
                const result = parseViewDefinition(sql, "public");

                expect(result).not.toBeNull();
                expect(result?.name).toBe("active_users");
                expect(result?.definition).toBe(
                    "SELECT * FROM users WHERE active = true"
                );
            });

            it("should parse CREATE VIEW with multiline definition", () => {
                const sql = `CREATE VIEW user_details AS
                    SELECT 
                        u.id,
                        u.name,
                        u.email
                    FROM users u
                    WHERE u.active = true;`;
                const result = parseViewDefinition(sql, "public");

                expect(result).not.toBeNull();
                expect(result?.name).toBe("user_details");
                expect(result?.definition).toContain("SELECT");
                expect(result?.definition).toContain("FROM users u");
            });

            it("should handle case-insensitive CREATE VIEW", () => {
                const sql =
                    "create view lowercase_view as select * from users;";
                const result = parseViewDefinition(sql, "public");

                expect(result).not.toBeNull();
                expect(result?.name).toBe("lowercase_view");
            });
        });

        describe("CREATE MATERIALIZED VIEW", () => {
            it("should parse CREATE MATERIALIZED VIEW", () => {
                const sql =
                    "CREATE MATERIALIZED VIEW mat_summary AS SELECT count(*) FROM users;";
                const result = parseViewDefinition(sql, "public");

                expect(result).not.toBeNull();
                expect(result?.name).toBe("mat_summary");
                expect(result?.isMaterialized).toBe(true);
                expect(result?.definition).toBe("SELECT count(*) FROM users");
            });

            it("should handle MATERIALIZED keyword with different casing", () => {
                const sql =
                    "CREATE materialized VIEW mat_view AS SELECT * FROM users;";
                const result = parseViewDefinition(sql, "public");

                expect(result).not.toBeNull();
                expect(result?.isMaterialized).toBe(true);
            });
        });

        describe("IF NOT EXISTS clause", () => {
            it("should parse CREATE VIEW IF NOT EXISTS", () => {
                const sql =
                    "CREATE VIEW IF NOT EXISTS safe_view AS SELECT * FROM users;";
                const result = parseViewDefinition(sql, "public");

                expect(result).not.toBeNull();
                expect(result?.name).toBe("safe_view");
                expect(result?.definition).toBe("SELECT * FROM users");
            });

            it("should parse CREATE MATERIALIZED VIEW IF NOT EXISTS", () => {
                const sql =
                    "CREATE MATERIALIZED VIEW IF NOT EXISTS safe_mat_view AS SELECT * FROM users;";
                const result = parseViewDefinition(sql, "public");

                expect(result).not.toBeNull();
                expect(result?.name).toBe("safe_mat_view");
                expect(result?.isMaterialized).toBe(true);
            });

            it("should handle case-insensitive IF NOT EXISTS", () => {
                const sql =
                    "CREATE VIEW if not exists case_view AS SELECT * FROM users;";
                const result = parseViewDefinition(sql, "public");

                expect(result).not.toBeNull();
                expect(result?.name).toBe("case_view");
            });
        });

        describe("Schema handling", () => {
            it("should parse view with explicit schema (unquoted)", () => {
                const sql =
                    "CREATE VIEW custom_schema.my_view AS SELECT * FROM users;";
                const result = parseViewDefinition(sql, "public");

                expect(result).not.toBeNull();
                expect(result?.schema).toBe("custom_schema");
                expect(result?.name).toBe("my_view");
            });

            it("should parse view with double-quoted schema", () => {
                const sql =
                    'CREATE VIEW "custom_schema".my_view AS SELECT * FROM users;';
                const result = parseViewDefinition(sql, "public");

                expect(result).not.toBeNull();
                expect(result?.schema).toBe("custom_schema");
                expect(result?.name).toBe("my_view");
            });

            it("should parse view with single-quoted schema", () => {
                const sql =
                    "CREATE VIEW 'custom_schema'.my_view AS SELECT * FROM users;";
                const result = parseViewDefinition(sql, "public");

                expect(result).not.toBeNull();
                expect(result?.schema).toBe("custom_schema");
                expect(result?.name).toBe("my_view");
            });

            it("should use default schema when not specified", () => {
                const sql = "CREATE VIEW my_view AS SELECT * FROM users;";
                const result = parseViewDefinition(sql, "my_default");

                expect(result).not.toBeNull();
                expect(result?.schema).toBe("my_default");
            });

            it("should override default schema with explicit schema", () => {
                const sql =
                    "CREATE VIEW other_schema.my_view AS SELECT * FROM users;";
                const result = parseViewDefinition(sql, "default_schema");

                expect(result).not.toBeNull();
                expect(result?.schema).toBe("other_schema");
            });
        });

        describe("View name quoting", () => {
            it("should parse view with double-quoted name", () => {
                const sql = 'CREATE VIEW "my_view" AS SELECT * FROM users;';
                const result = parseViewDefinition(sql, "public");

                expect(result).not.toBeNull();
                expect(result?.name).toBe("my_view");
            });

            it("should parse view with single-quoted name", () => {
                const sql = "CREATE VIEW 'my_view' AS SELECT * FROM users;";
                const result = parseViewDefinition(sql, "public");

                expect(result).not.toBeNull();
                expect(result?.name).toBe("my_view");
            });

            it("should parse view with both schema and name quoted", () => {
                const sql =
                    'CREATE VIEW "my_schema"."my_view" AS SELECT * FROM users;';
                const result = parseViewDefinition(sql, "public");

                expect(result).not.toBeNull();
                expect(result?.schema).toBe("my_schema");
                expect(result?.name).toBe("my_view");
            });
        });

        describe("Complex SELECT statements", () => {
            it("should parse view with JOINs", () => {
                const sql = `CREATE VIEW user_posts AS
                    SELECT u.id, u.name, p.title
                    FROM users u
                    JOIN posts p ON u.id = p.user_id;`;
                const result = parseViewDefinition(sql, "public");

                expect(result).not.toBeNull();
                expect(result?.definition).toContain("JOIN");
            });

            it("should parse view with subqueries", () => {
                const sql = `CREATE VIEW active_users AS
                    SELECT * FROM users
                    WHERE id IN (SELECT user_id FROM posts WHERE active = true);`;
                const result = parseViewDefinition(sql, "public");

                expect(result).not.toBeNull();
                expect(result?.definition).toContain(
                    "SELECT user_id FROM posts"
                );
            });

            it("should parse view with CTEs", () => {
                const sql = `CREATE VIEW user_summary AS
                    WITH active_users AS (
                        SELECT * FROM users WHERE active = true
                    )
                    SELECT * FROM active_users;`;
                const result = parseViewDefinition(sql, "public");

                expect(result).not.toBeNull();
                expect(result?.definition).toContain("WITH active_users");
            });

            it("should parse view with UNION", () => {
                const sql = `CREATE VIEW all_records AS
                    SELECT id, name FROM users
                    UNION
                    SELECT id, title FROM posts;`;
                const result = parseViewDefinition(sql, "public");

                expect(result).not.toBeNull();
                expect(result?.definition).toContain("UNION");
            });

            it("should parse view with aggregate functions", () => {
                const sql =
                    "CREATE VIEW user_stats AS SELECT count(*), avg(age) FROM users GROUP BY country;";
                const result = parseViewDefinition(sql, "public");

                expect(result).not.toBeNull();
                expect(result?.definition).toContain("count(*)");
                expect(result?.definition).toContain("GROUP BY");
            });
        });

        describe("Invalid/non-matching content", () => {
            it("should return null for non-CREATE VIEW statement", () => {
                const sql = "CREATE TABLE users (id UUID);";
                const result = parseViewDefinition(sql, "public");

                expect(result).toBeNull();
            });

            it("should return null for incomplete CREATE VIEW", () => {
                const sql = "CREATE VIEW my_view";
                const result = parseViewDefinition(sql, "public");

                expect(result).toBeNull();
            });

            it("should return null for empty string", () => {
                const result = parseViewDefinition("", "public");
                expect(result).toBeNull();
            });

            it("should return null for random text", () => {
                const result = parseViewDefinition(
                    "random text here",
                    "public"
                );
                expect(result).toBeNull();
            });
        });

        describe("Edge cases", () => {
            it("should handle view with AS keyword in definition", () => {
                const sql =
                    "CREATE VIEW aliased_view AS SELECT id AS user_id FROM users;";
                const result = parseViewDefinition(sql, "public");

                expect(result).not.toBeNull();
                expect(result?.definition).toContain("AS user_id");
            });

            it("should handle view with multiple spaces", () => {
                const sql =
                    "CREATE    VIEW    spaced_view    AS    SELECT * FROM users;";
                const result = parseViewDefinition(sql, "public");

                expect(result).not.toBeNull();
                expect(result?.name).toBe("spaced_view");
            });

            it("should handle view with tabs and newlines", () => {
                const sql =
                    "CREATE\tVIEW\n\ttabbed_view\nAS\n\tSELECT * FROM users;";
                const result = parseViewDefinition(sql, "public");

                expect(result).not.toBeNull();
                expect(result?.name).toBe("tabbed_view");
            });
        });
    });

    describe("parseViewComment", () => {
        describe("Basic comment parsing", () => {
            it("should parse COMMENT ON VIEW", () => {
                const sql =
                    "COMMENT ON VIEW user_summary IS 'Summary of all users';";
                const result = parseViewComment(sql, "public");

                expect(result).not.toBeNull();
                expect(result?.viewName).toBe("user_summary");
                expect(result?.comment).toBe("Summary of all users");
                expect(result?.schema).toBe("public");
            });

            it("should handle case-insensitive COMMENT ON VIEW", () => {
                const sql = "comment on view my_view is 'test comment';";
                const result = parseViewComment(sql, "public");

                expect(result).not.toBeNull();
                expect(result?.viewName).toBe("my_view");
            });

            it("should parse multi-word comments", () => {
                const sql =
                    "COMMENT ON VIEW my_view IS 'This is a longer comment with multiple words';";
                const result = parseViewComment(sql, "public");

                expect(result).not.toBeNull();
                expect(result?.comment).toBe(
                    "This is a longer comment with multiple words"
                );
            });
        });

        describe("COMMENT ON MATERIALIZED VIEW", () => {
            it("should parse COMMENT ON MATERIALIZED VIEW", () => {
                const sql =
                    "COMMENT ON MATERIALIZED VIEW mat_view IS 'Materialized view comment';";
                const result = parseViewComment(sql, "public");

                expect(result).not.toBeNull();
                expect(result?.viewName).toBe("mat_view");
                expect(result?.comment).toBe("Materialized view comment");
            });

            it("should handle case-insensitive MATERIALIZED keyword", () => {
                const sql = "COMMENT ON materialized VIEW mat_view IS 'test';";
                const result = parseViewComment(sql, "public");

                expect(result).not.toBeNull();
                expect(result?.viewName).toBe("mat_view");
            });
        });

        describe("Schema handling", () => {
            it("should parse comment with explicit schema", () => {
                const sql =
                    "COMMENT ON VIEW custom_schema.my_view IS 'test comment';";
                const result = parseViewComment(sql, "public");

                expect(result).not.toBeNull();
                expect(result?.schema).toBe("custom_schema");
                expect(result?.viewName).toBe("my_view");
            });

            it("should use default schema when not specified", () => {
                const sql = "COMMENT ON VIEW my_view IS 'test comment';";
                const result = parseViewComment(sql, "custom_default");

                expect(result).not.toBeNull();
                expect(result?.schema).toBe("custom_default");
            });
        });

        describe("Comment escaping", () => {
            it("should handle escaped single quotes in comment", () => {
                const sql =
                    "COMMENT ON VIEW my_view IS 'It''s a comment with apostrophes';";
                const result = parseViewComment(sql, "public");

                expect(result).not.toBeNull();
                expect(result?.comment).toBe("It's a comment with apostrophes");
            });

            it("should handle multiple escaped quotes", () => {
                const sql =
                    "COMMENT ON VIEW my_view IS 'Multiple ''escaped'' ''quotes''';";
                const result = parseViewComment(sql, "public");

                expect(result).not.toBeNull();
                expect(result?.comment).toBe("Multiple 'escaped' 'quotes'");
            });

            it("should handle empty comment", () => {
                const sql = "COMMENT ON VIEW my_view IS '';";
                const result = parseViewComment(sql, "public");

                expect(result).not.toBeNull();
                expect(result?.comment).toBe("");
            });
        });

        describe("Invalid/non-matching content", () => {
            it("should return null for non-COMMENT statement", () => {
                const sql = "CREATE VIEW my_view AS SELECT * FROM users;";
                const result = parseViewComment(sql, "public");

                expect(result).toBeNull();
            });

            it("should return null for COMMENT ON TABLE", () => {
                const sql = "COMMENT ON TABLE users IS 'test';";
                const result = parseViewComment(sql, "public");

                expect(result).toBeNull();
            });

            it("should return null for incomplete comment", () => {
                const sql = "COMMENT ON VIEW my_view IS";
                const result = parseViewComment(sql, "public");

                expect(result).toBeNull();
            });

            it("should return null for empty string", () => {
                const result = parseViewComment("", "public");
                expect(result).toBeNull();
            });
        });

        describe("Edge cases", () => {
            it("should handle extra whitespace", () => {
                const sql = "COMMENT   ON   VIEW   my_view   IS   'test';";
                const result = parseViewComment(sql, "public");

                expect(result).not.toBeNull();
                expect(result?.viewName).toBe("my_view");
            });

            it("should handle quoted view names", () => {
                const sql = "COMMENT ON VIEW \"my_view\" IS 'test';";
                const result = parseViewComment(sql, "public");

                expect(result).not.toBeNull();
                expect(result?.viewName).toBe("my_view");
            });
        });
    });

    describe("createViewWithColumns", () => {
        it("should create view with columns", () => {
            const columns: ColumnDefinition[] = [
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
                    nullable: true,
                    defaultValue: null,
                    isArray: false,
                    isPrimaryKey: false,
                    isUnique: false,
                },
            ];

            const result = createViewWithColumns(
                "public",
                "user_view",
                columns
            );

            expect(result.schema).toBe("public");
            expect(result.name).toBe("user_view");
            expect(result.columns).toHaveLength(2);
            expect(result.columns[0].name).toBe("id");
            expect(result.columns[1].name).toBe("name");
            expect(result.isMaterialized).toBe(false);
            expect(result.comment).toBeUndefined();
        });

        it("should create materialized view", () => {
            const columns: ColumnDefinition[] = [];

            const result = createViewWithColumns(
                "public",
                "mat_view",
                columns,
                true
            );

            expect(result.isMaterialized).toBe(true);
        });

        it("should create view with comment", () => {
            const columns: ColumnDefinition[] = [];

            const result = createViewWithColumns(
                "public",
                "commented_view",
                columns,
                false,
                "This is a comment"
            );

            expect(result.comment).toBe("This is a comment");
        });

        it("should create view with all parameters", () => {
            const columns: ColumnDefinition[] = [
                {
                    name: "id",
                    type: "integer",
                    nullable: false,
                    defaultValue: null,
                    isArray: false,
                    isPrimaryKey: false,
                    isUnique: false,
                },
            ];

            const result = createViewWithColumns(
                "custom_schema",
                "full_view",
                columns,
                true,
                "Full featured view"
            );

            expect(result.schema).toBe("custom_schema");
            expect(result.name).toBe("full_view");
            expect(result.columns).toHaveLength(1);
            expect(result.isMaterialized).toBe(true);
            expect(result.comment).toBe("Full featured view");
        });

        it("should handle empty columns array", () => {
            const result = createViewWithColumns("public", "empty_view", []);

            expect(result.columns).toHaveLength(0);
            expect(result.columns).toEqual([]);
        });

        it("should handle complex column definitions", () => {
            const columns: ColumnDefinition[] = [
                {
                    name: "tags",
                    type: "text",
                    nullable: true,
                    defaultValue: "'{}'",
                    isArray: true,
                    isPrimaryKey: false,
                    isUnique: false,
                },
            ];

            const result = createViewWithColumns(
                "public",
                "complex_view",
                columns
            );

            expect(result.columns[0].isArray).toBe(true);
            expect(result.columns[0].defaultValue).toBe("'{}'");
        });
    });
});
