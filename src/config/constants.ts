/**
 * Generator configuration constants
 */

export const GENERATOR_CONFIG = {
    // Paths
    useLocalFlag: true,
    useWorkdirFlag: true,
    defaultWorkdir: "./supabase",
    defaultOutputDir: "./src/lib/types/generated",
    defaultSchema: "public",

    // Type generation options
    extractNestedTypes: false,
    deduplicateTypes: true,
    namingConvention: "preserve" as const,
    alphabetical: false,
    indentSize: 2,
    usePrettier: false,
    includeIndexes: false,
    includeComments: true,

    // Source priority: 'sql' = read from SQL files, 'db' = query database
    defaultSource: "sql" as const,

    // Logging
    verboseLogging: true,
} as const;
