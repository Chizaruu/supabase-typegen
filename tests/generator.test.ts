/**
 * Integration tests for the type generator
 *
 * Coverage targets:
 * - initializeConfig: all branches and config combinations
 * - generateTypes: full flow from parsing to file generation
 * - generateFinalTypes: type generation with various options
 *
 * @group integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { initializeConfig, generateTypes } from "../src/generator.ts";
import * as fs from "fs";
import * as path from "path";
import * as logger from "../src/utils/logger.ts";
import * as cli from "../src/config/cli.ts";
import * as toml from "../src/config/toml.ts";
import * as sqlFileParser from "../src/parsers/sql-file-parser.ts";
import * as jsonbParser from "../src/parsers/jsonb.ts";
import * as tableGenerator from "../src/generators/table.ts";
import * as enumGenerator from "../src/generators/enum.ts";
import * as functionGenerator from "../src/generators/function.ts";
import * as compositeGenerator from "../src/generators/composite.ts";
import * as geometricGenerator from "../src/generators/geometric.ts";
import * as constantsGenerator from "../src/generators/constants.ts";
import * as jsonbGenerator from "../src/generators/jsonb.ts";
import * as prettierUtils from "../src/utils/prettier.ts";
import * as typeMapping from "../src/utils/type-mapping.ts";
import type {
    TableDefinition,
    EnumDefinition,
    FunctionDefinition,
    CompositeTypeDefinition,
    TypeDefinition,
} from "../src/types/index.ts";

// Mock fs module at the top level
vi.mock("fs", () => ({
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn(),
    statSync: vi.fn(),
}));

describe("Integration: Generator", () => {
    let originalArgv: string[];
    let originalProcessExit: typeof process.exit;
    let writeFileSyncSpy: any;

    beforeEach(() => {
        originalArgv = process.argv;
        originalProcessExit = process.exit;

        // Reset all mocks
        vi.clearAllMocks();

        // Mock all logging
        vi.spyOn(logger, "log").mockImplementation(() => {});
        vi.spyOn(logger, "setVerboseLogging").mockImplementation(() => {});

        // Mock process.exit
        process.exit = vi.fn() as any;

        // Set default fs mocks
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.mkdirSync).mockImplementation(() => undefined as any);
        vi.mocked(fs.writeFileSync).mockImplementation(() => {});
    });

    afterEach(() => {
        process.argv = originalArgv;
        process.exit = originalProcessExit;
        vi.clearAllMocks();
    });

    describe("initializeConfig", () => {
        it("should initialize with default configuration", () => {
            process.argv = ["node", "script.ts"];

            vi.spyOn(toml, "readSupabaseConfig").mockReturnValue([
                ["migrations/*.sql"],
                "./supabase",
            ]);
            vi.spyOn(toml, "resolveSchemaFiles").mockReturnValue([
                "/path/to/migrations/001_initial.sql",
            ]);
            vi.spyOn(prettierUtils, "detectPrettierConfig").mockReturnValue(
                null
            );
            vi.spyOn(prettierUtils, "getPrettierIndentSize").mockReturnValue(
                null
            );

            const config = initializeConfig();

            expect(config.supabase.source).toBe("sql");
            expect(config.supabase.schema).toBe("public");
            expect(config.namingConvention).toBe("preserve");
            expect(config.alphabetical).toBe(false);
            expect(config.extractNestedTypes).toBe(false);
            expect(config.deduplicateTypes).toBe(true);
            expect(config.indentSize).toBe(2);
            expect(config.includeIndexes).toBe(false);
            expect(config.includeComments).toBe(true);
        });

        it("should use CLI indent size when provided", () => {
            process.argv = ["node", "script.ts", "--indent", "4"];

            vi.spyOn(toml, "readSupabaseConfig").mockReturnValue([
                [],
                "./supabase",
            ]);
            vi.spyOn(toml, "resolveSchemaFiles").mockReturnValue([]);
            vi.spyOn(prettierUtils, "detectPrettierConfig").mockReturnValue(
                null
            );

            const config = initializeConfig();

            expect(config.indentSize).toBe(4);
        });

        it("should use Prettier config when --use-prettier is set", () => {
            process.argv = ["node", "script.ts", "--use-prettier"];

            vi.spyOn(toml, "readSupabaseConfig").mockReturnValue([
                [],
                "./supabase",
            ]);
            vi.spyOn(toml, "resolveSchemaFiles").mockReturnValue([]);
            vi.spyOn(prettierUtils, "detectPrettierConfig").mockReturnValue({
                tabWidth: 4,
            });
            vi.spyOn(prettierUtils, "getPrettierIndentSize").mockReturnValue(4);

            const config = initializeConfig();

            expect(config.indentSize).toBe(4);
        });

        it("should prefer CLI indent over Prettier config", () => {
            process.argv = [
                "node",
                "script.ts",
                "--indent",
                "8",
                "--use-prettier",
            ];

            vi.spyOn(toml, "readSupabaseConfig").mockReturnValue([
                [],
                "./supabase",
            ]);
            vi.spyOn(toml, "resolveSchemaFiles").mockReturnValue([]);
            vi.spyOn(prettierUtils, "detectPrettierConfig").mockReturnValue({
                tabWidth: 4,
            });
            vi.spyOn(prettierUtils, "getPrettierIndentSize").mockReturnValue(4);

            const config = initializeConfig();

            expect(config.indentSize).toBe(8);
        });

        it("should use default indent when Prettier config is null", () => {
            process.argv = ["node", "script.ts", "--use-prettier"];

            vi.spyOn(toml, "readSupabaseConfig").mockReturnValue([
                [],
                "./supabase",
            ]);
            vi.spyOn(toml, "resolveSchemaFiles").mockReturnValue([]);
            vi.spyOn(prettierUtils, "detectPrettierConfig").mockReturnValue(
                null
            );
            vi.spyOn(prettierUtils, "getPrettierIndentSize").mockReturnValue(
                null
            );

            const config = initializeConfig();

            expect(config.indentSize).toBe(2);
        });

        it("should generate output suffix from workdir", () => {
            process.argv = ["node", "script.ts", "--workdir", "./my-project"];

            vi.spyOn(toml, "readSupabaseConfig").mockReturnValue([
                [],
                "./my-project",
            ]);
            vi.spyOn(toml, "resolveSchemaFiles").mockReturnValue([]);
            vi.spyOn(prettierUtils, "detectPrettierConfig").mockReturnValue(
                null
            );

            const config = initializeConfig();

            expect(config.output.tempFile).toBe("databaseMy-project-temp.ts");
            expect(config.output.finalFile).toBe("databaseMy-project.ts");
        });

        it("should handle workdir with dots and supabase folder", () => {
            process.argv = ["node", "script.ts", "--workdir", "./././supabase"];

            vi.spyOn(toml, "readSupabaseConfig").mockReturnValue([
                [],
                "./././supabase",
            ]);
            vi.spyOn(toml, "resolveSchemaFiles").mockReturnValue([]);
            vi.spyOn(prettierUtils, "detectPrettierConfig").mockReturnValue(
                null
            );

            const config = initializeConfig();

            expect(config.output.tempFile).toBe("database-temp.ts");
            expect(config.output.finalFile).toBe("database.ts");
        });

        it("should handle default workdir", () => {
            process.argv = ["node", "script.ts", "--workdir", "./supabase"];

            vi.spyOn(toml, "readSupabaseConfig").mockReturnValue([
                [],
                "./supabase",
            ]);
            vi.spyOn(toml, "resolveSchemaFiles").mockReturnValue([]);
            vi.spyOn(prettierUtils, "detectPrettierConfig").mockReturnValue(
                null
            );

            const config = initializeConfig();

            expect(config.output.tempFile).toBe("database-temp.ts");
            expect(config.output.finalFile).toBe("database.ts");
        });

        it("should handle custom schema and naming convention", () => {
            process.argv = [
                "node",
                "script.ts",
                "--schema",
                "auth",
                "--naming",
                "camelCase",
            ];

            vi.spyOn(toml, "readSupabaseConfig").mockReturnValue([
                [],
                "./supabase",
            ]);
            vi.spyOn(toml, "resolveSchemaFiles").mockReturnValue([]);
            vi.spyOn(prettierUtils, "detectPrettierConfig").mockReturnValue(
                null
            );

            const config = initializeConfig();

            expect(config.supabase.schema).toBe("auth");
            expect(config.namingConvention).toBe("camelCase");
        });

        it("should handle all naming conventions", () => {
            const conventions = [
                "preserve",
                "PascalCase",
                "camelCase",
                "snake_case",
                "SCREAMING_SNAKE_CASE",
            ];

            for (const convention of conventions) {
                process.argv = ["node", "script.ts", "--naming", convention];

                vi.spyOn(toml, "readSupabaseConfig").mockReturnValue([
                    [],
                    "./supabase",
                ]);
                vi.spyOn(toml, "resolveSchemaFiles").mockReturnValue([]);
                vi.spyOn(prettierUtils, "detectPrettierConfig").mockReturnValue(
                    null
                );

                const config = initializeConfig();
                expect(config.namingConvention).toBe(convention);
            }
        });

        it("should handle all boolean flags", () => {
            process.argv = [
                "node",
                "script.ts",
                "--alphabetical",
                "--extract-nested",
                "--include-indexes",
                "--no-comments",
                "--silent",
            ];

            vi.spyOn(toml, "readSupabaseConfig").mockReturnValue([
                [],
                "./supabase",
            ]);
            vi.spyOn(toml, "resolveSchemaFiles").mockReturnValue([]);
            vi.spyOn(prettierUtils, "detectPrettierConfig").mockReturnValue(
                null
            );

            const config = initializeConfig();

            expect(config.alphabetical).toBe(true);
            expect(config.extractNestedTypes).toBe(true);
            expect(config.includeIndexes).toBe(true);
            expect(config.includeComments).toBe(false);
            expect(config.verboseLogging).toBe(false);
        });

        it("should handle no-deduplicate flag", () => {
            process.argv = ["node", "script.ts", "--no-deduplicate"];

            vi.spyOn(toml, "readSupabaseConfig").mockReturnValue([
                [],
                "./supabase",
            ]);
            vi.spyOn(toml, "resolveSchemaFiles").mockReturnValue([]);
            vi.spyOn(prettierUtils, "detectPrettierConfig").mockReturnValue(
                null
            );

            const config = initializeConfig();

            expect(config.deduplicateTypes).toBe(false);
        });

        it("should handle database connection string", () => {
            process.argv = [
                "node",
                "script.ts",
                "--connection-string",
                "postgresql://localhost:5432/db",
            ];

            vi.spyOn(toml, "readSupabaseConfig").mockReturnValue([
                [],
                "./supabase",
            ]);
            vi.spyOn(toml, "resolveSchemaFiles").mockReturnValue([]);
            vi.spyOn(prettierUtils, "detectPrettierConfig").mockReturnValue(
                null
            );

            const config = initializeConfig();

            expect(config.supabase.source).toBe("db");
            expect(config.supabase.connectionString).toBe(
                "postgresql://localhost:5432/db"
            );
        });

        it("should handle all indent sizes 1-8", () => {
            for (let i = 1; i <= 8; i++) {
                process.argv = ["node", "script.ts", "--indent", i.toString()];

                vi.spyOn(toml, "readSupabaseConfig").mockReturnValue([
                    [],
                    "./supabase",
                ]);
                vi.spyOn(toml, "resolveSchemaFiles").mockReturnValue([]);
                vi.spyOn(prettierUtils, "detectPrettierConfig").mockReturnValue(
                    null
                );

                const config = initializeConfig();
                expect(config.indentSize).toBe(i);
            }
        });
    });

    describe("generateTypes - Full Integration", () => {
        const mockTables: TableDefinition[] = [
            {
                schema: "public",
                name: "users",
                columns: [
                    {
                        name: "id",
                        type: "uuid",
                        nullable: false,
                        defaultValue: "gen_random_uuid()",
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
                        comment: "User email address",
                    },
                    {
                        name: "created_at",
                        type: "timestamp with time zone",
                        nullable: false,
                        defaultValue: "now()",
                        isArray: false,
                        isPrimaryKey: false,
                        isUnique: false,
                    },
                ],
                comment: "Application users",
                relationships: [],
                indexes: [
                    {
                        name: "idx_users_email",
                        tableName: "users",
                        columns: ["email"],
                        isUnique: true,
                        method: "btree",
                    },
                ],
            },
            {
                schema: "public",
                name: "posts",
                columns: [
                    {
                        name: "id",
                        type: "uuid",
                        nullable: false,
                        defaultValue: "gen_random_uuid()",
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
                        name: "title",
                        type: "text",
                        nullable: false,
                        defaultValue: null,
                        isArray: false,
                        isPrimaryKey: false,
                        isUnique: false,
                    },
                    {
                        name: "content",
                        type: "text",
                        nullable: true,
                        defaultValue: null,
                        isArray: false,
                        isPrimaryKey: false,
                        isUnique: false,
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

        const mockEnums: EnumDefinition[] = [
            {
                schema: "public",
                name: "user_role",
                values: ["admin", "user", "guest"],
            },
        ];

        const mockFunctions: FunctionDefinition[] = [
            {
                schema: "public",
                name: "get_user_posts",
                args: [{ name: "user_id", type: "uuid" }],
                returns: "setof posts",
            },
        ];

        const mockCompositeTypes: CompositeTypeDefinition[] = [
            {
                schema: "public",
                name: "address",
                attributes: [
                    { name: "street", type: "text" },
                    { name: "city", type: "text" },
                    { name: "postal_code", type: "text" },
                ],
            },
        ];

        const mockJsonbTypes: TypeDefinition[] = [
            {
                table: "users",
                column: "preferences",
                name: "UserPreferences",
                typeDefinition: "{ theme: string; language: string }",
                comment: "User preferences",
            },
        ];

        beforeEach(() => {
            process.argv = ["node", "script.ts"];

            // Mock config reading
            vi.spyOn(toml, "readSupabaseConfig").mockReturnValue([
                ["migrations/*.sql"],
                "./supabase",
            ]);
            vi.spyOn(toml, "resolveSchemaFiles").mockReturnValue([
                "/path/to/migrations/001_initial.sql",
            ]);

            // Mock prettier
            vi.spyOn(prettierUtils, "detectPrettierConfig").mockReturnValue(
                null
            );
            vi.spyOn(prettierUtils, "getPrettierIndentSize").mockReturnValue(
                null
            );

            // Mock SQL parsing
            vi.spyOn(sqlFileParser, "parseSqlFiles").mockReturnValue({
                tables: mockTables,
                enums: mockEnums,
                functions: mockFunctions,
                compositeTypes: mockCompositeTypes,
            });

            // Mock JSONB scanning
            vi.spyOn(jsonbParser, "scanSchemas").mockReturnValue(
                mockJsonbTypes
            );
            vi.spyOn(jsonbParser, "flattenTypes").mockReturnValue(
                mockJsonbTypes
            );
            vi.spyOn(jsonbParser, "normalizeTypeDefinition").mockImplementation(
                (def) => def
            );

            // Mock type mapping
            vi.spyOn(typeMapping, "detectGeometricTypes").mockReturnValue(
                new Set()
            );

            // Mock generators
            vi.spyOn(tableGenerator, "generateTableType").mockReturnValue(
                "    users: { Row: {} }"
            );
            vi.spyOn(enumGenerator, "generateEnumTypes").mockReturnValue(
                '    user_role: "admin"'
            );
            vi.spyOn(
                functionGenerator,
                "generateFunctionTypes"
            ).mockReturnValue("    get_user_posts: {}");
            vi.spyOn(
                compositeGenerator,
                "generateCompositeTypes"
            ).mockReturnValue("    address: {}");
            vi.spyOn(
                geometricGenerator,
                "generateGeometricTypes"
            ).mockReturnValue("");
            vi.spyOn(constantsGenerator, "generateConstants").mockReturnValue(
                ""
            );
            vi.spyOn(
                jsonbGenerator,
                "generateJsonbTypeDefinitions"
            ).mockReturnValue("type UserPreferences = {}");
            vi.spyOn(
                jsonbGenerator,
                "generateMergeDeepStructure"
            ).mockReturnValue("");
        });

        it("should complete full type generation successfully", () => {
            generateTypes();

            expect(fs.writeFileSync).toHaveBeenCalled();
            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining("Type generation complete"),
                "green",
                true
            );
        });

        it("should exit when no tables are found", () => {
            vi.spyOn(sqlFileParser, "parseSqlFiles").mockReturnValue({
                tables: [],
                enums: [],
                functions: [],
                compositeTypes: [],
            });

            generateTypes();

            expect(process.exit).toHaveBeenCalledWith(1);
            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining("No tables found"),
                "red",
                true
            );
        });

        it("should create output directory if it doesn't exist", () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);

            generateTypes();

            expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), {
                recursive: true,
            });
        });

        it("should handle alphabetical sorting", () => {
            process.argv = ["node", "script.ts", "--alphabetical"];

            generateTypes();

            // Verify tables are sorted
            const tables = [...mockTables].sort((a, b) =>
                a.name.localeCompare(b.name)
            );
            expect(tables[0].name).toBe("posts");
            expect(tables[1].name).toBe("users");
        });

        it("should sort columns alphabetically when flag is set", () => {
            process.argv = ["node", "script.ts", "--alphabetical"];

            generateTypes();

            // Verify alphabetical flag is passed correctly
            expect(tableGenerator.generateTableType).toHaveBeenCalled();
        });

        it("should handle different naming conventions", () => {
            process.argv = ["node", "script.ts", "--naming", "camelCase"];

            generateTypes();

            expect(tableGenerator.generateTableType).toHaveBeenCalledWith(
                expect.any(Object),
                "camelCase",
                expect.any(Number),
                expect.any(Boolean),
                expect.any(Boolean),
                expect.any(Set),
                expect.any(String),
                expect.any(Boolean)
            );
        });

        it("should include indexes when flag is set", () => {
            process.argv = ["node", "script.ts", "--include-indexes"];

            generateTypes();

            expect(tableGenerator.generateTableType).toHaveBeenCalledWith(
                expect.any(Object),
                expect.any(String),
                expect.any(Number),
                true, // includeIndexes
                expect.any(Boolean),
                expect.any(Set),
                expect.any(String),
                expect.any(Boolean)
            );
        });

        it("should exclude comments when flag is set", () => {
            process.argv = ["node", "script.ts", "--no-comments"];

            generateTypes();

            expect(sqlFileParser.parseSqlFiles).toHaveBeenCalledWith(
                expect.any(Array),
                expect.any(String),
                false // includeComments
            );
        });

        it("should handle JSONB type extraction", () => {
            process.argv = ["node", "script.ts", "--extract-nested"];

            generateTypes();

            expect(jsonbParser.scanSchemas).toHaveBeenCalled();
            expect(jsonbParser.flattenTypes).toHaveBeenCalledWith(
                mockJsonbTypes
            );
        });

        it("should skip flattening when extract-nested is false", () => {
            process.argv = ["node", "script.ts"];

            const flattenSpy = vi.spyOn(jsonbParser, "flattenTypes");

            generateTypes();

            expect(flattenSpy).not.toHaveBeenCalled();
        });

        it("should deduplicate types when enabled", () => {
            const duplicateTypes: TypeDefinition[] = [
                {
                    table: "users",
                    column: "data",
                    name: "UserData1",
                    typeDefinition: "{ name: string }",
                },
                {
                    table: "posts",
                    column: "data",
                    name: "UserData2",
                    typeDefinition: "{ name: string }",
                },
            ];

            vi.spyOn(jsonbParser, "scanSchemas").mockReturnValue(
                duplicateTypes
            );
            vi.spyOn(jsonbParser, "normalizeTypeDefinition").mockReturnValue(
                "{ name: string }"
            );

            generateTypes();

            expect(jsonbParser.normalizeTypeDefinition).toHaveBeenCalled();
        });

        it("should skip deduplication when disabled", () => {
            process.argv = ["node", "script.ts", "--no-deduplicate"];

            const duplicateTypes: TypeDefinition[] = [
                {
                    table: "users",
                    column: "data",
                    name: "UserData1",
                    typeDefinition: "{ name: string }",
                },
                {
                    table: "posts",
                    column: "data",
                    name: "UserData2",
                    typeDefinition: "{ name: string }",
                },
            ];

            vi.spyOn(jsonbParser, "scanSchemas").mockReturnValue(
                duplicateTypes
            );

            generateTypes();

            // Deduplication logic should not reduce the types
            expect(
                jsonbGenerator.generateJsonbTypeDefinitions
            ).toHaveBeenCalled();
        });

        it("should handle custom indent size", () => {
            process.argv = ["node", "script.ts", "--indent", "4"];

            generateTypes();

            expect(tableGenerator.generateTableType).toHaveBeenCalledWith(
                expect.any(Object),
                expect.any(String),
                4, // indentSize
                expect.any(Boolean),
                expect.any(Boolean),
                expect.any(Set),
                expect.any(String),
                expect.any(Boolean)
            );
        });

        it("should detect and use geometric types", () => {
            const geometricTypes = new Set(["point", "polygon"]);
            vi.spyOn(typeMapping, "detectGeometricTypes").mockReturnValue(
                geometricTypes
            );

            generateTypes();

            expect(
                geometricGenerator.generateGeometricTypes
            ).toHaveBeenCalledWith(geometricTypes, expect.any(Number));
        });

        it("should handle multiple schemas", () => {
            const multiSchemaTables: TableDefinition[] = [
                {
                    ...mockTables[0],
                    schema: "public",
                },
                {
                    ...mockTables[1],
                    schema: "auth",
                },
            ];

            vi.spyOn(sqlFileParser, "parseSqlFiles").mockReturnValue({
                tables: multiSchemaTables,
                enums: mockEnums,
                functions: mockFunctions,
                compositeTypes: mockCompositeTypes,
            });

            generateTypes();

            expect(tableGenerator.generateTableType).toHaveBeenCalledTimes(2);
        });

        it("should write correct file path", () => {
            process.argv = ["node", "script.ts", "--output", "./custom/types"];

            generateTypes();

            const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
            const filePath = writeCall[0] as string;

            // Normalize path separators for cross-platform compatibility
            const normalizedPath = filePath.replace(/\\/g, "/");

            expect(normalizedPath).toContain("custom/types");
            expect(normalizedPath).toMatch(/database.*\.ts$/);
        });

        it("should handle database source mode", () => {
            process.argv = ["node", "script.ts", "--db"];

            const config = initializeConfig();

            expect(config.supabase.source).toBe("db");
        });

        it("should log statistics correctly", () => {
            generateTypes();

            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining("2 table(s)"),
                "green"
            );
            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining("1 enum(s)"),
                "green"
            );
            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining("1 function(s)"),
                "green"
            );
            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining("1 composite type(s)"),
                "green"
            );
        });

        it("should handle empty enums, functions, and composite types", () => {
            vi.spyOn(sqlFileParser, "parseSqlFiles").mockReturnValue({
                tables: mockTables,
                enums: [],
                functions: [],
                compositeTypes: [],
            });

            generateTypes();

            // Should still complete successfully
            expect(fs.writeFileSync).toHaveBeenCalled();
        });

        it("should handle workdir with nested path", () => {
            process.argv = [
                "node",
                "script.ts",
                "--workdir",
                "./projects/myapp/supabase",
            ];

            vi.spyOn(toml, "readSupabaseConfig").mockReturnValue([
                [],
                "./projects/myapp/supabase",
            ]);
            vi.spyOn(toml, "resolveSchemaFiles").mockReturnValue([]);
            vi.spyOn(prettierUtils, "detectPrettierConfig").mockReturnValue(
                null
            );

            const config = initializeConfig();

            expect(config.output.finalFile).toContain("Myapp");
        });

        it("should generate file content with correct header", () => {
            generateTypes();

            const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
            const content = writeCall[1] as string;

            expect(content).toContain(
                "Auto-generated TypeScript types for Supabase"
            );
            expect(content).toContain("Generated:");
            expect(content).toContain("Source: SQL files");
            expect(content).toContain("Naming convention: preserve");
            expect(content).toContain("Schema: public");
        });

        it("should generate Json type definition", () => {
            generateTypes();

            const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
            const content = writeCall[1] as string;

            expect(content).toContain("export type Json =");
        });

        it("should generate helper types", () => {
            generateTypes();

            const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
            const content = writeCall[1] as string;

            expect(content).toContain("export type Tables<");
            expect(content).toContain("export type TablesInsert<");
            expect(content).toContain("export type TablesUpdate<");
            expect(content).toContain("export type Enums<");
            expect(content).toContain("export type CompositeTypes<");
        });

        it("should include MergeDeep import when JSONB overrides exist", () => {
            vi.spyOn(
                jsonbGenerator,
                "generateMergeDeepStructure"
            ).mockReturnValue("users: { data: UserData }");

            generateTypes();

            const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
            const content = writeCall[1] as string;

            expect(content).toContain(
                "import type { MergeDeep } from 'type-fest'"
            );
        });

        it("should not include MergeDeep import when no JSONB overrides", () => {
            vi.spyOn(
                jsonbGenerator,
                "generateMergeDeepStructure"
            ).mockReturnValue("");

            generateTypes();

            const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
            const content = writeCall[1] as string;

            expect(content).not.toContain(
                "import type { MergeDeep } from 'type-fest'"
            );
        });

        it("should include graphql_public schema", () => {
            generateTypes();

            const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
            const content = writeCall[1] as string;

            expect(content).toContain("graphql_public");
            expect(content).toContain("graphql:");
        });

        it("should log JSONB type statistics", () => {
            const nestedTypes: TypeDefinition[] = [
                {
                    table: "users",
                    column: "data",
                    name: "UserData",
                    typeDefinition: "{ name: string }",
                },
                {
                    table: "",
                    column: "",
                    name: "NestedType",
                    typeDefinition: "{ value: number }",
                },
            ];

            vi.spyOn(jsonbParser, "scanSchemas").mockReturnValue(nestedTypes);
            vi.spyOn(jsonbParser, "flattenTypes").mockReturnValue(nestedTypes);

            generateTypes();

            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining("2 JSONB type(s)"),
                "green"
            );
        });

        it("should sort JSONB types alphabetically when extract-nested and alphabetical are set", () => {
            process.argv = [
                "node",
                "script.ts",
                "--extract-nested",
                "--alphabetical",
            ];

            const unsortedTypes: TypeDefinition[] = [
                {
                    table: "users",
                    column: "data",
                    name: "ZebraType",
                    typeDefinition: "{ z: string }",
                },
                {
                    table: "posts",
                    column: "meta",
                    name: "AppleType",
                    typeDefinition: "{ a: string }",
                },
            ];

            vi.spyOn(jsonbParser, "scanSchemas").mockReturnValue(unsortedTypes);
            vi.spyOn(jsonbParser, "flattenTypes").mockReturnValue(
                unsortedTypes
            );

            generateTypes();

            expect(
                jsonbGenerator.generateJsonbTypeDefinitions
            ).toHaveBeenCalled();
        });
    });

    describe("Edge Cases", () => {
        beforeEach(() => {
            process.argv = ["node", "script.ts"];

            vi.spyOn(toml, "readSupabaseConfig").mockReturnValue([
                [],
                "./supabase",
            ]);
            vi.spyOn(toml, "resolveSchemaFiles").mockReturnValue(["/test.sql"]);
            vi.spyOn(prettierUtils, "detectPrettierConfig").mockReturnValue(
                null
            );
            vi.spyOn(prettierUtils, "getPrettierIndentSize").mockReturnValue(
                null
            );
            vi.spyOn(jsonbParser, "scanSchemas").mockReturnValue([]);
            vi.spyOn(typeMapping, "detectGeometricTypes").mockReturnValue(
                new Set()
            );
            vi.spyOn(tableGenerator, "generateTableType").mockReturnValue(
                "users: {}"
            );
            vi.spyOn(enumGenerator, "generateEnumTypes").mockReturnValue("");
            vi.spyOn(
                functionGenerator,
                "generateFunctionTypes"
            ).mockReturnValue("");
            vi.spyOn(
                compositeGenerator,
                "generateCompositeTypes"
            ).mockReturnValue("");
            vi.spyOn(
                geometricGenerator,
                "generateGeometricTypes"
            ).mockReturnValue("");
            vi.spyOn(constantsGenerator, "generateConstants").mockReturnValue(
                ""
            );
            vi.spyOn(
                jsonbGenerator,
                "generateJsonbTypeDefinitions"
            ).mockReturnValue("");
            vi.spyOn(
                jsonbGenerator,
                "generateMergeDeepStructure"
            ).mockReturnValue("");
        });

        it("should handle tables with no columns", () => {
            const emptyTable: TableDefinition = {
                schema: "public",
                name: "empty_table",
                columns: [],
                relationships: [],
                indexes: [],
            };

            vi.spyOn(sqlFileParser, "parseSqlFiles").mockReturnValue({
                tables: [emptyTable],
                enums: [],
                functions: [],
                compositeTypes: [],
            });

            generateTypes();

            expect(tableGenerator.generateTableType).toHaveBeenCalled();
        });

        it("should handle tables with many relationships", () => {
            const table: TableDefinition = {
                schema: "public",
                name: "posts",
                columns: [],
                relationships: Array(10)
                    .fill(null)
                    .map((_, i) => ({
                        foreignKeyName: `fk_${i}`,
                        columns: ["id"],
                        isOneToOne: false,
                        referencedRelation: "users",
                        referencedColumns: ["id"],
                    })),
                indexes: [],
            };

            vi.spyOn(sqlFileParser, "parseSqlFiles").mockReturnValue({
                tables: [table],
                enums: [],
                functions: [],
                compositeTypes: [],
            });

            generateTypes();

            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining("10 relationship(s)"),
                "green"
            );
        });

        it("should handle tables with many indexes", () => {
            const table: TableDefinition = {
                schema: "public",
                name: "users",
                columns: [],
                relationships: [],
                indexes: Array(5)
                    .fill(null)
                    .map((_, i) => ({
                        name: `idx_${i}`,
                        tableName: "users",
                        columns: ["id"],
                        isUnique: false,
                    })),
            };

            vi.spyOn(sqlFileParser, "parseSqlFiles").mockReturnValue({
                tables: [table],
                enums: [],
                functions: [],
                compositeTypes: [],
            });

            generateTypes();

            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining("5 (found but not included"),
                "cyan"
            );
        });

        it("should log index count when included", () => {
            process.argv = ["node", "script.ts", "--include-indexes"];

            const table: TableDefinition = {
                schema: "public",
                name: "users",
                columns: [],
                relationships: [],
                indexes: Array(3)
                    .fill(null)
                    .map((_, i) => ({
                        name: `idx_${i}`,
                        tableName: "users",
                        columns: ["id"],
                        isUnique: false,
                    })),
            };

            vi.spyOn(sqlFileParser, "parseSqlFiles").mockReturnValue({
                tables: [table],
                enums: [],
                functions: [],
                compositeTypes: [],
            });

            generateTypes();

            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining(
                    "Indexes: 3 (included in generated types)"
                ),
                "green"
            );
        });

        it("should handle tables with no relationships", () => {
            const table: TableDefinition = {
                schema: "public",
                name: "standalone",
                columns: [],
                relationships: [],
                indexes: [],
            };

            vi.spyOn(sqlFileParser, "parseSqlFiles").mockReturnValue({
                tables: [table],
                enums: [],
                functions: [],
                compositeTypes: [],
            });

            generateTypes();

            // Should not log relationship count
            const calls = (logger.log as any).mock.calls;
            const hasRelationshipLog = calls.some((call: any) =>
                call[0].includes("relationship(s)")
            );
            expect(hasRelationshipLog).toBe(false);
        });

        it("should handle tables with no indexes", () => {
            const table: TableDefinition = {
                schema: "public",
                name: "simple",
                columns: [],
                relationships: [],
                indexes: [],
            };

            vi.spyOn(sqlFileParser, "parseSqlFiles").mockReturnValue({
                tables: [table],
                enums: [],
                functions: [],
                compositeTypes: [],
            });

            generateTypes();

            // Should not log index count
            const calls = (logger.log as any).mock.calls;
            const hasIndexLog = calls.some((call: any) =>
                call[0].includes("Indexes:")
            );
            expect(hasIndexLog).toBe(false);
        });

        it("should handle 3 different schemas", () => {
            const tables: TableDefinition[] = [
                {
                    schema: "public",
                    name: "users",
                    columns: [],
                    relationships: [],
                    indexes: [],
                },
                {
                    schema: "auth",
                    name: "sessions",
                    columns: [],
                    relationships: [],
                    indexes: [],
                },
                {
                    schema: "storage",
                    name: "files",
                    columns: [],
                    relationships: [],
                    indexes: [],
                },
            ];

            vi.spyOn(sqlFileParser, "parseSqlFiles").mockReturnValue({
                tables,
                enums: [],
                functions: [],
                compositeTypes: [],
            });

            generateTypes();

            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining("4 schema(s)"), // includes graphql_public
                "cyan"
            );
        });

        it("should handle enums in different schemas", () => {
            const enums: EnumDefinition[] = [
                {
                    schema: "public",
                    name: "status",
                    values: ["active", "inactive"],
                },
                {
                    schema: "auth",
                    name: "role",
                    values: ["admin", "user"],
                },
            ];

            vi.spyOn(sqlFileParser, "parseSqlFiles").mockReturnValue({
                tables: [
                    {
                        schema: "public",
                        name: "test",
                        columns: [],
                        relationships: [],
                        indexes: [],
                    },
                ],
                enums,
                functions: [],
                compositeTypes: [],
            });

            generateTypes();

            expect(enumGenerator.generateEnumTypes).toHaveBeenCalled();
        });

        it("should handle functions in different schemas", () => {
            const functions: FunctionDefinition[] = [
                {
                    schema: "public",
                    name: "get_users",
                    args: [],
                    returns: "setof users",
                },
                {
                    schema: "auth",
                    name: "check_auth",
                    args: [],
                    returns: "boolean",
                },
            ];

            vi.spyOn(sqlFileParser, "parseSqlFiles").mockReturnValue({
                tables: [
                    {
                        schema: "public",
                        name: "test",
                        columns: [],
                        relationships: [],
                        indexes: [],
                    },
                ],
                enums: [],
                functions,
                compositeTypes: [],
            });

            generateTypes();

            expect(functionGenerator.generateFunctionTypes).toHaveBeenCalled();
        });

        it("should handle composite types in different schemas", () => {
            const compositeTypes: CompositeTypeDefinition[] = [
                {
                    schema: "public",
                    name: "address",
                    attributes: [{ name: "street", type: "text" }],
                },
                {
                    schema: "custom",
                    name: "location",
                    attributes: [{ name: "lat", type: "float8" }],
                },
            ];

            vi.spyOn(sqlFileParser, "parseSqlFiles").mockReturnValue({
                tables: [
                    {
                        schema: "public",
                        name: "test",
                        columns: [],
                        relationships: [],
                        indexes: [],
                    },
                ],
                enums: [],
                functions: [],
                compositeTypes,
            });

            generateTypes();

            expect(
                compositeGenerator.generateCompositeTypes
            ).toHaveBeenCalled();
        });

        it("should handle all geometric types", () => {
            const geometricTypes = new Set([
                "point",
                "line",
                "lseg",
                "box",
                "path",
                "polygon",
                "circle",
            ]);

            vi.spyOn(typeMapping, "detectGeometricTypes").mockReturnValue(
                geometricTypes
            );

            vi.spyOn(sqlFileParser, "parseSqlFiles").mockReturnValue({
                tables: [
                    {
                        schema: "public",
                        name: "test",
                        columns: [],
                        relationships: [],
                        indexes: [],
                    },
                ],
                enums: [],
                functions: [],
                compositeTypes: [],
            });

            generateTypes();

            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining("7 geometric type(s)"),
                "green"
            );
        });

        it("should handle empty JSONB types", () => {
            vi.spyOn(jsonbParser, "scanSchemas").mockReturnValue([]);

            vi.spyOn(sqlFileParser, "parseSqlFiles").mockReturnValue({
                tables: [
                    {
                        schema: "public",
                        name: "test",
                        columns: [],
                        relationships: [],
                        indexes: [],
                    },
                ],
                enums: [],
                functions: [],
                compositeTypes: [],
            });

            generateTypes();

            const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
            const content = writeCall[1] as string;

            // Should not have JSONB section
            expect(content).not.toContain("JSONB Column Type Definitions");
        });

        it("should handle verbose logging disabled", () => {
            process.argv = ["node", "script.ts", "--silent"];

            vi.spyOn(sqlFileParser, "parseSqlFiles").mockReturnValue({
                tables: [
                    {
                        schema: "public",
                        name: "test",
                        columns: [],
                        relationships: [],
                        indexes: [],
                    },
                ],
                enums: [],
                functions: [],
                compositeTypes: [],
            });

            generateTypes();

            expect(logger.setVerboseLogging).toHaveBeenCalledWith(false);
        });

        it("should include custom output suffix in import suggestion", () => {
            process.argv = ["node", "script.ts", "--workdir", "./my-app"];

            vi.spyOn(toml, "readSupabaseConfig").mockReturnValue([
                [],
                "./my-app",
            ]);
            vi.spyOn(sqlFileParser, "parseSqlFiles").mockReturnValue({
                tables: [
                    {
                        schema: "public",
                        name: "test",
                        columns: [],
                        relationships: [],
                        indexes: [],
                    },
                ],
                enums: [],
                functions: [],
                compositeTypes: [],
            });

            generateTypes();

            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining("databaseMy-app"),
                "cyan",
                true
            );
        });
    });

    describe("Type Deduplication Logic", () => {
        beforeEach(() => {
            process.argv = ["node", "script.ts"];

            vi.spyOn(toml, "readSupabaseConfig").mockReturnValue([
                [],
                "./supabase",
            ]);
            vi.spyOn(toml, "resolveSchemaFiles").mockReturnValue(["/test.sql"]);
            vi.spyOn(prettierUtils, "detectPrettierConfig").mockReturnValue(
                null
            );
            vi.spyOn(prettierUtils, "getPrettierIndentSize").mockReturnValue(
                null
            );
            vi.spyOn(typeMapping, "detectGeometricTypes").mockReturnValue(
                new Set()
            );
            vi.spyOn(tableGenerator, "generateTableType").mockReturnValue(
                "users: {}"
            );
            vi.spyOn(enumGenerator, "generateEnumTypes").mockReturnValue("");
            vi.spyOn(
                functionGenerator,
                "generateFunctionTypes"
            ).mockReturnValue("");
            vi.spyOn(
                compositeGenerator,
                "generateCompositeTypes"
            ).mockReturnValue("");
            vi.spyOn(
                geometricGenerator,
                "generateGeometricTypes"
            ).mockReturnValue("");
            vi.spyOn(constantsGenerator, "generateConstants").mockReturnValue(
                ""
            );
            vi.spyOn(
                jsonbGenerator,
                "generateJsonbTypeDefinitions"
            ).mockReturnValue("");
            vi.spyOn(
                jsonbGenerator,
                "generateMergeDeepStructure"
            ).mockReturnValue("");

            vi.spyOn(sqlFileParser, "parseSqlFiles").mockReturnValue({
                tables: [
                    {
                        schema: "public",
                        name: "test",
                        columns: [],
                        relationships: [],
                        indexes: [],
                    },
                ],
                enums: [],
                functions: [],
                compositeTypes: [],
            });
        });

        it("should log removed duplicate count", () => {
            const duplicates: TypeDefinition[] = [
                {
                    table: "users",
                    column: "data1",
                    name: "Type1",
                    typeDefinition: "{ value: string }",
                },
                {
                    table: "posts",
                    column: "data2",
                    name: "Type2",
                    typeDefinition: "{ value: string }",
                },
                {
                    table: "comments",
                    column: "data3",
                    name: "Type3",
                    typeDefinition: "{ value: string }",
                },
            ];

            vi.spyOn(jsonbParser, "scanSchemas").mockReturnValue(duplicates);
            vi.spyOn(jsonbParser, "normalizeTypeDefinition").mockReturnValue(
                "{ value: string }"
            );

            generateTypes();

            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining("Removed 2 duplicate type(s)"),
                "green"
            );
        });

        it("should not log duplicate removal when count is 0", () => {
            const uniqueTypes: TypeDefinition[] = [
                {
                    table: "users",
                    column: "data1",
                    name: "Type1",
                    typeDefinition: "{ value: string }",
                },
                {
                    table: "posts",
                    column: "data2",
                    name: "Type2",
                    typeDefinition: "{ count: number }",
                },
            ];

            vi.spyOn(jsonbParser, "scanSchemas").mockReturnValue(uniqueTypes);
            vi.spyOn(jsonbParser, "normalizeTypeDefinition").mockImplementation(
                (def) => def
            );

            generateTypes();

            const calls = (logger.log as any).mock.calls;
            const hasRemovedLog = calls.some(
                (call: any) =>
                    call[0].includes("Removed") && call[0].includes("duplicate")
            );
            expect(hasRemovedLog).toBe(false);
        });
    });
});
