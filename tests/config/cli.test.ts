/**
 * Tests for CLI argument parsing
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { parseCommandLineArgs } from "../../src/config/cli.ts";

describe("parseCommandLineArgs", () => {
    let originalArgv: string[];

    beforeEach(() => {
        // Save original process.argv
        originalArgv = process.argv;
    });

    afterEach(() => {
        // Restore original process.argv
        process.argv = originalArgv;
    });

    it("should parse default values", () => {
        process.argv = ["node", "script.ts"];
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
        process.argv = ["node", "script.ts", "--workdir", "./my-supabase"];
        const result = parseCommandLineArgs();

        expect(result.workdir).toBe("./my-supabase");
        expect(result.useWorkdir).toBe(true);
    });

    it("should parse --output flag", () => {
        process.argv = ["node", "script.ts", "--output", "./types"];
        const result = parseCommandLineArgs();

        expect(result.outputDir).toBe("./types");
    });

    it("should parse -o shorthand for output", () => {
        process.argv = ["node", "script.ts", "-o", "./types"];
        const result = parseCommandLineArgs();

        expect(result.outputDir).toBe("./types");
    });

    it("should parse --schema flag", () => {
        process.argv = ["node", "script.ts", "--schema", "custom"];
        const result = parseCommandLineArgs();

        expect(result.schema).toBe("custom");
    });

    it("should parse --naming flag", () => {
        process.argv = ["node", "script.ts", "--naming", "camelCase"];
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
            process.argv = ["node", "script.ts", "--naming", convention];
            const result = parseCommandLineArgs();
            expect(result.namingConvention).toBe(convention);
        });
    });

    it("should parse --alphabetical flag", () => {
        process.argv = ["node", "script.ts", "--alphabetical"];
        const result = parseCommandLineArgs();

        expect(result.alphabetical).toBe(true);
    });

    it("should parse --sort flag (alias for alphabetical)", () => {
        process.argv = ["node", "script.ts", "--sort"];
        const result = parseCommandLineArgs();

        expect(result.alphabetical).toBe(true);
    });

    it("should parse --indent flag", () => {
        process.argv = ["node", "script.ts", "--indent", "4"];
        const result = parseCommandLineArgs();

        expect(result.indentSize).toBe(4);
    });

    it("should parse --indent-size flag", () => {
        process.argv = ["node", "script.ts", "--indent-size", "2"];
        const result = parseCommandLineArgs();

        expect(result.indentSize).toBe(2);
    });

    it("should handle invalid indent size", () => {
        process.argv = ["node", "script.ts", "--indent", "99"];
        const result = parseCommandLineArgs();

        expect(result.indentSize).toBeNull();
    });

    it("should parse --use-prettier flag", () => {
        process.argv = ["node", "script.ts", "--use-prettier"];
        const result = parseCommandLineArgs();

        expect(result.usePrettier).toBe(true);
    });

    it("should parse --no-prettier flag", () => {
        process.argv = ["node", "script.ts", "--no-prettier"];
        const result = parseCommandLineArgs();

        expect(result.usePrettier).toBe(false);
    });

    it("should parse --extract-nested flag", () => {
        process.argv = ["node", "script.ts", "--extract-nested"];
        const result = parseCommandLineArgs();

        expect(result.extractNestedTypes).toBe(true);
    });

    it("should parse --deep-nested flag (alias)", () => {
        process.argv = ["node", "script.ts", "--deep-nested"];
        const result = parseCommandLineArgs();

        expect(result.extractNestedTypes).toBe(true);
    });

    it("should parse --deduplicate flag", () => {
        process.argv = ["node", "script.ts", "--deduplicate"];
        const result = parseCommandLineArgs();

        expect(result.deduplicateTypes).toBe(true);
    });

    it("should parse --no-deduplicate flag", () => {
        process.argv = ["node", "script.ts", "--no-deduplicate"];
        const result = parseCommandLineArgs();

        expect(result.deduplicateTypes).toBe(false);
    });

    it("should parse --include-indexes flag", () => {
        process.argv = ["node", "script.ts", "--include-indexes"];
        const result = parseCommandLineArgs();

        expect(result.includeIndexes).toBe(true);
    });

    it("should parse --no-comments flag", () => {
        process.argv = ["node", "script.ts", "--no-comments"];
        const result = parseCommandLineArgs();

        expect(result.includeComments).toBe(false);
    });

    it("should parse --skip-comments flag (alias)", () => {
        process.argv = ["node", "script.ts", "--skip-comments"];
        const result = parseCommandLineArgs();

        expect(result.includeComments).toBe(false);
    });

    it("should parse --silent flag", () => {
        process.argv = ["node", "script.ts", "--silent"];
        const result = parseCommandLineArgs();

        expect(result.verboseLogging).toBe(false);
    });

    it("should parse --quiet flag (alias)", () => {
        process.argv = ["node", "script.ts", "--quiet"];
        const result = parseCommandLineArgs();

        expect(result.verboseLogging).toBe(false);
    });

    it("should parse --no-logs flag (alias)", () => {
        process.argv = ["node", "script.ts", "--no-logs"];
        const result = parseCommandLineArgs();

        expect(result.verboseLogging).toBe(false);
    });

    it("should parse --db flag", () => {
        process.argv = ["node", "script.ts", "--db"];
        const result = parseCommandLineArgs();

        expect(result.source).toBe("db");
    });

    it("should parse --use-database flag (alias)", () => {
        process.argv = ["node", "script.ts", "--use-database"];
        const result = parseCommandLineArgs();

        expect(result.source).toBe("db");
    });

    it("should parse --connection-string flag", () => {
        process.argv = [
            "node",
            "script.ts",
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
            "script.ts",
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
        process.argv = ["node", "script.ts"];

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
            "script.ts",
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
});
