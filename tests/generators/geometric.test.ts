/**
 * Tests for geometric type generation
 */

import { describe, it, expect } from "vitest";
import { generateGeometricTypes } from "../../src/generators/geometric.ts";

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
});
