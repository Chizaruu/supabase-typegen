/**
 * Prettier configuration detection utilities
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { PrettierConfig } from "../types/index.js";
import { log } from "./logger.js";

function parseSimpleYaml(content: string): PrettierConfig | null {
    try {
        const config: PrettierConfig = {};
        const lines = content.split("\n");

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#")) {
                continue;
            }

            const match = trimmed.match(/^(\w+):\s*(.+)$/);
            if (!match) {
                continue;
            }

            const [, key, value] = match;
            const cleanValue = value.trim();
            const unquotedValue = cleanValue.replace(/['"]/g, "");

            if (key === "tabWidth") {
                config.tabWidth = parseInt(unquotedValue);
            } else if (key === "useTabs") {
                config.useTabs = unquotedValue === "true";
            } else if (key === "semi") {
                config.semi = unquotedValue === "true";
            } else if (key === "singleQuote") {
                config.singleQuote = unquotedValue === "true";
            } else if (key === "trailingComma") {
                config.trailingComma = unquotedValue;
            } else if (key === "printWidth") {
                config.printWidth = parseInt(unquotedValue);
            }
        }

        return Object.keys(config).length > 0 ? config : null;
    } catch {
        return null;
    }
}

export function detectPrettierConfig(): PrettierConfig | null {
    const possiblePaths = [
        ".prettierrc",
        ".prettierrc.json",
        ".prettierrc.yaml",
        ".prettierrc.yml",
        "prettier.config.js",
        ".prettierrc.js",
        "package.json",
    ];

    // First pass: check for .js files and log warnings
    for (const configPath of possiblePaths) {
        if (configPath.endsWith(".js")) {
            const fullPath = join(process.cwd(), configPath);
            if (existsSync(fullPath)) {
                log(
                    `  Found ${configPath} but cannot parse JS config files`,
                    "yellow"
                );
                log(`  Use --indent to specify indentation manually`, "yellow");
            }
        }
    }

    // Second pass: find and return the first valid config
    for (const configPath of possiblePaths) {
        const fullPath = join(process.cwd(), configPath);

        if (!existsSync(fullPath)) {
            continue;
        }

        try {
            if (configPath === "package.json") {
                const content = readFileSync(fullPath, "utf8");
                const packageJson = JSON.parse(content);
                if (packageJson.prettier) {
                    log(`  Found Prettier config in package.json`, "cyan");
                    return packageJson.prettier as PrettierConfig;
                }
                continue;
            }

            if (configPath.endsWith(".json") || configPath === ".prettierrc") {
                const content = readFileSync(fullPath, "utf8");
                const config = JSON.parse(content);
                log(`  Found Prettier config: ${configPath}`, "cyan");
                return config as PrettierConfig;
            }

            if (configPath.endsWith(".yaml") || configPath.endsWith(".yml")) {
                const content = readFileSync(fullPath, "utf8");
                const config = parseSimpleYaml(content);
                if (config) {
                    log(`  Found Prettier config: ${configPath}`, "cyan");
                    return config as PrettierConfig;
                }
            }

            // Skip .js files in second pass since we already warned about them
            if (configPath.endsWith(".js")) {
                continue;
            }
        } catch (error) {
            continue;
        }
    }

    return null;
}

export function getPrettierIndentSize(
    prettierConfig: PrettierConfig | null
): number | null {
    if (!prettierConfig) {
        return null;
    }

    if (prettierConfig.useTabs) {
        log(
            `  Prettier uses tabs, defaulting to 2 spaces for type generation`,
            "yellow"
        );
        return 2;
    }

    if (prettierConfig.tabWidth !== undefined) {
        return prettierConfig.tabWidth;
    }

    return null;
}
