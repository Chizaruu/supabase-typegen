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

    // Match the CREATE INDEX prefix and extract components
    const prefixMatch = normalized.match(
        /^create\s+(?:unique\s+)?index\s+(?:concurrently\s+)?(?:if\s+not\s+exists\s+)?"?([^"\s]+)"?\s+on\s+(?:"?(?:\w+)"?\.)?"?([^"\s(]+)"?\s*(?:using\s+"?(\w+)"?)?\s*\(/i
    );

    if (!prefixMatch) {
        return null;
    }

    const indexName = prefixMatch[1];
    const tableName = prefixMatch[2];
    const method = prefixMatch[3];

    // Find the starting position of the column list
    const columnStartIndex = prefixMatch[0].length - 1; // -1 to include the opening parenthesis

    // Find the matching closing parenthesis
    const { endIndex, content } = findMatchingParenthesis(
        normalized,
        columnStartIndex
    );

    if (endIndex === -1) {
        return null;
    }

    const columnsStr = content;

    // Extract WHERE clause if present
    const remainingStr = normalized.substring(endIndex + 1).trim();
    const whereMatch = remainingStr.match(/^where\s+(.+)$/i);
    const whereClause = whereMatch ? whereMatch[1].trim() : undefined;

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
 * Find the matching closing parenthesis and extract content
 */
function findMatchingParenthesis(
    str: string,
    startIndex: number
): { endIndex: number; content: string } {
    let depth = 0;
    let content = "";

    for (let i = startIndex; i < str.length; i++) {
        const char = str[i];

        if (char === "(") {
            depth++;
            if (depth > 1) {
                content += char;
            }
        } else if (char === ")") {
            depth--;
            if (depth === 0) {
                return { endIndex: i, content };
            }
            content += char;
        } else if (depth > 0) {
            content += char;
        }
    }

    return { endIndex: -1, content: "" };
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
