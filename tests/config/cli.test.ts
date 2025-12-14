/**
 * Tests for CLI argument parsing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { parseCommandLineArgs } from "../../src/config/cli.js";
import * as logger from "../../src/utils/logger.js";

describe("parseCommandLineArgs", () => {
    let originalArgv: string[];

    beforeEach(() => {
        // Save original process.argv
        originalArgv = process.argv;

        // Mock the log function to suppress console output during tests
        vi.spyOn(logger, "log").mockImplementation(() => {});
    });

    afterEach(() => {
        // Restore original process.argv
        process.argv = originalArgv;

        // Restore all mocks
        vi.restoreAllMocks();
    });

    it("should parse default values", () => {
        process.argv = ["node", "script.js"];
        const result = parseCommandLineArgs();

        expect(result.source).toBe("sql");
        expect(result.schema).toBe("public");
        expect(result.verboseLogging).toBe(true);
        expect(result.namingConvention).toBe("preserve");
        expect(result.alphabetical).toBe(false);
        expect(result.extractNestedTypes).toBe(false);
        expect(result.deduplicateTypes).toBe(true);
    });

    it("should parse --workdir flag", () => {
        process.argv = ["node", "script.js", "--workdir", "./my-supabase"];
        const result = parseCommandLineArgs();

        expect(result.workdir).toBe("./my-supabase");
        expect(result.useWorkdir).toBe(true);
    });

    it("should parse --output flag", () => {
        process.argv = ["node", "script.js", "--output", "./types"];
        const result = parseCommandLineArgs();

        expect(result.outputDir).toBe("./types");
    });

    it("should parse -o shorthand for output", () => {
        process.argv = ["node", "script.js", "-o", "./types"];
        const result = parseCommandLineArgs();

        expect(result.outputDir).toBe("./types");
    });

    it("should parse --schema flag", () => {
        process.argv = ["node", "script.js", "--schema", "custom"];
        const result = parseCommandLineArgs();

        expect(result.schema).toBe("custom");
    });

    it("should parse --naming flag", () => {
        process.argv = ["node", "script.js", "--naming", "camelCase"];
        const result = parseCommandLineArgs();

        expect(result.namingConvention).toBe("camelCase");
    });

    it("should parse all naming conventions", () => {
        const conventions = [
            "preserve",
            "PascalCase",
            "camelCase",
            "snake_case",
            "SCREAMING_SNAKE_CASE",
        ];

        conventions.forEach((convention) => {
            process.argv = ["node", "script.js", "--naming", convention];
            const result = parseCommandLineArgs();
            expect(result.namingConvention).toBe(convention);
        });
    });

    it("should parse --alphabetical flag", () => {
        process.argv = ["node", "script.js", "--alphabetical"];
        const result = parseCommandLineArgs();

        expect(result.alphabetical).toBe(true);
    });

    it("should parse --sort flag (alias for alphabetical)", () => {
        process.argv = ["node", "script.js", "--sort"];
        const result = parseCommandLineArgs();

        expect(result.alphabetical).toBe(true);
    });

    it("should parse --indent flag", () => {
        process.argv = ["node", "script.js", "--indent", "4"];
        const result = parseCommandLineArgs();

        expect(result.indentSize).toBe(4);
    });

    it("should parse --indent-size flag", () => {
        process.argv = ["node", "script.js", "--indent-size", "2"];
        const result = parseCommandLineArgs();

        expect(result.indentSize).toBe(2);
    });

    it("should handle invalid indent size", () => {
        process.argv = ["node", "script.js", "--indent", "99"];
        const result = parseCommandLineArgs();

        // Verify the warning was logged
        expect(logger.log).toHaveBeenCalledWith(
            expect.stringContaining("Invalid indent size: 99"),
            "yellow",
            true
        );

        expect(result.indentSize).toBeNull();
    });

    it("should parse --use-prettier flag", () => {
        process.argv = ["node", "script.js", "--use-prettier"];
        const result = parseCommandLineArgs();

        expect(result.usePrettier).toBe(true);
    });

    it("should parse --no-prettier flag", () => {
        process.argv = ["node", "script.js", "--no-prettier"];
        const result = parseCommandLineArgs();

        expect(result.usePrettier).toBe(false);
    });

    it("should parse --extract-nested flag", () => {
        process.argv = ["node", "script.js", "--extract-nested"];
        const result = parseCommandLineArgs();

        expect(result.extractNestedTypes).toBe(true);
    });

    it("should parse --deep-nested flag (alias)", () => {
        process.argv = ["node", "script.js", "--deep-nested"];
        const result = parseCommandLineArgs();

        expect(result.extractNestedTypes).toBe(true);
    });

    it("should parse --deduplicate flag", () => {
        process.argv = ["node", "script.js", "--deduplicate"];
        const result = parseCommandLineArgs();

        expect(result.deduplicateTypes).toBe(true);
    });

    it("should parse --no-deduplicate flag", () => {
        process.argv = ["node", "script.js", "--no-deduplicate"];
        const result = parseCommandLineArgs();

        expect(result.deduplicateTypes).toBe(false);
    });

    it("should parse --include-indexes flag", () => {
        process.argv = ["node", "script.js", "--include-indexes"];
        const result = parseCommandLineArgs();

        expect(result.includeIndexes).toBe(true);
    });

    it("should parse --no-comments flag", () => {
        process.argv = ["node", "script.js", "--no-comments"];
        const result = parseCommandLineArgs();

        expect(result.includeComments).toBe(false);
    });

    it("should parse --skip-comments flag (alias)", () => {
        process.argv = ["node", "script.js", "--skip-comments"];
        const result = parseCommandLineArgs();

        expect(result.includeComments).toBe(false);
    });

    it("should parse --silent flag", () => {
        process.argv = ["node", "script.js", "--silent"];
        const result = parseCommandLineArgs();

        expect(result.verboseLogging).toBe(false);
    });

    it("should parse --quiet flag (alias)", () => {
        process.argv = ["node", "script.js", "--quiet"];
        const result = parseCommandLineArgs();

        expect(result.verboseLogging).toBe(false);
    });

    it("should parse --no-logs flag (alias)", () => {
        process.argv = ["node", "script.js", "--no-logs"];
        const result = parseCommandLineArgs();

        expect(result.verboseLogging).toBe(false);
    });

    it("should parse --db flag", () => {
        process.argv = ["node", "script.js", "--db"];
        const result = parseCommandLineArgs();

        expect(result.source).toBe("db");
    });

    it("should parse --use-database flag (alias)", () => {
        process.argv = ["node", "script.js", "--use-database"];
        const result = parseCommandLineArgs();

        expect(result.source).toBe("db");
    });

    it("should parse --connection-string flag", () => {
        process.argv = [
            "node",
            "script.js",
            "--connection-string",
            "postgresql://localhost",
        ];
        const result = parseCommandLineArgs();

        expect(result.connectionString).toBe("postgresql://localhost");
        expect(result.source).toBe("db");
    });

    it("should handle multiple flags together", () => {
        process.argv = [
            "node",
            "script.js",
            "--workdir",
            "./supabase",
            "--output",
            "./types",
            "--naming",
            "camelCase",
            "--alphabetical",
            "--indent",
            "4",
            "--include-indexes",
            "--extract-nested",
        ];

        const result = parseCommandLineArgs();

        expect(result.workdir).toBe("./supabase");
        expect(result.outputDir).toBe("./types");
        expect(result.namingConvention).toBe("camelCase");
        expect(result.alphabetical).toBe(true);
        expect(result.indentSize).toBe(4);
        expect(result.includeIndexes).toBe(true);
        expect(result.extractNestedTypes).toBe(true);
    });

    it("should use environment variable for connection string if not provided", () => {
        const originalEnv = process.env.DATABASE_URL;
        process.env.DATABASE_URL = "postgresql://env-connection";
        process.argv = ["node", "script.js"];

        const result = parseCommandLineArgs();

        expect(result.connectionString).toBe("postgresql://env-connection");

        // Restore
        if (originalEnv) {
            process.env.DATABASE_URL = originalEnv;
        } else {
            delete process.env.DATABASE_URL;
        }
    });

    it("should prioritize CLI connection string over environment", () => {
        const originalEnv = process.env.DATABASE_URL;
        process.env.DATABASE_URL = "postgresql://env-connection";
        process.argv = [
            "node",
            "script.js",
            "--connection-string",
            "postgresql://cli-connection",
        ];

        const result = parseCommandLineArgs();

        expect(result.connectionString).toBe("postgresql://cli-connection");

        // Restore
        if (originalEnv) {
            process.env.DATABASE_URL = originalEnv;
        } else {
            delete process.env.DATABASE_URL;
        }
    });

    it("should parse --local flag without workdir argument", () => {
        process.argv = ["node", "script.js", "--local"];
        const result = parseCommandLineArgs();

        expect(result.useLocal).toBe(true);
    });

    it("should parse --local flag with workdir argument", () => {
        process.argv = ["node", "script.js", "--local", "./my-supabase"];
        const result = parseCommandLineArgs();

        expect(result.useLocal).toBe(true);
        expect(result.workdir).toBe("./my-supabase");
        expect(result.useWorkdir).toBe(false);
    });

    it("should parse --local flag followed by another flag", () => {
        process.argv = ["node", "script.js", "--local", "--schema", "custom"];
        const result = parseCommandLineArgs();

        expect(result.useLocal).toBe(true);
        expect(result.schema).toBe("custom");
    });

    it("should handle positional workdir argument", () => {
        process.argv = ["node", "script.js", "./custom-path"];
        const result = parseCommandLineArgs();

        expect(result.workdir).toBe("./custom-path");
        expect(result.useWorkdir).toBe(false);
    });

    it("should handle multiple positional arguments (last one wins)", () => {
        process.argv = ["node", "script.js", "./path1", "./path2"];
        const result = parseCommandLineArgs();

        expect(result.workdir).toBe("./path2");
    });

    it("should handle invalid naming convention", () => {
        process.argv = ["node", "script.js", "--naming", "invalid-convention"];
        const result = parseCommandLineArgs();

        // Verify the warning was logged
        expect(logger.log).toHaveBeenCalledWith(
            expect.stringContaining(
                "Invalid naming convention: invalid-convention"
            ),
            "yellow",
            true
        );

        expect(result.namingConvention).toBe("preserve");
    });

    it("should parse --dedupe alias for deduplicate", () => {
        process.argv = ["node", "script.js", "--dedupe"];
        const result = parseCommandLineArgs();

        expect(result.deduplicateTypes).toBe(true);
    });

    it("should parse --dedupe-types alias for deduplicate", () => {
        process.argv = ["node", "script.js", "--dedupe-types"];
        const result = parseCommandLineArgs();

        expect(result.deduplicateTypes).toBe(true);
    });

    it("should parse --no-dedupe alias for no-deduplicate", () => {
        process.argv = ["node", "script.js", "--no-dedupe"];
        const result = parseCommandLineArgs();

        expect(result.deduplicateTypes).toBe(false);
    });

    it("should parse --indexes alias for include-indexes", () => {
        process.argv = ["node", "script.js", "--indexes"];
        const result = parseCommandLineArgs();

        expect(result.includeIndexes).toBe(true);
    });

    it("should parse --sort-alphabetical alias", () => {
        process.argv = ["node", "script.js", "--sort-alphabetical"];
        const result = parseCommandLineArgs();

        expect(result.alphabetical).toBe(true);
    });

    it("should parse --naming-convention alias", () => {
        process.argv = [
            "node",
            "script.js",
            "--naming-convention",
            "PascalCase",
        ];
        const result = parseCommandLineArgs();

        expect(result.namingConvention).toBe("PascalCase");
    });

    it("should handle mixed positional and flag arguments", () => {
        process.argv = [
            "node",
            "script.js",
            "./custom-workdir",
            "--schema",
            "custom",
            "--alphabetical",
        ];

        const result = parseCommandLineArgs();

        expect(result.workdir).toBe("./custom-workdir");
        expect(result.schema).toBe("custom");
        expect(result.alphabetical).toBe(true);
    });
});
