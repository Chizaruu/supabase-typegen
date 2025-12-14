/**
 * JSONB type generation
 */

import type { TypeDefinition, NamingConvention } from "../types/index.js";
import { convertCase } from "../utils/naming.js";

export function generateJsonbTypeDefinitions(
    allJsonbTypes: TypeDefinition[],
    includeComments: boolean = true
): string {
    if (allJsonbTypes.length === 0) {
        return "";
    }

    return allJsonbTypes
        .map((type) => {
            if (!type.table && !type.column) {
                return `export type ${type.name} = ${type.typeDefinition};`;
            }

            let output = "";
            if (includeComments && type.comment) {
                output += `/**\n * ${type.comment}\n`;
                if (type.example) {
                    output += " *\n * Example:\n * ```json\n";
                    output += JSON.stringify(type.example, null, 2)
                        .split("\n")
                        .map((l) => ` * ${l}`)
                        .join("\n");
                    output += "\n * ```\n";
                }
                output += " */\n";
            }
            output += `export type ${type.name} = ${type.typeDefinition};`;
            return output;
        })
        .join("\n\n");
}

export function generateMergeDeepStructure(
    jsonbTypes: TypeDefinition[],
    convention: NamingConvention,
    indentSize: number = 2,
    alphabetical: boolean = false
): string {
    const indent = " ".repeat(indentSize);

    // Group by table
    const typesByTable: Record<string, TypeDefinition[]> = {};
    jsonbTypes.forEach((type) => {
        if (type.table) {
            if (!typesByTable[type.table]) {
                typesByTable[type.table] = [];
            }
            typesByTable[type.table].push(type);
        }
    });

    if (Object.keys(typesByTable).length === 0) {
        return "";
    }

    // Get table entries and optionally sort them
    const tableEntries = Object.entries(typesByTable);
    if (alphabetical) {
        tableEntries.sort(([a], [b]) => a.localeCompare(b));
    }

    const mergeDeepStructure = tableEntries
        .map(([tableName, types]) => {
            const convertedTableName = convertCase(tableName, convention);

            // Optionally sort the column types within each table
            const sortedTypes = alphabetical
                ? [...types].sort((a, b) => a.column.localeCompare(b.column))
                : types;

            const rowFields = sortedTypes
                .map((type) => {
                    const convertedColName = convertCase(
                        type.column,
                        convention
                    );
                    return `${indent.repeat(6)}${convertedColName}: ${
                        type.name
                    } | null`;
                })
                .join("\n");
            return `${indent.repeat(4)}${convertedTableName}: {
${indent.repeat(5)}Row: {
${rowFields}
${indent.repeat(5)}}
${indent.repeat(4)}}`;
        })
        .join("\n");

    return mergeDeepStructure;
}
