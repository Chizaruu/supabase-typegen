/**
 * Tests for JSONB type generation
 */

import { describe, it, expect } from "vitest";
import {
    generateJsonbTypeDefinitions,
    generateMergeDeepStructure,
} from "../../src/generators/jsonb.js";
import type { TypeDefinition } from "../../src/types/index.js";

describe("generateJsonbTypeDefinitions", () => {
    it("should generate basic JSONB type", () => {
        const types: TypeDefinition[] = [
            {
                table: "users",
                column: "preferences",
                name: "UserPreferences",
                typeDefinition: "{ theme: string }",
            },
        ];

        const result = generateJsonbTypeDefinitions(types, true);

        expect(result).toContain(
            "export type UserPreferences = { theme: string }"
        );
    });

    it("should not include comments when disabled", () => {
        const types: TypeDefinition[] = [
            {
                table: "users",
                column: "preferences",
                name: "UserPreferences",
                typeDefinition: "{ theme: string }",
                comment: "User preferences",
            },
        ];

        const result = generateJsonbTypeDefinitions(types, false);

        expect(result).not.toContain("User preferences");
        expect(result).not.toContain("/**");
    });

    it("should include comments when enabled", () => {
        const types: TypeDefinition[] = [
            {
                table: "users",
                column: "preferences",
                name: "UserPreferences",
                typeDefinition: "{ theme: string }",
                comment: "User preferences data",
            },
        ];

        const result = generateJsonbTypeDefinitions(types, true);

        expect(result).toContain("/**");
        expect(result).toContain("* User preferences data");
        expect(result).toContain("*/");
    });

    it("should include example in comment", () => {
        const types: TypeDefinition[] = [
            {
                table: "users",
                column: "preferences",
                name: "UserPreferences",
                typeDefinition: "{ theme: string }",
                comment: "User preferences",
                example: { theme: "dark" },
            },
        ];

        const result = generateJsonbTypeDefinitions(types, true);

        expect(result).toContain("Example:");
        expect(result).toContain("```json");
        expect(result).toContain('"theme": "dark"');
    });

    it("should handle types without table/column", () => {
        const types: TypeDefinition[] = [
            {
                table: "",
                column: "",
                name: "GenericType",
                typeDefinition: "{ value: number }",
            },
        ];

        const result = generateJsonbTypeDefinitions(types, true);

        expect(result).toContain("export type GenericType = { value: number }");
    });

    it("should return empty string for empty array", () => {
        const result = generateJsonbTypeDefinitions([], true);

        expect(result).toBe("");
    });

    it("should generate multiple types", () => {
        const types: TypeDefinition[] = [
            {
                table: "users",
                column: "preferences",
                name: "UserPreferences",
                typeDefinition: "{ theme: string }",
            },
            {
                table: "posts",
                column: "metadata",
                name: "PostMetadata",
                typeDefinition: "{ tags: string[] }",
            },
        ];

        const result = generateJsonbTypeDefinitions(types, true);

        expect(result).toContain("export type UserPreferences");
        expect(result).toContain("export type PostMetadata");
    });

    it("should handle complex nested types", () => {
        const types: TypeDefinition[] = [
            {
                table: "users",
                column: "settings",
                name: "UserSettings",
                typeDefinition:
                    "{ notifications: { email: boolean; sms: boolean } }",
            },
        ];

        const result = generateJsonbTypeDefinitions(types, true);

        expect(result).toContain(
            "notifications: { email: boolean; sms: boolean }"
        );
    });
});

