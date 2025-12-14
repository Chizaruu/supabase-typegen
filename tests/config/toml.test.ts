/**
 * Tests for TOML configuration parsing
 *
 * Coverage targets:
 * - parseToml: all TOML formats and edge cases
 * - readSupabaseConfig: config file resolution and fallbacks
 * - resolveSchemaFiles: glob pattern expansion and file resolution
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
    parseToml,
    readSupabaseConfig,
    resolveSchemaFiles,
} from "../../src/config/toml.ts";
import * as fs from "fs";
import * as path from "path";
import * as logger from "../../src/utils/logger.ts";
import { globSync } from "glob";

// Mock modules
vi.mock("fs");
vi.mock("glob");

describe("TOML Configuration Parser", () => {
    let originalCwd: string;

    beforeEach(() => {
        originalCwd = process.cwd();
        vi.clearAllMocks();
        vi.spyOn(logger, "log").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("parseToml", () => {
        it("should parse empty TOML content", () => {
            const content = "";
            const result = parseToml(content);

            expect(result).toEqual({});
        });

        it("should parse TOML with comments only", () => {
            const content = `
# This is a comment
# Another comment
            `;
            const result = parseToml(content);

            expect(result).toEqual({});
        });

        it("should parse single-line array with schema_paths", () => {
            const content = `
[db.migrations]
schema_paths = ["migrations/001_init.sql", "migrations/002_users.sql"]
            `;
            const result = parseToml(content);

            expect(result.db?.migrations?.schema_paths).toEqual([
                "migrations/001_init.sql",
                "migrations/002_users.sql",
            ]);
        });

        it("should parse multi-line array with schema_paths", () => {
            const content = `
[db.migrations]
schema_paths = [
    "migrations/001_init.sql",
    "migrations/002_users.sql",
    "migrations/003_posts.sql"
]
            `;
            const result = parseToml(content);

            expect(result.db?.migrations?.schema_paths).toEqual([
                "migrations/001_init.sql",
                "migrations/002_users.sql",
                "migrations/003_posts.sql",
            ]);
        });

        it("should parse multi-line array with items on separate lines", () => {
            const content = `
[db.migrations]
schema_paths = [
    "migrations/*.sql",
    "seeds/*.sql"
]
            `;
            const result = parseToml(content);

            expect(result.db?.migrations?.schema_paths).toEqual([
                "migrations/*.sql",
                "seeds/*.sql",
            ]);
        });

        it("should parse multi-line array with items on opening line (no closing bracket)", () => {
            const content = `
[db.migrations]
schema_paths = ["migrations/001_init.sql",
    "migrations/002_users.sql",
    "migrations/003_posts.sql"
]
            `;
            const result = parseToml(content);

            expect(result.db?.migrations?.schema_paths).toEqual([
                "migrations/001_init.sql",
                "migrations/002_users.sql",
                "migrations/003_posts.sql",
            ]);
        });

        it("should parse multi-line array with items on closing line", () => {
            const content = `
[db.migrations]
schema_paths = [
    "migrations/001_init.sql",
    "migrations/002_users.sql", "migrations/003_posts.sql"]
            `;
            const result = parseToml(content);

            expect(result.db?.migrations?.schema_paths).toEqual([
                "migrations/001_init.sql",
                "migrations/002_users.sql",
                "migrations/003_posts.sql",
            ]);
        });

        it("should parse multi-line array with multiple items per line", () => {
            const content = `
[db.migrations]
schema_paths = ["migrations/001_init.sql", "migrations/002_users.sql",
    "migrations/003_posts.sql", "migrations/004_comments.sql",
    "migrations/005_tags.sql"]
            `;
            const result = parseToml(content);

            expect(result.db?.migrations?.schema_paths).toEqual([
                "migrations/001_init.sql",
                "migrations/002_users.sql",
                "migrations/003_posts.sql",
                "migrations/004_comments.sql",
                "migrations/005_tags.sql",
            ]);
        });

        it("should ignore comments in TOML", () => {
            const content = `
# Configuration file
[db.migrations]
# Schema paths
schema_paths = ["migrations/*.sql"]
            `;
            const result = parseToml(content);

            expect(result.db?.migrations?.schema_paths).toEqual([
                "migrations/*.sql",
            ]);
        });

        it("should handle sections without schema_paths", () => {
            const content = `
[api]
enabled = true

[db]
port = 5432
            `;
            const result = parseToml(content);

            expect(result.db?.migrations?.schema_paths).toBeUndefined();
        });

        it("should handle nested sections", () => {
            const content = `
[db.migrations]
schema_paths = ["migrations/*.sql"]

[db.seed]
enabled = true
            `;
            const result = parseToml(content);

            expect(result.db?.migrations?.schema_paths).toEqual([
                "migrations/*.sql",
            ]);
        });

        it("should handle array with glob patterns", () => {
            const content = `
[db.migrations]
schema_paths = [
    "migrations/**/*.sql",
    "migrations/*.sql",
    "seeds/**/*.sql"
]
            `;
            const result = parseToml(content);

            expect(result.db?.migrations?.schema_paths).toEqual([
                "migrations/**/*.sql",
                "migrations/*.sql",
                "seeds/**/*.sql",
            ]);
        });

        it("should handle empty array", () => {
            const content = `
