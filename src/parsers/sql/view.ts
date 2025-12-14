/**
 * View definition parsing from SQL
 */

import type { ViewDefinition, ColumnDefinition } from "../../types/index.js";

/**
 * Parse CREATE VIEW or CREATE MATERIALIZED VIEW statements
 */
export function parseViewDefinition(
    sqlContent: string,
    schema: string = "public"
): ViewDefinition | null {
    // Match CREATE [MATERIALIZED] VIEW [IF NOT EXISTS] [schema.]view_name AS select_statement
    const viewMatch = sqlContent.match(
        /create\s+(materialized\s+)?view\s+(?:if\s+not\s+exists\s+)?(?:(?:"([^"]+)"|'([^']+)'|(\w+))\.)?(?:"([^"]+)"|'([^']+)'|(\w+))\s+as\s+([\s\S]+?)(?:;|$)/i
    );

    if (!viewMatch) {
        return null;
    }

    const isMaterialized = !!viewMatch[1];
    // Schema can be in groups 2 (double quoted), 3 (single quoted), or 4 (unquoted)
    const viewSchema = viewMatch[2] || viewMatch[3] || viewMatch[4] || schema;
    // View name can be in groups 5 (double quoted), 6 (single quoted), or 7 (unquoted)
    const viewName = viewMatch[5] || viewMatch[6] || viewMatch[7];
    const definition = viewMatch[8].trim();

    // For now, we return an empty columns array
    // Column inference from SELECT statements is complex and would require
    // either database introspection or a full SQL parser
    // Users can use database introspection mode or manually define view columns

    return {
        schema: viewSchema,
        name: viewName,
        columns: [],
        isMaterialized,
        definition,
    };
}

/**
 * Parse COMMENT ON VIEW statements
 */
export function parseViewComment(
    sqlContent: string,
    schema: string = "public"
): { viewName: string; comment: string; schema: string } | null {
    const commentMatch = sqlContent.match(
        /comment\s+on\s+(?:materialized\s+)?view\s+(?:["']?(\w+)["']?\.)?["']?(\w+)["']?\s+is\s+'((?:[^']|'')*)'/i
    );

    if (!commentMatch) {
        return null;
    }

    const viewSchema = commentMatch[1] || schema;
    const viewName = commentMatch[2];
    const comment = commentMatch[3].replace(/''/g, "'");

    return {
        viewName,
        comment,
        schema: viewSchema,
    };
}

/**
 * Helper function to manually define view columns
 * This can be used when reading from a configuration file
 * or when users want to explicitly type their views
 */
export function createViewWithColumns(
    schema: string,
    name: string,
    columns: ColumnDefinition[],
    isMaterialized: boolean = false,
    comment?: string
): ViewDefinition {
    return {
        schema,
        name,
        columns,
        isMaterialized,
        comment,
    };
}
