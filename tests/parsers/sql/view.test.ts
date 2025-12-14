/**
 * Tests for view definition parsing
 *
 * Coverage targets:
 * - parseViewDefinition: CREATE VIEW and CREATE MATERIALIZED VIEW parsing with column inference
 * - parseViewComment: COMMENT ON VIEW parsing
 * - createViewWithColumns: Manual view creation helper
 */

import { describe, it, expect } from "vitest";
import {
    parseViewDefinition,
    parseViewComment,
    createViewWithColumns,
} from "../../../src/parsers/sql/view.js";
import type {
    ColumnDefinition,
    TableDefinition,
} from "../../../src/types/index.js";

const sampleTables: TableDefinition[] = [
    {
        schema: "public",
        name: "users",
        columns: [
            {
                name: "id",
                type: "integer",
                nullable: false,
                defaultValue: null,
                isArray: false,
                isPrimaryKey: true,
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
            {
                name: "email",
                type: "text",
                nullable: false,
                defaultValue: null,
                isArray: false,
                isPrimaryKey: false,
                isUnique: false,
            },
            {
                name: "active",
                type: "boolean",
                nullable: false,
                defaultValue: "true",
                isArray: false,
                isPrimaryKey: false,
                isUnique: false,
            },
            {
                name: "age",
                type: "integer",
                nullable: true,
                defaultValue: null,
                isArray: false,
                isPrimaryKey: false,
                isUnique: false,
            },
            {
                name: "country",
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
        name: "posts",
        columns: [
            {
                name: "id",
                type: "integer",
                nullable: false,
                defaultValue: null,
                isArray: false,
                isPrimaryKey: true,
                isUnique: false,
            },
            {
                name: "user_id",
                type: "integer",
                nullable: false,
                defaultValue: null,
                isArray: false,
                isPrimaryKey: false,
                isUnique: false,
            },
            {
                name: "title",
                type: "text",
                nullable: false,
                defaultValue: null,
                isArray: false,
                isPrimaryKey: false,
                isUnique: false,
            },
            {
                name: "active",
                type: "boolean",
                nullable: false,
                defaultValue: "true",
                isArray: false,
                isPrimaryKey: false,
                isUnique: false,
            },
        ],
        relationships: [],
        indexes: [],
    },
];

describe("View Parser", () => {
    describe("parseViewDefinition", () => {
        describe("Basic view parsing", () => {
            it("should parse a simple CREATE VIEW statement with column inference", () => {
                const sql =
                    "CREATE VIEW user_summary AS SELECT id, name FROM users;";
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.schema).toBe("public");
                expect(result?.name).toBe("user_summary");
                expect(result?.isMaterialized).toBe(false);
                expect(result?.definition).toBe("SELECT id, name FROM users");
                expect(result?.columns).toHaveLength(2);
                expect(result?.columns[0].name).toBe("id");
                expect(result?.columns[0].type).toBe("integer");
                expect(result?.columns[1].name).toBe("name");
                expect(result?.columns[1].type).toBe("text");
            });

            it("should parse CREATE VIEW without table context", () => {
                const sql =
                    "CREATE VIEW user_summary AS SELECT id, name FROM users;";
                const result = parseViewDefinition(sql, "public", []);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(2);
                expect(result?.columns[0].type).toBe("unknown");
                expect(result?.columns[1].type).toBe("unknown");
            });

            it("should parse CREATE VIEW without semicolon", () => {
                const sql =
                    "CREATE VIEW active_users AS SELECT * FROM users WHERE active = true";
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.name).toBe("active_users");
                expect(result?.definition).toBe(
                    "SELECT * FROM users WHERE active = true"
                );
                expect(result?.columns.length).toBeGreaterThan(0);
            });

            it("should parse CREATE VIEW with multiline definition", () => {
                const sql = `CREATE VIEW user_details AS
                    SELECT 
                        u.id,
                        u.name,
                        u.email
                    FROM users u
                    WHERE u.active = true;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.name).toBe("user_details");
                expect(result?.definition).toContain("SELECT");
                expect(result?.definition).toContain("FROM users u");
                expect(result?.columns).toHaveLength(3);
                expect(result?.columns[0].name).toBe("id");
                expect(result?.columns[0].type).toBe("integer");
            });

            it("should handle case-insensitive CREATE VIEW", () => {
                const sql =
                    "create view lowercase_view as select * from users;";
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.name).toBe("lowercase_view");
            });
        });

        describe("CREATE MATERIALIZED VIEW", () => {
            it("should parse CREATE MATERIALIZED VIEW", () => {
                const sql =
                    "CREATE MATERIALIZED VIEW mat_summary AS SELECT count(*) FROM users;";
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.name).toBe("mat_summary");
                expect(result?.isMaterialized).toBe(true);
                expect(result?.definition).toBe("SELECT count(*) FROM users");
            });

            it("should handle MATERIALIZED keyword with different casing", () => {
                const sql =
                    "CREATE materialized VIEW mat_view AS SELECT * FROM users;";
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.isMaterialized).toBe(true);
            });
        });

        describe("IF NOT EXISTS clause", () => {
            it("should parse CREATE VIEW IF NOT EXISTS", () => {
                const sql =
                    "CREATE VIEW IF NOT EXISTS safe_view AS SELECT * FROM users;";
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.name).toBe("safe_view");
                expect(result?.definition).toBe("SELECT * FROM users");
            });

            it("should parse CREATE MATERIALIZED VIEW IF NOT EXISTS", () => {
                const sql =
                    "CREATE MATERIALIZED VIEW IF NOT EXISTS safe_mat_view AS SELECT * FROM users;";
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.name).toBe("safe_mat_view");
                expect(result?.isMaterialized).toBe(true);
            });

            it("should handle case-insensitive IF NOT EXISTS", () => {
                const sql =
                    "CREATE VIEW if not exists case_view AS SELECT * FROM users;";
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.name).toBe("case_view");
            });
        });

        describe("Schema handling", () => {
            it("should parse view with explicit schema (unquoted)", () => {
                const sql =
                    "CREATE VIEW custom_schema.my_view AS SELECT * FROM users;";
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.schema).toBe("custom_schema");
                expect(result?.name).toBe("my_view");
            });

            it("should parse view with double-quoted schema", () => {
                const sql =
                    'CREATE VIEW "custom_schema".my_view AS SELECT * FROM users;';
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.schema).toBe("custom_schema");
                expect(result?.name).toBe("my_view");
            });

            it("should parse view with single-quoted schema", () => {
                const sql =
                    "CREATE VIEW 'custom_schema'.my_view AS SELECT * FROM users;";
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.schema).toBe("custom_schema");
                expect(result?.name).toBe("my_view");
            });

            it("should use default schema when not specified", () => {
                const sql = "CREATE VIEW my_view AS SELECT * FROM users;";
                const result = parseViewDefinition(
                    sql,
                    "my_default",
                    sampleTables
                );

                expect(result).not.toBeNull();
                expect(result?.schema).toBe("my_default");
            });

            it("should override default schema with explicit schema", () => {
                const sql =
                    "CREATE VIEW other_schema.my_view AS SELECT * FROM users;";
                const result = parseViewDefinition(
                    sql,
                    "default_schema",
                    sampleTables
                );

                expect(result).not.toBeNull();
                expect(result?.schema).toBe("other_schema");
            });
        });

        describe("View name quoting", () => {
            it("should parse view with double-quoted name", () => {
                const sql = 'CREATE VIEW "my_view" AS SELECT * FROM users;';
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.name).toBe("my_view");
            });

            it("should parse view with single-quoted name", () => {
                const sql = "CREATE VIEW 'my_view' AS SELECT * FROM users;";
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.name).toBe("my_view");
            });

            it("should parse view with both schema and name quoted", () => {
                const sql =
                    'CREATE VIEW "my_schema"."my_view" AS SELECT * FROM users;';
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.schema).toBe("my_schema");
                expect(result?.name).toBe("my_view");
            });
        });

        describe("Complex SELECT statements", () => {
            it("should parse view with JOINs and infer column types", () => {
                const sql = `CREATE VIEW user_posts AS
                    SELECT u.id, u.name, p.title
                    FROM users u
                    JOIN posts p ON u.id = p.user_id;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.definition).toContain("JOIN");
                expect(result?.columns).toHaveLength(3);
                expect(result?.columns[0].name).toBe("id");
                expect(result?.columns[0].type).toBe("integer");
                expect(result?.columns[1].name).toBe("name");
                expect(result?.columns[1].type).toBe("text");
                expect(result?.columns[2].name).toBe("title");
                expect(result?.columns[2].type).toBe("text");
            });

            it("should handle multiple JOINs with different table aliases", () => {
                const sql = `CREATE VIEW multi_join AS
                    SELECT u.id, u.name, p1.title AS first_post, p2.title AS second_post
                    FROM users u
                    JOIN posts p1 ON u.id = p1.user_id
                    JOIN posts p2 ON u.id = p2.user_id;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(4);
                expect(result?.columns[2].name).toBe("first_post");
                expect(result?.columns[2].type).toBe("text");
                expect(result?.columns[3].name).toBe("second_post");
                expect(result?.columns[3].type).toBe("text");
            });

            it("should handle JOINs without aliases - use table name as alias", () => {
                const sql = `CREATE VIEW join_no_alias AS
        SELECT users.id, users.name, posts.title
        FROM users
        JOIN posts ON users.id = posts.user_id;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(3);
                expect(result?.columns[0].name).toBe("id");
                expect(result?.columns[0].type).toBe("integer");
                expect(result?.columns[1].name).toBe("name");
                expect(result?.columns[1].type).toBe("text");
                expect(result?.columns[2].name).toBe("title");
                expect(result?.columns[2].type).toBe("text");
            });

            it("should handle JOINs with explicit aliases (no AS keyword)", () => {
                const sql = `CREATE VIEW join_with_alias AS
        SELECT u.id, p.title
        FROM users u
        JOIN posts p ON u.id = p.user_id;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(2);
                expect(result?.columns[0].name).toBe("id");
                expect(result?.columns[0].type).toBe("integer");
                expect(result?.columns[1].name).toBe("title");
                expect(result?.columns[1].type).toBe("text");
            });

            it("should handle JOINs with AS keyword in alias", () => {
                const sql = `CREATE VIEW join_as_keyword AS
        SELECT u.id, p.title
        FROM users AS u
        JOIN posts AS p ON u.id = p.user_id;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(2);
                expect(result?.columns[0].type).toBe("integer");
                expect(result?.columns[1].type).toBe("text");
            });

            it("should allow referencing columns by original table name when FROM has alias", () => {
                const sql = `CREATE VIEW from_alias_and_original AS
        SELECT users.id, u.name
        FROM users AS u;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(2);
                expect(result?.columns[0].name).toBe("id");
                expect(result?.columns[0].type).toBe("integer");
                expect(result?.columns[1].name).toBe("name");
                expect(result?.columns[1].type).toBe("text");
            });

            it("should parse view with subqueries", () => {
                const sql = `CREATE VIEW active_users AS
                    SELECT * FROM users
                    WHERE id IN (SELECT user_id FROM posts WHERE active = true);`;
                const result = parseViewDefinition(sql, "public", sampleTables);

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
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.definition).toContain("WITH active_users");
            });

            it("should parse view with UNION", () => {
                const sql = `CREATE VIEW all_records AS
                    SELECT id, name FROM users
                    UNION
                    SELECT id, title FROM posts;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.definition).toContain("UNION");
            });

            it("should handle MIN and MAX aggregate functions", () => {
                const sql = `CREATE VIEW min_max AS
                    SELECT MIN(age) AS min_age, MAX(age) AS max_age FROM users;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(2);
                expect(result?.columns[0].type).toBe("unknown");
                expect(result?.columns[1].type).toBe("unknown");
            });

            it("should handle mixed qualified and unqualified columns", () => {
                const sql = `CREATE VIEW mixed_cols AS
                    SELECT u.id, name, u.email FROM users u;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(3);
                expect(result?.columns[0].type).toBe("integer");
                expect(result?.columns[1].type).toBe("text");
                expect(result?.columns[2].type).toBe("text");
            });

            it("should handle columns with schema prefix in table reference", () => {
                const customSchemaTables: TableDefinition[] = [
                    {
                        schema: "custom",
                        name: "items",
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

                const sql = `CREATE VIEW schema_view AS
                    SELECT id FROM items;`;
                const result = parseViewDefinition(
                    sql,
                    "custom",
                    customSchemaTables
                );

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(1);
            });

            it("should handle CAST with array types", () => {
                const sql = `CREATE VIEW array_cast_fn AS
                    SELECT CAST(id AS integer[]) AS id_arr FROM users;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(1);
                expect(result?.columns[0].isArray).toBe(true);
            });

            it("should parse aggregate functions and infer types", () => {
                const sql =
                    "CREATE VIEW user_stats AS SELECT count(*), avg(age) FROM users GROUP BY country;";
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.definition).toContain("count(*)");
                expect(result?.definition).toContain("GROUP BY");
                expect(result?.columns).toHaveLength(2);
                expect(result?.columns[0].type).toBe("bigint");
                expect(result?.columns[1].type).toBe("numeric");
            });
        });

        describe("Column type inference", () => {
            it("should infer types from type casts", () => {
                const sql = `CREATE VIEW typed_view AS
                    SELECT id::text AS id_text, age::numeric AS age_num FROM users;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(2);
                expect(result?.columns[0].name).toBe("id_text");
                expect(result?.columns[0].type).toBe("text");
                expect(result?.columns[1].name).toBe("age_num");
                expect(result?.columns[1].type).toBe("numeric");
            });

            it("should infer types from CAST expressions", () => {
                const sql = `CREATE VIEW cast_view AS
                    SELECT CAST(id AS bigint) AS big_id FROM users;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(1);
                expect(result?.columns[0].name).toBe("big_id");
                expect(result?.columns[0].type).toBe("bigint");
            });

            it("should detect array types", () => {
                const sql = `CREATE VIEW array_view AS
                    SELECT ARRAY_AGG(id) AS user_ids FROM users;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(1);
                expect(result?.columns[0].name).toBe("user_ids");
                expect(result?.columns[0].isArray).toBe(true);
            });

            it("should infer all JSON/JSONB aggregate function types", () => {
                const sql = `CREATE VIEW json_variants AS
                    SELECT 
                        JSON_AGG(name) AS json_agg_col,
                        JSONB_AGG(name) AS jsonb_agg_col,
                        JSON_OBJECT_AGG(id, name) AS json_obj_agg_col,
                        JSONB_OBJECT_AGG(id, name) AS jsonb_obj_agg_col
                    FROM users;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(4);
                expect(result?.columns[0].type).toBe("json");
                expect(result?.columns[1].type).toBe("jsonb");
                expect(result?.columns[2].type).toBe("json");
                expect(result?.columns[3].type).toBe("jsonb");
            });

            it("should infer date/time function types", () => {
                const sql = `CREATE VIEW time_view AS
                    SELECT NOW() AS current_time, CURRENT_DATE AS today FROM users LIMIT 1;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(2);
                expect(result?.columns[0].type).toBe(
                    "timestamp with time zone"
                );
                expect(result?.columns[1].type).toBe("date");
            });

            it("should infer STRING_AGG type", () => {
                const sql = `CREATE VIEW agg_view AS
                    SELECT STRING_AGG(name, ',') AS names FROM users;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(1);
                expect(result?.columns[0].type).toBe("text");
            });

            it("should infer BOOL_AND and BOOL_OR types", () => {
                const sql = `CREATE VIEW bool_view AS
                    SELECT BOOL_AND(active) AS all_active, BOOL_OR(active) AS any_active FROM users;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(2);
                expect(result?.columns[0].type).toBe("boolean");
                expect(result?.columns[1].type).toBe("boolean");
            });

            it("should infer literal boolean types", () => {
                const sql = `CREATE VIEW bool_literals AS
                    SELECT true AS is_true, false AS is_false FROM users LIMIT 1;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(2);
                expect(result?.columns[0].type).toBe("boolean");
                expect(result?.columns[1].type).toBe("boolean");
            });

            it("should infer numeric literal types", () => {
                const sql = `CREATE VIEW num_literals AS
                    SELECT 42 AS int_num, 3.14 AS decimal_num, 'text' AS string_val FROM users LIMIT 1;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(3);
                expect(result?.columns[0].type).toBe("integer");
                expect(result?.columns[1].type).toBe("numeric");
                expect(result?.columns[2].type).toBe("text");
            });

            it("should handle CAST without alias", () => {
                const sql = `CREATE VIEW cast_no_alias AS
                    SELECT CAST(id AS bigint) FROM users;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(1);
                expect(result?.columns[0].type).toBe("bigint");
            });

            it("should handle type cast without alias", () => {
                const sql = `CREATE VIEW cast_syntax_no_alias AS
                    SELECT id::bigint FROM users;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(1);
                expect(result?.columns[0].type).toBe("bigint");
            });

            it("should handle array type casts with aliases", () => {
                const sql = `CREATE VIEW array_cast AS
                    SELECT id::integer[] AS id_array FROM users;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(1);
                expect(result?.columns[0].name).toBe("id_array");
                expect(result?.columns[0].isArray).toBe(true);
            });

            it("should handle CURRENT_TIME function", () => {
                const sql = `CREATE VIEW current_time_view AS
                    SELECT CURRENT_TIME AS now_time FROM users LIMIT 1;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(1);
                expect(result?.columns[0].type).toBe("time with time zone");
            });

            it("should handle CASE expressions", () => {
                const sql = `CREATE VIEW case_view AS
                    SELECT CASE WHEN active THEN 'yes' ELSE 'no' END AS status FROM users;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(1);
                expect(result?.columns[0].type).toBe("unknown");
            });

            it("should handle expressions that fall through to inference", () => {
                const sql = `CREATE VIEW complex_expr AS
                    SELECT COUNT(*) * 2 AS double_count FROM users;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(1);
                expect(result?.columns[0].name).toBe("double_count");
            });

            it("should handle nested function calls with parentheses", () => {
                const sql = `CREATE VIEW nested_funcs AS
                    SELECT COALESCE(SUM(age), 0) AS total_age, UPPER(LOWER(name)) AS normalized FROM users;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(2);
            });

            it("should handle deeply nested parentheses in expressions", () => {
                const sql = `CREATE VIEW deep_nest AS
                    SELECT ((age * 2) + (id * 3)) AS calc, COALESCE(NULLIF(name, ''), 'default') AS safe_name FROM users;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(2);
                expect(result?.columns[0].name).toBe("calc");
                expect(result?.columns[1].name).toBe("safe_name");
            });

            it("should handle function calls with multiple arguments and commas", () => {
                const sql = `CREATE VIEW multi_arg AS
                    SELECT SUBSTRING(name, 1, 5) AS short_name, CONCAT(name, ' - ', email) AS full FROM users;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(2);
            });

            it("should parse SELECT with no FROM clause", () => {
                const sql = `CREATE VIEW no_from AS
                    SELECT 1 AS one, 'test' AS text_val;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(0);
            });

            it("should handle column expressions without table context", () => {
                const sql = `CREATE VIEW no_context AS
                    SELECT unknown_col AS aliased FROM unknown_table;`;
                const result = parseViewDefinition(sql, "public", []);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(1);
                expect(result?.columns[0].name).toBe("aliased");
                expect(result?.columns[0].type).toBe("unknown");
            });

            it("should generate column names from expressions without aliases", () => {
                const sql = `CREATE VIEW expr_names AS
                    SELECT age + 10, u.age * 2, UPPER(name) FROM users u;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(3);
                expect(result?.columns[0].name).toBe("age + 10");
                expect(result?.columns[1].name).toBe("age * 2");
                expect(result?.columns[2].name).toBe("UPPER");
            });

            it("should handle expressions with dots - remove qualifier prefix", () => {
                const sql = `CREATE VIEW dot_expr AS
                    SELECT schema.table.function() FROM users;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(1);
                expect(result?.columns[0].name).toBe("function");
            });

            it("should handle expressions with only parentheses - remove parens content", () => {
                const sql = `CREATE VIEW paren_expr AS
                    SELECT CONCAT(name, email) FROM users;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(1);
                expect(result?.columns[0].name).toBe("CONCAT");
            });

            it("should default to 'column' when expression reduces to empty string", () => {
                const sql = `CREATE VIEW empty_reduce AS
                    SELECT ((())) FROM users;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(1);
                expect(result?.columns[0].name).toBe("column");
            });
        });

        describe("Invalid/non-matching content", () => {
            it("should return null for non-CREATE VIEW statement", () => {
                const sql = "CREATE TABLE users (id UUID);";
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).toBeNull();
            });

            it("should return null for incomplete CREATE VIEW", () => {
                const sql = "CREATE VIEW my_view";
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).toBeNull();
            });

            it("should return null for empty string", () => {
                const result = parseViewDefinition("", "public", sampleTables);
                expect(result).toBeNull();
            });

            it("should return null for random text", () => {
                const result = parseViewDefinition(
                    "random text here",
                    "public",
                    sampleTables
                );
                expect(result).toBeNull();
            });
        });

        describe("Edge cases", () => {
            it("should handle view with AS keyword in definition", () => {
                const sql =
                    "CREATE VIEW aliased_view AS SELECT id AS user_id FROM users;";
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.definition).toContain("AS user_id");
                expect(result?.columns[0].name).toBe("user_id");
                expect(result?.columns[0].type).toBe("integer");
            });

            it("should handle view with multiple spaces", () => {
                const sql =
                    "CREATE    VIEW    spaced_view    AS    SELECT * FROM users;";
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.name).toBe("spaced_view");
            });

            it("should handle view with tabs and newlines", () => {
                const sql =
                    "CREATE\tVIEW\n\ttabbed_view\nAS\n\tSELECT * FROM users;";
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.name).toBe("tabbed_view");
            });

            it("should handle columns from non-existent tables with aliases", () => {
                const sql = `CREATE VIEW missing_table AS
                    SELECT t.column_name AS alias FROM nonexistent t;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(1);
                expect(result?.columns[0].name).toBe("alias");
                expect(result?.columns[0].type).toBe("unknown");
            });

            it("should handle table aliases that don't match any tables", () => {
                const sql = `CREATE VIEW wrong_alias AS
                    SELECT xyz.id FROM users xyz;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(1);
            });

            it("should handle qualified column names that don't exist", () => {
                const sql = `CREATE VIEW no_such_col AS
                    SELECT u.nonexistent AS col FROM users u;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(1);
                expect(result?.columns[0].name).toBe("col");
                expect(result?.columns[0].type).toBe("unknown");
            });

            it("should handle unqualified columns not in any table", () => {
                const sql = `CREATE VIEW orphan_col AS
                    SELECT orphan_column AS alias FROM users;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(1);
                expect(result?.columns[0].type).toBe("unknown");
            });

            it("should handle empty column name extraction", () => {
                const sql = `CREATE VIEW empty_expr AS
                    SELECT () AS empty FROM users;`;
                const result = parseViewDefinition(sql, "public", sampleTables);

                expect(result).not.toBeNull();
                expect(result?.columns).toHaveLength(1);
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
