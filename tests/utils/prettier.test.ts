/**
 * Tests for Prettier configuration detection
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
    detectPrettierConfig,
    getPrettierIndentSize,
} from "../../src/utils/prettier.ts";
import * as fs from "fs";
import * as logger from "../../src/utils/logger.ts";

// Mock fs module
vi.mock("fs");

describe("Prettier Configuration Detection", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(logger, "log").mockImplementation(() => {});
        vi.spyOn(process, "cwd").mockReturnValue("/home/project");
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("detectPrettierConfig", () => {
        describe("JSON config files", () => {
            it("should detect .prettierrc.json and log cyan message (lines 96-100)", () => {
                const config = {
                    tabWidth: 4,
                    semi: true,
                    singleQuote: true,
                };

                vi.mocked(fs.existsSync).mockImplementation((path) => {
                    return path.toString().endsWith(".prettierrc.json");
                });
                vi.mocked(fs.readFileSync).mockReturnValue(
                    JSON.stringify(config)
                );

                const result = detectPrettierConfig();

                expect(result).toEqual(config);
                expect(logger.log).toHaveBeenCalledWith(
                    "  Found Prettier config: .prettierrc.json",
                    "cyan"
                );
            });

            it("should detect .prettierrc (JSON format) and return config (lines 96-100)", () => {
                const config = {
                    tabWidth: 2,
                    useTabs: false,
                };

                vi.mocked(fs.existsSync).mockImplementation((path) => {
                    return path.toString().endsWith(".prettierrc");
                });
                vi.mocked(fs.readFileSync).mockReturnValue(
                    JSON.stringify(config)
                );

                const result = detectPrettierConfig();

                expect(result).toEqual(config);
                expect(logger.log).toHaveBeenCalledWith(
                    "  Found Prettier config: .prettierrc",
                    "cyan"
                );
            });

            it("should handle invalid JSON gracefully", () => {
                vi.mocked(fs.existsSync).mockImplementation((path) => {
                    return path.toString().endsWith(".prettierrc.json");
                });
                vi.mocked(fs.readFileSync).mockReturnValue("{ invalid json");

                const result = detectPrettierConfig();

                expect(result).toBeNull();
            });
        });

        describe("YAML config files", () => {
            it("should detect .prettierrc.yaml with tabWidth (line 31)", () => {
                const yamlContent = `
tabWidth: 4
semi: true
singleQuote: false
                `.trim();

                vi.mocked(fs.existsSync).mockImplementation((path) => {
                    return path.toString().endsWith(".prettierrc.yaml");
                });
                vi.mocked(fs.readFileSync).mockReturnValue(yamlContent);

                const result = detectPrettierConfig();

                expect(result?.tabWidth).toBe(4);
                expect(logger.log).toHaveBeenCalledWith(
                    "  Found Prettier config: .prettierrc.yaml",
                    "cyan"
                );
            });

            it("should parse useTabs from YAML (lines 32-33)", () => {
                const yamlContent = `
useTabs: true
tabWidth: 4
                `.trim();

                vi.mocked(fs.existsSync).mockImplementation((path) => {
                    return path.toString().endsWith(".prettierrc.yaml");
                });
                vi.mocked(fs.readFileSync).mockReturnValue(yamlContent);

                const result = detectPrettierConfig();

                expect(result?.useTabs).toBe(true);
                expect(result?.tabWidth).toBe(4);
            });

            it("should parse semi from YAML (lines 34-35)", () => {
                const yamlContent = `
semi: false
tabWidth: 2
                `.trim();

                vi.mocked(fs.existsSync).mockImplementation((path) => {
                    return path.toString().endsWith(".prettierrc.yaml");
                });
                vi.mocked(fs.readFileSync).mockReturnValue(yamlContent);

                const result = detectPrettierConfig();

                expect(result?.semi).toBe(false);
            });

            it("should parse singleQuote from YAML (lines 36-37)", () => {
                const yamlContent = `
singleQuote: true
tabWidth: 2
                `.trim();

                vi.mocked(fs.existsSync).mockImplementation((path) => {
                    return path.toString().endsWith(".prettierrc.yaml");
                });
                vi.mocked(fs.readFileSync).mockReturnValue(yamlContent);

                const result = detectPrettierConfig();

                expect(result?.singleQuote).toBe(true);
            });

            it("should parse trailingComma from YAML (lines 38-39)", () => {
                const yamlContent = `
trailingComma: "es5"
tabWidth: 2
                `.trim();

                vi.mocked(fs.existsSync).mockImplementation((path) => {
                    return path.toString().endsWith(".prettierrc.yaml");
                });
                vi.mocked(fs.readFileSync).mockReturnValue(yamlContent);

                const result = detectPrettierConfig();

                expect(result?.trailingComma).toBe("es5");
            });

            it("should parse printWidth from YAML (lines 40-42)", () => {
                const yamlContent = `
printWidth: 120
tabWidth: 4
                `.trim();

                vi.mocked(fs.existsSync).mockImplementation((path) => {
                    return path.toString().endsWith(".prettierrc.yaml");
                });
                vi.mocked(fs.readFileSync).mockReturnValue(yamlContent);

                const result = detectPrettierConfig();

                expect(result?.printWidth).toBe(120);
                expect(result?.tabWidth).toBe(4);
            });

            it("should handle YAML with comments (line 17)", () => {
                const yamlContent = `
# This is a comment
tabWidth: 4
# Another comment
semi: true
                `.trim();

                vi.mocked(fs.existsSync).mockImplementation((path) => {
                    return path.toString().endsWith(".prettierrc.yaml");
                });
                vi.mocked(fs.readFileSync).mockReturnValue(yamlContent);

                const result = detectPrettierConfig();

                expect(result?.tabWidth).toBe(4);
                expect(result?.semi).toBe(true);
            });

            it("should handle YAML with invalid lines (lines 23-24)", () => {
                const yamlContent = `
tabWidth: 4
invalid line without colon
printWidth: 100
                `.trim();

                vi.mocked(fs.existsSync).mockImplementation((path) => {
                    return path.toString().endsWith(".prettierrc.yaml");
                });
                vi.mocked(fs.readFileSync).mockReturnValue(yamlContent);

                const result = detectPrettierConfig();

                expect(result?.tabWidth).toBe(4);
                expect(result?.printWidth).toBe(100);
            });

            it("should handle empty YAML file (return null)", () => {
                vi.mocked(fs.existsSync).mockImplementation((path) => {
                    return path.toString().endsWith(".prettierrc.yaml");
                });
                vi.mocked(fs.readFileSync).mockReturnValue("");

                const result = detectPrettierConfig();

                expect(result).toBeNull();
            });

            it("should handle YAML with only comments (return null)", () => {
                const yamlContent = `
# Just a comment
# Another comment
                `.trim();

                vi.mocked(fs.existsSync).mockImplementation((path) => {
                    return path.toString().endsWith(".prettierrc.yaml");
                });
                vi.mocked(fs.readFileSync).mockReturnValue(yamlContent);

                const result = detectPrettierConfig();

                expect(result).toBeNull();
            });

            it("should detect .prettierrc.yml (lines 102-108)", () => {
                const yamlContent = `
tabWidth: 2
useTabs: false
                `.trim();

                vi.mocked(fs.existsSync).mockImplementation((path) => {
                    return path.toString().endsWith(".prettierrc.yml");
                });
                vi.mocked(fs.readFileSync).mockReturnValue(yamlContent);

                const result = detectPrettierConfig();

                expect(result?.tabWidth).toBe(2);
                expect(result?.useTabs).toBe(false);
                expect(logger.log).toHaveBeenCalledWith(
                    "  Found Prettier config: .prettierrc.yml",
                    "cyan"
                );
            });

            it("should parse all supported YAML properties", () => {
                const yamlContent = `
tabWidth: 4
useTabs: false
semi: true
singleQuote: true
trailingComma: "all"
printWidth: 100
                `.trim();

                vi.mocked(fs.existsSync).mockImplementation((path) => {
                    return path.toString().endsWith(".prettierrc.yaml");
                });
                vi.mocked(fs.readFileSync).mockReturnValue(yamlContent);

                const result = detectPrettierConfig();

                expect(result?.tabWidth).toBe(4);
                expect(result?.useTabs).toBe(false);
                expect(result?.semi).toBe(true);
                expect(result?.singleQuote).toBe(true);
                expect(result?.trailingComma).toBe("all");
                expect(result?.printWidth).toBe(100);
            });

            it("should handle quoted numeric values in YAML", () => {
                const yamlContent = `
tabWidth: "4"
printWidth: "100"
                `.trim();

                vi.mocked(fs.existsSync).mockImplementation((path) => {
                    return path.toString().endsWith(".prettierrc.yaml");
                });
                vi.mocked(fs.readFileSync).mockReturnValue(yamlContent);

                const result = detectPrettierConfig();

                expect(result?.tabWidth).toBe(4);
                expect(result?.printWidth).toBe(100);
            });
        });

        describe("package.json", () => {
            it("should detect prettier config in package.json (lines 88-91)", () => {
                const prettierConfig = {
                    tabWidth: 4,
                    semi: false,
                    singleQuote: true,
                };

                vi.mocked(fs.existsSync).mockImplementation((path) => {
                    return path.toString().endsWith("package.json");
                });
                vi.mocked(fs.readFileSync).mockReturnValue(
                    JSON.stringify({
                        name: "test-package",
                        version: "1.0.0",
                        prettier: prettierConfig,
                    })
                );

                const result = detectPrettierConfig();

                expect(result).toEqual(prettierConfig);
                expect(logger.log).toHaveBeenCalledWith(
                    "  Found Prettier config in package.json",
                    "cyan"
                );
            });

            it("should continue when package.json has no prettier field (lines 92-93)", () => {
                // ONLY package.json exists, no prettier field
                vi.mocked(fs.existsSync).mockImplementation((path) => {
                    return path.toString().endsWith("package.json");
                });

                vi.mocked(fs.readFileSync).mockReturnValue(
                    JSON.stringify({
                        name: "test-package",
                        version: "1.0.0",
                        dependencies: {},
                    })
                );

                const result = detectPrettierConfig();

                // Should return null since package.json has no prettier config
                expect(result).toBeNull();
            });

            it("should handle invalid package.json gracefully", () => {
                vi.mocked(fs.existsSync).mockImplementation((path) => {
                    return path.toString().endsWith("package.json");
                });
                vi.mocked(fs.readFileSync).mockReturnValue("{ invalid json");

                const result = detectPrettierConfig();

                expect(result).toBeNull();
            });
        });

        describe("TypeScript config files", () => {
            it("should log warning for prettier.config.ts and continue (lines 67-72)", () => {
                // Only prettier.config.ts and .prettierrc.json should exist
                vi.mocked(fs.existsSync).mockImplementation((path) => {
                    return (
                        path.toString().endsWith("prettier.config.ts") ||
                        path.toString().endsWith(".prettierrc.json")
                    );
                });

                vi.mocked(fs.readFileSync).mockImplementation((path) => {
                    if (path.toString().endsWith("prettier.config.ts")) {
                        return "export default { tabWidth: 4 }";
                    }
                    if (path.toString().endsWith(".prettierrc.json")) {
                        return JSON.stringify({ tabWidth: 2 });
                    }
                    return "{}";
                });

                const result = detectPrettierConfig();

                expect(logger.log).toHaveBeenCalledWith(
                    "  Found prettier.config.ts but cannot parse JS config files",
                    "yellow"
                );
                expect(logger.log).toHaveBeenCalledWith(
                    "  Use --indent to specify indentation manually",
                    "yellow"
                );
                expect(result?.tabWidth).toBe(2);
            });

            it("should log warning for .prettierrc.ts and skip it (lines 67-72, 113-114)", () => {
                // Only .prettierrc.ts and package.json should exist
                vi.mocked(fs.existsSync).mockImplementation((path) => {
                    return (
                        path.toString().endsWith(".prettierrc.ts") ||
                        path.toString().endsWith("package.json")
                    );
                });

                vi.mocked(fs.readFileSync).mockImplementation((path) => {
                    if (path.toString().endsWith(".prettierrc.ts")) {
                        return "export default { tabWidth: 8 }";
                    }
                    if (path.toString().endsWith("package.json")) {
                        return JSON.stringify({
                            prettier: { tabWidth: 3 },
                        });
                    }
                    return "{}";
                });

                const result = detectPrettierConfig();

                expect(logger.log).toHaveBeenCalledWith(
                    "  Found .prettierrc.ts but cannot parse JS config files",
                    "yellow"
                );
                expect(result?.tabWidth).toBe(3);
            });

            it("should skip .ts files in second pass (lines 113-114)", () => {
                vi.mocked(fs.existsSync).mockImplementation((path) => {
                    return path.toString().endsWith("prettier.config.ts");
                });

                vi.mocked(fs.readFileSync).mockReturnValue(
                    "export default { tabWidth: 4 }"
                );

                const result = detectPrettierConfig();

                // Should warn but not try to parse
                expect(logger.log).toHaveBeenCalledWith(
                    expect.stringContaining("cannot parse"),
                    "yellow"
                );
                expect(result).toBeNull();
            });
        });

        describe("File search order and priority", () => {
            it("should prioritize .prettierrc over other configs", () => {
                // Multiple config files exist
                vi.mocked(fs.existsSync).mockImplementation((path) => {
                    return (
                        path.toString().endsWith(".prettierrc") ||
                        path.toString().endsWith(".prettierrc.json") ||
                        path.toString().endsWith("package.json")
                    );
                });

                vi.mocked(fs.readFileSync).mockImplementation((path) => {
                    if (path.toString().endsWith(".prettierrc")) {
                        return JSON.stringify({ tabWidth: 1 });
                    }
                    if (path.toString().endsWith(".prettierrc.json")) {
                        return JSON.stringify({ tabWidth: 2 });
                    }
                    if (path.toString().endsWith("package.json")) {
                        return JSON.stringify({ prettier: { tabWidth: 3 } });
                    }
                    return "{}";
                });

                const result = detectPrettierConfig();

                expect(result?.tabWidth).toBe(1);
            });

            it("should return null when no config files exist", () => {
                vi.mocked(fs.existsSync).mockReturnValue(false);

                const result = detectPrettierConfig();

                expect(result).toBeNull();
            });

            it("should continue searching after YAML returns null", () => {
                // Only .prettierrc.yaml and package.json should exist
                vi.mocked(fs.existsSync).mockImplementation((path) => {
                    return (
                        path.toString().endsWith(".prettierrc.yaml") ||
                        path.toString().endsWith("package.json")
                    );
                });

                vi.mocked(fs.readFileSync).mockImplementation((path) => {
                    if (path.toString().endsWith(".prettierrc.yaml")) {
                        return "# only comments";
                    }
                    if (path.toString().endsWith("package.json")) {
                        return JSON.stringify({
                            prettier: { tabWidth: 4 },
                        });
                    }
                    return "{}";
                });

                const result = detectPrettierConfig();

                expect(result?.tabWidth).toBe(4);
            });
        });

        describe("Error handling", () => {
            it("should handle file read errors gracefully", () => {
                vi.mocked(fs.existsSync).mockReturnValue(true);
                vi.mocked(fs.readFileSync).mockImplementation(() => {
                    throw new Error("File read error");
                });

                const result = detectPrettierConfig();

                expect(result).toBeNull();
            });

            it("should continue checking other files after an error", () => {
                // Only .prettierrc and .prettierrc.json exist
                vi.mocked(fs.existsSync).mockImplementation((path) => {
                    return (
                        path.toString().endsWith(".prettierrc") ||
                        path.toString().endsWith(".prettierrc.json")
                    );
                });

                let callCount = 0;
                vi.mocked(fs.readFileSync).mockImplementation((path) => {
                    callCount++;
                    if (path.toString().endsWith(".prettierrc")) {
                        throw new Error("Error");
                    }
                    if (path.toString().endsWith(".prettierrc.json")) {
                        return JSON.stringify({ tabWidth: 4 });
                    }
                    return "{}";
                });

                const result = detectPrettierConfig();

                expect(result?.tabWidth).toBe(4);
                expect(callCount).toBeGreaterThan(1);
            });

            it("should handle YAML parsing exceptions (lines 46-48)", () => {
                vi.mocked(fs.existsSync).mockImplementation((path) => {
                    return path.toString().endsWith(".prettierrc.yaml");
                });

                vi.mocked(fs.readFileSync).mockImplementation(() => {
                    const badContent: any = {
                        split() {
                            throw new TypeError("Cannot split");
                        },
                    };
                    return badContent;
                });

                const result = detectPrettierConfig();

                expect(result).toBeNull();
            });
        });
    });

    describe("getPrettierIndentSize", () => {
        it("should return null when config is null (lines 126-128)", () => {
            const result = getPrettierIndentSize(null);

            expect(result).toBeNull();
            expect(logger.log).not.toHaveBeenCalled();
        });

        it("should return tabWidth from config (lines 138-140)", () => {
            const config = { tabWidth: 4 };

            const result = getPrettierIndentSize(config);

            expect(result).toBe(4);
        });

        it("should return 2 when useTabs is true (lines 130-136)", () => {
            const config = { useTabs: true, tabWidth: 4 };

            const result = getPrettierIndentSize(config);

            expect(result).toBe(2);
            expect(logger.log).toHaveBeenCalledWith(
                "  Prettier uses tabs, defaulting to 2 spaces for type generation",
                "yellow"
            );
        });

        it("should prioritize useTabs over tabWidth (lines 130-136)", () => {
            const config = { useTabs: true, tabWidth: 8 };

            const result = getPrettierIndentSize(config);

            expect(result).toBe(2);
        });

        it("should return null when tabWidth is undefined and useTabs is false (line 142)", () => {
            const config = { useTabs: false };

            const result = getPrettierIndentSize(config);

            expect(result).toBeNull();
        });

        it("should handle empty config object (line 142)", () => {
            const config = {};

            const result = getPrettierIndentSize(config);

            expect(result).toBeNull();
        });

        it("should handle config with only tabWidth (lines 138-140)", () => {
            const config = { tabWidth: 2 };

            const result = getPrettierIndentSize(config);

            expect(result).toBe(2);
        });

        it("should handle config with tabWidth 0 (lines 138-140)", () => {
            const config = { tabWidth: 0 };

            const result = getPrettierIndentSize(config);

            expect(result).toBe(0);
        });

        it("should ignore other config properties (lines 138-140)", () => {
            const config = {
                tabWidth: 4,
                semi: true,
                singleQuote: true,
                printWidth: 100,
            };

            const result = getPrettierIndentSize(config);

            expect(result).toBe(4);
        });

        it("should handle config with useTabs false explicitly (lines 138-140)", () => {
            const config = { useTabs: false, tabWidth: 4 };

            const result = getPrettierIndentSize(config);

            expect(result).toBe(4);
        });

        it("should return null when only other properties present (line 142)", () => {
            const config = {
                semi: true,
                singleQuote: true,
                printWidth: 100,
            };

            const result = getPrettierIndentSize(config);

            expect(result).toBeNull();
        });

        it("should log yellow warning when useTabs is true (lines 92-93)", () => {
            const config = { useTabs: true };

            const result = getPrettierIndentSize(config);

            expect(result).toBe(2);
            expect(logger.log).toHaveBeenCalledWith(
                "  Prettier uses tabs, defaulting to 2 spaces for type generation",
                "yellow"
            );
        });
    });

    describe("Integration scenarios", () => {
        it("should detect config and extract indent size", () => {
            const config = { tabWidth: 4, semi: true };

            vi.mocked(fs.existsSync).mockImplementation((path) => {
                return path.toString().endsWith(".prettierrc.json");
            });
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(config));

            const prettierConfig = detectPrettierConfig();
            const indentSize = getPrettierIndentSize(prettierConfig);

            expect(indentSize).toBe(4);
        });

        it("should handle tabs configuration", () => {
            const config = { useTabs: true };

            vi.mocked(fs.existsSync).mockImplementation((path) => {
                return path.toString().endsWith(".prettierrc.json");
            });
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(config));

            const prettierConfig = detectPrettierConfig();
            const indentSize = getPrettierIndentSize(prettierConfig);

            expect(indentSize).toBe(2);
        });

        it("should return null when no config found", () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);

            const prettierConfig = detectPrettierConfig();
            const indentSize = getPrettierIndentSize(prettierConfig);

            expect(indentSize).toBeNull();
        });

        it("should handle package.json with useTabs", () => {
            vi.mocked(fs.existsSync).mockImplementation((path) => {
                return path.toString().endsWith("package.json");
            });
            vi.mocked(fs.readFileSync).mockReturnValue(
                JSON.stringify({
                    prettier: { useTabs: true, tabWidth: 4 },
                })
            );

            const config = detectPrettierConfig();
            const indentSize = getPrettierIndentSize(config);

            expect(config?.useTabs).toBe(true);
            expect(indentSize).toBe(2);
        });

        it("should handle YAML with all properties", () => {
            const yamlContent = `
tabWidth: 4
useTabs: false
semi: true
singleQuote: true
trailingComma: "all"
printWidth: 100
            `.trim();

            vi.mocked(fs.existsSync).mockImplementation((path) => {
                return path.toString().endsWith(".prettierrc.yaml");
            });
            vi.mocked(fs.readFileSync).mockReturnValue(yamlContent);

            const config = detectPrettierConfig();
            const indentSize = getPrettierIndentSize(config);

            expect(config?.tabWidth).toBe(4);
            expect(config?.useTabs).toBe(false);
            expect(indentSize).toBe(4);
        });
    });

    describe("Edge cases", () => {
        it("should handle whitespace variations in YAML", () => {
            const yamlContent = `
  tabWidth:   4  
    printWidth:120
semi:    true   
            `.trim();

            vi.mocked(fs.existsSync).mockImplementation((path) => {
                return path.toString().endsWith(".prettierrc.yaml");
            });
            vi.mocked(fs.readFileSync).mockReturnValue(yamlContent);

            const result = detectPrettierConfig();

            expect(result?.tabWidth).toBe(4);
            expect(result?.printWidth).toBe(120);
            expect(result?.semi).toBe(true);
        });

        it("should handle boolean values without quotes in YAML", () => {
            const yamlContent = `
useTabs: true
semi: false
singleQuote: true
            `.trim();

            vi.mocked(fs.existsSync).mockImplementation((path) => {
                return path.toString().endsWith(".prettierrc.yaml");
            });
            vi.mocked(fs.readFileSync).mockReturnValue(yamlContent);

            const result = detectPrettierConfig();

            expect(result?.useTabs).toBe(true);
            expect(result?.semi).toBe(false);
            expect(result?.singleQuote).toBe(true);
        });

        it("should handle mixed quote styles in trailingComma", () => {
            const yamlContent = `
trailingComma: 'all'
tabWidth: 2
            `.trim();

            vi.mocked(fs.existsSync).mockImplementation((path) => {
                return path.toString().endsWith(".prettierrc.yaml");
            });
            vi.mocked(fs.readFileSync).mockReturnValue(yamlContent);

            const result = detectPrettierConfig();

            expect(result?.trailingComma).toBe("all");
            expect(result?.tabWidth).toBe(2);
        });

        it("should handle YAML with unsupported properties", () => {
            const yamlContent = `
tabWidth: 2
arrowParens: always
bracketSpacing: true
printWidth: 80
            `.trim();

            vi.mocked(fs.existsSync).mockImplementation((path) => {
                return path.toString().endsWith(".prettierrc.yaml");
            });
            vi.mocked(fs.readFileSync).mockReturnValue(yamlContent);

            const result = detectPrettierConfig();

            expect(result?.tabWidth).toBe(2);
            expect(result?.printWidth).toBe(80);
            expect(result).not.toHaveProperty("arrowParens");
        });

        it("should handle negative tabWidth", () => {
            const config = { tabWidth: -1 };

            const result = getPrettierIndentSize(config);

            expect(result).toBe(-1);
        });

        it("should handle very large tabWidth", () => {
            const config = { tabWidth: 9999 };

            const result = getPrettierIndentSize(config);

            expect(result).toBe(9999);
        });
    });
});
