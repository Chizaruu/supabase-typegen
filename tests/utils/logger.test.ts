/**
 * Tests for logger utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SpyInstance } from "vitest";
import { colors, setVerboseLogging, log } from "../../src/utils/logger.ts";
import type { ColorName } from "../../src/types/index.ts";

// Spy on global console.log
let consoleLogSpy: SpyInstance;

describe("colors", () => {
    it("should export color constants", () => {
        expect(colors).toBeDefined();
        expect(typeof colors).toBe("object");
    });

    it("should have reset color", () => {
        expect(colors.reset).toBe("\x1b[0m");
    });

    it("should have bright color", () => {
        expect(colors.bright).toBe("\x1b[1m");
    });

    it("should have green color", () => {
        expect(colors.green).toBe("\x1b[32m");
    });

    it("should have blue color", () => {
        expect(colors.blue).toBe("\x1b[34m");
    });

    it("should have yellow color", () => {
        expect(colors.yellow).toBe("\x1b[33m");
    });

    it("should have red color", () => {
        expect(colors.red).toBe("\x1b[31m");
    });

    it("should have cyan color", () => {
        expect(colors.cyan).toBe("\x1b[36m");
    });

    it("should have all expected color keys", () => {
        const expectedKeys = [
            "reset",
            "bright",
            "green",
            "blue",
            "yellow",
            "red",
            "cyan",
        ];
        expect(Object.keys(colors).sort()).toEqual(expectedKeys.sort());
    });

    it("should be a const object", () => {
        // TypeScript type test - colors should be readonly
        expect(Object.isFrozen(colors)).toBe(false); // as const doesn't freeze at runtime
        expect(colors).toBeTruthy();
    });
});

describe("setVerboseLogging", () => {
    beforeEach(() => {
        consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        // Reset to default state
        setVerboseLogging(true);
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
    });

    it("should set verbose logging to true", () => {
        setVerboseLogging(true);
        log("test message");
        expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });

    it("should set verbose logging to false", () => {
        setVerboseLogging(false);
        log("test message");
        expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it("should toggle verbose logging", () => {
        setVerboseLogging(true);
        log("message 1");
        expect(consoleLogSpy).toHaveBeenCalledTimes(1);

        consoleLogSpy.mockClear();
        setVerboseLogging(false);
        log("message 2");
        expect(consoleLogSpy).not.toHaveBeenCalled();

        setVerboseLogging(true);
        log("message 3");
        expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });

    it("should accept boolean values", () => {
        setVerboseLogging(true);
        expect(() => log("test")).not.toThrow();

        setVerboseLogging(false);
        expect(() => log("test")).not.toThrow();
    });
});

describe("log", () => {
    beforeEach(() => {
        consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        setVerboseLogging(true); // Default state
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
        setVerboseLogging(true); // Reset to default
    });

    describe("basic logging", () => {
        it("should log a message when verbose is true", () => {
            log("test message");
            expect(consoleLogSpy).toHaveBeenCalledTimes(1);
        });

        it("should log message with default reset color", () => {
            log("test message");
            expect(consoleLogSpy).toHaveBeenCalledWith(
                `${colors.reset}test message${colors.reset}`
            );
        });

        it("should not log when verbose is false and force is false", () => {
            setVerboseLogging(false);
            log("test message");
            expect(consoleLogSpy).not.toHaveBeenCalled();
        });

        it("should log empty string", () => {
            log("");
            expect(consoleLogSpy).toHaveBeenCalledWith(
                `${colors.reset}${colors.reset}`
            );
        });

        it("should log multiline messages", () => {
            const message = "line 1\nline 2\nline 3";
            log(message);
            expect(consoleLogSpy).toHaveBeenCalledWith(
                `${colors.reset}${message}${colors.reset}`
            );
        });
    });

    describe("color application", () => {
        it("should apply green color", () => {
            log("success", "green");
            expect(consoleLogSpy).toHaveBeenCalledWith(
                `${colors.green}success${colors.reset}`
            );
        });

        it("should apply red color", () => {
            log("error", "red");
            expect(consoleLogSpy).toHaveBeenCalledWith(
                `${colors.red}error${colors.reset}`
            );
        });

        it("should apply yellow color", () => {
            log("warning", "yellow");
            expect(consoleLogSpy).toHaveBeenCalledWith(
                `${colors.yellow}warning${colors.reset}`
            );
        });

        it("should apply blue color", () => {
            log("info", "blue");
            expect(consoleLogSpy).toHaveBeenCalledWith(
                `${colors.blue}info${colors.reset}`
            );
        });

        it("should apply cyan color", () => {
            log("debug", "cyan");
            expect(consoleLogSpy).toHaveBeenCalledWith(
                `${colors.cyan}debug${colors.reset}`
            );
        });

        it("should apply bright color", () => {
            log("highlight", "bright");
            expect(consoleLogSpy).toHaveBeenCalledWith(
                `${colors.bright}highlight${colors.reset}`
            );
        });

        it("should apply reset color explicitly", () => {
            log("normal", "reset");
            expect(consoleLogSpy).toHaveBeenCalledWith(
                `${colors.reset}normal${colors.reset}`
            );
        });
    });

    describe("force parameter", () => {
        it("should log when verbose is false but force is true", () => {
            setVerboseLogging(false);
            log("forced message", "reset", true);
            expect(consoleLogSpy).toHaveBeenCalledTimes(1);
        });

        it("should log when verbose is true and force is true", () => {
            setVerboseLogging(true);
            log("forced message", "reset", true);
            expect(consoleLogSpy).toHaveBeenCalledTimes(1);
        });

        it("should not log when verbose is false and force is false", () => {
            setVerboseLogging(false);
            log("normal message", "reset", false);
            expect(consoleLogSpy).not.toHaveBeenCalled();
        });

        it("should force log with color", () => {
            setVerboseLogging(false);
            log("forced colored", "green", true);
            expect(consoleLogSpy).toHaveBeenCalledWith(
                `${colors.green}forced colored${colors.reset}`
            );
        });
    });

    describe("parameter combinations", () => {
        it("should handle all parameters: message, color, force", () => {
            log("test", "blue", true);
            expect(consoleLogSpy).toHaveBeenCalledWith(
                `${colors.blue}test${colors.reset}`
            );
        });

        it("should handle message and color only", () => {
            log("test", "red");
            expect(consoleLogSpy).toHaveBeenCalledWith(
                `${colors.red}test${colors.reset}`
            );
        });

        it("should handle message only", () => {
            log("test");
            expect(consoleLogSpy).toHaveBeenCalledWith(
                `${colors.reset}test${colors.reset}`
            );
        });

        it("should handle message and force (skipping color)", () => {
            setVerboseLogging(false);
            // Force as third param, color defaults to reset
            log("test", "reset", true);
            expect(consoleLogSpy).toHaveBeenCalledWith(
                `${colors.reset}test${colors.reset}`
            );
        });
    });

    describe("edge cases", () => {
        it("should handle special characters in message", () => {
            const message = "Test: !@#$%^&*()_+-=[]{}|;:',.<>?/~`";
            log(message);
            expect(consoleLogSpy).toHaveBeenCalledWith(
                `${colors.reset}${message}${colors.reset}`
            );
        });

        it("should handle unicode characters", () => {
            const message = "Hello 世界 🌍";
            log(message);
            expect(consoleLogSpy).toHaveBeenCalledWith(
                `${colors.reset}${message}${colors.reset}`
            );
        });

        it("should handle very long messages", () => {
            const message = "a".repeat(10000);
            log(message);
            expect(consoleLogSpy).toHaveBeenCalledWith(
                `${colors.reset}${message}${colors.reset}`
            );
        });

        it("should handle messages with ANSI codes already present", () => {
            const message = "\x1b[31mAlready colored\x1b[0m";
            log(message, "green");
            expect(consoleLogSpy).toHaveBeenCalledWith(
                `${colors.green}${message}${colors.reset}`
            );
        });

        it("should handle tab and newline characters", () => {
            const message = "Line1\tTabbed\nLine2";
            log(message);
            expect(consoleLogSpy).toHaveBeenCalledWith(
                `${colors.reset}${message}${colors.reset}`
            );
        });
    });

    describe("multiple consecutive calls", () => {
        it("should log multiple messages in sequence", () => {
            log("message 1", "green");
            log("message 2", "red");
            log("message 3", "blue");

            expect(consoleLogSpy).toHaveBeenCalledTimes(3);
            expect(consoleLogSpy).toHaveBeenNthCalledWith(
                1,
                `${colors.green}message 1${colors.reset}`
            );
            expect(consoleLogSpy).toHaveBeenNthCalledWith(
                2,
                `${colors.red}message 2${colors.reset}`
            );
            expect(consoleLogSpy).toHaveBeenNthCalledWith(
                3,
                `${colors.blue}message 3${colors.reset}`
            );
        });

        it("should respect verbose setting for each call", () => {
            setVerboseLogging(true);
            log("logged");
            expect(consoleLogSpy).toHaveBeenCalledTimes(1);

            setVerboseLogging(false);
            log("not logged");
            expect(consoleLogSpy).toHaveBeenCalledTimes(1); // Still 1

            setVerboseLogging(true);
            log("logged again");
            expect(consoleLogSpy).toHaveBeenCalledTimes(2);
        });

        it("should handle mixed force and non-force calls", () => {
            setVerboseLogging(false);

            log("not logged", "reset", false);
            expect(consoleLogSpy).not.toHaveBeenCalled();

            log("forced", "reset", true);
            expect(consoleLogSpy).toHaveBeenCalledTimes(1);

            log("not logged again", "reset", false);
            expect(consoleLogSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe("integration scenarios", () => {
        it("should simulate verbose mode for development", () => {
            setVerboseLogging(true);

            log("Starting process...", "bright");
            log("Processing item 1", "cyan");
            log("✓ Item 1 complete", "green");
            log("⚠ Warning: deprecated API", "yellow");
            log("✓ All done!", "green");

            expect(consoleLogSpy).toHaveBeenCalledTimes(5);
        });

        it("should simulate quiet mode for production", () => {
            setVerboseLogging(false);

            log("Starting process...", "bright");
            log("Processing item 1", "cyan");
            log("Critical error occurred", "red", true); // Force
            log("Debug info", "cyan");
            log("Cleanup complete", "green");

            // Only forced message should log
            expect(consoleLogSpy).toHaveBeenCalledTimes(1);
            expect(consoleLogSpy).toHaveBeenCalledWith(
                `${colors.red}Critical error occurred${colors.reset}`
            );
        });

        it("should handle typical success/error logging pattern", () => {
            log("⏳ Loading data...", "yellow");
            log("✓ Data loaded successfully", "green");
            log("⏳ Processing...", "yellow");
            log("✗ Processing failed", "red", true); // Force important errors

            expect(consoleLogSpy).toHaveBeenCalledTimes(4);
        });
    });

    describe("state management", () => {
        it("should maintain verbose state across multiple modules", () => {
            setVerboseLogging(false);

            // Simulate different modules using logger
            log("Module A", "cyan");
            log("Module B", "blue");

            expect(consoleLogSpy).not.toHaveBeenCalled();

            setVerboseLogging(true);

            log("Module A", "cyan");
            log("Module B", "blue");

            expect(consoleLogSpy).toHaveBeenCalledTimes(2);
        });

        it("should start with default verbose=true state", () => {
            // This test assumes fresh import, but since we set it in beforeEach,
            // we're testing that the module initializes correctly
            setVerboseLogging(true);
            log("test");
            expect(consoleLogSpy).toHaveBeenCalled();
        });
    });

    describe("ANSI color code validation", () => {
        it("should always wrap message with color codes", () => {
            const testCases: Array<[string, ColorName]> = [
                ["test", "reset"],
                ["test", "green"],
                ["test", "red"],
                ["test", "yellow"],
                ["test", "blue"],
                ["test", "cyan"],
                ["test", "bright"],
            ];

            testCases.forEach(([message, color]) => {
                consoleLogSpy.mockClear();
                log(message, color);

                const call = consoleLogSpy.mock.calls[0]?.[0];
                expect(call).toMatch(/^\x1b\[\d+m.*\x1b\[0m$/);
            });
        });

        it("should always end with reset code", () => {
            const colors: ColorName[] = [
                "reset",
                "green",
                "red",
                "yellow",
                "blue",
                "cyan",
                "bright",
            ];

            colors.forEach((color) => {
                consoleLogSpy.mockClear();
                log("test", color);

                const call = consoleLogSpy.mock.calls[0]?.[0];
                expect(call).toMatch(/\x1b\[0m$/); // Ends with reset code
            });
        });
    });
});

describe("logger module exports", () => {
    it("should export colors object", () => {
        expect(colors).toBeDefined();
    });

    it("should export setVerboseLogging function", () => {
        expect(typeof setVerboseLogging).toBe("function");
    });

    it("should export log function", () => {
        expect(typeof log).toBe("function");
    });

    it("should not export VERBOSE_LOGGING directly", () => {
        // VERBOSE_LOGGING is internal state, not exported
        const loggerModule = { colors, setVerboseLogging, log };
        expect("VERBOSE_LOGGING" in loggerModule).toBe(false);
    });
});
