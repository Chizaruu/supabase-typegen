/**
 * Tests for SQL file parser orchestrator
 *
 * Coverage targets:
 * - parseSqlFiles: complete orchestration flow
 * - File reading and statement splitting
 * - Parsing all SQL definition types
 * - Comment handling
 * - Index attachment
 * - ALTER TABLE constraint handling
 * - Foreign key relationship detection
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { parseSqlFiles } from "../../src/parsers/sql-file-parser.js";
import * as fs from "fs";
import * as logger from "../../src/utils/logger.js";
import * as sqlParsers from "../../src/parsers/sql-parsers.js";
import type {
    TableDefinition,
    EnumDefinition,
    FunctionDefinition,
    CompositeTypeDefinition,
    IndexDefinition,
    ViewDefinition,
} from "../../src/types/index.js";

// Mock modules
vi.mock("fs");

describe("SQL File Parser", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(logger, "log").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("parseSqlFiles", () => {
        describe("Basic parsing", () => {
            it("should parse a simple table definition", () => {
                const sqlContent = `
                    CREATE TABLE users (
                        id UUID PRIMARY KEY,
                        email TEXT NOT NULL
                    );
                `;

                const mockTable: TableDefinition = {
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
                };

                vi.mocked(fs.readFileSync).mockReturnValue(sqlContent);
                vi.spyOn(sqlParsers, "parseTableDefinition").mockReturnValue(
                    mockTable
                );
                vi.spyOn(sqlParsers, "parseEnumDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseFunctionDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseCompositeType").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseIndexDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(
                    sqlParsers,
                    "parseAlterTableForeignKey"
                ).mockReturnValue(null);
                vi.spyOn(sqlParsers, "parseAlterTableUnique").mockReturnValue(
                    null
                );

                const result = parseSqlFiles(["/path/to/schema.sql"], "public");

                expect(result.tables).toHaveLength(1);
                expect(result.tables[0].name).toBe("users");
                expect(logger.log).toHaveBeenCalledWith(
                    expect.stringContaining("Parsed 1 table(s)"),
                    "green"
                );
            });

            it("should parse multiple files", () => {
                const sqlContent1 = "CREATE TABLE users (id UUID);";
                const sqlContent2 = "CREATE TABLE posts (id UUID);";

                const mockTable1: TableDefinition = {
                    schema: "public",
                    name: "users",
                    columns: [],
                    relationships: [],
                    indexes: [],
                };

                const mockTable2: TableDefinition = {
                    schema: "public",
                    name: "posts",
                    columns: [],
                    relationships: [],
                    indexes: [],
                };

                vi.mocked(fs.readFileSync)
                    .mockReturnValueOnce(sqlContent1)
                    .mockReturnValueOnce(sqlContent2);

                let tableCount = 0;
                vi.spyOn(sqlParsers, "parseTableDefinition").mockImplementation(
                    () => {
                        tableCount++;
                        return tableCount === 1 ? mockTable1 : mockTable2;
                    }
                );
                vi.spyOn(sqlParsers, "parseEnumDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseFunctionDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseCompositeType").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseIndexDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(
                    sqlParsers,
                    "parseAlterTableForeignKey"
                ).mockReturnValue(null);
                vi.spyOn(sqlParsers, "parseAlterTableUnique").mockReturnValue(
                    null
                );

                const result = parseSqlFiles(
                    ["/path/to/users.sql", "/path/to/posts.sql"],
                    "public"
                );

                expect(result.tables).toHaveLength(2);
                expect(logger.log).toHaveBeenCalledWith(
                    expect.stringContaining("Processing: users.sql"),
                    "cyan"
                );
                expect(logger.log).toHaveBeenCalledWith(
                    expect.stringContaining("Processing: posts.sql"),
                    "cyan"
                );
            });

            it("should handle empty SQL content", () => {
                vi.mocked(fs.readFileSync).mockReturnValue("");
                vi.spyOn(sqlParsers, "parseTableDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseEnumDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseFunctionDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseCompositeType").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseIndexDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(
                    sqlParsers,
                    "parseAlterTableForeignKey"
                ).mockReturnValue(null);
                vi.spyOn(sqlParsers, "parseAlterTableUnique").mockReturnValue(
                    null
                );

                const result = parseSqlFiles(["/path/to/empty.sql"], "public");

                expect(result.tables).toHaveLength(0);
                expect(result.enums).toHaveLength(0);
                expect(result.functions).toHaveLength(0);
                expect(result.compositeTypes).toHaveLength(0);
            });

            it("should extract filename correctly from path", () => {
                vi.mocked(fs.readFileSync).mockReturnValue("");
                vi.spyOn(sqlParsers, "parseTableDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseEnumDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseFunctionDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseCompositeType").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseIndexDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(
                    sqlParsers,
                    "parseAlterTableForeignKey"
                ).mockReturnValue(null);
                vi.spyOn(sqlParsers, "parseAlterTableUnique").mockReturnValue(
                    null
                );

                parseSqlFiles(["/path/to/migrations/001_schema.sql"], "public");

                expect(logger.log).toHaveBeenCalledWith(
                    expect.stringContaining("001_schema.sql"),
                    "cyan"
                );
            });

            it("should handle empty file path string", () => {
                vi.mocked(fs.readFileSync).mockReturnValue("");
                vi.spyOn(sqlParsers, "parseTableDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseEnumDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseFunctionDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseCompositeType").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseIndexDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(
                    sqlParsers,
                    "parseAlterTableForeignKey"
                ).mockReturnValue(null);
                vi.spyOn(sqlParsers, "parseAlterTableUnique").mockReturnValue(
                    null
                );

                parseSqlFiles([""], "public");

                expect(logger.log).toHaveBeenCalledWith(
                    expect.stringContaining("Processing: "),
                    "cyan"
                );
            });
        });

        describe("Parsing different SQL types", () => {
            it("should parse enums", () => {
                const mockEnum: EnumDefinition = {
                    schema: "public",
                    name: "user_role",
                    values: ["admin", "user"],
                };

                vi.mocked(fs.readFileSync).mockReturnValue(
                    "CREATE TYPE user_role AS ENUM ('admin', 'user');"
                );

                vi.spyOn(sqlParsers, "parseTableDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseEnumDefinition").mockReturnValue(
                    mockEnum
                );
                vi.spyOn(sqlParsers, "parseFunctionDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseCompositeType").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseIndexDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(
                    sqlParsers,
                    "parseAlterTableForeignKey"
                ).mockReturnValue(null);
                vi.spyOn(sqlParsers, "parseAlterTableUnique").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseTableComment").mockReturnValue(null);
                vi.spyOn(sqlParsers, "parseColumnComment").mockReturnValue(
                    null
                );

                const result = parseSqlFiles(["/path/to/schema.sql"], "public");

                expect(result.enums).toHaveLength(1);
                expect(result.enums[0].name).toBe("user_role");
                expect(logger.log).toHaveBeenCalledWith(
                    expect.stringContaining("Parsed 1 enum(s)"),
                    "green"
                );
            });

            it("should parse functions", () => {
                const mockFunction: FunctionDefinition = {
                    schema: "public",
                    name: "get_user",
                    args: [],
                    returns: "users",
                };

                vi.mocked(fs.readFileSync).mockReturnValue(
                    "CREATE FUNCTION get_user() RETURNS users;"
                );

                vi.spyOn(sqlParsers, "parseTableDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseEnumDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseFunctionDefinition").mockReturnValue(
                    mockFunction
                );
                vi.spyOn(sqlParsers, "parseCompositeType").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseIndexDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(
                    sqlParsers,
                    "parseAlterTableForeignKey"
                ).mockReturnValue(null);
                vi.spyOn(sqlParsers, "parseAlterTableUnique").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseTableComment").mockReturnValue(null);
                vi.spyOn(sqlParsers, "parseColumnComment").mockReturnValue(
                    null
                );

                const result = parseSqlFiles(["/path/to/schema.sql"], "public");

                expect(result.functions).toHaveLength(1);
                expect(result.functions[0].name).toBe("get_user");
                expect(logger.log).toHaveBeenCalledWith(
                    expect.stringContaining("Parsed 1 function(s)"),
                    "green"
                );
            });

            it("should parse composite types", () => {
                const mockComposite: CompositeTypeDefinition = {
                    schema: "public",
                    name: "address",
                    attributes: [{ name: "street", type: "text" }],
                };

                vi.mocked(fs.readFileSync).mockReturnValue(
                    "CREATE TYPE address AS (street text);"
                );

                vi.spyOn(sqlParsers, "parseTableDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseEnumDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseFunctionDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseCompositeType").mockReturnValue(
                    mockComposite
                );
                vi.spyOn(sqlParsers, "parseIndexDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(
                    sqlParsers,
                    "parseAlterTableForeignKey"
                ).mockReturnValue(null);
                vi.spyOn(sqlParsers, "parseAlterTableUnique").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseTableComment").mockReturnValue(null);
                vi.spyOn(sqlParsers, "parseColumnComment").mockReturnValue(
                    null
                );

                const result = parseSqlFiles(["/path/to/schema.sql"], "public");

                expect(result.compositeTypes).toHaveLength(1);
                expect(result.compositeTypes[0].name).toBe("address");
                expect(logger.log).toHaveBeenCalledWith(
                    expect.stringContaining("Parsed 1 composite type(s)"),
                    "green"
                );
            });

            it("should parse multiple types in one file", () => {
                const sqlContent = `
        CREATE TABLE users (id UUID);
        CREATE TYPE role AS ENUM ('admin');
        CREATE FUNCTION get_user() RETURNS users;
        CREATE TYPE address AS (street text);
        CREATE VIEW active_users AS SELECT * FROM users WHERE active = true;
    `;

                vi.mocked(fs.readFileSync).mockReturnValue(sqlContent);

                let tableCallCount = 0;
                vi.spyOn(sqlParsers, "parseTableDefinition").mockImplementation(
                    () => {
                        return tableCallCount++ === 0
                            ? {
                                  schema: "public",
                                  name: "users",
                                  columns: [],
                                  relationships: [],
                                  indexes: [],
                              }
                            : null;
                    }
                );

                let enumCallCount = 0;
                vi.spyOn(sqlParsers, "parseEnumDefinition").mockImplementation(
                    () => {
                        return enumCallCount++ === 0
                            ? {
                                  schema: "public",
                                  name: "role",
                                  values: ["admin"],
                              }
                            : null;
                    }
                );

                let functionCallCount = 0;
                vi.spyOn(
                    sqlParsers,
                    "parseFunctionDefinition"
                ).mockImplementation(() => {
                    return functionCallCount++ === 0
                        ? {
                              schema: "public",
                              name: "get_user",
                              args: [],
                              returns: "users",
                          }
                        : null;
                });

                let compositeCallCount = 0;
                vi.spyOn(sqlParsers, "parseCompositeType").mockImplementation(
                    () => {
                        return compositeCallCount++ === 0
                            ? {
                                  schema: "public",
                                  name: "address",
                                  attributes: [
                                      { name: "street", type: "text" },
                                  ],
                              }
                            : null;
                    }
                );

                let viewCallCount = 0;
                vi.spyOn(sqlParsers, "parseViewDefinition").mockImplementation(
                    () => {
                        return viewCallCount++ === 0
                            ? {
                                  schema: "public",
                                  name: "active_users",
                                  definition:
                                      "SELECT * FROM users WHERE active = true",
                                  columns: [],
                                  isMaterialized: false,
                              }
                            : null;
                    }
                );

                vi.spyOn(sqlParsers, "parseIndexDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(
                    sqlParsers,
                    "parseAlterTableForeignKey"
                ).mockReturnValue(null);
                vi.spyOn(sqlParsers, "parseAlterTableUnique").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseTableComment").mockReturnValue(null);
                vi.spyOn(sqlParsers, "parseColumnComment").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseViewComment").mockReturnValue(null);

                const result = parseSqlFiles(["/path/to/schema.sql"], "public");

                expect(result.tables).toHaveLength(1);
                expect(result.enums).toHaveLength(1);
                expect(result.functions).toHaveLength(1);
                expect(result.compositeTypes).toHaveLength(1);
                expect(result.views).toHaveLength(1);
            });

            it("should parse views", () => {
                const mockView: ViewDefinition = {
                    schema: "public",
                    name: "user_summary",
                    definition: "SELECT id, email FROM users",
                    columns: [],
                    isMaterialized: false,
                };

                vi.mocked(fs.readFileSync).mockReturnValue(
                    "CREATE VIEW user_summary AS SELECT id, email FROM users;"
                );

                vi.spyOn(sqlParsers, "parseTableDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseEnumDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseFunctionDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseCompositeType").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseViewDefinition").mockReturnValue(
                    mockView
                );
                vi.spyOn(sqlParsers, "parseIndexDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(
                    sqlParsers,
                    "parseAlterTableForeignKey"
                ).mockReturnValue(null);
                vi.spyOn(sqlParsers, "parseAlterTableUnique").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseTableComment").mockReturnValue(null);
                vi.spyOn(sqlParsers, "parseColumnComment").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseViewComment").mockReturnValue(null);

                const result = parseSqlFiles(["/path/to/schema.sql"], "public");

                expect(result.views).toHaveLength(1);
                expect(result.views[0].name).toBe("user_summary");
                expect(logger.log).toHaveBeenCalledWith(
                    expect.stringContaining("Parsed 1 view(s)"),
                    "green"
                );
            });
        });

        describe("Index handling", () => {
            it("should attach indexes to tables", () => {
                const sqlContent = `
                    CREATE TABLE users (id UUID);
                    CREATE INDEX idx_users_id ON users(id);
                `;

                const mockTable: TableDefinition = {
                    schema: "public",
                    name: "users",
                    columns: [],
                    relationships: [],
                    indexes: [],
                };

                const mockIndex: IndexDefinition = {
                    name: "idx_users_id",
                    tableName: "users",
                    columns: ["id"],
                    isUnique: false,
                };

                vi.mocked(fs.readFileSync).mockReturnValue(sqlContent);

                let tableCallCount = 0;
                vi.spyOn(sqlParsers, "parseTableDefinition").mockImplementation(
                    () => {
                        return tableCallCount++ === 0 ? mockTable : null;
                    }
                );

                vi.spyOn(sqlParsers, "parseEnumDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseFunctionDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseCompositeType").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseViewDefinition").mockReturnValue(
                    null
                ); // ADD THIS LINE

                let indexCallCount = 0;
                vi.spyOn(sqlParsers, "parseIndexDefinition").mockImplementation(
                    () => {
                        return indexCallCount++ === 0 ? mockIndex : null;
                    }
                );

                vi.spyOn(
                    sqlParsers,
                    "parseAlterTableForeignKey"
                ).mockReturnValue(null);
                vi.spyOn(sqlParsers, "parseAlterTableUnique").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseTableComment").mockReturnValue(null);
                vi.spyOn(sqlParsers, "parseColumnComment").mockReturnValue(
                    null
                );

                const result = parseSqlFiles(["/path/to/schema.sql"], "public");

                expect(result.tables[0].indexes).toHaveLength(1);
                expect(result.tables[0].indexes[0].name).toBe("idx_users_id");
            });
        });

        describe("Comment handling", () => {
            let mockTable: TableDefinition;

            it("should attach table comments when includeComments is true", () => {
                mockTable = {
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
                            isUnique: false,
                        },
                    ],
                    relationships: [],
                    indexes: [],
                };

                const sqlContent = `
        CREATE TABLE users (id UUID);
        COMMENT ON TABLE users IS 'User accounts';
    `;

                vi.mocked(fs.readFileSync).mockReturnValue(sqlContent);

                let tableCallCount = 0;
                vi.spyOn(sqlParsers, "parseTableDefinition").mockImplementation(
                    () => {
                        return tableCallCount++ === 0 ? mockTable : null;
                    }
                );

                vi.spyOn(sqlParsers, "parseEnumDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseFunctionDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseCompositeType").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseViewDefinition").mockReturnValue(
                    null
                ); // ADD THIS LINE
                vi.spyOn(sqlParsers, "parseIndexDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(
                    sqlParsers,
                    "parseAlterTableForeignKey"
                ).mockReturnValue(null);
                vi.spyOn(sqlParsers, "parseAlterTableUnique").mockReturnValue(
                    null
                );

                let tableCommentCallCount = 0;
                vi.spyOn(sqlParsers, "parseTableComment").mockImplementation(
                    () => {
                        return tableCommentCallCount++ === 0
                            ? {
                                  tableName: "users",
                                  comment: "User accounts",
                                  schema: "public",
                              }
                            : null;
                    }
                );

                vi.spyOn(sqlParsers, "parseColumnComment").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseViewComment").mockReturnValue(null); // ADD THIS LINE TOO

                const result = parseSqlFiles(
                    ["/path/to/schema.sql"],
                    "public",
                    true
                );

                expect(result.tables[0].comment).toBe("User accounts");
            });

            it("should attach column comments when includeComments is true", () => {
                mockTable = {
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
                            isUnique: false,
                        },
                    ],
                    relationships: [],
                    indexes: [],
                };

                const sqlContent = `
        CREATE TABLE users (id UUID, email TEXT);
        COMMENT ON COLUMN users.email IS 'User email address';
    `;

                vi.mocked(fs.readFileSync).mockReturnValue(sqlContent);

                let tableCallCount = 0;
                vi.spyOn(sqlParsers, "parseTableDefinition").mockImplementation(
                    () => {
                        return tableCallCount++ === 0 ? mockTable : null;
                    }
                );

                vi.spyOn(sqlParsers, "parseEnumDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseFunctionDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseCompositeType").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseViewDefinition").mockReturnValue(
                    null
                ); // ADD THIS LINE
                vi.spyOn(sqlParsers, "parseIndexDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(
                    sqlParsers,
                    "parseAlterTableForeignKey"
                ).mockReturnValue(null);
                vi.spyOn(sqlParsers, "parseAlterTableUnique").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseTableComment").mockReturnValue(null);

                let columnCommentCallCount = 0;
                vi.spyOn(sqlParsers, "parseColumnComment").mockImplementation(
                    () => {
                        return columnCommentCallCount++ === 0
                            ? {
                                  tableName: "users",
                                  columnName: "email",
                                  comment: "User email address",
                                  schema: "public",
                              }
                            : null;
                    }
                );

                vi.spyOn(sqlParsers, "parseViewComment").mockReturnValue(null); // ADD THIS LINE TOO

                const result = parseSqlFiles(
                    ["/path/to/schema.sql"],
                    "public",
                    true
                );

                const emailColumn = result.tables[0].columns.find(
                    (c) => c.name === "email"
                );
                expect(emailColumn?.comment).toBe("User email address");
            });

            it("should not parse comments when includeComments is false", () => {
                mockTable = {
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
                            isUnique: false,
                        },
                    ],
                    relationships: [],
                    indexes: [],
                };

                const sqlContent = `
                    CREATE TABLE users (id UUID);
                    COMMENT ON TABLE users IS 'User accounts';
                `;

                vi.mocked(fs.readFileSync).mockReturnValue(sqlContent);

                vi.spyOn(sqlParsers, "parseTableDefinition")
                    .mockReturnValueOnce(mockTable)
                    .mockReturnValue(null);
                vi.spyOn(sqlParsers, "parseEnumDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseFunctionDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseCompositeType").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseIndexDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(
                    sqlParsers,
                    "parseAlterTableForeignKey"
                ).mockReturnValue(null);
                vi.spyOn(sqlParsers, "parseAlterTableUnique").mockReturnValue(
                    null
                );

                const tableCommentSpy = vi.spyOn(
                    sqlParsers,
                    "parseTableComment"
                );
                const columnCommentSpy = vi.spyOn(
                    sqlParsers,
                    "parseColumnComment"
                );

                parseSqlFiles(["/path/to/schema.sql"], "public", false);

                expect(tableCommentSpy).not.toHaveBeenCalled();
                expect(columnCommentSpy).not.toHaveBeenCalled();
            });

            it("should attach view comments when includeComments is true", () => {
                const mockView: ViewDefinition = {
                    schema: "public",
                    name: "user_summary",
                    definition: "SELECT id, email FROM users",
                    columns: [],
                    isMaterialized: false,
                };

                const sqlContent = `
        CREATE VIEW user_summary AS SELECT id, email FROM users;
        COMMENT ON VIEW user_summary IS 'Summary of user data';
    `;

                vi.mocked(fs.readFileSync).mockReturnValue(sqlContent);

                vi.spyOn(sqlParsers, "parseTableDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseEnumDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseFunctionDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseCompositeType").mockReturnValue(
                    null
                );

                let viewCallCount = 0;
                vi.spyOn(sqlParsers, "parseViewDefinition").mockImplementation(
                    () => {
                        return viewCallCount++ === 0 ? mockView : null;
                    }
                );

                vi.spyOn(sqlParsers, "parseIndexDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(
                    sqlParsers,
                    "parseAlterTableForeignKey"
                ).mockReturnValue(null);
                vi.spyOn(sqlParsers, "parseAlterTableUnique").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseTableComment").mockReturnValue(null);
                vi.spyOn(sqlParsers, "parseColumnComment").mockReturnValue(
                    null
                );

                let viewCommentCallCount = 0;
                vi.spyOn(sqlParsers, "parseViewComment").mockImplementation(
                    () => {
                        return viewCommentCallCount++ === 0
                            ? {
                                  viewName: "user_summary",
                                  comment: "Summary of user data",
                                  schema: "public",
                              }
                            : null;
                    }
                );

                const result = parseSqlFiles(
                    ["/path/to/schema.sql"],
                    "public",
                    true
                );

                expect(result.views[0].comment).toBe("Summary of user data");
            });
        });

        describe("ALTER TABLE handling", () => {
            let mockTable: TableDefinition;

            it("should apply ALTER TABLE UNIQUE constraints", () => {
                mockTable = {
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
                    ],
                    relationships: [],
                    indexes: [],
                };

                vi.mocked(fs.readFileSync).mockReturnValue(
                    "CREATE TABLE posts (email TEXT);\n                    ALTER TABLE posts ADD CONSTRAINT posts_email_unique UNIQUE (email);"
                );

                let tableCallCount = 0;
                vi.spyOn(sqlParsers, "parseTableDefinition").mockImplementation(
                    () => {
                        return tableCallCount++ === 0 ? mockTable : null;
                    }
                );

                vi.spyOn(sqlParsers, "parseEnumDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseFunctionDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseCompositeType").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseIndexDefinition").mockReturnValue(
                    null
                );

                let alterUniqueCallCount = 0;
                vi.spyOn(
                    sqlParsers,
                    "parseAlterTableUnique"
                ).mockImplementation(() => {
                    return alterUniqueCallCount++ === 0
                        ? {
                              tableName: "posts",
                              columns: ["email"],
                          }
                        : null;
                });

                vi.spyOn(
                    sqlParsers,
                    "parseAlterTableForeignKey"
                ).mockReturnValue(null);
                vi.spyOn(sqlParsers, "parseTableComment").mockReturnValue(null);
                vi.spyOn(sqlParsers, "parseColumnComment").mockReturnValue(
                    null
                );

                const result = parseSqlFiles(["/path/to/schema.sql"], "public");

                const emailColumn = result.tables[0].columns.find(
                    (c) => c.name === "email"
                );
                expect(emailColumn?.isUnique).toBe(true);
            });

            it("should attach ALTER TABLE foreign keys", () => {
                mockTable = {
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
                    ],
                    relationships: [],
                    indexes: [],
                };

                vi.mocked(fs.readFileSync).mockReturnValue(
                    "CREATE TABLE posts (user_id UUID, email TEXT);\n                    ALTER TABLE posts ADD CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);"
                );

                let tableCallCount = 0;
                vi.spyOn(sqlParsers, "parseTableDefinition").mockImplementation(
                    () => {
                        return tableCallCount++ === 0 ? mockTable : null;
                    }
                );

                vi.spyOn(sqlParsers, "parseEnumDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseFunctionDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseCompositeType").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseIndexDefinition").mockReturnValue(
                    null
                );

                let alterFKCallCount = 0;
                vi.spyOn(
                    sqlParsers,
                    "parseAlterTableForeignKey"
                ).mockImplementation(() => {
                    return alterFKCallCount++ === 0
                        ? {
                              tableName: "posts",
                              relationship: {
                                  foreignKeyName: "posts_user_id_fkey",
                                  columns: ["user_id"],
                                  isOneToOne: false,
                                  referencedRelation: "users",
                                  referencedColumns: ["id"],
                              },
                          }
                        : null;
                });

                vi.spyOn(sqlParsers, "parseAlterTableUnique").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseTableComment").mockReturnValue(null);
                vi.spyOn(sqlParsers, "parseColumnComment").mockReturnValue(
                    null
                );

                const result = parseSqlFiles(["/path/to/schema.sql"], "public");

                expect(result.tables[0].relationships).toHaveLength(1);
                expect(result.tables[0].relationships[0].foreignKeyName).toBe(
                    "posts_user_id_fkey"
                );
            });

            it("should detect one-to-one relationships when column is unique", () => {
                mockTable = {
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
                            isUnique: true,
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
                    ],
                    relationships: [],
                    indexes: [],
                };

                vi.mocked(fs.readFileSync).mockReturnValue(
                    "CREATE TABLE posts (id UUID PRIMARY KEY, user_id UUID UNIQUE, email TEXT);\n                    ALTER TABLE posts ADD CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);"
                );

                let tableCallCount = 0;
                vi.spyOn(sqlParsers, "parseTableDefinition").mockImplementation(
                    () => {
                        return tableCallCount++ === 0 ? mockTable : null;
                    }
                );

                vi.spyOn(sqlParsers, "parseEnumDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseFunctionDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseCompositeType").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseIndexDefinition").mockReturnValue(
                    null
                );

                let alterFKCallCount = 0;
                vi.spyOn(
                    sqlParsers,
                    "parseAlterTableForeignKey"
                ).mockImplementation(() => {
                    return alterFKCallCount++ === 0
                        ? {
                              tableName: "posts",
                              relationship: {
                                  foreignKeyName: "posts_user_id_fkey",
                                  columns: ["user_id"],
                                  isOneToOne: false,
                                  referencedRelation: "users",
                                  referencedColumns: ["id"],
                              },
                          }
                        : null;
                });

                vi.spyOn(sqlParsers, "parseAlterTableUnique").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseTableComment").mockReturnValue(null);
                vi.spyOn(sqlParsers, "parseColumnComment").mockReturnValue(
                    null
                );

                const result = parseSqlFiles(["/path/to/schema.sql"], "public");

                expect(result.tables[0].relationships[0].isOneToOne).toBe(true);
            });

            it("should detect one-to-one relationships when unique index exists", () => {
                mockTable = {
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
                    ],
                    relationships: [],
                    indexes: [
                        {
                            name: "idx_posts_user_id",
                            tableName: "posts",
                            columns: ["user_id"],
                            isUnique: true,
                        },
                    ],
                };

                vi.mocked(fs.readFileSync).mockReturnValue(
                    "CREATE TABLE posts (id UUID PRIMARY KEY, user_id UUID, email TEXT);\n                    CREATE UNIQUE INDEX idx_posts_user_id ON posts(user_id);\n                    ALTER TABLE posts ADD CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);"
                );

                let tableCallCount = 0;
                vi.spyOn(sqlParsers, "parseTableDefinition").mockImplementation(
                    () => {
                        return tableCallCount++ === 0 ? mockTable : null;
                    }
                );

                vi.spyOn(sqlParsers, "parseEnumDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseFunctionDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseCompositeType").mockReturnValue(
                    null
                );
                let indexCallCount = 0;
                vi.spyOn(sqlParsers, "parseIndexDefinition").mockImplementation(
                    () => {
                        return indexCallCount++ === 0
                            ? {
                                  name: "idx_posts_user_id",
                                  tableName: "posts",
                                  columns: ["user_id"],
                                  isUnique: true,
                              }
                            : null;
                    }
                );

                let alterFKCallCount = 0;
                vi.spyOn(
                    sqlParsers,
                    "parseAlterTableForeignKey"
                ).mockImplementation(() => {
                    return alterFKCallCount++ === 0
                        ? {
                              tableName: "posts",
                              relationship: {
                                  foreignKeyName: "posts_user_id_fkey",
                                  columns: ["user_id"],
                                  isOneToOne: false,
                                  referencedRelation: "users",
                                  referencedColumns: ["id"],
                              },
                          }
                        : null;
                });

                vi.spyOn(sqlParsers, "parseAlterTableUnique").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseTableComment").mockReturnValue(null);
                vi.spyOn(sqlParsers, "parseColumnComment").mockReturnValue(
                    null
                );

                const result = parseSqlFiles(["/path/to/schema.sql"], "public");

                expect(result.tables[0].relationships[0].isOneToOne).toBe(true);
            });

            it("should not detect one-to-one when multi-column foreign key", () => {
                mockTable = {
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
                    ],
                    relationships: [],
                    indexes: [],
                };

                vi.mocked(fs.readFileSync).mockReturnValue(
                    "CREATE TABLE posts (id UUID PRIMARY KEY, user_id UUID, email TEXT);\n                    ALTER TABLE posts ADD CONSTRAINT posts_fkey FOREIGN KEY (user_id, email) REFERENCES users(id, email);"
                );

                let tableCallCount = 0;
                vi.spyOn(sqlParsers, "parseTableDefinition").mockImplementation(
                    () => {
                        return tableCallCount++ === 0 ? mockTable : null;
                    }
                );

                vi.spyOn(sqlParsers, "parseEnumDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseFunctionDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseCompositeType").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseIndexDefinition").mockReturnValue(
                    null
                );

                let alterFKCallCount = 0;
                vi.spyOn(
                    sqlParsers,
                    "parseAlterTableForeignKey"
                ).mockImplementation(() => {
                    return alterFKCallCount++ === 0
                        ? {
                              tableName: "posts",
                              relationship: {
                                  foreignKeyName: "posts_fkey",
                                  columns: ["user_id", "email"],
                                  isOneToOne: false,
                                  referencedRelation: "users",
                                  referencedColumns: ["id", "email"],
                              },
                          }
                        : null;
                });

                vi.spyOn(sqlParsers, "parseAlterTableUnique").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseTableComment").mockReturnValue(null);
                vi.spyOn(sqlParsers, "parseColumnComment").mockReturnValue(
                    null
                );

                const result = parseSqlFiles(["/path/to/schema.sql"], "public");

                expect(result.tables[0].relationships[0].isOneToOne).toBe(
                    false
                );
            });
        });

        describe("Error handling", () => {
            beforeEach(() => {
                vi.spyOn(sqlParsers, "parseTableDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseEnumDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseFunctionDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseCompositeType").mockReturnValue(
                    null
                );
                vi.spyOn(sqlParsers, "parseIndexDefinition").mockReturnValue(
                    null
                );
                vi.spyOn(
                    sqlParsers,
                    "parseAlterTableForeignKey"
                ).mockReturnValue(null);
                vi.spyOn(sqlParsers, "parseAlterTableUnique").mockReturnValue(
                    null
                );
            });

            it("should handle file read errors", () => {
                vi.mocked(fs.readFileSync).mockImplementation(() => {
                    throw new Error("File not found");
                });

                const result = parseSqlFiles(
                    ["/path/to/missing.sql"],
                    "public"
                );

                expect(result.tables).toHaveLength(0);
                expect(logger.log).toHaveBeenCalledWith(
                    expect.stringContaining("Error parsing"),
                    "red"
                );
                expect(logger.log).toHaveBeenCalledWith(
                    expect.stringContaining("File not found"),
                    "red"
                );
            });

            it("should continue parsing other files after an error", () => {
                vi.mocked(fs.readFileSync)
                    .mockImplementationOnce(() => {
                        throw new Error("File error");
                    })
                    .mockReturnValueOnce("CREATE TABLE users (id UUID);");

                let tableCallCount = 0;
                vi.spyOn(sqlParsers, "parseTableDefinition").mockImplementation(
                    () => {
                        return tableCallCount++ === 0
                            ? {
                                  schema: "public",
                                  name: "users",
                                  columns: [],
                                  relationships: [],
                                  indexes: [],
                              }
                            : null;
                    }
                );

                const result = parseSqlFiles(
                    ["/path/to/error.sql", "/path/to/valid.sql"],
                    "public"
                );

                expect(result.tables).toHaveLength(1);
            });

            it("should handle non-Error objects", () => {
                vi.mocked(fs.readFileSync).mockImplementation(() => {
                    throw "String error";
                });

                const result = parseSqlFiles(["/path/to/error.sql"], "public");

                expect(logger.log).toHaveBeenCalledWith(
                    expect.stringContaining("String error"),
                    "red"
                );
            });
        });

        describe("Schema parameter", () => {
            it("should pass schema to all parsers", () => {
                vi.mocked(fs.readFileSync).mockReturnValue(
                    "CREATE TABLE users (id UUID);"
                );

                const tableDefSpy = vi
                    .spyOn(sqlParsers, "parseTableDefinition")
                    .mockReturnValue(null);
                const enumDefSpy = vi
                    .spyOn(sqlParsers, "parseEnumDefinition")
                    .mockReturnValue(null);
                const funcDefSpy = vi
                    .spyOn(sqlParsers, "parseFunctionDefinition")
                    .mockReturnValue(null);
                const compositeDefSpy = vi
                    .spyOn(sqlParsers, "parseCompositeType")
                    .mockReturnValue(null);
                const indexDefSpy = vi
                    .spyOn(sqlParsers, "parseIndexDefinition")
                    .mockReturnValue(null);
                const alterFKSpy = vi
                    .spyOn(sqlParsers, "parseAlterTableForeignKey")
                    .mockReturnValue(null);
                const alterUniqueSpy = vi
                    .spyOn(sqlParsers, "parseAlterTableUnique")
                    .mockReturnValue(null);

                parseSqlFiles(["/path/to/schema.sql"], "custom_schema");

                expect(tableDefSpy).toHaveBeenCalledWith(
                    expect.any(String),
                    "custom_schema"
                );
                expect(enumDefSpy).toHaveBeenCalledWith(
                    expect.any(String),
                    "custom_schema"
                );
                expect(funcDefSpy).toHaveBeenCalledWith(
                    expect.any(String),
                    "custom_schema"
                );
                expect(compositeDefSpy).toHaveBeenCalledWith(
                    expect.any(String),
                    "custom_schema"
                );
                expect(indexDefSpy).toHaveBeenCalledWith(
                    expect.any(String),
                    "custom_schema"
                );
                expect(alterFKSpy).toHaveBeenCalledWith(
                    expect.any(String),
                    "custom_schema"
                );
                expect(alterUniqueSpy).toHaveBeenCalledWith(
                    expect.any(String),
                    "custom_schema"
                );
            });
        });
    });
});
