/**
 * Main type generation orchestrator
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import type {
    GeneratorConfig,
    TableDefinition,
    EnumDefinition,
    FunctionDefinition,
    CompositeTypeDefinition,
    ViewDefinition,
    TypeDefinition,
} from "./types/index.js";
import { log, setVerboseLogging } from "./utils/logger.js";
import { parseCommandLineArgs } from "./config/cli.js";
import { readSupabaseConfig, resolveSchemaFiles } from "./config/toml.js";
import { parseSqlFiles } from "./parsers/sql-file-parser.js";
import {
    detectPrettierConfig,
    getPrettierIndentSize,
} from "./utils/prettier.js";
import { GENERATOR_CONFIG } from "./config/constants.js";
import { detectGeometricTypes } from "./utils/type-mapping.js";
import {
    scanSchemas,
    normalizeTypeDefinition,
    flattenTypes,
} from "./parsers/jsonb.js";
import {
    generateTableType,
    generateEnumTypes,
    generateFunctionTypes,
    generateCompositeTypes,
    generateGeometricTypes,
    generateConstants,
    generateJsonbTypeDefinitions,
    generateMergeDeepStructure,
    generateViewTypes,
} from "./generators/index.js";

export function initializeConfig(): GeneratorConfig {
    const cliArgs = parseCommandLineArgs();

    log("\n🔧 Initializing configuration...", "bright");
    log(
        `  Source: ${cliArgs.source === "sql" ? "SQL files" : "Database"}`,
        "cyan"
    );
    log(`  Schema: ${cliArgs.schema}`, "cyan");
    log(`  Output directory: ${cliArgs.outputDir}`, "cyan");
    log(`  Naming convention: ${cliArgs.namingConvention}`, "cyan");
    log(`  Extract nested types: ${cliArgs.extractNestedTypes}`, "cyan");
    log(`  Deduplicate types: ${cliArgs.deduplicateTypes}`, "cyan");
    log(`  Alphabetical sorting: ${cliArgs.alphabetical}`, "cyan");
    log(`  Include indexes: ${cliArgs.includeIndexes}`, "cyan");
    log(`  Include comments: ${cliArgs.includeComments}`, "cyan");
    log(`  Exclude 'this' and 'constraint' columns: true (automatic)`, "cyan");

    let finalIndentSize: number = GENERATOR_CONFIG.indentSize;
    let indentSource = "default";

    if (cliArgs.indentSize !== null) {
        finalIndentSize = cliArgs.indentSize;
        indentSource = "CLI flag";
    } else if (cliArgs.usePrettier) {
        const prettierConfig = detectPrettierConfig();
        const prettierIndent = getPrettierIndentSize(prettierConfig);

        if (prettierIndent !== null) {
            finalIndentSize = prettierIndent;
            indentSource = "Prettier config";
        }
    }

    log(`  Indentation: ${finalIndentSize} spaces (${indentSource})`, "cyan");

    const [configSchemaPaths, configWorkdir] = readSupabaseConfig(
        cliArgs.workdir
    );
    const resolvedPaths = resolveSchemaFiles(configSchemaPaths, configWorkdir);

    let outputSuffix = "";
    if (
        cliArgs.workdir &&
        cliArgs.workdir !== GENERATOR_CONFIG.defaultWorkdir
    ) {
        const pathParts = cliArgs.workdir
            .split(/[/\\]/)
            .filter((p) => p && p !== "." && p !== "supabase");
        if (pathParts.length > 0) {
            const lastPart = pathParts[pathParts.length - 1];
            outputSuffix = lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
        }
    }

    return {
        supabase: {
            source: cliArgs.source,
            connectionString: cliArgs.connectionString,
            schema: cliArgs.schema,
            useWorkdirFlag: cliArgs.useWorkdir,
            inputWorkdir: cliArgs.workdir,
            configWorkdir: configWorkdir,
            configPath: configWorkdir ? join(configWorkdir, "config.toml") : "",
        },
        schemaPaths: resolvedPaths,
        output: {
            dir: cliArgs.outputDir,
            tempFile: `database${outputSuffix}-temp.ts`,
            finalFile: `database${outputSuffix}.ts`,
        },
        extractNestedTypes: cliArgs.extractNestedTypes,
        deduplicateTypes: cliArgs.deduplicateTypes,
        verboseLogging: cliArgs.verboseLogging,
        namingConvention: cliArgs.namingConvention,
        alphabetical: cliArgs.alphabetical,
        indentSize: finalIndentSize,
        includeIndexes: cliArgs.includeIndexes,
        includeComments: cliArgs.includeComments,
    };
}

function generateFinalTypes(
    config: GeneratorConfig,
    tables: TableDefinition[],
    enums: EnumDefinition[],
    functions: FunctionDefinition[],
    compositeTypes: CompositeTypeDefinition[],
    views: ViewDefinition[],
    jsonbTypes: TypeDefinition[]
): void {
    log("\n🔨 Step 3: Generating type definitions...", "bright");

    const finalPath = join(config.output.dir, config.output.finalFile);
    const convention = config.namingConvention;
    const schema = config.supabase.schema;
    const indentSize = config.indentSize;
    const indent = " ".repeat(indentSize);

    // Detect which geometric types are used
    const usedGeometricTypes = detectGeometricTypes(tables);
    const useGeometricTypes = usedGeometricTypes.size > 0;

    if (useGeometricTypes) {
        log(
            `  ✓ Detected ${
                usedGeometricTypes.size
            } geometric type(s): ${Array.from(usedGeometricTypes).join(", ")}`,
            "cyan"
        );
    }

    // Sort if requested
    if (config.alphabetical) {
        log("  ✓ Sorting types alphabetically", "cyan");
        tables.sort((a, b) => a.name.localeCompare(b.name));
        enums.sort((a, b) => a.name.localeCompare(b.name));
        functions.sort((a, b) => a.name.localeCompare(b.name));
        compositeTypes.sort((a, b) => a.name.localeCompare(b.name));
        views.sort((a, b) => a.name.localeCompare(b.name));
        jsonbTypes.sort((a, b) => a.name.localeCompare(b.name));

        for (const table of tables) {
            table.columns.sort((a, b) => a.name.localeCompare(b.name));
            table.relationships.sort((a, b) =>
                a.foreignKeyName.localeCompare(b.foreignKeyName)
            );
            table.indexes.sort((a, b) => a.name.localeCompare(b.name));
        }

        for (const compType of compositeTypes) {
            compType.attributes.sort((a, b) => a.name.localeCompare(b.name));
        }

        for (const view of views) {
            view.columns.sort((a, b) => a.name.localeCompare(b.name));
        }
    }

    // Flatten JSONB types if needed
    let allJsonbTypes = config.extractNestedTypes
        ? flattenTypes(jsonbTypes)
        : jsonbTypes;

    // Deduplicate types if requested
    if (config.deduplicateTypes && allJsonbTypes.length > 0) {
        log("  ✓ Deduplicating types...", "cyan");

        const typeMap = new Map<string, TypeDefinition>();
        const normalizedToName = new Map<string, string>();
        const nameToCanonical = new Map<string, string>();

        for (const type of allJsonbTypes) {
            const normalized = normalizeTypeDefinition(type.typeDefinition);

            if (normalizedToName.has(normalized)) {
                const canonicalName = normalizedToName.get(normalized)!;
                nameToCanonical.set(type.name, canonicalName);
            } else {
                normalizedToName.set(normalized, type.name);
                typeMap.set(type.name, type);
                nameToCanonical.set(type.name, type.name);
            }
        }

        const deduplicatedTypes: TypeDefinition[] = [];
        const seen = new Set<string>();

        for (const type of allJsonbTypes) {
            const normalized = normalizeTypeDefinition(type.typeDefinition);
            const canonicalName = normalizedToName.get(normalized)!;

            if (!seen.has(canonicalName)) {
                seen.add(canonicalName);
                let canonicalType = typeMap.get(canonicalName)!;

                let updatedDefinition = canonicalType.typeDefinition;
                for (const [oldName, newName] of nameToCanonical.entries()) {
                    if (oldName !== newName) {
                        const regex = new RegExp(`\\b${oldName}\\b`, "g");
                        updatedDefinition = updatedDefinition.replace(
                            regex,
                            newName
                        );
                    }
                }

                canonicalType = {
                    ...canonicalType,
                    typeDefinition: updatedDefinition,
                };

                deduplicatedTypes.push(canonicalType);
            }
        }

        const removedCount = allJsonbTypes.length - deduplicatedTypes.length;
        if (removedCount > 0) {
            log(`    Removed ${removedCount} duplicate type(s)`, "green");
        }

        allJsonbTypes = deduplicatedTypes;
    }

    if (config.alphabetical && config.extractNestedTypes) {
        allJsonbTypes.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Group by schema
    const tablesBySchema: Record<string, TableDefinition[]> = {};
    const enumsBySchema: Record<string, EnumDefinition[]> = {};
    const functionsBySchema: Record<string, FunctionDefinition[]> = {};
    const compositeTypesBySchema: Record<string, CompositeTypeDefinition[]> =
        {};
    const viewsBySchema: Record<string, ViewDefinition[]> = {};

    for (const table of tables) {
        if (!tablesBySchema[table.schema]) {
            tablesBySchema[table.schema] = [];
        }
        tablesBySchema[table.schema].push(table);
    }

    for (const enumDef of enums) {
        if (!enumsBySchema[enumDef.schema]) {
            enumsBySchema[enumDef.schema] = [];
        }
        enumsBySchema[enumDef.schema].push(enumDef);
    }

    for (const func of functions) {
        if (!functionsBySchema[func.schema]) {
            functionsBySchema[func.schema] = [];
        }
        functionsBySchema[func.schema].push(func);
    }

    for (const compType of compositeTypes) {
        if (!compositeTypesBySchema[compType.schema]) {
            compositeTypesBySchema[compType.schema] = [];
        }
        compositeTypesBySchema[compType.schema].push(compType);
    }

    for (const view of views) {
        if (!viewsBySchema[view.schema]) {
            viewsBySchema[view.schema] = [];
        }
        viewsBySchema[view.schema].push(view);
    }

    const allSchemas = new Set<string>([
        ...Object.keys(tablesBySchema),
        ...Object.keys(enumsBySchema),
        ...Object.keys(functionsBySchema),
        ...Object.keys(compositeTypesBySchema),
        ...Object.keys(viewsBySchema),
    ]);

    allSchemas.add("graphql_public");

    // Generate base types for each schema
    const schemaTypes: string[] = [];

    for (const schemaName of Array.from(allSchemas).sort()) {
        const schemaTables = tablesBySchema[schemaName] || [];
        const schemaEnums = enumsBySchema[schemaName] || [];
        const schemaFunctions = functionsBySchema[schemaName] || [];
        const schemaCompositeTypes = compositeTypesBySchema[schemaName] || [];
        const schemaViews = viewsBySchema[schemaName] || [];

        const availableEnums = new Set(schemaEnums.map((e) => e.name));

        const tableTypes = schemaTables
            .map((table) =>
                generateTableType(
                    table,
                    convention,
                    indentSize,
                    config.includeIndexes,
                    config.includeComments,
                    availableEnums,
                    schemaName,
                    useGeometricTypes
                )
            )
            .join("\n");
        const enumTypes = generateEnumTypes(
            schemaEnums,
            convention,
            indentSize
        );
        const functionTypes = generateFunctionTypes(
            schemaFunctions,
            convention,
            indentSize,
            availableEnums,
            schemaName,
            useGeometricTypes,
            config.alphabetical
        );
        const compositeTypesDef = generateCompositeTypes(
            schemaCompositeTypes,
            convention,
            indentSize
        );
        const viewTypes = generateViewTypes(
            schemaViews,
            convention,
            indentSize,
            config.includeComments,
            availableEnums,
            schemaName,
            useGeometricTypes
        );

        if (schemaName === "graphql_public") {
            schemaTypes.push(`${indent}graphql_public: {
${indent.repeat(2)}Tables: {
${indent.repeat(3)}[_ in never]: never
${indent.repeat(2)}}
${indent.repeat(2)}Views: {
${indent.repeat(3)}[_ in never]: never
${indent.repeat(2)}}
${indent.repeat(2)}Functions: {
${indent.repeat(3)}graphql: {
${indent.repeat(4)}Args: {
${indent.repeat(5)}extensions?: Json
${indent.repeat(5)}operationName?: string
${indent.repeat(5)}query?: string
${indent.repeat(5)}variables?: Json
${indent.repeat(4)}}
${indent.repeat(4)}Returns: Json
${indent.repeat(3)}}
${indent.repeat(2)}}
${indent.repeat(2)}Enums: {
${indent.repeat(3)}[_ in never]: never
${indent.repeat(2)}}
${indent.repeat(2)}CompositeTypes: {
${indent.repeat(3)}[_ in never]: never
${indent.repeat(2)}}
${indent}}`);
        } else {
            schemaTypes.push(`${indent}${schemaName}: {
${indent.repeat(2)}Tables: {
${tableTypes || `${indent.repeat(3)}[_ in never]: never`}
${indent.repeat(2)}}
${indent.repeat(2)}Views: {
${viewTypes || `${indent.repeat(3)}[_ in never]: never`}
${indent.repeat(2)}}
${indent.repeat(2)}Functions: {
${functionTypes || `${indent.repeat(3)}[_ in never]: never`}
${indent.repeat(2)}}
${indent.repeat(2)}Enums: {
${enumTypes || `${indent.repeat(3)}[_ in never]: never`}
${indent.repeat(2)}}
${indent.repeat(2)}CompositeTypes: {
${compositeTypesDef || `${indent.repeat(3)}[_ in never]: never`}
${indent.repeat(2)}}
${indent}}`);
        }
    }

    // Generate JSONB type definitions
    const jsonbTypeDefinitions = generateJsonbTypeDefinitions(
        allJsonbTypes,
        config.includeComments
    );

    // Generate MergeDeep structure for JSONB overrides
    const mergeDeepStructure = generateMergeDeepStructure(
        jsonbTypes,
        convention,
        indentSize,
        config.alphabetical
    );
    const hasMergeDeep = mergeDeepStructure.length > 0;

    // Create header
    const namingNote =
        convention === "preserve"
            ? "preserve (exact database naming)"
            : convention;
    const sourceNote =
        config.supabase.source === "sql" ? "SQL files" : "database";
    const sortNote = config.alphabetical ? " (alphabetically sorted)" : "";

    let indentSourceNote = "";
    if (indentSize === 2) {
        const prettierConfig = detectPrettierConfig();
        const prettierIndent = getPrettierIndentSize(prettierConfig);
        if (prettierIndent === indentSize) {
            indentSourceNote = " (from Prettier config)";
        } else {
            indentSourceNote = " (default)";
        }
    } else {
        indentSourceNote = " (custom)";
    }

    const header = `/**
 * Auto-generated TypeScript types for Supabase
 * Generated: ${new Date().toISOString()}
 * Source: ${sourceNote}
 * Naming convention: ${namingNote}
 * Schema: ${schema}${sortNote}
 * Indentation: ${indentSize} spaces${indentSourceNote}
 * Note: 'this' and 'constraint' columns are automatically excluded
 * 
 * DO NOT EDIT MANUALLY - Run type generation script to regenerate
 */

