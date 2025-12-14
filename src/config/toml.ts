/**
 * TOML configuration parsing utilities
 */

import { readFileSync, existsSync, statSync } from "fs";
import { join, resolve } from "path";
import { globSync } from "glob";
import type { SupabaseConfig } from "../types/index.ts";
import { log } from "../utils/logger.ts";

export function parseToml(content: string): SupabaseConfig {
    const config: SupabaseConfig = {};
    const lines = content.split("\n");

    let currentSection: string[] = [];
    let inArray = false;
    let arrayKey = "";
    let arrayItems: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (trimmed.startsWith("#")) {
            continue;
        }

        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            currentSection = trimmed.slice(1, -1).split(".");
            continue;
        }

        if (
            trimmed.includes("=[") ||
            (trimmed.includes("=") && trimmed.includes("["))
        ) {
            const match = trimmed.match(/^(\w+)\s*=\s*\[/);
            if (match) {
                arrayKey = match[1];
                inArray = true;
                arrayItems = [];

                if (trimmed.includes("]")) {
                    const itemMatches = trimmed.matchAll(/"([^"]+)"/g);
                    for (const item of itemMatches) {
                        arrayItems.push(item[1]);
                    }
                    inArray = false;

                    if (
                        currentSection[0] === "db" &&
                        currentSection[1] === "migrations" &&
                        arrayKey === "schema_paths"
                    ) {
                        if (!config.db) {
                            config.db = {};
                        }
                        if (!config.db.migrations) {
                            config.db.migrations = {};
                        }
                        config.db.migrations.schema_paths = arrayItems;
                    }
                } else {
                    const itemMatches = trimmed.matchAll(/"([^"]+)"/g);
                    for (const item of itemMatches) {
                        arrayItems.push(item[1]);
                    }
                }
                continue;
            }
        }

        if (inArray) {
            if (trimmed.includes("]")) {
                const itemMatches = trimmed.matchAll(/"([^"]+)"/g);
                for (const item of itemMatches) {
                    arrayItems.push(item[1]);
                }
                inArray = false;

                if (
                    currentSection[0] === "db" &&
                    currentSection[1] === "migrations" &&
                    arrayKey === "schema_paths"
                ) {
                    if (!config.db) {
                        config.db = {};
                    }
                    if (!config.db.migrations) {
                        config.db.migrations = {};
                    }
                    config.db.migrations.schema_paths = arrayItems;
                }
            } else {
                const itemMatches = trimmed.matchAll(/"([^"]+)"/g);
                for (const item of itemMatches) {
                    arrayItems.push(item[1]);
                }
            }
            continue;
        }
    }

    return config;
}

export function readSupabaseConfig(
    workdir: string | null
): [string[], string | null] {
    let configPath = workdir
        ? join(workdir, "config.toml")
        : join(process.cwd(), "supabase", "config.toml");

    let actualWorkdir = workdir;

    if (workdir && !existsSync(configPath)) {
        const fallbackPath = join(workdir, "supabase", "config.toml");
        if (existsSync(fallbackPath)) {
            log(`  Config not found at: ${configPath}`, "yellow");
            log(`  Using fallback: ${fallbackPath}`, "cyan");
            configPath = fallbackPath;
            actualWorkdir = join(workdir, "supabase");
        }
    }

    if (!existsSync(configPath)) {
        log(`  Warning: config.toml not found at ${configPath}`, "yellow");
        log(`  Falling back to default schema paths`, "yellow");
        const defaultPaths = ["migrations/*.sql", "migrations/**/*.sql"];
        return [defaultPaths, actualWorkdir];
    }

    log(`  Reading config from: ${configPath}`, "cyan");

    const content = readFileSync(configPath, "utf8");
    const config = parseToml(content);

    const schemaPaths = config.db?.migrations?.schema_paths || [];

    if (schemaPaths.length === 0) {
        log(`  Warning: No schema_paths found in config.toml`, "yellow");
        const defaultPaths = ["migrations/*.sql", "migrations/**/*.sql"];
        return [defaultPaths, actualWorkdir];
    }

    log(`  Found ${schemaPaths.length} schema path(s) in config`, "green");

    const globPatterns = schemaPaths.filter((p) => p.includes("*"));
    const specificFiles = schemaPaths.filter((p) => !p.includes("*"));
    if (globPatterns.length > 0) {
        log(
            `    ${globPatterns.length} glob pattern(s), ${specificFiles.length} specific file(s)`,
            "cyan"
        );
    }

    return [schemaPaths, actualWorkdir];
}

export function resolveSchemaFiles(
    schemaPaths: string[],
    workdir: string | null
): string[] {
    const baseDir = workdir
        ? resolve(process.cwd(), workdir)
        : resolve(process.cwd(), "supabase");

    log(
        `\n  📁 Resolving schema files from base directory: ${baseDir}`,
        "cyan"
    );

    const allFiles: string[] = [];
    const seenFiles = new Set<string>();

    for (const schemaPath of schemaPaths) {
        const pattern = join(baseDir, schemaPath);

        try {
            if (pattern.includes("*")) {
                const normalizedPattern = pattern.replace(/\\/g, "/");
                log(`  🔍 Expanding glob pattern: ${schemaPath}`, "cyan");
                const files = globSync(normalizedPattern, {
                    nodir: true,
                    absolute: true,
                });

                log(
                    `    Found ${files.length} file(s) matching pattern`,
                    files.length > 0 ? "green" : "yellow"
                );

                let addedCount = 0;
                let skippedCount = 0;

                for (const file of files) {
                    const normalized = resolve(file).replace(/\\/g, "/");
                    if (normalized.endsWith(".sql")) {
                        if (seenFiles.has(normalized)) {
                            skippedCount++;
                        } else {
                            allFiles.push(normalized);
                            seenFiles.add(normalized);
                            addedCount++;
                        }
                    }
                }

                if (addedCount > 0 || skippedCount > 0) {
                    log(
                        `    Added: ${addedCount}, Skipped (duplicates): ${skippedCount}`,
                        "cyan"
                    );
                }
            } else {
                const normalized = resolve(pattern).replace(/\\/g, "/");
                if (
                    existsSync(pattern) &&
                    statSync(pattern).isFile() &&
                    normalized.endsWith(".sql")
                ) {
                    if (seenFiles.has(normalized)) {
                        log(`  ⊝ ${schemaPath} (duplicate, skipped)`, "yellow");
                    } else {
                        allFiles.push(normalized);
                        seenFiles.add(normalized);
                        log(`  ✓ ${schemaPath}`, "green");
                    }
                } else if (!existsSync(pattern)) {
                    log(`  ✗ File not found: ${schemaPath}`, "yellow");
                } else if (!normalized.endsWith(".sql")) {
                    log(`  ⊝ Skipped (not .sql): ${schemaPath}`, "yellow");
                }
            }
        } catch (error) {
            const errorMsg =
                error instanceof Error ? error.message : String(error);
            log(
                `  ✗ Error resolving pattern ${schemaPath}: ${errorMsg}`,
                "red"
            );
        }
    }

    log(
        `\n  📊 Total unique SQL files resolved: ${allFiles.length}`,
        allFiles.length > 0 ? "green" : "red"
    );

    return allFiles;
}
