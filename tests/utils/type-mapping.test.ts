/**
 * Tests for PostgreSQL to TypeScript type mapping
 */

import { describe, it, expect } from "vitest";
import {
    mapPostgresTypeToTypeScript,
    detectGeometricTypes,
} from "../../src/utils/type-mapping.ts";

describe("mapPostgresTypeToTypeScript", () => {
    const schema = "public";
    const noEnums = new Set<string>();

    describe("numeric types", () => {
        it("should map integer types to number", () => {
            expect(
                mapPostgresTypeToTypeScript("integer", false, schema, noEnums)
            ).toBe("number");
            expect(
                mapPostgresTypeToTypeScript("int4", false, schema, noEnums)
            ).toBe("number");
            expect(
                mapPostgresTypeToTypeScript("bigint", false, schema, noEnums)
            ).toBe("number");
            expect(
                mapPostgresTypeToTypeScript("smallint", false, schema, noEnums)
            ).toBe("number");
        });

        it("should map decimal types to number", () => {
            expect(
                mapPostgresTypeToTypeScript("decimal", false, schema, noEnums)
            ).toBe("number");
            expect(
                mapPostgresTypeToTypeScript("numeric", false, schema, noEnums)
            ).toBe("number");
            expect(
                mapPostgresTypeToTypeScript(
                    "numeric(10,2)",
                    false,
                    schema,
                    noEnums
                )
            ).toBe("number");
        });

        it("should map floating point types to number", () => {
            expect(
                mapPostgresTypeToTypeScript("real", false, schema, noEnums)
            ).toBe("number");
            expect(
                mapPostgresTypeToTypeScript(
                    "double precision",
                    false,
                    schema,
                    noEnums
                )
            ).toBe("number");
            expect(
                mapPostgresTypeToTypeScript("float4", false, schema, noEnums)
            ).toBe("number");
            expect(
                mapPostgresTypeToTypeScript("float8", false, schema, noEnums)
            ).toBe("number");
        });
    });

    describe("string types", () => {
        it("should map text types to string", () => {
            expect(
                mapPostgresTypeToTypeScript("text", false, schema, noEnums)
            ).toBe("string");
            expect(
                mapPostgresTypeToTypeScript("varchar", false, schema, noEnums)
            ).toBe("string");
            expect(
                mapPostgresTypeToTypeScript(
                    "character varying",
                    false,
                    schema,
                    noEnums
                )
            ).toBe("string");
            expect(
                mapPostgresTypeToTypeScript(
                    "character varying(255)",
                    false,
                    schema,
                    noEnums
                )
            ).toBe("string");
            expect(
                mapPostgresTypeToTypeScript("char", false, schema, noEnums)
            ).toBe("string");
        });

        it("should map uuid to string", () => {
            expect(
                mapPostgresTypeToTypeScript("uuid", false, schema, noEnums)
            ).toBe("string");
        });
    });

    describe("boolean types", () => {
        it("should map boolean types to boolean", () => {
            expect(
                mapPostgresTypeToTypeScript("boolean", false, schema, noEnums)
            ).toBe("boolean");
            expect(
                mapPostgresTypeToTypeScript("bool", false, schema, noEnums)
            ).toBe("boolean");
        });
    });

    describe("date/time types", () => {
        it("should map timestamp types to string", () => {
            expect(
                mapPostgresTypeToTypeScript("timestamp", false, schema, noEnums)
            ).toBe("string");
            expect(
                mapPostgresTypeToTypeScript(
                    "timestamp with time zone",
                    false,
                    schema,
                    noEnums
                )
            ).toBe("string");
            expect(
                mapPostgresTypeToTypeScript(
                    "timestamp without time zone",
                    false,
                    schema,
                    noEnums
                )
            ).toBe("string");
            expect(
                mapPostgresTypeToTypeScript(
                    "timestamptz",
                    false,
                    schema,
                    noEnums
                )
            ).toBe("string");
        });

        it("should map date and time types to string", () => {
            expect(
                mapPostgresTypeToTypeScript("date", false, schema, noEnums)
            ).toBe("string");
            expect(
                mapPostgresTypeToTypeScript("time", false, schema, noEnums)
            ).toBe("string");
            expect(
                mapPostgresTypeToTypeScript("interval", false, schema, noEnums)
            ).toBe("string");
        });
    });

    describe("json types", () => {
        it("should map json types to Json", () => {
            expect(
                mapPostgresTypeToTypeScript("json", false, schema, noEnums)
            ).toBe("Json");
            expect(
                mapPostgresTypeToTypeScript("jsonb", false, schema, noEnums)
            ).toBe("Json");
        });
    });

    describe("array types", () => {
        it("should add array notation for array types", () => {
            expect(
                mapPostgresTypeToTypeScript("integer", true, schema, noEnums)
            ).toBe("number[]");
            expect(
                mapPostgresTypeToTypeScript("text", true, schema, noEnums)
            ).toBe("string[]");
            expect(
                mapPostgresTypeToTypeScript("boolean", true, schema, noEnums)
            ).toBe("boolean[]");
        });
    });

    describe("enum types", () => {
        it("should map enum types to Database enum reference", () => {
            const enums = new Set(["user_role", "status"]);
            expect(
                mapPostgresTypeToTypeScript("user_role", false, schema, enums)
            ).toBe('Database["public"]["Enums"]["user_role"]');
            expect(
                mapPostgresTypeToTypeScript("status", false, schema, enums)
            ).toBe('Database["public"]["Enums"]["status"]');
        });

        it("should handle enum arrays", () => {
            const enums = new Set(["user_role"]);
            expect(
                mapPostgresTypeToTypeScript("user_role", true, schema, enums)
            ).toBe('Database["public"]["Enums"]["user_role"][]');
        });
    });

    describe("geometric types", () => {
        it("should map geometric types to string when not using geometric types", () => {
            expect(
                mapPostgresTypeToTypeScript(
                    "point",
                    false,
                    schema,
                    noEnums,
                    false
                )
            ).toBe("string");
            expect(
                mapPostgresTypeToTypeScript(
                    "line",
                    false,
                    schema,
                    noEnums,
                    false
                )
            ).toBe("string");
            expect(
                mapPostgresTypeToTypeScript(
                    "polygon",
                    false,
                    schema,
                    noEnums,
                    false
                )
            ).toBe("string");
        });

        it("should map geometric types to structured types when enabled", () => {
            expect(
                mapPostgresTypeToTypeScript(
                    "point",
                    false,
                    schema,
                    noEnums,
                    true
                )
            ).toBe("Point");
            expect(
                mapPostgresTypeToTypeScript(
                    "line",
                    false,
                    schema,
                    noEnums,
                    true
                )
            ).toBe("Line");
            expect(
                mapPostgresTypeToTypeScript(
                    "polygon",
                    false,
                    schema,
                    noEnums,
                    true
                )
            ).toBe("Polygon");
            expect(
                mapPostgresTypeToTypeScript(
                    "circle",
                    false,
                    schema,
                    noEnums,
                    true
                )
            ).toBe("Circle");
        });
    });

    describe("unknown types", () => {
        it("should map unknown types to unknown", () => {
            expect(
                mapPostgresTypeToTypeScript(
                    "custom_type",
                    false,
                    schema,
                    noEnums
                )
            ).toBe("unknown");
            expect(
                mapPostgresTypeToTypeScript(
                    "weird_type",
                    false,
                    schema,
                    noEnums
                )
            ).toBe("unknown");
        });
    });
});

