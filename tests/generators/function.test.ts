/**
 * Tests for function type generation
 */

import { describe, it, expect } from "vitest";
import { generateFunctionTypes } from "../../src/generators/function.ts";
import type { FunctionDefinition } from "../../src/types/index.ts";

describe("generateFunctionTypes", () => {
    it("should generate function with no args", () => {
        const functions: FunctionDefinition[] = [
            {
                schema: "public",
                name: "get_timestamp",
                args: [],
                returns: "timestamp",
            },
        ];

        const result = generateFunctionTypes(functions, "preserve", 2);

        expect(result).toContain(
            "get_timestamp: { Args: never; Returns: string }"
        );
    });

    it("should generate function with single arg", () => {
        const functions: FunctionDefinition[] = [
            {
                schema: "public",
                name: "get_user",
                args: [{ name: "user_id", type: "uuid", hasDefault: false }],
                returns: "users",
            },
        ];

        const result = generateFunctionTypes(functions, "preserve", 2);

        expect(result).toContain("get_user:");
        expect(result).toContain("user_id: string");
    });

    it("should generate function with multiple args", () => {
        const functions: FunctionDefinition[] = [
            {
                schema: "public",
                name: "calculate_total",
                args: [
                    { name: "quantity", type: "integer", hasDefault: false },
                    { name: "price", type: "numeric", hasDefault: false },
                ],
                returns: "numeric",
            },
        ];

        const result = generateFunctionTypes(functions, "preserve", 2);

        expect(result).toContain("quantity: number");
        expect(result).toContain("price: number");
        expect(result).toContain("Returns: number");
    });

    it("should mark args with defaults as optional", () => {
        const functions: FunctionDefinition[] = [
            {
                schema: "public",
                name: "greet",
                args: [{ name: "name", type: "text", hasDefault: true }],
                returns: "text",
            },
        ];

        const result = generateFunctionTypes(functions, "preserve", 2);

        expect(result).toContain("name?: string");
    });

    it("should apply naming convention to function name", () => {
        const functions: FunctionDefinition[] = [
            {
                schema: "public",
                name: "get_user_count",
                args: [],
                returns: "integer",
            },
        ];

        const result = generateFunctionTypes(functions, "PascalCase", 2);

        expect(result).toContain("GetUserCount:");
    });

    it("should apply naming convention to args", () => {
        const functions: FunctionDefinition[] = [
            {
                schema: "public",
                name: "test",
                args: [{ name: "user_id", type: "uuid", hasDefault: false }],
                returns: "boolean",
            },
        ];

        const result = generateFunctionTypes(functions, "camelCase", 2);

        expect(result).toContain("userId: string");
    });

    it("should handle array return types", () => {
        const functions: FunctionDefinition[] = [
            {
                schema: "public",
                name: "get_tags",
                args: [],
                returns: "text[]",
            },
        ];

        const result = generateFunctionTypes(functions, "preserve", 2);

        // The generator maps text[] to unknown[] in returns
        expect(result).toContain("Returns: unknown[]");
    });

    it("should handle enum args", () => {
        const functions: FunctionDefinition[] = [
            {
                schema: "public",
                name: "filter_by_role",
                args: [{ name: "role", type: "user_role", hasDefault: false }],
                returns: "users[]",
            },
        ];

        const enums = new Set(["user_role"]);
        const result = generateFunctionTypes(functions, "preserve", 2, enums);

        expect(result).toContain('Database["public"]["Enums"]["user_role"]');
    });

    it("should sort args alphabetically when enabled", () => {
        const functions: FunctionDefinition[] = [
            {
                schema: "public",
                name: "test",
                args: [
                    { name: "zebra", type: "text", hasDefault: false },
                    { name: "apple", type: "text", hasDefault: false },
                ],
                returns: "void",
            },
        ];

        const result = generateFunctionTypes(
            functions,
            "preserve",
            2,
            new Set(),
            "public",
            false,
            true
        );

        // When alphabetical sorting is enabled, 'apple' should come before 'zebra'
        const appleIndex = result.indexOf("apple:");
        const zebraIndex = result.indexOf("zebra:");
        expect(appleIndex).toBeLessThan(zebraIndex);
    });

    it("should handle custom indentation", () => {
        const functions: FunctionDefinition[] = [
            {
                schema: "public",
                name: "test",
                args: [{ name: "arg", type: "text", hasDefault: false }],
                returns: "void",
            },
        ];

        const result = generateFunctionTypes(functions, "preserve", 4);

        expect(result).toContain("    "); // 4 spaces
    });

    it("should return empty string for empty array", () => {
        const result = generateFunctionTypes([], "preserve", 2);

        expect(result).toBe("");
    });

    it("should generate multiple functions", () => {
        const functions: FunctionDefinition[] = [
            {
                schema: "public",
                name: "func1",
                args: [],
                returns: "void",
            },
            {
                schema: "public",
                name: "func2",
                args: [],
                returns: "boolean",
            },
        ];

        const result = generateFunctionTypes(functions, "preserve", 2);

        expect(result).toContain("func1:");
        expect(result).toContain("func2:");
    });

    it("should handle void return type", () => {
        const functions: FunctionDefinition[] = [
            {
                schema: "public",
                name: "log_action",
                args: [],
                returns: "void",
            },
        ];

        const result = generateFunctionTypes(functions, "preserve", 2);

        expect(result).toContain("Returns: void");
    });

    it("should handle mixed optional and required args", () => {
        const functions: FunctionDefinition[] = [
            {
                schema: "public",
                name: "create_user",
                args: [
                    { name: "email", type: "text", hasDefault: false },
                    { name: "name", type: "text", hasDefault: true },
                    { name: "age", type: "integer", hasDefault: true },
                ],
                returns: "uuid",
            },
        ];

        const result = generateFunctionTypes(functions, "preserve", 2);

        expect(result).toContain("email: string");
        expect(result).toContain("name?: string");
        expect(result).toContain("age?: number");
    });
});
