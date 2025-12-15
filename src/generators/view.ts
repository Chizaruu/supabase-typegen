/**
 * View type generation
 */

import type { ViewDefinition, NamingConvention } from "../types/index.js";
import { convertCase } from "../utils/naming.js";
import { mapPostgresTypeToTypeScript } from "../utils/type-mapping.js";

export function generateViewType(
    view: ViewDefinition,
    convention: NamingConvention,
    indentSize: number = 2,
    includeComments: boolean = true,
    availableEnums: Set<string> = new Set(),
    schema: string = "public",
    useGeometricTypes: boolean = false
): string {
    const viewName = convertCase(view.name, convention);
    const indent = " ".repeat(indentSize);

    // Filter out 'this' and 'constraint' columns (same as tables)
    const filteredColumns = view.columns.filter((col) => {
        const colNameLower = col.name.toLowerCase();
        return colNameLower !== "this" && colNameLower !== "constraint";
    });

    // If no columns are defined, generate a placeholder
    let rowColumns: string[];
    if (filteredColumns.length === 0) {
        rowColumns = [
            `${indent.repeat(5)}// Column types could not be inferred from SQL`,
            `${indent.repeat(
                5
            )}// Use database introspection or manually define columns`,
            `${indent.repeat(5)}[key: string]: unknown`,
        ];
    } else {
        rowColumns = filteredColumns.map((col) => {
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
    }

    // Build comment block
    let commentBlock = "";
    if (includeComments) {
        const comments: string[] = [];

        if (view.isMaterialized) {
            comments.push("Materialized View");
        }

        if (view.comment) {
            comments.push(view.comment);
        }

        if (comments.length > 0) {
            commentBlock = `${indent.repeat(3)}/**\n`;
            comments.forEach((comment) => {
                commentBlock += `${indent.repeat(3)} * ${comment}\n`;
            });
            commentBlock += `${indent.repeat(3)} */\n`;
        }
    }

    // Views are read-only, so only Row type (no Insert/Update)
    return `${commentBlock}${indent.repeat(3)}${viewName}: {
${indent.repeat(4)}Row: {
${rowColumns.join("\n")}
${indent.repeat(4)}}
${indent.repeat(4)}Relationships: []
${indent.repeat(3)}}`;
}

/**
 * Generate all view types for a schema
 */
export function generateViewTypes(
    views: ViewDefinition[],
    convention: NamingConvention,
    indentSize: number = 2,
    includeComments: boolean = true,
    availableEnums: Set<string> = new Set(),
    schema: string = "public",
    useGeometricTypes: boolean = false
): string {
    if (views.length === 0) {
        return "";
    }

    const viewTypeDefs = views.map((view) =>
        generateViewType(
            view,
            convention,
            indentSize,
            includeComments,
            availableEnums,
            schema,
            useGeometricTypes
        )
    );

    return viewTypeDefs.join("\n");
}