describe("detectGeometricTypes", () => {
    it("should detect point types", () => {
        const tables = [
            {
                columns: [{ name: "location", type: "point", isArray: false }],
            },
        ];
        const result = detectGeometricTypes(tables as any);
        expect(result.has("point")).toBe(true);
        expect(result.size).toBe(1);
    });

    it("should detect multiple geometric types", () => {
        const tables = [
            {
                columns: [
                    { name: "location", type: "point", isArray: false },
                    { name: "boundary", type: "polygon", isArray: false },
                    { name: "area", type: "circle", isArray: false },
                ],
            },
        ];
        const result = detectGeometricTypes(tables as any);
        expect(result.has("point")).toBe(true);
        expect(result.has("polygon")).toBe(true);
        expect(result.has("circle")).toBe(true);
        expect(result.size).toBe(3);
    });

    it("should ignore non-geometric types", () => {
        const tables = [
            {
                columns: [
                    { name: "name", type: "text", isArray: false },
                    { name: "age", type: "integer", isArray: false },
                ],
            },
        ];
        const result = detectGeometricTypes(tables as any);
        expect(result.size).toBe(0);
    });

    it("should handle types with size specifications", () => {
        const tables = [
            {
                columns: [
                    { name: "location", type: "point(2)", isArray: false },
                ],
            },
        ];
        const result = detectGeometricTypes(tables as any);
        expect(result.has("point")).toBe(true);
    });
});
