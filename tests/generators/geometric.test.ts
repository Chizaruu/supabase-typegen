/**
 * Tests for geometric type generation
 */

import { describe, it, expect } from "vitest";
import { generateGeometricTypes } from "../../src/generators/geometric.js";

describe("generateGeometricTypes", () => {
    it("should generate point type", () => {
        const usedTypes = new Set(["point"]);
        const result = generateGeometricTypes(usedTypes, 2);

        expect(result).toContain("export type Point");
        expect(result).toContain("{ x: number; y: number }");
    });

    it("should generate line type", () => {
        const usedTypes = new Set(["line"]);
        const result = generateGeometricTypes(usedTypes, 2);

        expect(result).toContain("export type Line");
        expect(result).toContain("{ a: number; b: number; c: number }");
    });

    it("should generate line segment type", () => {
        const usedTypes = new Set(["lseg"]);
        const result = generateGeometricTypes(usedTypes, 2);

        expect(result).toContain("export type LineSegment");
        expect(result).toContain("{ p1: Point; p2: Point }");
    });

    it("should generate box type", () => {
        const usedTypes = new Set(["box"]);
        const result = generateGeometricTypes(usedTypes, 2);

        expect(result).toContain("export type Box");
        expect(result).toContain("{ upperRight: Point; lowerLeft: Point }");
    });

    it("should generate path type", () => {
        const usedTypes = new Set(["path"]);
        const result = generateGeometricTypes(usedTypes, 2);

        expect(result).toContain("export type Path");
        expect(result).toContain("{ points: Point[]; open: boolean }");
    });

    it("should generate polygon type", () => {
        const usedTypes = new Set(["polygon"]);
        const result = generateGeometricTypes(usedTypes, 2);

        expect(result).toContain("export type Polygon");
        expect(result).toContain("{ points: Point[] }");
    });

    it("should generate circle type", () => {
        const usedTypes = new Set(["circle"]);
        const result = generateGeometricTypes(usedTypes, 2);

        expect(result).toContain("export type Circle");
        expect(result).toContain("{ center: Point; radius: number }");
    });

    it("should generate multiple geometric types", () => {
        const usedTypes = new Set(["point", "line", "circle"]);
        const result = generateGeometricTypes(usedTypes, 2);

        expect(result).toContain("export type Point");
        expect(result).toContain("export type Line");
        expect(result).toContain("export type Circle");
    });

    it("should return empty string for empty set", () => {
        const usedTypes = new Set<string>();
        const result = generateGeometricTypes(usedTypes, 2);

        expect(result).toBe("");
    });

    it("should include header comment", () => {
        const usedTypes = new Set(["point"]);
        const result = generateGeometricTypes(usedTypes, 2);

        expect(result).toContain("// Geometric Type Definitions");
        expect(result).toContain("// PostgreSQL geometric types");
    });

    it("should include string fallback in all types", () => {
        const usedTypes = new Set(["point", "circle"]);
        const result = generateGeometricTypes(usedTypes, 2);

        expect(result).toContain("| string");
    });

    it("should generate all geometric types when all are used", () => {
        const usedTypes = new Set([
            "point",
            "line",
            "lseg",
            "box",
            "path",
            "polygon",
            "circle",
        ]);
        const result = generateGeometricTypes(usedTypes, 2);

        expect(result).toContain("export type Point");
        expect(result).toContain("export type Line");
        expect(result).toContain("export type LineSegment");
        expect(result).toContain("export type Box");
        expect(result).toContain("export type Path");
        expect(result).toContain("export type Polygon");
        expect(result).toContain("export type Circle");
    });

    it("should not generate types not in the set", () => {
        const usedTypes = new Set(["point"]);
        const result = generateGeometricTypes(usedTypes, 2);

        expect(result).not.toContain("export type Line");
        expect(result).not.toContain("export type Circle");
    });

    it("should handle indentation parameter", () => {
        const usedTypes = new Set(["point"]);
        const result = generateGeometricTypes(usedTypes, 4);

        expect(result).toContain("export type Point");
    });

    it("should maintain proper TypeScript syntax", () => {
        const usedTypes = new Set(["point", "circle"]);
        const result = generateGeometricTypes(usedTypes, 2);

        // Check for proper TypeScript syntax
        expect(result).toMatch(/export type \w+ = /);
        expect(result).toMatch(/{ .+ } \| string/);
    });

    // ========================================================================
    // NEW TESTS FOR IMPROVED COVERAGE
    // ========================================================================

    it("should return empty string when set contains only unrecognized types", () => {
        const usedTypes = new Set(["unknown", "invalid", "notageometrictype"]);
        const result = generateGeometricTypes(usedTypes, 2);

        expect(result).toBe("");
    });

    it("should ignore unrecognized types and only generate valid ones", () => {
        const usedTypes = new Set(["point", "unknown", "circle", "invalid"]);
        const result = generateGeometricTypes(usedTypes, 2);

        expect(result).toContain("export type Point");
        expect(result).toContain("export type Circle");
        expect(result).not.toContain("unknown");
        expect(result).not.toContain("invalid");
    });

    it("should handle case-sensitive type names", () => {
        const usedTypes = new Set(["Point", "CIRCLE", "Line"]);
        const result = generateGeometricTypes(usedTypes, 2);

        // Should not match uppercase versions
        expect(result).toBe("");
    });

    it("should use default indentation when not specified", () => {
        const usedTypes = new Set(["point"]);
        const result = generateGeometricTypes(usedTypes);

        expect(result).toContain("export type Point");
        expect(result).toContain("{ x: number; y: number }");
    });

    it("should handle indentation of 0", () => {
        const usedTypes = new Set(["point"]);
        const result = generateGeometricTypes(usedTypes, 0);

        expect(result).toContain("export type Point");
    });

    it("should handle large indentation values", () => {
        const usedTypes = new Set(["point"]);
        const result = generateGeometricTypes(usedTypes, 8);

        expect(result).toContain("export type Point");
    });

    it("should generate types in consistent order", () => {
        // Test order consistency - types should appear in the order checked in the code
        const usedTypes = new Set([
            "circle",
            "point",
            "polygon",
            "line",
            "box",
            "lseg",
            "path",
        ]);
        const result = generateGeometricTypes(usedTypes, 2);

        const pointIndex = result.indexOf("export type Point");
        const lineIndex = result.indexOf("export type Line");
        const lsegIndex = result.indexOf("export type LineSegment");
        const boxIndex = result.indexOf("export type Box");
        const pathIndex = result.indexOf("export type Path");
        const polygonIndex = result.indexOf("export type Polygon");
        const circleIndex = result.indexOf("export type Circle");

        // Verify order based on code structure: point, line, lseg, box, path, polygon, circle
        expect(pointIndex).toBeLessThan(lineIndex);
        expect(lineIndex).toBeLessThan(lsegIndex);
        expect(lsegIndex).toBeLessThan(boxIndex);
        expect(boxIndex).toBeLessThan(pathIndex);
        expect(pathIndex).toBeLessThan(polygonIndex);
        expect(polygonIndex).toBeLessThan(circleIndex);
    });

    it("should have proper header with equals signs", () => {
        const usedTypes = new Set(["point"]);
        const result = generateGeometricTypes(usedTypes, 2);

        expect(result).toContain(
            "// ============================================================================"
        );
        expect(result).toContain("// Geometric Type Definitions");
    });

    it("should end with double newline", () => {
        const usedTypes = new Set(["point"]);
        const result = generateGeometricTypes(usedTypes, 2);

        expect(result).toMatch(/\n\n$/);
    });

    it("should have newlines between type definitions", () => {
        const usedTypes = new Set(["point", "line"]);
        const result = generateGeometricTypes(usedTypes, 2);

        const lines = result.split("\n");
        const pointLine = lines.find((l) => l.includes("export type Point"));
        const lineLine = lines.find((l) => l.includes("export type Line"));

        expect(pointLine).toBeDefined();
        expect(lineLine).toBeDefined();
    });

    it("should not include trailing spaces in type definitions", () => {
        const usedTypes = new Set(["point", "circle"]);
        const result = generateGeometricTypes(usedTypes, 2);

        const lines = result.split("\n");
        const typeLines = lines.filter((l) => l.includes("export type"));

        typeLines.forEach((line) => {
            expect(line).not.toMatch(/\s+$/);
        });
    });

    it("should handle single type with all formatting", () => {
        const usedTypes = new Set(["polygon"]);
        const result = generateGeometricTypes(usedTypes, 2);

        expect(result).toContain(
            "// ============================================================================"
        );
        expect(result).toContain("// Geometric Type Definitions");
        expect(result).toContain(
            "// ============================================================================"
        );
        expect(result).toContain("// PostgreSQL geometric types");
        expect(result).toContain(
            "export type Polygon = { points: Point[] } | string"
        );
        expect(result).toMatch(/\n\n$/);
    });

    it("should handle type names with mixed valid and empty strings", () => {
        const usedTypes = new Set(["point", "", "circle"]);
        const result = generateGeometricTypes(usedTypes, 2);

        expect(result).toContain("export type Point");
        expect(result).toContain("export type Circle");
    });

    it("should handle only box and path types together", () => {
        const usedTypes = new Set(["box", "path"]);
        const result = generateGeometricTypes(usedTypes, 2);

        expect(result).toContain("export type Box");
        expect(result).toContain("export type Path");
        expect(result).not.toContain("export type Point");
        expect(result).not.toContain("export type Circle");
    });

    it("should verify exact Point type definition format", () => {
        const usedTypes = new Set(["point"]);
        const result = generateGeometricTypes(usedTypes, 2);

        expect(result).toContain(
            "export type Point = { x: number; y: number } | string"
        );
    });

    it("should verify exact Line type definition format", () => {
        const usedTypes = new Set(["line"]);
        const result = generateGeometricTypes(usedTypes, 2);

        expect(result).toContain(
            "export type Line = { a: number; b: number; c: number } | string"
        );
    });

    it("should verify exact LineSegment type definition format", () => {
        const usedTypes = new Set(["lseg"]);
        const result = generateGeometricTypes(usedTypes, 2);

        expect(result).toContain(
            "export type LineSegment = { p1: Point; p2: Point } | string"
        );
    });

    it("should verify exact Box type definition format", () => {
        const usedTypes = new Set(["box"]);
        const result = generateGeometricTypes(usedTypes, 2);

        expect(result).toContain(
            "export type Box = { upperRight: Point; lowerLeft: Point } | string"
        );
    });

    it("should verify exact Path type definition format", () => {
        const usedTypes = new Set(["path"]);
        const result = generateGeometricTypes(usedTypes, 2);

        expect(result).toContain(
            "export type Path = { points: Point[]; open: boolean } | string"
        );
    });

    it("should verify exact Polygon type definition format", () => {
        const usedTypes = new Set(["polygon"]);
        const result = generateGeometricTypes(usedTypes, 2);

        expect(result).toContain(
            "export type Polygon = { points: Point[] } | string"
        );
    });

    it("should verify exact Circle type definition format", () => {
        const usedTypes = new Set(["circle"]);
        const result = generateGeometricTypes(usedTypes, 2);

        expect(result).toContain(
            "export type Circle = { center: Point; radius: number } | string"
        );
    });

    it("should handle whitespace in type names", () => {
        const usedTypes = new Set([" point ", "  circle  "]);
        const result = generateGeometricTypes(usedTypes, 2);

        // Whitespace should prevent matching
        expect(result).toBe("");
    });

    it("should not generate duplicate types even if added multiple times to set", () => {
        // Sets naturally deduplicate, but testing the behavior
        const usedTypes = new Set(["point"]);
        usedTypes.add("point");
        usedTypes.add("point");
        const result = generateGeometricTypes(usedTypes, 2);

        const matches = result.match(/export type Point/g);
        expect(matches?.length).toBe(1);
    });

    it("should handle lseg and line together without conflicts", () => {
        const usedTypes = new Set(["lseg", "line"]);
        const result = generateGeometricTypes(usedTypes, 2);

        expect(result).toContain("export type Line =");
        expect(result).toContain("export type LineSegment =");
        expect(result).not.toContain("export type Lseg");
    });

    it("should return proper structure with exactly 7 types", () => {
        const usedTypes = new Set([
            "point",
            "line",
            "lseg",
            "box",
            "path",
            "polygon",
            "circle",
        ]);
        const result = generateGeometricTypes(usedTypes, 2);

        const exportTypeMatches = result.match(/export type/g);
        expect(exportTypeMatches?.length).toBe(7);
    });

    it("should handle numeric strings in type names", () => {
        const usedTypes = new Set(["point123", "123point", "point"]);
        const result = generateGeometricTypes(usedTypes, 2);

        expect(result).toContain("export type Point");
        expect(result).not.toContain("point123");
        expect(result).not.toContain("123point");
    });

    it("should handle special characters in type names", () => {
        const usedTypes = new Set(["point!", "point-line", "point_type"]);
        const result = generateGeometricTypes(usedTypes, 2);

        // Should not match any of these
        expect(result).toBe("");
    });
});
