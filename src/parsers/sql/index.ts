/**
 * Index definition parsing from SQL
 */

import type { IndexDefinition } from "../../types/index.ts";

export function parseIndexDefinition(
    sqlContent: string,
    schema: string = "public"
): IndexDefinition | null {
    // Normalize whitespace
    const normalized = sqlContent.trim().replace(/\s+/g, " ");

    // Pattern to match CREATE INDEX statements
    // Handles: UNIQUE, CONCURRENTLY, IF NOT EXISTS, quoted identifiers, USING method, WHERE clause
    const indexMatch = normalized.match(
        /^create\s+(?:unique\s+)?index\s+(?:concurrently\s+)?(?:if\s+not\s+exists\s+)?"?([^"\s]+)"?\s+on\s+(?:"?(?:\w+)"?\.)?"?([^"\s(]+)"?\s*(?:using\s+"?(\w+)"?)?\s*\(([^)]+(?:\([^)]*\))*)\)(?:\s+where\s+(.+))?$/i
    );

    if (!indexMatch) {
        return null;
    }

    const indexName = indexMatch[1];
    const tableName = indexMatch[2];
    const method = indexMatch[3];
    const columnsStr = indexMatch[4];
    const whereClause = indexMatch[5]?.trim();

    // Parse columns - handle expressions with nested parentheses
    const columns = parseColumns(columnsStr);

    // Check if it's a unique index
    const isUnique = /^create\s+unique\s+index/i.test(normalized);

    return {
        name: indexName,
        tableName,
        columns,
        isUnique,
        method,
        whereClause,
    };
}

/**
 * Parse column list, handling expressions with parentheses
 */
function parseColumns(columnsStr: string): string[] {
    const columns: string[] = [];
    let current = "";
    let depth = 0;

    for (let i = 0; i < columnsStr.length; i++) {
        const char = columnsStr[i];

        if (char === "(") {
            depth++;
            current += char;
        } else if (char === ")") {
            depth--;
            current += char;
        } else if (char === "," && depth === 0) {
            // Only split on commas outside of parentheses
            const trimmed = current.trim().replace(/^["']|["']$/g, "");
            if (trimmed) {
                columns.push(trimmed);
            }
            current = "";
        } else {
            current += char;
        }
    }

    // Add the last column
    const trimmed = current.trim().replace(/^["']|["']$/g, "");
    if (trimmed) {
        columns.push(trimmed);
    }

    return columns;
}
