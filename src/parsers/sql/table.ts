/**
 * Table definition parsing from SQL
 */

import type {
    TableDefinition,
    ColumnDefinition,
    RelationshipDefinition,
} from "../../types/index.ts";

/**
 * Helper function to extract identifier value from regex match groups
 * Handles quoted and unquoted identifiers
 */
function extractIdentifier(...groups: (string | undefined)[]): string {
    return groups.find((g) => g !== undefined) || "";
}

function splitByComma(str: string): string[] {
    const parts: string[] = [];
    let current = "";
    let parenDepth = 0;
    let inString = false;
    let stringChar: string | null = null;

    for (let i = 0; i < str.length; i++) {
        const char = str[i];

        if (char === '"' || char === "'") {
            // Count consecutive backslashes before this quote
            let backslashCount = 0;
            let checkIndex = i - 1;
            while (checkIndex >= 0 && str[checkIndex] === "\\") {
                backslashCount++;
                checkIndex--;
            }

            // Quote is escaped only if there's an odd number of backslashes
            const isEscaped = backslashCount % 2 === 1;

            if (!isEscaped) {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                } else if (char === stringChar) {
                    inString = false;
                    stringChar = null;
                }
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
        colType = quotedTypeMatch[2];
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
        /\breferences\s+(?:(?:"([^"]+)"|'([^']+)'|(\w+))\.)?(?:"([^"]+)"|'([^']+)'|(\w+))\s*\((?:"([^"]+)"|'([^']+)'|(\w+))\)/i
    );
    if (referencesMatch) {
        foreignKey = {
            schema: extractIdentifier(
                referencesMatch[1],
                referencesMatch[2],
                referencesMatch[3]
            ),
            table: extractIdentifier(
                referencesMatch[4],
                referencesMatch[5],
                referencesMatch[6]
            ),
            column: extractIdentifier(
                referencesMatch[7],
                referencesMatch[8],
                referencesMatch[9]
            ),
        };
        // Don't set schema if it's empty
        if (!foreignKey.schema) {
            delete foreignKey.schema;
        }
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
        /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:(?:"([^"]+)"|'([^']+)'|(\w+))\.)?(?:"([^"]+)"|'([^']+)'|(\w+))\s*\(/i
    );

    if (!tableStartMatch) {
        return null;
    }

    const tableSchema =
        extractIdentifier(
            tableStartMatch[1],
            tableStartMatch[2],
            tableStartMatch[3]
        ) || schema;
    const tableName = extractIdentifier(
        tableStartMatch[4],
        tableStartMatch[5],
        tableStartMatch[6]
    );
    const startIndex = tableStartMatch.index! + tableStartMatch[0].length;

    let parenDepth = 1;
    let endIndex = startIndex;
    let inString = false;
    let stringChar: string | null = null;

    while (endIndex < sqlContent.length && parenDepth > 0) {
        const char = sqlContent[endIndex];

        if (char === '"' || char === "'") {
            // Count consecutive backslashes before this quote
            let backslashCount = 0;
            let checkIndex = endIndex - 1;
            while (checkIndex >= 0 && sqlContent[checkIndex] === "\\") {
                backslashCount++;
                checkIndex--;
            }

            // Quote is escaped only if there's an odd number of backslashes
            const isEscaped = backslashCount % 2 === 1;

            if (!isEscaped) {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                } else if (char === stringChar) {
                    inString = false;
                    stringChar = null;
                }
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
            /^constraint\s+(?:"([^"]+)"|'([^']+)'|([\w-]+))\s+foreign\s+key\s*\(([^)]+)\)\s+references\s+(?:(?:"([^"]+)"|'([^']+)'|([\w-]+))\.)?(?:"([^"]+)"|'([^']+)'|([\w-]+))\s*\(([^)]+)\)/i
        );

        if (constraintMatch) {
            const constraintName = extractIdentifier(
                constraintMatch[1],
                constraintMatch[2],
                constraintMatch[3]
            );
            const columns = constraintMatch[4]
                .split(",")
                .map((c) => c.trim().replace(/["']/g, ""));
            const refSchema = extractIdentifier(
                constraintMatch[5],
                constraintMatch[6],
                constraintMatch[7]
            );
            const refTable = extractIdentifier(
                constraintMatch[8],
                constraintMatch[9],
                constraintMatch[10]
            );
            const refColumns = constraintMatch[11]
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