${hasMergeDeep ? "import type { MergeDeep } from 'type-fest';\n\n" : ""}`;

    const jsonType = `export type Json =
${indent}| string
${indent}| number
${indent}| boolean
${indent}| null
${indent}| { [key: string]: Json | undefined }
${indent}| Json[]

`;

    const geometricTypesSection = generateGeometricTypes(
        usedGeometricTypes,
        indentSize
    );

    const jsonbSection =
        allJsonbTypes.length > 0
            ? `
// ============================================================================
// JSONB Column Type Definitions
// ============================================================================
// These types provide structured definitions for JSONB columns with default values

${jsonbTypeDefinitions}
`
            : "";

    const constantsSection = generateConstants(
        enumsBySchema,
        allSchemas,
        convention,
        indentSize
    );

    const baseDatabaseType = `${
        hasMergeDeep ? "type DatabaseGenerated = " : "export type Database = "
    }{
${schemaTypes.join("\n")}
}
`;

    const enhancedDatabaseType = hasMergeDeep
        ? `
// ============================================================================
// Enhanced Database Type with JSONB Support
// ============================================================================

/**
 * Enhanced Database type with specific JSONB column types
 * Uses MergeDeep to override generic Json types with specific structures
 */
export type Database = MergeDeep<
${indent}DatabaseGenerated,
${indent}{
${indent.repeat(2)}${schema}: {
${indent.repeat(3)}Tables: {
${mergeDeepStructure}
${indent.repeat(3)}}
${indent.repeat(2)}}
${indent}}
>;

