/**
 * JSONB column parsing and type generation
 */

import { readFileSync } from "fs";
import type {
    JsonbColumn,
    TypeDefinition,
    NamingConvention,
} from "../types/index.ts";
import { convertCase } from "../utils/naming.ts";

export function parseJsonbColumns(
    sqlContent: string,
    fileName: string
): JsonbColumn[] {
    const jsonbColumns: JsonbColumn[] = [];

    const createTableMatch = sqlContent.match(
        /create table (?:if not exists )?["']?(\w+)["']?\s*\(([\s\S]*?)\);/i
    );

    if (!createTableMatch) {
        return jsonbColumns;
    }

    const tableName = createTableMatch[1];
    const tableBody = createTableMatch[2];

    const columnPattern = /(\w+)\s+jsonb(?:\s+not null)?\s+default\s+/gi;
    let match: RegExpExecArray | null;

    while ((match = columnPattern.exec(tableBody)) !== null) {
        const columnName = match[1];
        const startPos = match.index + match[0].length;

        let defaultValue = "";

        if (tableBody[startPos] === "'") {
            const endQuote = tableBody.indexOf("'", startPos + 1);
            if (endQuote !== -1) {
                defaultValue = tableBody.substring(startPos, endQuote + 1);
                if (
                    tableBody.substring(endQuote + 1, endQuote + 8) ===
                    "::jsonb"
                ) {
                    defaultValue += "::jsonb";
                }
            }
        } else if (
            tableBody.substring(startPos, startPos + 18).toLowerCase() ===
            "jsonb_build_object"
        ) {
            let depth = 0;
            let inString = false;
            let stringChar: string | null = null;
            let i = startPos;

            while (i < tableBody.length) {
                const char = tableBody[i];

                if (
                    (char === "'" || char === '"') &&
                    (i === 0 || tableBody[i - 1] !== "\\")
                ) {
                    if (!inString) {
                        inString = true;
                        stringChar = char;
                    } else if (char === stringChar) {
                        inString = false;
                        stringChar = null;
                    }
                }

                if (!inString) {
                    if (char === "(") {
                        depth++;
                    }
                    if (char === ")") {
                        depth--;
                        if (depth === 0) {
                            defaultValue = tableBody.substring(startPos, i + 1);
                            break;
                        }
                    }
                }

                i++;
            }
        }

        if (defaultValue) {
            jsonbColumns.push({
                table: tableName,
                column: columnName,
                defaultValue: defaultValue,
                fileName: fileName,
            });
        }
    }

    return jsonbColumns;
}

export function parseJsonbBuildObject(
    sqlValue: string
): Record<string, unknown> | null {
    try {
        const content = sqlValue
            .replace(/^jsonb_build_object\s*\(\s*/i, "")
            .replace(/\s*\)$/, "");

        const parts: string[] = [];
        let current = "";
        let depth = 0;
        let inString = false;
        let stringChar: string | null = null;

        for (let i = 0; i < content.length; i++) {
            const char = content[i];

            if (
                (char === "'" || char === '"') &&
                (i === 0 || content[i - 1] !== "\\")
            ) {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                } else if (char === stringChar) {
                    inString = false;
                    stringChar = null;
                }
            }

            if (!inString) {
                if (char === "(") {
                    depth++;
                }
                if (char === ")") {
                    depth--;
                }

                if (char === "," && depth === 0) {
                    parts.push(current.trim());
                    current = "";
                    continue;
                }
            }

            current += char;
        }

        if (current.trim()) {
            parts.push(current.trim());
        }

        const result: Record<string, unknown> = {};
        for (let i = 0; i < parts.length; i += 2) {
            if (i + 1 >= parts.length) {
                break;
            }

            const key = parts[i].replace(/^['"]|['"]$/g, "");
            let value = parts[i + 1].trim();

            if (value.startsWith("jsonb_build_object(")) {
                result[key] = parseJsonbBuildObject(value);
            } else {
                value = value.replace(/^['"]|['"]$/g, "");
                if (value === "true" || value === "false") {
                    result[key] = value === "true";
                } else if (!isNaN(Number(value)) && value !== "") {
                    result[key] = Number(value);
                } else {
                    result[key] = value;
                }
            }
        }

        return result;
    } catch {
        return null;
    }
}

export function generateTypeName(
    table: string,
    column: string,
    convention: NamingConvention
): string {
    const combined = `${table}_${column}`;
    return convertCase(combined, convention);
}

export function inferTypeFromValue(value: unknown, indent = 0): string {
    const indentStr = "  ".repeat(indent);

    if (value === null || value === undefined) {
        return "unknown";
    }

    if (Array.isArray(value)) {
        if (value.length === 0) {
            return "unknown[]";
        }
        return `${inferTypeFromValue(value[0], indent)}[]`;
    }

    if (typeof value === "object") {
        const entries = Object.entries(value).map(
            ([key, val]) =>
                `${indentStr}  ${key}: ${inferTypeFromValue(val, indent + 1)}`
        );
        return `{\n${entries.join("\n")}\n${indentStr}}`;
    }

    if (typeof value === "string") {
        return "string";
    }
    if (typeof value === "number") {
        return "number";
    }
    if (typeof value === "boolean") {
        return "boolean";
    }

    return "unknown";
}

export function extractNestedTypes(
    value: unknown,
    baseName: string,
    indent = 0,
    convention: NamingConvention = "preserve"
): { typeDefinition: string; nestedTypes: TypeDefinition[] } {
    const nestedTypes: TypeDefinition[] = [];

    if (value === null || value === undefined) {
        return { typeDefinition: "unknown", nestedTypes: [] };
    }

    if (Array.isArray(value)) {
        if (value.length === 0) {
            return { typeDefinition: "unknown[]", nestedTypes: [] };
        }
        const result = extractNestedTypes(
            value[0],
            `${baseName}_item`,
            indent,
            convention
        );
        return {
            typeDefinition: `${result.typeDefinition}[]`,
            nestedTypes: result.nestedTypes,
        };
    }

    if (typeof value === "object") {
        const indentStr = "  ".repeat(indent);
        const entries: string[] = [];

        for (const [key, val] of Object.entries(value)) {
            if (
                val !== null &&
                typeof val === "object" &&
                !Array.isArray(val)
            ) {
                const nestedTypeName = convertCase(
                    `${baseName}_${key}`,
                    convention
                );
                const nestedResult = extractNestedTypes(
                    val,
                    `${baseName}_${key}`,
                    indent + 1,
                    convention
                );

                nestedTypes.push({
                    table: "",
                    column: "",
                    name: nestedTypeName,
                    typeDefinition: nestedResult.typeDefinition,
                    nestedTypes: nestedResult.nestedTypes,
                });

                entries.push(`${indentStr}  ${key}: ${nestedTypeName}`);
            } else {
                const result = extractNestedTypes(
                    val,
                    `${baseName}_${key}`,
                    indent + 1,
                    convention
                );
                entries.push(`${indentStr}  ${key}: ${result.typeDefinition}`);
                nestedTypes.push(...result.nestedTypes);
            }
        }

        return {
            typeDefinition: `{\n${entries.join("\n")}\n${indentStr}}`,
            nestedTypes,
        };
    }

    if (typeof value === "string") {
        return { typeDefinition: "string", nestedTypes: [] };
    }
    if (typeof value === "number") {
        return { typeDefinition: "number", nestedTypes: [] };
    }
    if (typeof value === "boolean") {
        return { typeDefinition: "boolean", nestedTypes: [] };
    }

    return { typeDefinition: "unknown", nestedTypes: [] };
}

export function generateTypeDefinition(
    column: JsonbColumn,
    extractNested: boolean,
    convention: NamingConvention
): TypeDefinition {
    const typeName = generateTypeName(column.table, column.column, convention);

    if (!column.defaultValue) {
        return {
            table: column.table,
            column: column.column,
            name: typeName,
            typeDefinition: "Record<string, unknown>",
            comment: column.comment,
            nestedTypes: [],
        };
    }

    let jsonStructure: Record<string, unknown> | null = null;

    if (column.defaultValue.startsWith("jsonb_build_object")) {
        jsonStructure = parseJsonbBuildObject(column.defaultValue);
    } else if (column.defaultValue.match(/^'.*'::jsonb$/)) {
        try {
            jsonStructure = JSON.parse(
                column.defaultValue.replace(/^'|'::jsonb$/g, "")
            );
        } catch {
            // Failed to parse
        }
    }

    if (!jsonStructure) {
        return {
            table: column.table,
            column: column.column,
            name: typeName,
            typeDefinition: "Record<string, unknown>",
            comment: column.comment,
            nestedTypes: [],
        };
    }

    if (extractNested) {
        const result = extractNestedTypes(
            jsonStructure,
            `${column.table}_${column.column}`,
            0,
            convention
        );
        return {
            table: column.table,
            column: column.column,
            name: typeName,
            typeDefinition: result.typeDefinition,
            comment: column.comment,
            example: jsonStructure,
            nestedTypes: result.nestedTypes,
        };
    }

    return {
        table: column.table,
        column: column.column,
        name: typeName,
        typeDefinition: inferTypeFromValue(jsonStructure),
        comment: column.comment,
        example: jsonStructure,
        nestedTypes: [],
    };
}

export function normalizeTypeDefinition(typeDefinition: string): string {
    return typeDefinition
        .replace(/\s+/g, " ")
        .replace(/\s*([{}:,])\s*/g, "$1")
        .trim();
}

export function flattenTypes(types: TypeDefinition[]): TypeDefinition[] {
    const result: TypeDefinition[] = [];

    for (const type of types) {
        if (type.nestedTypes && type.nestedTypes.length > 0) {
            result.push(...flattenTypes(type.nestedTypes));
        }
        result.push(type);
    }

    return result;
}

export function scanSchemas(
    schemaPaths: string[],
    extractNestedTypes: boolean,
    namingConvention: NamingConvention
): TypeDefinition[] {
    const allColumns: JsonbColumn[] = [];

    for (const schemaPath of schemaPaths) {
        try {
            const content = readFileSync(schemaPath, "utf8");
            const fileName = schemaPath.split("/").pop() || schemaPath;
            const columns = parseJsonbColumns(content, fileName);

            if (columns.length > 0) {
                allColumns.push(...columns);
            }
        } catch {
            // Ignore read errors
        }
    }

    if (allColumns.length === 0) {
        return [];
    }

    return allColumns.map((col) =>
        generateTypeDefinition(col, extractNestedTypes, namingConvention)
    );
}