[db.migrations]
schema_paths = []
            `;
            const result = parseToml(content);

            expect(result.db?.migrations?.schema_paths).toEqual([]);
        });

        it("should handle array with trailing comma", () => {
            const content = `
[db.migrations]
schema_paths = [
    "migrations/*.sql",
    "seeds/*.sql",
]
            `;
            const result = parseToml(content);

            expect(result.db?.migrations?.schema_paths).toEqual([
                "migrations/*.sql",
                "seeds/*.sql",
            ]);
        });

        it("should only parse db.migrations.schema_paths", () => {
            const content = `
[other.section]
paths = ["some/path"]

[db.migrations]
schema_paths = ["migrations/*.sql"]

[another]
files = ["file.txt"]
            `;
            const result = parseToml(content);

            expect(result.db?.migrations?.schema_paths).toEqual([
                "migrations/*.sql",
            ]);
            expect(result).not.toHaveProperty("other");
            expect(result).not.toHaveProperty("another");
        });

        it("should handle Windows-style paths", () => {
            const content = `
[db.migrations]
schema_paths = ["migrations\\*.sql", "supabase\\migrations\\*.sql"]
            `;
            const result = parseToml(content);

            expect(result.db?.migrations?.schema_paths).toEqual([
                "migrations\\*.sql",
                "supabase\\migrations\\*.sql",
            ]);
        });
    });

    describe("readSupabaseConfig", () => {
        it("should read config from workdir", () => {
            const configContent = `
[db.migrations]
schema_paths = ["migrations/*.sql"]
            `;

            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(configContent);

            const [paths, workdir] = readSupabaseConfig("./supabase");

            expect(paths).toEqual(["migrations/*.sql"]);
            expect(workdir).toBe("./supabase");
            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining("Reading config from"),
                "cyan"
            );
        });

        it("should use fallback path when config not found in workdir root", () => {
            const configContent = `
[db.migrations]
schema_paths = ["migrations/*.sql"]
            `;

            vi.mocked(fs.existsSync)
                .mockReturnValueOnce(false) // First check fails
                .mockReturnValueOnce(true); // Fallback succeeds
            vi.mocked(fs.readFileSync).mockReturnValue(configContent);

            const [paths, workdir] = readSupabaseConfig("./myproject");

            expect(paths).toEqual(["migrations/*.sql"]);
            expect(workdir).toContain("myproject");
            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining("Config not found at"),
                "yellow"
            );
            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining("Using fallback"),
                "cyan"
            );
        });

        it("should return default paths when config file doesn't exist", () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);

            const [paths, workdir] = readSupabaseConfig("./supabase");

            expect(paths).toEqual(["migrations/*.sql", "migrations/**/*.sql"]);
            expect(workdir).toBe("./supabase");
            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining("Warning: config.toml not found"),
                "yellow"
            );
            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining("Falling back to default schema paths"),
                "yellow"
            );
        });

        it("should use current directory when workdir is null", () => {
            const configContent = `
[db.migrations]
schema_paths = ["migrations/*.sql"]
            `;

            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(configContent);

            const [paths, workdir] = readSupabaseConfig(null);

            expect(paths).toEqual(["migrations/*.sql"]);
            expect(workdir).toBeNull();
        });

        it("should return default paths when schema_paths is empty", () => {
            const configContent = `
[db.migrations]
schema_paths = []
            `;

            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(configContent);

            const [paths, workdir] = readSupabaseConfig("./supabase");

            expect(paths).toEqual(["migrations/*.sql", "migrations/**/*.sql"]);
            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining("Warning: No schema_paths found"),
                "yellow"
            );
        });

        it("should return default paths when schema_paths is missing", () => {
            const configContent = `
[db]
port = 5432
            `;

            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(configContent);

            const [paths, workdir] = readSupabaseConfig("./supabase");

            expect(paths).toEqual(["migrations/*.sql", "migrations/**/*.sql"]);
        });

        it("should log glob patterns count", () => {
            const configContent = `
