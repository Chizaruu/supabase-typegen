/**
 * Tests for composite type generation
 */

import { describe, it, expect } from "vitest";
import { generateCompositeTypes } from "../../src/generators/composite.ts";
import type { CompositeTypeDefinition } from "../../src/types/index.ts";

describe("generateCompositeTypes", () => {
    it("should generate basic composite type", () => {
        const types: CompositeTypeDefinition[] = [
            {
                schema: "public",
                name: "address",
                attributes: [
                    { name: "street", type: "text" },
                    { name: "city", type: "text" },
                ],
            },
        ];

        const result = generateCompositeTypes(types, "preserve", 2);

        expect(result).toContain("address: {");
        expect(result).toContain("street: text");
        expect(result).toContain("city: text");
    });

    it("should apply naming convention to type name", () => {
        const types: CompositeTypeDefinition[] = [
            {
                schema: "public",
                name: "user_address",
                attributes: [{ name: "street", type: "text" }],
            },
        ];

        const result = generateCompositeTypes(types, "PascalCase", 2);

        expect(result).toContain("UserAddress: {");
    });

    it("should apply naming convention to attributes", () => {
        const types: CompositeTypeDefinition[] = [
            {
                schema: "public",
                name: "contact",
                attributes: [{ name: "phone_number", type: "text" }],
            },
        ];

        const result = generateCompositeTypes(types, "camelCase", 2);

        expect(result).toContain("phoneNumber: text");
    });

    it("should handle multiple attributes", () => {
        const types: CompositeTypeDefinition[] = [
            {
                schema: "public",
                name: "person",
                attributes: [
                    { name: "name", type: "text" },
                    { name: "age", type: "integer" },
                    { name: "email", type: "text" },
                ],
            },
        ];

        const result = generateCompositeTypes(types, "preserve", 2);

        expect(result).toContain("name: text");
        expect(result).toContain("age: integer");
        expect(result).toContain("email: text");
    });

    it("should handle custom indentation", () => {
        const types: CompositeTypeDefinition[] = [
            {
                schema: "public",
                name: "test",
                attributes: [{ name: "field", type: "text" }],
            },
        ];

        const result = generateCompositeTypes(types, "preserve", 4);

        expect(result).toContain("    "); // 4 spaces
    });

    it("should return empty string for empty array", () => {
        const result = generateCompositeTypes([], "preserve", 2);

        expect(result).toBe("");
    });

    it("should generate multiple composite types", () => {
        const types: CompositeTypeDefinition[] = [
            {
                schema: "public",
                name: "address",
                attributes: [{ name: "street", type: "text" }],
            },
            {
                schema: "public",
                name: "contact",
                attributes: [{ name: "email", type: "text" }],
            },
        ];

        const result = generateCompositeTypes(types, "preserve", 2);

        expect(result).toContain("address: {");
        expect(result).toContain("contact: {");
    });

    it("should handle types with array attributes", () => {
        const types: CompositeTypeDefinition[] = [
            {
                schema: "public",
                name: "collection",
                attributes: [{ name: "tags", type: "text[]" }],
            },
        ];

        const result = generateCompositeTypes(types, "preserve", 2);

        expect(result).toContain("tags: text[]");
    });

    it("should handle single attribute composite", () => {
        const types: CompositeTypeDefinition[] = [
            {
                schema: "public",
                name: "wrapper",
                attributes: [{ name: "value", type: "integer" }],
            },
        ];

        const result = generateCompositeTypes(types, "preserve", 2);

        expect(result).toContain("wrapper: {");
        expect(result).toContain("value: integer");
    });

    it("should handle snake_case naming", () => {
        const types: CompositeTypeDefinition[] = [
            {
                schema: "public",
                name: "UserData",
                attributes: [{ name: "FirstName", type: "text" }],
            },
        ];

        const result = generateCompositeTypes(types, "snake_case", 2);

        expect(result).toContain("user_data: {");
        expect(result).toContain("first_name: text");
    });

    it("should handle SCREAMING_SNAKE_CASE naming", () => {
        const types: CompositeTypeDefinition[] = [
            {
                schema: "public",
                name: "config_value",
                attributes: [{ name: "setting_name", type: "text" }],
            },
        ];

        const result = generateCompositeTypes(types, "SCREAMING_SNAKE_CASE", 2);

        expect(result).toContain("CONFIG_VALUE: {");
        expect(result).toContain("SETTING_NAME: text");
    });

    it("should preserve original casing when preserve convention is used", () => {
        const types: CompositeTypeDefinition[] = [
            {
                schema: "public",
                name: "MyType",
                attributes: [{ name: "MyField", type: "text" }],
            },
        ];

        const result = generateCompositeTypes(types, "preserve", 2);

        expect(result).toContain("MyType: {");
        expect(result).toContain("MyField: text");
    });

    it("should handle numeric and boolean types", () => {
        const types: CompositeTypeDefinition[] = [
            {
                schema: "public",
                name: "stats",
                attributes: [
                    { name: "count", type: "integer" },
                    { name: "average", type: "numeric" },
                    { name: "active", type: "boolean" },
                ],
            },
        ];

        const result = generateCompositeTypes(types, "preserve", 2);

        expect(result).toContain("count: integer");
        expect(result).toContain("average: numeric");
        expect(result).toContain("active: boolean");
    });
});
