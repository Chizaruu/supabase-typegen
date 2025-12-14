/**
 * Table definition parsing from SQL
 */

import type {
    TableDefinition,
    ColumnDefinition,
    RelationshipDefinition,
} from "../../types/index.ts";

function splitByComma(str: string): string[] {
    const parts: string[] = [];
    let current = "";
    let parenDepth = 0;
    let inString = false;
    let stringChar: string | null = null;

    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        const prevChar = i > 0 ? str[i - 1] : "";

        if ((char === '"' || char === "'") && prevChar !== "\\") {
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
                parenDepth++;
            }
            if (char === ")") {
                parenDepth--;
            }

            if (char === "," && parenDepth === 0) {
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

    return parts;
}

export function parseColumnDefinition(
    colDef: string,
    tableName?: string
): ColumnDefinition | null {
    const trimmed = colDef.trim();

    let nameMatch = trimmed.match(/^"([^"]+)"\s+(.+)$/);
    if (!nameMatch) {
        nameMatch = trimmed.match(/^'([^']+)'\s+(.+)$/);
    }
    if (!nameMatch) {
        nameMatch = trimmed.match(/^(\w+)\s+(.+)$/);
    }

    if (!nameMatch) {
        return null;
    }

    const colName = nameMatch[1];
    const rest = nameMatch[2].trim();

    let colType = "";
    let remainingConstraints = rest;

    const quotedTypeMatch = rest.match(
        /^(?:["']([^"']+)["']\.)?["']([^"']+)["']/
    );
    if (quotedTypeMatch) {
        colType = quotedTypeMatch[2] || quotedTypeMatch[1];
        remainingConstraints = rest.substring(quotedTypeMatch[0].length).trim();
    } else {
        const multiWordTypes = [
            "timestamp with time zone",
            "timestamp without time zone",
            "time with time zone",
            "time without time zone",
            "double precision",
            "character varying",
        ];

        for (const multiType of multiWordTypes) {
            if (rest.toLowerCase().startsWith(multiType)) {
                colType = multiType;
                remainingConstraints = rest.substring(multiType.length).trim();

                const sizeMatch = remainingConstraints.match(/^\s*(\([^)]+\))/);
                if (sizeMatch) {
                    colType += sizeMatch[1];
                    remainingConstraints = remainingConstraints
                        .substring(sizeMatch[0].length)
                        .trim();
                }
                break;
            }
        }
    }

    if (!colType) {
        const typeMatch = rest.match(/^(\w+)(\s*\([^)]+\))?/);
        if (typeMatch) {
            colType = typeMatch[1] + (typeMatch[2] || "");
            remainingConstraints = rest.substring(typeMatch[0].length).trim();
        } else {
            return null;
        }
    }

    const isArray =
        colType.includes("[]") ||
        remainingConstraints.toLowerCase().startsWith("[]") ||
        /\barray\b/i.test(remainingConstraints);

    if (isArray) {
        colType = colType.replace("[]", "").trim();
        remainingConstraints = remainingConstraints
            .replace(/^\s*\[\]/, "")
            .trim();
    }

    const constraintsLower = remainingConstraints.toLowerCase();
    const notNull = /\bnot\s+null\b/.test(constraintsLower);
    const isPrimaryKey = /\bprimary\s+key\b/.test(constraintsLower);
    const isUnique = /\bunique\b/.test(constraintsLower) && !isPrimaryKey;

    let defaultValue: string | null = null;
    const defaultMatch = remainingConstraints.match(
        /\bdefault\s+(.+?)(?:\s+(?:not\s+null|primary\s+key|unique|references|check|constraint)|$)/i
    );
    if (defaultMatch) {
        defaultValue = defaultMatch[1].trim();
    }

    let foreignKey:
        | { table: string; column: string; schema?: string }
        | undefined;
    const referencesMatch = remainingConstraints.match(
        /\breferences\s+(?:["']?(\w+)["']?\.)?["']?(\w+)["']?\s*\(["']?(\w+)["']?\)/i
    );
    if (referencesMatch) {
        foreignKey = {
            schema: referencesMatch[1],
            table: referencesMatch[2],
            column: referencesMatch[3],
        };
    }

    return {
        name: colName,
        type: colType,
        nullable: !notNull && !isPrimaryKey,
        defaultValue,
        isArray,
        isPrimaryKey,
        isUnique,
        foreignKey,
    };
}