`
        : "\n";

    const helperTypes = `
type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
${indent}DefaultSchemaTableNameOrOptions extends
${indent.repeat(2)}| keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
${indent.repeat(2)}| { schema: keyof DatabaseWithoutInternals },
${indent}TableName extends DefaultSchemaTableNameOrOptions extends {
${indent.repeat(2)}schema: keyof DatabaseWithoutInternals
${indent}}
${indent.repeat(
    2
)}? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
${indent.repeat(
    4
)}DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
${indent.repeat(2)}: never = never,
> = DefaultSchemaTableNameOrOptions extends {
${indent}schema: keyof DatabaseWithoutInternals
}
${indent}? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
${indent.repeat(
    3
)}DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
${indent.repeat(3)}Row: infer R
${indent.repeat(2)}}
${indent.repeat(2)}? R
${indent.repeat(2)}: never
${indent}: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
${indent.repeat(4)}DefaultSchema["Views"])
${indent.repeat(2)}? (DefaultSchema["Tables"] &
${indent.repeat(
    4
)}DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
${indent.repeat(4)}Row: infer R
${indent.repeat(3)}}
${indent.repeat(3)}? R
${indent.repeat(3)}: never
${indent.repeat(2)}: never

export type TablesInsert<
${indent}DefaultSchemaTableNameOrOptions extends
${indent.repeat(2)}| keyof DefaultSchema["Tables"]
${indent.repeat(2)}| { schema: keyof DatabaseWithoutInternals },
${indent}TableName extends DefaultSchemaTableNameOrOptions extends {
${indent.repeat(2)}schema: keyof DatabaseWithoutInternals
${indent}}
${indent.repeat(
    2
)}? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
${indent.repeat(2)}: never = never,
> = DefaultSchemaTableNameOrOptions extends {
${indent}schema: keyof DatabaseWithoutInternals
}
${indent}? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
${indent.repeat(3)}Insert: infer I
${indent.repeat(2)}}
${indent.repeat(2)}? I
${indent.repeat(2)}: never
${indent}: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
${indent.repeat(
    2
)}? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
${indent.repeat(4)}Insert: infer I
${indent.repeat(3)}}
${indent.repeat(3)}? I
${indent.repeat(3)}: never
${indent.repeat(2)}: never

