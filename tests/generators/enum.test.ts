/**
 * Tests for enum type generation
 */

import { describe, it, expect } from "vitest";
import { generateEnumTypes } from "../../src/generators/enum.js";
import type { EnumDefinition } from "../../src/types/index.js";

describe("generateEnumTypes", () => {
    it("should generate basic enum type", () => {
        const enums: EnumDefinition[] = [
            {
                schema: "public",
                name: "user_role",
                values: ["admin", "user", "guest"],
            },
        ];

        const result = generateEnumTypes(enums, "preserve", 2);

        expect(result).toContain('user_role: "admin" | "user" | "guest"');
    });

    it("should generate multiple enum types", () => {
        const enums: EnumDefinition[] = [
            {
                schema: "public",
                name: "user_role",
                values: ["admin", "user"],
            },
            {
                schema: "public",
                name: "status",
                values: ["active", "inactive"],
            },
        ];

        const result = generateEnumTypes(enums, "preserve", 2);

        expect(result).toContain('user_role: "admin" | "user"');
        expect(result).toContain('status: "active" | "inactive"');
    });

    it("should apply naming convention", () => {
        const enums: EnumDefinition[] = [
            {
                schema: "public",
                name: "user_role",
                values: ["admin", "user"],
            },
        ];

        const result = generateEnumTypes(enums, "PascalCase", 2);

        expect(result).toContain('UserRole: "admin" | "user"');
    });

    it("should apply camelCase naming", () => {
        const enums: EnumDefinition[] = [
            {
                schema: "public",
                name: "user_role",
                values: ["admin", "user"],
            },
        ];

        const result = generateEnumTypes(enums, "camelCase", 2);

        expect(result).toContain('userRole: "admin" | "user"');
    });

    it("should handle custom indentation", () => {
        const enums: EnumDefinition[] = [
            {
                schema: "public",
                name: "status",
                values: ["active"],
            },
        ];

        const result4 = generateEnumTypes(enums, "preserve", 4);
        const result2 = generateEnumTypes(enums, "preserve", 2);

        expect(result4).toContain("    "); // 4 spaces
        expect(result2).toContain("  "); // 2 spaces
    });

    it("should return empty string for empty array", () => {
        const result = generateEnumTypes([], "preserve", 2);

        expect(result).toBe("");
    });

    it("should handle single value enum", () => {
        const enums: EnumDefinition[] = [
            {
                schema: "public",
                name: "singleton",
                values: ["only"],
            },
        ];

        const result = generateEnumTypes(enums, "preserve", 2);

        expect(result).toContain('singleton: "only"');
    });

    it("should handle enum with many values", () => {
        const enums: EnumDefinition[] = [
            {
                schema: "public",
                name: "day",
                values: [
                    "monday",
                    "tuesday",
                    "wednesday",
                    "thursday",
                    "friday",
                    "saturday",
                    "sunday",
                ],
            },
        ];

        const result = generateEnumTypes(enums, "preserve", 2);

        expect(result).toContain("day:");
        expect(result).toContain('"monday"');
        expect(result).toContain('"sunday"');
    });

    it("should handle values with spaces", () => {
        const enums: EnumDefinition[] = [
            {
                schema: "public",
                name: "priority",
                values: ["very high", "high", "medium", "low"],
            },
        ];

        const result = generateEnumTypes(enums, "preserve", 2);

        expect(result).toContain('"very high"');
    });

    it("should handle values with special characters", () => {
        const enums: EnumDefinition[] = [
            {
                schema: "public",
                name: "category",
                values: ["books & media", "food & drink"],
            },
        ];

        const result = generateEnumTypes(enums, "preserve", 2);

        expect(result).toContain('"books & media"');
    });

    it("should handle SCREAMING_SNAKE_CASE naming", () => {
        const enums: EnumDefinition[] = [
            {
                schema: "public",
                name: "user_role",
                values: ["admin"],
            },
        ];

        const result = generateEnumTypes(enums, "SCREAMING_SNAKE_CASE", 2);

        expect(result).toContain("USER_ROLE:");
    });

    it("should generate proper TypeScript union syntax", () => {
        const enums: EnumDefinition[] = [
            {
                schema: "public",
                name: "color",
                values: ["red", "green", "blue"],
            },
        ];

        const result = generateEnumTypes(enums, "preserve", 2);

        expect(result).toMatch(/color: "red" \| "green" \| "blue"/);
    });
});
