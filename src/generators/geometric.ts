/**
 * Geometric type generation
 */

export function generateGeometricTypes(
    usedTypes: Set<string>,
    indentSize: number = 2
): string {
    if (usedTypes.size === 0) {
        return "";
    }

    const indent = " ".repeat(indentSize);
    const types: string[] = [];

    if (usedTypes.has("point")) {
        types.push(`export type Point = { x: number; y: number } | string`);
    }

    if (usedTypes.has("line")) {
        types.push(
            `export type Line = { a: number; b: number; c: number } | string`
        );
    }

    if (usedTypes.has("lseg")) {
        types.push(
            `export type LineSegment = { p1: Point; p2: Point } | string`
        );
    }

    if (usedTypes.has("box")) {
        types.push(
            `export type Box = { upperRight: Point; lowerLeft: Point } | string`
        );
    }

    if (usedTypes.has("path")) {
        types.push(
            `export type Path = { points: Point[]; open: boolean } | string`
        );
    }

    if (usedTypes.has("polygon")) {
        types.push(`export type Polygon = { points: Point[] } | string`);
    }

    if (usedTypes.has("circle")) {
        types.push(
            `export type Circle = { center: Point; radius: number } | string`
        );
    }

    if (types.length === 0) {
        return "";
    }

    return `// ============================================================================
// Geometric Type Definitions
// ============================================================================
// PostgreSQL geometric types with structured alternatives

${types.join("\n")}

`;
}