export type TablesUpdate<
${indent}DefaultSchemaTableNameOrOptions extends
${indent.repeat(2)}| keyof DefaultSchema["Tables"]
${indent.repeat(2)}| { schema: keyof DatabaseWithoutInternals },
${indent}TableName extends DefaultSchemaTableNameOrOptions extends {
${indent.repeat(2)}schema: keyof DatabaseWithoutInternals
${indent}}
${indent.repeat(
    2
)}? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
${indent.repeat(2)}: never = never,
> = DefaultSchemaTableNameOrOptions extends {
${indent}schema: keyof DatabaseWithoutInternals
}
${indent}? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
${indent.repeat(3)}Update: infer U
${indent.repeat(2)}}
${indent.repeat(2)}? U
${indent.repeat(2)}: never
${indent}: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
${indent.repeat(
    2
)}? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
${indent.repeat(4)}Update: infer U
${indent.repeat(3)}}
${indent.repeat(3)}? U
${indent.repeat(3)}: never
${indent.repeat(2)}: never

export type Enums<
${indent}DefaultSchemaEnumNameOrOptions extends
${indent.repeat(2)}| keyof DefaultSchema["Enums"]
${indent.repeat(2)}| { schema: keyof DatabaseWithoutInternals },
${indent}EnumName extends DefaultSchemaEnumNameOrOptions extends {
${indent.repeat(2)}schema: keyof DatabaseWithoutInternals
${indent}}
${indent.repeat(
    2
)}? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
${indent.repeat(2)}: never = never,
> = DefaultSchemaEnumNameOrOptions extends {
${indent}schema: keyof DatabaseWithoutInternals
}
${indent}? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
${indent}: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
${indent.repeat(2)}? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
${indent.repeat(2)}: never

