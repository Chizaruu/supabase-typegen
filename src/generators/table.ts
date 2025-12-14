/**
 * Table type generation
 */

import type {
    TableDefinition,
    NamingConvention,
    IndexDefinition,
} from "../types/index.ts";
import { convertCase } from "../utils/naming.ts";
import { mapPostgresTypeToTypeScript } from "../utils/type-mapping.ts";

function generateIndexMetadata(
    indexes: IndexDefinition[],
    convention: NamingConvention,
    indentSize: number = 2
): string {
    if (indexes.length === 0) {
        return "[]";
    }

    const indent = " ".repeat(indentSize);

    const indexDefs = indexes.map((idx) => {
        const columns = idx.columns
            .map((c) => `"${convertCase(c, convention)}"`)
            .join(", ");
        const methodStr = idx.method
            ? `\n${indent.repeat(6)}method: "${idx.method}"`
            : "";
        const whereStr = idx.whereClause
            ? `\n${indent.repeat(6)}where: "${idx.whereClause.replace(
                  /"/g,
                  '\\"'
              )}"`
            : "";

        return `${indent.repeat(5)}{
${indent.repeat(6)}name: "${idx.name}"
${indent.repeat(6)}columns: [${columns}]
${indent.repeat(6)}isUnique: ${idx.isUnique}${methodStr}${whereStr}
${indent.repeat(5)}}`;
    });

    return `[\n${indexDefs.join(",\n")}\n${indent.repeat(4)}]`;
}

export function generateTableType(
    table: TableDefinition,
    convention: NamingConvention,
    indentSize: number = 2,
    includeIndexes: boolean = false,
    includeComments: boolean = true,
    availableEnums: Set<string> = new Set(),
    schema: string = "public",
    useGeometricTypes: boolean = false
): string {
    const tableName = convertCase(table.name, convention);
    const indent = " ".repeat(indentSize);

    // Filter out 'this' and 'constraint' columns
    const filteredColumns = table.columns.filter((col) => {
        const colNameLower = col.name.toLowerCase();
        return colNameLower !== "this" && colNameLower !== "constraint";
    });

    const rowColumns = filteredColumns.map((col) => {
        const colName = convertCase(col.name, convention);
        const tsType = mapPostgresTypeToTypeScript(
            col.type,
            col.isArray,
            schema,
            availableEnums,
            useGeometricTypes
        );
        const nullable = col.nullable ? " | null" : "";

        const commentLine =
            includeComments && col.comment
                ? `${indent.repeat(5)}/** ${col.comment} */\n`
                : "";

        return `${commentLine}${indent.repeat(
            5
        )}${colName}: ${tsType}${nullable}`;
    });

    const insertColumns = filteredColumns.map((col) => {
        const colName = convertCase(col.name, convention);
        const tsType = mapPostgresTypeToTypeScript(
            col.type,
            col.isArray,
            schema,
            availableEnums,
            useGeometricTypes
        );
        const hasDefault = col.defaultValue !== null;
        const isOptional = hasDefault || col.nullable;
        const optionalMark = isOptional ? "?" : "";
        const nullable = col.nullable ? " | null" : "";

        const commentLine = col.comment
            ? `${indent.repeat(5)}/** ${col.comment} */\n`
            : "";

        return `${commentLine}${indent.repeat(
            5
        )}${colName}${optionalMark}: ${tsType}${nullable}`;
    });

    const updateColumns = filteredColumns.map((col) => {
        const colName = convertCase(col.name, convention);
        const tsType = mapPostgresTypeToTypeScript(
            col.type,
            col.isArray,
            schema,
            availableEnums,
            useGeometricTypes
        );
        const nullable = col.nullable ? " | null" : "";

        const commentLine = col.comment
            ? `${indent.repeat(5)}/** ${col.comment} */\n`
            : "";

        return `${commentLine}${indent.repeat(
            5
        )}${colName}?: ${tsType}${nullable}`;
    });

    // Generate relationships array
    const relationships = table.relationships.map((rel) => {
        const columns = rel.columns
            .map((c) => `"${convertCase(c, convention)}"`)
            .join(", ");
        const refColumns = rel.referencedColumns
            .map((c) => `"${c}"`)
            .join(", ");

        return `${indent.repeat(5)}{
${indent.repeat(6)}foreignKeyName: "${rel.foreignKeyName}"
${indent.repeat(6)}columns: [${columns}]
${indent.repeat(6)}isOneToOne: ${rel.isOneToOne}
${indent.repeat(6)}referencedRelation: "${rel.referencedRelation}"
${indent.repeat(6)}referencedColumns: [${refColumns}]
${indent.repeat(5)}}`;
    });

    const relationshipsStr =
        relationships.length > 0
            ? `[\n${relationships.join(",\n")}\n${indent.repeat(4)}]`
            : "[]";

    // Generate indexes metadata (only if includeIndexes is enabled)
    let indexesField = "";
    if (includeIndexes) {
        const indexesStr = generateIndexMetadata(
            table.indexes,
            convention,
            indentSize
        );
        indexesField = `\n${indent.repeat(4)}Indexes: ${indexesStr}`;
    }

    // Add table comment as JSDoc if available and enabled
    const tableCommentBlock =
        includeComments && table.comment
            ? `${indent.repeat(3)}/**\n${indent.repeat(3)} * ${
                  table.comment
              }\n${indent.repeat(3)} */\n`
            : "";

    return `${tableCommentBlock}${indent.repeat(3)}${tableName}: {
${indent.repeat(4)}Row: {
${rowColumns.join("\n")}
${indent.repeat(4)}}
${indent.repeat(4)}Insert: {
${insertColumns.join("\n")}
${indent.repeat(4)}}
${indent.repeat(4)}Update: {
${updateColumns.join("\n")}
${indent.repeat(4)}}
${indent.repeat(4)}Relationships: ${relationshipsStr}${indexesField}
${indent.repeat(3)}}`;
}
