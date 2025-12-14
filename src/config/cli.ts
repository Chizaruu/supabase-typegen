/**
 * Command line argument parsing
 */

import type { NamingConvention, SourceType } from "../types/index.js";
import { GENERATOR_CONFIG } from "./constants.js";
import { log } from "../utils/logger.js";

interface CliArgs {
    useLocal: boolean;
    useWorkdir: boolean;
    workdir: string;
    connectionString: string | undefined;
    source: SourceType;
    schema: string;
    outputDir: string;
    extractNestedTypes: boolean;
    deduplicateTypes: boolean;
    verboseLogging: boolean;
    namingConvention: NamingConvention;
    alphabetical: boolean;
    indentSize: number | null;
    usePrettier: boolean;
    includeIndexes: boolean;
    includeComments: boolean;
}

export function parseCommandLineArgs(): CliArgs {
    const args = process.argv.slice(2);

    let useLocal: boolean = GENERATOR_CONFIG.useLocalFlag;
    let explicitWorkdirFlag = false;
    let workdir: string | null = null;
    let connectionString: string | null = null;
    let useDatabase = false;
    let schema: string = GENERATOR_CONFIG.defaultSchema;
    let outputDir: string | null = null;
    let extractNestedTypes: boolean = GENERATOR_CONFIG.extractNestedTypes;
    let deduplicateTypes: boolean = GENERATOR_CONFIG.deduplicateTypes;
    let verboseLogging: boolean = GENERATOR_CONFIG.verboseLogging;
    let namingConvention: NamingConvention = GENERATOR_CONFIG.namingConvention;
    let alphabetical: boolean = GENERATOR_CONFIG.alphabetical;
    let indentSize: number | null = null;
    let usePrettier: boolean = false;
    let includeIndexes: boolean = GENERATOR_CONFIG.includeIndexes;
    let includeComments: boolean = GENERATOR_CONFIG.includeComments;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === "--local") {
            useLocal = true;
            if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
                workdir = args[++i];
                explicitWorkdirFlag = false;
            }
        } else if (arg === "--workdir") {
            explicitWorkdirFlag = true;
            workdir = args[++i];
        } else if (arg === "--db" || arg === "--use-database") {
            useDatabase = true;
        } else if (arg === "--connection-string") {
            connectionString = args[++i];
            useDatabase = true;
        } else if (arg === "--schema") {
            schema = args[++i];
        } else if (arg === "--output" || arg === "-o") {
            outputDir = args[++i];
        } else if (arg === "--deep-nested" || arg === "--extract-nested") {
            extractNestedTypes = true;
        } else if (
            arg === "--deduplicate" ||
            arg === "--dedupe" ||
            arg === "--dedupe-types"
        ) {
            deduplicateTypes = true;
        } else if (arg === "--no-deduplicate" || arg === "--no-dedupe") {
            deduplicateTypes = false;
        } else if (
            arg === "--no-logs" ||
            arg === "--silent" ||
            arg === "--quiet"
        ) {
            verboseLogging = false;
        } else if (
            arg === "--alphabetical" ||
            arg === "--sort" ||
            arg === "--sort-alphabetical"
        ) {
            alphabetical = true;
        } else if (arg === "--use-prettier") {
            usePrettier = true;
        } else if (arg === "--no-prettier") {
            usePrettier = false;
        } else if (arg === "--indent" || arg === "--indent-size") {
            const size = parseInt(args[++i]);
            if (!isNaN(size) && size > 0 && size <= 8) {
                indentSize = size;
            } else {
                log(
                    `Invalid indent size: ${args[i]}. Must be between 1 and 8. Using default or Prettier config.`,
                    "yellow",
                    true
                );
            }
        } else if (arg === "--include-indexes" || arg === "--indexes") {
            includeIndexes = true;
        } else if (arg === "--no-comments" || arg === "--skip-comments") {
            includeComments = false;
        } else if (arg === "--naming" || arg === "--naming-convention") {
            const nextArg = args[++i];
            if (
                [
                    "preserve",
                    "PascalCase",
                    "camelCase",
                    "snake_case",
                    "SCREAMING_SNAKE_CASE",
                ].includes(nextArg)
            ) {
                namingConvention = nextArg as NamingConvention;
            } else {
                log(
                    `Invalid naming convention: ${nextArg}. Using default: ${GENERATOR_CONFIG.namingConvention}`,
                    "yellow",
                    true
                );
            }
        } else if (!arg.startsWith("--")) {
            workdir = arg;
            explicitWorkdirFlag = false;
        }
    }

    const source: SourceType = useDatabase ? "db" : "sql";

    return {
        useLocal,
        useWorkdir: explicitWorkdirFlag,
        workdir: workdir || GENERATOR_CONFIG.defaultWorkdir,
        connectionString: connectionString || process.env.DATABASE_URL,
        source,
        schema,
        outputDir: outputDir || GENERATOR_CONFIG.defaultOutputDir,
        extractNestedTypes,
        deduplicateTypes,
        verboseLogging,
        namingConvention,
        alphabetical,
        indentSize,
        usePrettier,
        includeIndexes,
        includeComments,
    };
}