export type CompositeTypes<
${indent}PublicCompositeTypeNameOrOptions extends
${indent.repeat(2)}| keyof DefaultSchema["CompositeTypes"]
${indent.repeat(2)}| { schema: keyof DatabaseWithoutInternals },
${indent}CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
${indent.repeat(2)}schema: keyof DatabaseWithoutInternals
${indent}}
${indent.repeat(
    2
)}? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
${indent.repeat(2)}: never = never,
> = PublicCompositeTypeNameOrOptions extends {
${indent}schema: keyof DatabaseWithoutInternals
}
${indent}? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
${indent}: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
${indent.repeat(
    2
)}? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
${indent.repeat(2)}: never
`;

    const content =
        header +
        geometricTypesSection +
        jsonType +
        baseDatabaseType +
        enhancedDatabaseType +
        helperTypes +
        jsonbSection +
        constantsSection;

    writeFileSync(finalPath, content, "utf8");

    log(`  ✓ Types generated: ${finalPath}`, "green");
    log(`  ✓ ${tables.length} table(s)`, "green");

    const totalRelationships = tables.reduce(
        (sum, t) => sum + t.relationships.length,
        0
    );
    if (totalRelationships > 0) {
        log(`  ✓ ${totalRelationships} relationship(s)`, "green");
    }

    const totalIndexes = tables.reduce((sum, t) => sum + t.indexes.length, 0);
    if (totalIndexes > 0) {
        if (config.includeIndexes) {
            log(
                `    Indexes: ${totalIndexes} (included in generated types)`,
                "green"
            );
        } else {
            log(
                `    Indexes: ${totalIndexes} (found but not included in types - use --include-indexes to include)`,
                "cyan"
            );
        }
    }

    if (enums.length > 0) {
        log(`  ✓ ${enums.length} enum(s)`, "green");
    }
    if (functions.length > 0) {
        log(`  ✓ ${functions.length} function(s)`, "green");
    }
    if (compositeTypes.length > 0) {
        log(`  ✓ ${compositeTypes.length} composite type(s)`, "green");
    }
    if (views.length > 0) {
        log(`  ✓ ${views.length} view(s)`, "green");
    }
    if (allJsonbTypes.length > 0) {
        const mainTypes = jsonbTypes.filter((t) => t.table);
        log(
            `  ✓ ${allJsonbTypes.length} JSONB type(s) (${
                mainTypes.length
            } main, ${allJsonbTypes.length - mainTypes.length} nested)`,
            "green"
        );
    }

    if (usedGeometricTypes.size > 0) {
        log(
            `  ✓ ${
                usedGeometricTypes.size
            } geometric type(s) exported: ${Array.from(usedGeometricTypes).join(
                ", "
            )}`,
            "green"
        );
    }

    log(
        `  ✓ ${allSchemas.size} schema(s): ${Array.from(allSchemas).join(
            ", "
        )}`,
        "cyan"
    );
    log(`  ✓ Automatically excluded 'this' and 'constraint' columns`, "cyan");
}

export function generateTypes(): void {
    log(
        "╔════════════════════════════════════════════════════════════╗",
        "bright"
    );
    log(
        "║  Supabase Type Generator (with Index Support)             ║",
        "bright"
    );
    log(
        "╚════════════════════════════════════════════════════════════╝",
        "bright"
    );

    const config = initializeConfig();
    setVerboseLogging(config.verboseLogging);

    // Ensure output directory exists
    if (!existsSync(config.output.dir)) {
        mkdirSync(config.output.dir, { recursive: true });
    }

    // Parse SQL files
    const { tables, enums, functions, compositeTypes, views } = parseSqlFiles(
        config.schemaPaths,
        config.supabase.schema,
        config.includeComments
    );

    if (tables.length === 0) {
        log("\n❌ No tables found in SQL files!", "red", true);
        log("   Check your schema paths in config.toml", "yellow", true);
        process.exit(1);
    }

    // Scan for JSONB columns
    log("\n🔍 Step 2: Scanning SQL schemas for JSONB columns...", "bright");
    const jsonbTypes = scanSchemas(
        config.schemaPaths,
        config.extractNestedTypes,
        config.namingConvention
    );

    if (jsonbTypes.length > 0) {
        log(`  📊 Total JSONB columns found: ${jsonbTypes.length}`, "green");
    }

    // Generate final types
    generateFinalTypes(
        config,
        tables,
        enums,
        functions,
        compositeTypes,
        views,
        jsonbTypes
    );

    log("\n✅ Type generation complete!", "green", true);
    log(`\n📝 Import your types with:`, "cyan", true);
    log(
        `   import type { Database, Tables, Enums } from './${config.output.finalFile.replace(
            ".js",
            ""
        )}'`,
        "cyan",
        true
    );
}