describe("generateMergeDeepStructure", () => {
    it("should generate MergeDeep structure for single type", () => {
        const types: TypeDefinition[] = [
            {
                table: "users",
                column: "preferences",
                name: "UserPreferences",
                typeDefinition: "{ theme: string }",
            },
        ];

        const result = generateMergeDeepStructure(types, "preserve", 2, false);

        expect(result).toContain("users: {");
        expect(result).toContain("Row: {");
        expect(result).toContain("preferences: UserPreferences | null");
    });

    it("should apply naming convention to table and column", () => {
        const types: TypeDefinition[] = [
            {
                table: "user_profiles",
                column: "user_preferences",
                name: "UserPreferences",
                typeDefinition: "{ theme: string }",
            },
        ];

        const result = generateMergeDeepStructure(types, "camelCase", 2, false);

        expect(result).toContain("userProfiles: {");
        expect(result).toContain("userPreferences: UserPreferences | null");
    });

    it("should handle multiple columns in same table", () => {
        const types: TypeDefinition[] = [
            {
                table: "users",
                column: "preferences",
                name: "UserPreferences",
                typeDefinition: "{ theme: string }",
            },
            {
                table: "users",
                column: "settings",
                name: "UserSettings",
                typeDefinition: "{ lang: string }",
            },
        ];

        const result = generateMergeDeepStructure(types, "preserve", 2, false);

        expect(result).toContain("preferences: UserPreferences | null");
        expect(result).toContain("settings: UserSettings | null");
    });

    it("should handle multiple tables", () => {
        const types: TypeDefinition[] = [
            {
                table: "users",
                column: "preferences",
                name: "UserPreferences",
                typeDefinition: "{ theme: string }",
            },
            {
                table: "posts",
                column: "metadata",
                name: "PostMetadata",
                typeDefinition: "{ tags: string[] }",
            },
        ];

        const result = generateMergeDeepStructure(types, "preserve", 2, false);

        expect(result).toContain("users: {");
        expect(result).toContain("posts: {");
    });

    it("should sort alphabetically when enabled", () => {
        const types: TypeDefinition[] = [
            {
                table: "zebra",
                column: "data",
                name: "ZebraData",
                typeDefinition: "{ value: string }",
            },
            {
                table: "alpha",
                column: "data",
                name: "AlphaData",
                typeDefinition: "{ value: string }",
            },
        ];

        const result = generateMergeDeepStructure(types, "preserve", 2, true);

        const alphaIndex = result.indexOf("alpha:");
        const zebraIndex = result.indexOf("zebra:");
        expect(alphaIndex).toBeLessThan(zebraIndex);
    });

    it("should sort columns alphabetically when enabled", () => {
        const types: TypeDefinition[] = [
            {
                table: "users",
                column: "zebra",
                name: "Zebra",
                typeDefinition: "{ value: string }",
            },
            {
                table: "users",
                column: "alpha",
                name: "Alpha",
                typeDefinition: "{ value: string }",
            },
        ];

        const result = generateMergeDeepStructure(types, "preserve", 2, true);

        const alphaIndex = result.indexOf("alpha:");
        const zebraIndex = result.indexOf("zebra:");
        expect(alphaIndex).toBeLessThan(zebraIndex);
    });

    it("should return empty string for empty array", () => {
        const result = generateMergeDeepStructure([], "preserve", 2, false);

        expect(result).toBe("");
    });

    it("should return empty string for types without table", () => {
        const types: TypeDefinition[] = [
            {
                table: "",
                column: "data",
                name: "Data",
                typeDefinition: "{ value: string }",
            },
        ];

        const result = generateMergeDeepStructure(types, "preserve", 2, false);

        expect(result).toBe("");
    });

    it("should handle custom indentation", () => {
        const types: TypeDefinition[] = [
            {
                table: "users",
                column: "preferences",
                name: "UserPreferences",
                typeDefinition: "{ theme: string }",
            },
        ];

        const result = generateMergeDeepStructure(types, "preserve", 4, false);

        expect(result).toContain("    "); // 4 spaces
    });

    it("should handle PascalCase naming", () => {
        const types: TypeDefinition[] = [
            {
                table: "user_profiles",
                column: "user_data",
                name: "UserData",
                typeDefinition: "{ value: string }",
            },
        ];

        const result = generateMergeDeepStructure(
            types,
            "PascalCase",
            2,
            false
        );

        expect(result).toContain("UserProfiles: {");
        expect(result).toContain("UserData: UserData | null");
    });
});
