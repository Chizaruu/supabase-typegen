/**
 * Index definition parsing from SQL
 */

import type { IndexDefinition } from "../../types/index.ts";

export function parseIndexDefinition(
    sqlContent: string,
    schema: string = "public"
): IndexDefinition | null {
    const indexMatch = sqlContent.match(
        /create\s+(unique\s+)?index\s+(?:if\s+not\s+exists\s+)?["']?(\w+)["']?\s+on\s+(?:["']?(\w+)["']?\.)?["']?(\w+)["']?\s*(?:using\s+["']?(\w+)["']?)?\s*\(([^)]+)\)(?:\s+where\s+(.+))?/i
    );

    if (!indexMatch) {
        return null;
    }

    const isUnique = Boolean(indexMatch[1]);
    const indexName = indexMatch[2];
    const indexSchema = indexMatch[3] || schema;
    const tableName = indexMatch[4];
    const method = indexMatch[5];
    const columnsStr = indexMatch[6];
    const whereClause = indexMatch[7]?.trim();

    const columns = columnsStr
        .split(",")
        .map((col) => col.trim().replace(/["']/g, ""))
        .filter((col) => col.length > 0);

    return {
        name: indexName,
        tableName,
        columns,
        isUnique,
        method,
        whereClause,
    };
}
