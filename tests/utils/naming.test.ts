/**
 * Tests for naming convention utilities
 */

import { describe, it, expect } from "vitest";
import { convertCase } from "../../src/utils/naming.js";

describe("convertCase", () => {
    describe("preserve", () => {
        it("should preserve original naming", () => {
            expect(convertCase("user_name", "preserve")).toBe("user_name");
            expect(convertCase("UserName", "preserve")).toBe("UserName");
            expect(convertCase("userName", "preserve")).toBe("userName");
        });
    });

    describe("PascalCase", () => {
        it("should convert snake_case to PascalCase", () => {
            expect(convertCase("user_name", "PascalCase")).toBe("UserName");
            expect(convertCase("first_name_last_name", "PascalCase")).toBe(
                "FirstNameLastName"
            );
        });

        it("should convert camelCase to PascalCase", () => {
            expect(convertCase("userName", "PascalCase")).toBe("UserName");
            expect(convertCase("firstName", "PascalCase")).toBe("FirstName");
        });

        it("should handle already PascalCase", () => {
            expect(convertCase("UserName", "PascalCase")).toBe("UserName");
        });

        it("should handle SCREAMING_SNAKE_CASE", () => {
            expect(convertCase("USER_NAME", "PascalCase")).toBe("UserName");
        });
    });

    describe("camelCase", () => {
        it("should convert snake_case to camelCase", () => {
            expect(convertCase("user_name", "camelCase")).toBe("userName");
            expect(convertCase("first_name_last_name", "camelCase")).toBe(
                "firstNameLastName"
            );
        });

        it("should convert PascalCase to camelCase", () => {
            expect(convertCase("UserName", "camelCase")).toBe("userName");
            expect(convertCase("FirstName", "camelCase")).toBe("firstName");
        });

        it("should handle already camelCase", () => {
            expect(convertCase("userName", "camelCase")).toBe("userName");
        });
    });

    describe("snake_case", () => {
        it("should convert camelCase to snake_case", () => {
            expect(convertCase("userName", "snake_case")).toBe("user_name");
            expect(convertCase("firstName", "snake_case")).toBe("first_name");
        });

        it("should convert PascalCase to snake_case", () => {
            expect(convertCase("UserName", "snake_case")).toBe("user_name");
            expect(convertCase("FirstName", "snake_case")).toBe("first_name");
        });

        it("should handle already snake_case", () => {
            expect(convertCase("user_name", "snake_case")).toBe("user_name");
        });

        it("should convert SCREAMING_SNAKE_CASE to snake_case", () => {
            expect(convertCase("USER_NAME", "snake_case")).toBe("user_name");
        });
    });

    describe("SCREAMING_SNAKE_CASE", () => {
        it("should convert camelCase to SCREAMING_SNAKE_CASE", () => {
            expect(convertCase("userName", "SCREAMING_SNAKE_CASE")).toBe(
                "USER_NAME"
            );
        });

        it("should convert PascalCase to SCREAMING_SNAKE_CASE", () => {
            expect(convertCase("UserName", "SCREAMING_SNAKE_CASE")).toBe(
                "USER_NAME"
            );
        });

        it("should convert snake_case to SCREAMING_SNAKE_CASE", () => {
            expect(convertCase("user_name", "SCREAMING_SNAKE_CASE")).toBe(
                "USER_NAME"
            );
        });

        it("should handle already SCREAMING_SNAKE_CASE", () => {
            expect(convertCase("USER_NAME", "SCREAMING_SNAKE_CASE")).toBe(
                "USER_NAME"
            );
        });
    });

    describe("edge cases", () => {
        it("should handle single word", () => {
            expect(convertCase("user", "PascalCase")).toBe("User");
            expect(convertCase("user", "camelCase")).toBe("user");
            expect(convertCase("user", "snake_case")).toBe("user");
            expect(convertCase("user", "SCREAMING_SNAKE_CASE")).toBe("USER");
        });

        it("should handle empty string", () => {
            expect(convertCase("", "PascalCase")).toBe("");
            expect(convertCase("", "camelCase")).toBe("");
        });

        it("should handle multiple underscores", () => {
            expect(convertCase("user__name", "PascalCase")).toBe("UserName");
            expect(convertCase("user__name", "camelCase")).toBe("userName");
        });

        it("should return original string for unknown convention (line 38)", () => {
            expect(convertCase("userName", "unknown" as any)).toBe("userName");
            expect(convertCase("user_name", "invalid" as any)).toBe(
                "user_name"
            );
        });
    });
});
