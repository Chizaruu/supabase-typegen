/**
 * Tests for logger utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SpyInstance } from "vitest";
import { colors, setVerboseLogging, log } from "../../src/utils/logger.js";

// Spy on global console.log
let consoleLogSpy: SpyInstance;

describe("colors", () => {
    it("should export color constants", () => {
        expect(colors).toBeDefined();
        expect(typeof colors).toBe("object");
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
});

describe("setVerboseLogging", () => {
    beforeEach(() => {
        consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
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
});

describe("log", () => {
    beforeEach(() => {
        consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        setVerboseLogging(true);
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
        setVerboseLogging(true);
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
    });

    describe("force parameter", () => {
        it("should log when verbose is false but force is true", () => {
            setVerboseLogging(false);
            log("forced message", "reset", true);
            expect(consoleLogSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe("edge cases", () => {
        it("should handle unicode characters", () => {
            const message = "Hello 世界 🌍";
            log(message);
            expect(consoleLogSpy).toHaveBeenCalledWith(
                `${colors.reset}${message}${colors.reset}`
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
});
