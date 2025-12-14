/**
 * Tests for Prettier configuration detection
 *
 * Coverage targets:
 * - detectPrettierConfig: all config file formats and edge cases
 * - getPrettierIndentSize: indent extraction and fallbacks
 * - parseSimpleYaml: YAML parsing (tested indirectly)
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
    let originalCwd: string;

    beforeEach(() => {
        originalCwd = process.cwd();
        vi.clearAllMocks();
        vi.spyOn(logger, "log").mockImplementation(() => {});
        vi.spyOn(process, "cwd").mockReturnValue("/home/project");
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("detectPrettierConfig", () => {
        describe("JSON config files", () => {
            it("should detect .prettierrc.json", () => {
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
                    expect.stringContaining(".prettierrc.json"),
                    "cyan"
                );
            });

            it("should detect .prettierrc (JSON format)", () => {
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
                    expect.stringContaining(".prettierrc"),
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
            it("should detect .prettierrc.yaml with tabWidth", () => {
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
                expect(result?.semi).toBe(true);
                expect(result?.singleQuote).toBe(false);
                expect(logger.log).toHaveBeenCalledWith(
                    expect.stringContaining(".prettierrc.yaml"),
                    "cyan"
                );
            });

            it("should detect .prettierrc.yml", () => {
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
            });

            it("should parse YAML with comments", () => {
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

            it("should parse YAML with trailingComma", () => {
                const yamlContent = `
tabWidth: 2
trailingComma: "es5"
                `.trim();

                vi.mocked(fs.existsSync).mockImplementation((path) => {
                    return path.toString().endsWith(".prettierrc.yaml");
                });
                vi.mocked(fs.readFileSync).mockReturnValue(yamlContent);

                const result = detectPrettierConfig();

                expect(result?.trailingComma).toBe("es5");
            });

            it("should parse YAML with printWidth", () => {
                const yamlContent = `
printWidth: 100
tabWidth: 4
                `.trim();

                vi.mocked(fs.existsSync).mockImplementation((path) => {
                    return path.toString().endsWith(".prettierrc.yaml");
                });
                vi.mocked(fs.readFileSync).mockReturnValue(yamlContent);

                const result = detectPrettierConfig();

                expect(result?.printWidth).toBe(100);
                expect(result?.tabWidth).toBe(4);
            });

            it("should parse YAML with useTabs true", () => {
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
            });

            it("should handle empty YAML file", () => {
                vi.mocked(fs.existsSync).mockImplementation((path) => {
                    return path.toString().endsWith(".prettierrc.yaml");
                });
                vi.mocked(fs.readFileSync).mockReturnValue("");

                const result = detectPrettierConfig();

                expect(result).toBeNull();
            });

            it("should handle YAML with only comments", () => {
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

            it("should handle YAML with invalid lines", () => {
                const yamlContent = `
tabWidth: 4
invalid line without colon
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

            it("should parse trailingComma with single quotes", () => {
                const yamlContent = `
trailingComma: 'all'
                `.trim();

                vi.mocked(fs.existsSync).mockImplementation((path) => {
                    return path.toString().endsWith(".prettierrc.yaml");
                });
                vi.mocked(fs.readFileSync).mockReturnValue(yamlContent);

                const result = detectPrettierConfig();

                expect(result?.trailingComma).toBe("all");
            });
        });

        describe("package.json", () => {
            it("should detect prettier config in package.json", () => {
                const packageJson = {
                    name: "my-app",
                    prettier: {
                        tabWidth: 4,
                        semi: false,
                    },
                };

                vi.mocked(fs.existsSync).mockImplementation((path) => {
                    return path.toString().endsWith("package.json");
                });
                vi.mocked(fs.readFileSync).mockReturnValue(
                    JSON.stringify(packageJson)
                );

                const result = detectPrettierConfig();

                expect(result).toEqual(packageJson.prettier);
                expect(logger.log).toHaveBeenCalledWith(
                    expect.stringContaining("package.json"),
                    "cyan"
                );
            });

            it("should return null when package.json has no prettier config", () => {
                const packageJson = {
                    name: "my-app",
                    dependencies: {},
                };

                vi.mocked(fs.existsSync).mockImplementation((path) => {
                    return path.toString().endsWith("package.json");
                });
                vi.mocked(fs.readFileSync).mockReturnValue(
                    JSON.stringify(packageJson)
                );

                const result = detectPrettierConfig();

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
            it("should warn about .prettierrc.ts files", () => {
                vi.mocked(fs.existsSync).mockImplementation((path) => {
                    return path.toString().endsWith(".prettierrc.ts");
                });
                vi.mocked(fs.readFileSync).mockReturnValue("export default {}");

                const result = detectPrettierConfig();

                expect(result).toBeNull();
                expect(logger.log).toHaveBeenCalledWith(
                    expect.stringContaining("cannot parse JS config files"),
                    "yellow"
                );
                expect(logger.log).toHaveBeenCalledWith(
                    expect.stringContaining("Use --indent"),
                    "yellow"
                );
            });

            it("should warn about prettier.config.ts files", () => {
                vi.mocked(fs.existsSync).mockImplementation((path) => {
                    return path.toString().endsWith("prettier.config.ts");
                });
                vi.mocked(fs.readFileSync).mockReturnValue("export default {}");

                const result = detectPrettierConfig();

                expect(result).toBeNull();
                expect(logger.log).toHaveBeenCalledWith(
                    expect.stringContaining("cannot parse JS config files"),
                    "yellow"
                );
            });
        });

        describe("No config found", () => {
            it("should return null when no config files exist", () => {
                vi.mocked(fs.existsSync).mockReturnValue(false);

                const result = detectPrettierConfig();

                expect(result).toBeNull();
            });

            it("should check all possible config paths", () => {
                vi.mocked(fs.existsSync).mockReturnValue(false);

                detectPrettierConfig();

                expect(fs.existsSync).toHaveBeenCalledTimes(7);
            });
        });

        describe("Priority order", () => {
            it("should prioritize .prettierrc over package.json", () => {
                const prettierrcConfig = { tabWidth: 4 };
                const packageJsonConfig = { tabWidth: 2 };

                vi.mocked(fs.existsSync).mockReturnValue(true);
                vi.mocked(fs.readFileSync).mockImplementation((path) => {
                    if (path.toString().endsWith(".prettierrc")) {
                        return JSON.stringify(prettierrcConfig);
                    }
                    return JSON.stringify({
                        name: "my-app",
                        prettier: packageJsonConfig,
                    });
                });

                const result = detectPrettierConfig();

                expect(result?.tabWidth).toBe(4);
            });

            it("should check files in order until one is found", () => {
                vi.mocked(fs.existsSync).mockImplementation((path) => {
                    return path.toString().endsWith(".prettierrc.yaml");
                });
                vi.mocked(fs.readFileSync).mockReturnValue("tabWidth: 4");

                detectPrettierConfig();

                // Should stop checking after finding .prettierrc.yaml
                const calls = (fs.existsSync as any).mock.calls;
                expect(
                    calls.some((call: any) =>
                        call[0].endsWith(".prettierrc.yaml")
                    )
                ).toBe(true);
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
                let callCount = 0;
                vi.mocked(fs.existsSync).mockReturnValue(true);
                vi.mocked(fs.readFileSync).mockImplementation((path) => {
                    callCount++;
                    if (path.toString().endsWith(".prettierrc")) {
                        throw new Error("Error");
                    }
                    return JSON.stringify({ tabWidth: 4 });
                });

                const result = detectPrettierConfig();

                // Should have tried multiple files
                expect(callCount).toBeGreaterThan(1);
            });
        });

        describe("All config properties", () => {
            it("should parse all supported properties from JSON", () => {
                const config = {
                    tabWidth: 4,
                    useTabs: false,
                    semi: true,
                    singleQuote: true,
                    trailingComma: "all",
                    printWidth: 100,
                };

                vi.mocked(fs.existsSync).mockImplementation((path) => {
                    return path.toString().endsWith(".prettierrc.json");
                });
                vi.mocked(fs.readFileSync).mockReturnValue(
                    JSON.stringify(config)
                );

                const result = detectPrettierConfig();

                expect(result).toEqual(config);
            });

            it("should parse all supported properties from YAML", () => {
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
        });
    });

    describe("getPrettierIndentSize", () => {
        it("should return null when config is null", () => {
            const result = getPrettierIndentSize(null);

            expect(result).toBeNull();
        });

        it("should return tabWidth from config", () => {
            const config = { tabWidth: 4 };

            const result = getPrettierIndentSize(config);

            expect(result).toBe(4);
        });

        it("should return 2 when useTabs is true", () => {
            const config = { useTabs: true, tabWidth: 4 };

            const result = getPrettierIndentSize(config);

            expect(result).toBe(2);
            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining("uses tabs"),
                "yellow"
            );
        });

        it("should prioritize useTabs over tabWidth", () => {
            const config = { useTabs: true, tabWidth: 8 };

            const result = getPrettierIndentSize(config);

            expect(result).toBe(2); // Should return 2, not 8
        });

        it("should return null when tabWidth is undefined and useTabs is false", () => {
            const config = { useTabs: false };

            const result = getPrettierIndentSize(config);

            expect(result).toBeNull();
        });

        it("should handle empty config object", () => {
            const config = {};

            const result = getPrettierIndentSize(config);

            expect(result).toBeNull();
        });

        it("should handle config with only tabWidth", () => {
            const config = { tabWidth: 2 };

            const result = getPrettierIndentSize(config);

            expect(result).toBe(2);
        });

        it("should handle config with tabWidth 0", () => {
            const config = { tabWidth: 0 };

            const result = getPrettierIndentSize(config);

            expect(result).toBe(0);
        });

        it("should ignore other config properties", () => {
            const config = {
                tabWidth: 4,
                semi: true,
                singleQuote: true,
                printWidth: 100,
            };

            const result = getPrettierIndentSize(config);

            expect(result).toBe(4);
        });

        it("should handle config with useTabs false explicitly", () => {
            const config = { useTabs: false, tabWidth: 4 };

            const result = getPrettierIndentSize(config);

            expect(result).toBe(4);
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
    });
});