[db.migrations]
schema_paths = [
    "migrations/*.sql",
    "migrations/**/*.sql",
    "migrations/001_init.sql"
]
            `;

            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(configContent);

            readSupabaseConfig("./supabase");

            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining("Found 3 schema path(s) in config"),
                "green"
            );
            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining(
                    "2 glob pattern(s), 1 specific file(s)"
                ),
                "cyan"
            );
        });

        it("should not log glob patterns when there are none", () => {
            const configContent = `
[db.migrations]
schema_paths = [
    "migrations/001_init.sql",
    "migrations/002_users.sql"
]
            `;

            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(configContent);

            readSupabaseConfig("./supabase");

            const calls = (logger.log as any).mock.calls;
            const hasGlobLog = calls.some((call: any) =>
                call[0].includes("glob pattern(s)")
            );
            expect(hasGlobLog).toBe(false);
        });
    });

    describe("resolveSchemaFiles", () => {
        beforeEach(() => {
            // Mock process.cwd()
            vi.spyOn(process, "cwd").mockReturnValue("/home/project");
        });

        it("should resolve glob patterns", () => {
            vi.mocked(globSync).mockReturnValue([
                "/home/project/supabase/migrations/001_init.sql",
                "/home/project/supabase/migrations/002_users.sql",
            ]);

            const files = resolveSchemaFiles(["migrations/*.sql"], null);

            expect(files).toHaveLength(2);
            expect(files[0]).toContain("001_init.sql");
            expect(files[1]).toContain("002_users.sql");
        });

        it("should resolve specific files", () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.statSync).mockReturnValue({
                isFile: () => true,
            } as any);

            const files = resolveSchemaFiles(
                ["migrations/001_init.sql"],
                "./supabase"
            );

            expect(files).toHaveLength(1);
            expect(files[0]).toContain("001_init.sql");
        });

        it("should skip duplicate files", () => {
            vi.mocked(globSync)
                .mockReturnValueOnce([
                    "/home/project/supabase/migrations/001_init.sql",
                    "/home/project/supabase/migrations/002_users.sql",
                ])
                .mockReturnValueOnce([
                    "/home/project/supabase/migrations/001_init.sql", // Duplicate
                    "/home/project/supabase/migrations/003_posts.sql",
                ]);

            const files = resolveSchemaFiles(
                ["migrations/*.sql", "migrations/**/*.sql"],
                null
            );

            expect(files).toHaveLength(3);
            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining("Skipped (duplicates): 1"),
                "cyan"
            );
        });

        it("should filter out non-.sql files from glob results", () => {
            vi.mocked(globSync).mockReturnValue([
                "/home/project/supabase/migrations/001_init.sql",
                "/home/project/supabase/migrations/README.md",
                "/home/project/supabase/migrations/002_users.sql",
            ]);

            const files = resolveSchemaFiles(["migrations/*"], null);

            expect(files).toHaveLength(2);
            expect(files.every((f) => f.endsWith(".sql"))).toBe(true);
        });

        it("should log warning for non-existent files", () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);

            const files = resolveSchemaFiles(
                ["migrations/missing.sql"],
                "./supabase"
            );

            expect(files).toHaveLength(0);
            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining("File not found"),
                "yellow"
            );
        });

        it("should skip non-.sql specific files", () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.statSync).mockReturnValue({
                isFile: () => true,
            } as any);

            const files = resolveSchemaFiles(["README.md"], "./supabase");

            expect(files).toHaveLength(0);
            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining("Skipped (not .sql)"),
                "yellow"
            );
        });

        it("should handle errors during glob expansion", () => {
            vi.mocked(globSync).mockImplementation(() => {
                throw new Error("Glob pattern error");
            });

            const files = resolveSchemaFiles(
                ["invalid/**/*.sql"],
                "./supabase"
            );

            expect(files).toHaveLength(0);
            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining("Error resolving pattern"),
                "red"
            );
        });

        it("should log when glob pattern finds no files", () => {
            vi.mocked(globSync).mockReturnValue([]);

            resolveSchemaFiles(["migrations/*.sql"], "./supabase");

            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining("Found 0 file(s) matching pattern"),
                "yellow"
            );
        });

        it("should log when glob pattern finds files", () => {
            vi.mocked(globSync).mockReturnValue([
                "/home/project/supabase/migrations/001_init.sql",
            ]);

            resolveSchemaFiles(["migrations/*.sql"], "./supabase");

            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining("Found 1 file(s) matching pattern"),
                "green"
            );
        });

        it("should skip duplicate specific files", () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.statSync).mockReturnValue({
                isFile: () => true,
            } as any);

            const files = resolveSchemaFiles(
                ["migrations/001_init.sql", "migrations/001_init.sql"],
                "./supabase"
            );

            expect(files).toHaveLength(1);
            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining("duplicate, skipped"),
                "yellow"
            );
        });

        it("should use workdir when provided", () => {
            vi.mocked(globSync).mockReturnValue([
                "/home/project/custom/migrations/001_init.sql",
            ]);

            resolveSchemaFiles(["migrations/*.sql"], "./custom");

            // Check the first log call contains the custom workdir
            const firstLogCall = (logger.log as any).mock.calls[0];
            expect(firstLogCall[0]).toContain("custom");
            expect(firstLogCall[0]).toContain("Resolving schema files");
        });

        it("should use default supabase directory when workdir is null", () => {
            vi.mocked(globSync).mockReturnValue([
                "/home/project/supabase/migrations/001_init.sql",
            ]);

            resolveSchemaFiles(["migrations/*.sql"], null);

            // Check the first log call contains the supabase directory
            const firstLogCall = (logger.log as any).mock.calls[0];
            expect(firstLogCall[0]).toContain("supabase");
            expect(firstLogCall[0]).toContain("Resolving schema files");
        });

        it("should normalize Windows path separators in glob patterns", () => {
            vi.mocked(globSync).mockReturnValue([
                "/home/project/supabase/migrations/001_init.sql",
            ]);

            resolveSchemaFiles(["migrations\\*.sql"], "./supabase");

            // Check that globSync was called with forward slashes
            expect(globSync).toHaveBeenCalledWith(
                expect.stringMatching(/migrations\/\*\.sql/),
                expect.any(Object)
            );
        });

        it("should log total files resolved with success color", () => {
            vi.mocked(globSync).mockReturnValue([
                "/home/project/supabase/migrations/001_init.sql",
                "/home/project/supabase/migrations/002_users.sql",
            ]);

            resolveSchemaFiles(["migrations/*.sql"], null);

            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining("Total unique SQL files resolved: 2"),
                "green"
            );
        });

        it("should log total files resolved with error color when empty", () => {
            vi.mocked(globSync).mockReturnValue([]);

            resolveSchemaFiles(["migrations/*.sql"], null);

            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining("Total unique SQL files resolved: 0"),
                "red"
            );
        });

        it("should handle mixed glob and specific files", () => {
            vi.mocked(globSync).mockReturnValue([
                "/home/project/supabase/migrations/001_init.sql",
                "/home/project/supabase/migrations/002_users.sql",
            ]);
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.statSync).mockReturnValue({
                isFile: () => true,
            } as any);

            const files = resolveSchemaFiles(
                ["migrations/*.sql", "seeds/001_seed.sql"],
                null
            );

            expect(files.length).toBeGreaterThan(0);
        });

        it("should handle glob patterns with no matches and specific files", () => {
            vi.mocked(globSync).mockReturnValue([]);
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.statSync).mockReturnValue({
                isFile: () => true,
            } as any);

            const files = resolveSchemaFiles(
                ["migrations/*.sql", "seeds/001_seed.sql"],
                "./supabase"
            );

            expect(files).toHaveLength(1);
            expect(files[0]).toContain("001_seed.sql");
        });

        it("should handle errors with non-Error objects", () => {
            vi.mocked(globSync).mockImplementation(() => {
                throw "String error";
            });

            const files = resolveSchemaFiles(["invalid/*.sql"], "./supabase");

            expect(files).toHaveLength(0);
            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining("Error resolving pattern"),
                "red"
            );
            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining("String error"),
                "red"
            );
        });

        it("should log added and skipped counts", () => {
            vi.mocked(globSync).mockReturnValue([
                "/home/project/supabase/migrations/001_init.sql",
                "/home/project/supabase/migrations/002_users.sql",
                "/home/project/supabase/migrations/002_users.sql", // Duplicate in same glob
            ]);

            resolveSchemaFiles(["migrations/**/*.sql"], null);

            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining("Added: 2"),
                "cyan"
            );
        });

        it("should not log added/skipped when both are 0", () => {
            vi.mocked(globSync).mockReturnValue([
                "/home/project/supabase/migrations/README.md",
            ]);

            resolveSchemaFiles(["migrations/*"], null);

            const calls = (logger.log as any).mock.calls;
            const hasAddedLog = calls.some((call: any) =>
                call[0].includes("Added:")
            );
            expect(hasAddedLog).toBe(false);
        });
    });
});
