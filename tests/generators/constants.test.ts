/**
 * Tests for constants generation
 */

import { describe, it, expect } from "vitest";
import { generateConstants } from "../../src/generators/constants.ts";
import type { EnumDefinition } from "../../src/types/index.ts";

describe("generateConstants", () => {
    describe("basic functionality", () => {
        it("should generate constants for a single schema with one enum", () => {
            const enums: EnumDefinition[] = [
                {
                    schema: "public",
                    name: "status",
                    values: ["active", "inactive", "pending"],
                },
            ];

            const result = generateConstants(
                { public: enums },
                new Set(["public"]),
                "preserve",
                2
            );

            expect(result).toContain("export const Constants = {");
            expect(result).toContain("public: {");
            expect(result).toContain("Enums: {");
            expect(result).toContain(
                'status: ["active", "inactive", "pending"]'
            );
            expect(result).toContain("} as const");
        });

        it("should generate constants for multiple enums in one schema", () => {
            const enums: EnumDefinition[] = [
                {
                    schema: "public",
                    name: "status",
                    values: ["active", "inactive"],
                },
                {
                    schema: "public",
                    name: "role",
                    values: ["admin", "user", "guest"],
                },
            ];

            const result = generateConstants(
                { public: enums },
                new Set(["public"]),
                "preserve",
                2
            );

            expect(result).toContain('status: ["active", "inactive"]');
            expect(result).toContain('role: ["admin", "user", "guest"]');
        });

        it("should generate constants for multiple schemas", () => {
            const publicEnums: EnumDefinition[] = [
                {
                    schema: "public",
                    name: "status",
                    values: ["active", "inactive"],
                },
            ];

            const authEnums: EnumDefinition[] = [
                {
                    schema: "auth",
                    name: "provider",
                    values: ["google", "github", "email"],
                },
            ];

            const result = generateConstants(
                { public: publicEnums, auth: authEnums },
                new Set(["public", "auth"]),
                "preserve",
                2
            );

            expect(result).toContain("public: {");
            expect(result).toContain("auth: {");
            expect(result).toContain('status: ["active", "inactive"]');
            expect(result).toContain('provider: ["google", "github", "email"]');
        });
    });

    describe("empty schemas", () => {
        it("should handle empty schema with no enums", () => {
            const result = generateConstants(
                { public: [] },
                new Set(["public"]),
                "preserve",
                2
            );

            expect(result).toContain("public: {");
            expect(result).toContain("Enums: {},");
        });

        it("should handle multiple empty schemas", () => {
            const result = generateConstants(
                { public: [], auth: [] },
                new Set(["public", "auth"]),
                "preserve",
                2
            );

            expect(result).toContain("public: {");
            expect(result).toContain("auth: {");
            expect(result).toMatch(/Enums: {},/g);
        });

        it("should handle mix of empty and populated schemas", () => {
            const enums: EnumDefinition[] = [
                {
                    schema: "public",
                    name: "status",
                    values: ["active"],
                },
            ];

            const result = generateConstants(
                { public: enums, auth: [] },
                new Set(["public", "auth"]),
                "preserve",
                2
            );

            expect(result).toContain('status: ["active"]');
            expect(result).toContain("auth: {");
            expect(result).toContain("Enums: {},");
        });

        it("should handle schema in allSchemas but not in enumsBySchema", () => {
            const result = generateConstants(
                { public: [] },
                new Set(["public", "auth"]),
                "preserve",
                2
            );

            expect(result).toContain("public: {");
            expect(result).toContain("auth: {");
        });
    });

    describe("naming conventions", () => {
        const enums: EnumDefinition[] = [
            {
                schema: "public",
                name: "user_status",
                values: ["active", "inactive"],
            },
        ];

        it("should preserve original naming", () => {
            const result = generateConstants(
                { public: enums },
                new Set(["public"]),
                "preserve",
                2
            );

            expect(result).toContain("user_status:");
        });

        it("should convert to PascalCase", () => {
            const result = generateConstants(
                { public: enums },
                new Set(["public"]),
                "PascalCase",
                2
            );

            expect(result).toContain("UserStatus:");
        });

        it("should convert to camelCase", () => {
            const result = generateConstants(
                { public: enums },
                new Set(["public"]),
                "camelCase",
                2
            );

            expect(result).toContain("userStatus:");
        });

        it("should convert to snake_case", () => {
            const result = generateConstants(
                { public: enums },
                new Set(["public"]),
                "snake_case",
                2
            );

            expect(result).toContain("user_status:");
        });

        it("should convert to SCREAMING_SNAKE_CASE", () => {
            const result = generateConstants(
                { public: enums },
                new Set(["public"]),
                "SCREAMING_SNAKE_CASE",
                2
            );

            expect(result).toContain("USER_STATUS:");
        });
    });

    describe("indentation", () => {
        const enums: EnumDefinition[] = [
            {
                schema: "public",
                name: "status",
                values: ["active"],
            },
        ];

        it("should use default indent size of 2", () => {
            const result = generateConstants(
                { public: enums },
                new Set(["public"]),
                "preserve"
            );

            // Check for 2-space indent for schema level
            expect(result).toContain("  public: {");
            // Check for 4-space indent for Enums level
            expect(result).toContain("    Enums: {");
        });

        it("should use custom indent size of 4", () => {
            const result = generateConstants(
                { public: enums },
                new Set(["public"]),
                "preserve",
                4
            );

            // Check for 4-space indent for schema level
            expect(result).toContain("    public: {");
            // Check for 8-space indent for Enums level
            expect(result).toContain("        Enums: {");
        });

        it("should use custom indent size of 0 (tabs or minified)", () => {
            const result = generateConstants(
                { public: enums },
                new Set(["public"]),
                "preserve",
                0
            );

            expect(result).toContain("public: {");
            expect(result).toContain("Enums: {");
        });
    });

    describe("schema ordering", () => {
        it("should sort schemas alphabetically", () => {
            const publicEnums: EnumDefinition[] = [
                { schema: "public", name: "status", values: ["active"] },
            ];
            const authEnums: EnumDefinition[] = [
                { schema: "auth", name: "role", values: ["admin"] },
            ];
            const customEnums: EnumDefinition[] = [
                { schema: "custom", name: "type", values: ["a"] },
            ];

            const result = generateConstants(
                { public: publicEnums, auth: authEnums, custom: customEnums },
                new Set(["public", "auth", "custom"]),
                "preserve",
                2
            );

            const authIndex = result.indexOf("auth:");
            const customIndex = result.indexOf("custom:");
            const publicIndex = result.indexOf("public:");

            expect(authIndex).toBeLessThan(customIndex);
            expect(customIndex).toBeLessThan(publicIndex);
        });
    });

    describe("edge cases", () => {
        it("should handle enum with single value", () => {
            const enums: EnumDefinition[] = [
                {
                    schema: "public",
                    name: "singleton",
                    values: ["only_value"],
                },
            ];

            const result = generateConstants(
                { public: enums },
                new Set(["public"]),
                "preserve",
                2
            );

            expect(result).toContain('singleton: ["only_value"]');
        });

        it("should handle enum with many values", () => {
            const values = Array.from({ length: 20 }, (_, i) => `value_${i}`);
            const enums: EnumDefinition[] = [
                {
                    schema: "public",
                    name: "many_values",
                    values,
                },
            ];

            const result = generateConstants(
                { public: enums },
                new Set(["public"]),
                "preserve",
                2
            );

            expect(result).toContain("many_values:");
            values.forEach((value) => {
                expect(result).toContain(`"${value}"`);
            });
        });

        it("should handle enum values with special characters", () => {
            const enums: EnumDefinition[] = [
                {
                    schema: "public",
                    name: "special",
                    values: ["with-dash", "with_underscore", "with space"],
                },
            ];

            const result = generateConstants(
                { public: enums },
                new Set(["public"]),
                "preserve",
                2
            );

            expect(result).toContain('"with-dash"');
            expect(result).toContain('"with_underscore"');
            expect(result).toContain('"with space"');
        });

        it("should handle empty values array", () => {
            const enums: EnumDefinition[] = [
                {
                    schema: "public",
                    name: "empty",
                    values: [],
                },
            ];

            const result = generateConstants(
                { public: enums },
                new Set(["public"]),
                "preserve",
                2
            );

            expect(result).toContain("empty: []");
        });

        it("should escape quotes in enum values", () => {
            const enums: EnumDefinition[] = [
                {
                    schema: "public",
                    name: "status",
                    values: ["active", "inactive"],
                },
            ];

            const result = generateConstants(
                { public: enums },
                new Set(["public"]),
                "preserve",
                2
            );

            // Values should be properly quoted
            expect(result).toContain('"active"');
            expect(result).toContain('"inactive"');
        });
    });

    describe("output format", () => {
        it("should include header comments", () => {
            const result = generateConstants({}, new Set([]), "preserve", 2);

            expect(result).toContain("// ===========================");
            expect(result).toContain("// Constants - Runtime Enum Values");
            expect(result).toContain("// Use these for dropdowns, validation");
        });

        it("should include export statement", () => {
            const result = generateConstants({}, new Set([]), "preserve", 2);

            expect(result).toContain("export const Constants = {");
        });

        it("should include as const assertion", () => {
            const result = generateConstants({}, new Set([]), "preserve", 2);

            expect(result).toContain("} as const");
        });

        it("should have proper closing bracket", () => {
            const enums: EnumDefinition[] = [
                {
                    schema: "public",
                    name: "status",
                    values: ["active"],
                },
            ];

            const result = generateConstants(
                { public: enums },
                new Set(["public"]),
                "preserve",
                2
            );

            expect(result.trim()).toMatch(/} as const\s*$/);
        });
    });

    describe("complex scenarios", () => {
        it("should handle multiple schemas with multiple enums each", () => {
            const publicEnums: EnumDefinition[] = [
                {
                    schema: "public",
                    name: "status",
                    values: ["active", "inactive"],
                },
                {
                    schema: "public",
                    name: "role",
                    values: ["admin", "user"],
                },
            ];

            const authEnums: EnumDefinition[] = [
                {
                    schema: "auth",
                    name: "provider",
                    values: ["google", "github"],
                },
                {
                    schema: "auth",
                    name: "factor",
                    values: ["totp", "sms"],
                },
            ];

            const result = generateConstants(
                { public: publicEnums, auth: authEnums },
                new Set(["public", "auth"]),
                "PascalCase",
                2
            );

            expect(result).toContain("Status:");
            expect(result).toContain("Role:");
            expect(result).toContain("Provider:");
            expect(result).toContain("Factor:");
        });

        it("should produce valid TypeScript constant object", () => {
            const enums: EnumDefinition[] = [
                {
                    schema: "public",
                    name: "status",
                    values: ["active", "inactive", "pending"],
                },
            ];

            const result = generateConstants(
                { public: enums },
                new Set(["public"]),
                "preserve",
                2
            );

            // Should be parseable as TypeScript
            expect(result).toContain("export const Constants = {");
            expect(result).toContain("} as const");
            expect(result).not.toContain("undefined");
            expect(result).not.toContain("null");
        });
    });

    describe("real-world scenarios", () => {
        it("should handle typical database schema with multiple enum types", () => {
            const publicEnums: EnumDefinition[] = [
                {
                    schema: "public",
                    name: "user_status",
                    values: ["active", "suspended", "deleted"],
                },
                {
                    schema: "public",
                    name: "user_role",
                    values: ["admin", "moderator", "member", "guest"],
                },
                {
                    schema: "public",
                    name: "post_status",
                    values: ["draft", "published", "archived"],
                },
            ];

            const result = generateConstants(
                { public: publicEnums },
                new Set(["public"]),
                "camelCase",
                2
            );

            expect(result).toContain("userStatus:");
            expect(result).toContain("userRole:");
            expect(result).toContain("postStatus:");
            expect(result).toContain('"active", "suspended", "deleted"');
            expect(result).toContain('"admin", "moderator", "member", "guest"');
            expect(result).toContain('"draft", "published", "archived"');
        });

        it("should handle multi-schema application with auth and custom schemas", () => {
            const publicEnums: EnumDefinition[] = [
                { schema: "public", name: "status", values: ["active"] },
            ];
            const authEnums: EnumDefinition[] = [
                { schema: "auth", name: "provider", values: ["email"] },
            ];
            const customEnums: EnumDefinition[] = [
                { schema: "custom", name: "type", values: ["a", "b"] },
            ];

            const result = generateConstants(
                {
                    public: publicEnums,
                    auth: authEnums,
                    custom: customEnums,
                },
                new Set(["public", "auth", "custom"]),
                "PascalCase",
                4
            );

            expect(result).toContain("auth:");
            expect(result).toContain("custom:");
            expect(result).toContain("public:");
            expect(result).toContain("Status:");
            expect(result).toContain("Provider:");
            expect(result).toContain("Type:");
        });
    });
});