export function parseTableDefinition(
    sqlContent: string,
    schema: string = "public"
): TableDefinition | null {
    const tableStartMatch = sqlContent.match(
        /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:["']?(\w+)["']?\.)?["']?(\w+)["']?\s*\(/i
    );

    if (!tableStartMatch) {
        return null;
    }

    const tableSchema = tableStartMatch[1] || schema;
    const tableName = tableStartMatch[2];
    const startIndex = tableStartMatch.index! + tableStartMatch[0].length;

    let parenDepth = 1;
    let endIndex = startIndex;
    let inString = false;
    let stringChar: string | null = null;

    while (endIndex < sqlContent.length && parenDepth > 0) {
        const char = sqlContent[endIndex];
        const prevChar = endIndex > 0 ? sqlContent[endIndex - 1] : "";

        if ((char === '"' || char === "'") && prevChar !== "\\") {
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
                parenDepth++;
            }
            if (char === ")") {
                parenDepth--;
            }
        }

        endIndex++;
    }

    if (parenDepth !== 0) {
        return null;
    }

    let tableBody = sqlContent.substring(startIndex, endIndex - 1);

    if (!tableBody || tableBody.trim().length === 0) {
        return null;
    }

    tableBody = tableBody.replace(/--[^\n]*/g, "");
    tableBody = tableBody.replace(/\s+/g, " ").trim();

    const columns: ColumnDefinition[] = [];
    const relationships: RelationshipDefinition[] = [];

    const columnDefs = splitByComma(tableBody);

    for (const colDef of columnDefs) {
        const trimmed = colDef.trim();

        if (!trimmed || trimmed.startsWith("--")) {
            continue;
        }

        const constraintMatch = trimmed.match(
            /^constraint\s+["']?(\w+)["']?\s+foreign\s+key\s*\(([^)]+)\)\s+references\s+(?:["']?(\w+)["']?\.)?["']?(\w+)["']?\s*\(([^)]+)\)/i
        );

        if (constraintMatch) {
            const constraintName = constraintMatch[1];
            const columns = constraintMatch[2]
                .split(",")
                .map((c) => c.trim().replace(/["']/g, ""));
            const refSchema = constraintMatch[3];
            const refTable = constraintMatch[4];
            const refColumns = constraintMatch[5]
                .split(",")
                .map((c) => c.trim().replace(/["']/g, ""));

            const referencedRelation = refSchema
                ? `${refSchema}.${refTable}`
                : refTable;

            relationships.push({
                foreignKeyName: constraintName,
                columns: columns,
                isOneToOne: false,
                referencedRelation: referencedRelation,
                referencedColumns: refColumns,
            });
            continue;
        }

        if (
            /^(primary\s+key|foreign\s+key|unique\s*\(|check\s*\(|case\s+when|when\s+|then\s+|else\s+|end\s*$|otherwise)/i.test(
                trimmed
            )
        ) {
            continue;
        }

        const col = parseColumnDefinition(trimmed, tableName);
        if (col) {
            columns.push(col);

            if (col.foreignKey) {
                const fkeyName = `${tableName}_${col.name}_fkey`;

                const referencedRelation = col.foreignKey.schema
                    ? `${col.foreignKey.schema}.${col.foreignKey.table}`
                    : col.foreignKey.table;

                relationships.push({
                    foreignKeyName: fkeyName,
                    columns: [col.name],
                    isOneToOne: col.isUnique,
                    referencedRelation: referencedRelation,
                    referencedColumns: [col.foreignKey.column],
                });
            }
        }
    }

    if (columns.length === 0) {
        return null;
    }

    return {
        schema: tableSchema,
        name: tableName,
        columns,
        relationships,
        indexes: [],
    };
}
