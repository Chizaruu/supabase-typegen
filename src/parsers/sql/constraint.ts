/**
 * ALTER TABLE constraint parsing from SQL
 */

import type { RelationshipDefinition } from "../../types/index.ts";

export function parseAlterTableForeignKey(
    sqlContent: string,
    schema: string = "public"
): { tableName: string; relationship: RelationshipDefinition } | null {
    const alterMatch = sqlContent.match(
        /alter\s+table\s+(?:only\s+)?(?:["']?(\w+)["']?\.)?["']?(\w+)["']?\s+add\s+constraint\s+["']?(\w+)["']?\s+foreign\s+key\s*\(([^)]+)\)\s+references\s+(?:["']?(\w+)["']?\.)?["']?(\w+)["']?\s*\(([^)]+)\)/i
    );

    if (!alterMatch) {
        return null;
    }

    const tableSchema = alterMatch[1] || schema;
    const tableName = alterMatch[2];
    const constraintName = alterMatch[3];
    const columnsStr = alterMatch[4];
    const refSchema = alterMatch[5];
    const refTable = alterMatch[6];
    const refColumnsStr = alterMatch[7];

    const columns = columnsStr
        .split(",")
        .map((col) => col.trim().replace(/["']/g, ""))
        .filter((col) => col.length > 0);

    const refColumns = refColumnsStr
        .split(",")
        .map((col) => col.trim().replace(/["']/g, ""))
        .filter((col) => col.length > 0);

    const referencedRelation = refTable;

    const isOneToOne = false;

    return {
        tableName,
        relationship: {
            foreignKeyName: constraintName,
            columns,
            isOneToOne,
            referencedRelation,
            referencedColumns: refColumns,
        },
    };
}

export function parseAlterTableUnique(
    sqlContent: string,
    schema: string = "public"
): { tableName: string; columns: string[] } | null {
    const alterMatch = sqlContent.match(
        /alter\s+table\s+(?:only\s+)?(?:["']?(\w+)["']?\.)?["']?(\w+)["']?\s+add\s+(?:constraint\s+["']?\w+["']?\s+)?unique\s*\(([^)]+)\)/i
    );

    if (!alterMatch) {
        return null;
    }

    const tableSchema = alterMatch[1] || schema;
    const tableName = alterMatch[2];
    const columnsStr = alterMatch[3];

    const columns = columnsStr
        .split(",")
        .map((col) => col.trim().replace(/["']/g, ""))
        .filter((col) => col.length > 0);

    return {
        tableName,
        columns,
    };
}
