/**
 * PostgreSQL to TypeScript type mapping
 */

export function mapPostgresTypeToTypeScript(
    pgType: string,
    isArray: boolean,
    schema: string = "public",
    availableEnums: Set<string> = new Set(),
    useGeometricTypes: boolean = false
): string {
    const baseTypeName = pgType
        .toLowerCase()
        .replace(/\([^)]*\)/, "")
        .trim();

    const typeMap: Record<string, string> = {
        smallint: "number",
        integer: "number",
        bigint: "number",
        int2: "number",
        int4: "number",
        int8: "number",
        decimal: "number",
        numeric: "number",
        real: "number",
        "double precision": "number",
        float4: "number",
        float8: "number",
        money: "number",
        smallserial: "number",
        serial: "number",
        bigserial: "number",
        "character varying": "string",
        varchar: "string",
        character: "string",
        char: "string",
        text: "string",
        citext: "string",
        boolean: "boolean",
        bool: "boolean",
        timestamp: "string",
        "timestamp without time zone": "string",
        "timestamp with time zone": "string",
        timestamptz: "string",
        date: "string",
        time: "string",
        "time without time zone": "string",
        "time with time zone": "string",
        timetz: "string",
        interval: "string",
        json: "Json",
        jsonb: "Json",
        uuid: "string",
        bytea: "string",
        inet: "string",
        cidr: "string",
        macaddr: "string",
        macaddr8: "string",
        void: "void",
        trigger: "unknown",
        event_trigger: "unknown",
        record: "unknown",
    };

    const geometricTypeMap: Record<string, string> = {
        point: useGeometricTypes ? "Point" : "string",
        line: useGeometricTypes ? "Line" : "string",
        lseg: useGeometricTypes ? "LineSegment" : "string",
        box: useGeometricTypes ? "Box" : "string",
        path: useGeometricTypes ? "Path" : "string",
        polygon: useGeometricTypes ? "Polygon" : "string",
        circle: useGeometricTypes ? "Circle" : "string",
    };

    let baseType: string;

    if (typeMap[baseTypeName]) {
        baseType = typeMap[baseTypeName];
    } else if (geometricTypeMap[baseTypeName]) {
        baseType = geometricTypeMap[baseTypeName];
    } else if (availableEnums.has(pgType)) {
        baseType = `Database["${schema}"]["Enums"]["${pgType}"]`;
    } else {
        baseType = "unknown";
    }

    return isArray ? `${baseType}[]` : baseType;
}

export function detectGeometricTypes(tables: any[]): Set<string> {
    const geometricTypes = new Set<string>([
        "point",
        "line",
        "lseg",
        "box",
        "path",
        "polygon",
        "circle",
    ]);

    const usedTypes = new Set<string>();

    for (const table of tables) {
        for (const column of table.columns) {
            const baseType = column.type
                .toLowerCase()
                .replace(/\([^)]*\)/, "")
                .trim();
            if (geometricTypes.has(baseType)) {
                usedTypes.add(baseType);
            }
        }
    }

    return usedTypes;
}
