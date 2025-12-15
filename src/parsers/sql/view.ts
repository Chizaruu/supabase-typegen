/**
 * View definition parsing from SQL
 */

import type {
    ViewDefinition,
    ColumnDefinition,
    TableDefinition,
} from "../../types/index.js";

/**
 * Infer PostgreSQL type from SQL expression
 *
 * Supported expressions:
 * - Aggregate functions: COUNT, SUM, AVG, MIN, MAX
 * - Array functions: ARRAY_AGG
 * - String functions: STRING_AGG
 * - Boolean functions: BOOL_AND, BOOL_OR
 * - JSON functions: JSON_AGG, JSONB_AGG, JSON_OBJECT_AGG, JSONB_OBJECT_AGG
 * - Date/time functions: NOW, CURRENT_TIMESTAMP, CURRENT_DATE, CURRENT_TIME
 * - Literals: numbers, strings, booleans
 * - CASE expressions
 *
 * Returns 'unknown' for unsupported or complex expressions.
 */
function inferTypeFromExpression(expr: string): {
    type: string;
    isArray: boolean;
} {
    const exprLower = expr.toLowerCase().trim();

    if (exprLower.match(/^count\s*\(/)) {
        return { type: "bigint", isArray: false };
    }

    if (exprLower.match(/^(sum|avg)\s*\(/)) {
        return { type: "numeric", isArray: false };
    }

    if (exprLower.match(/^(min|max)\s*\(/)) {
        return { type: "unknown", isArray: false };
    }

    if (exprLower.match(/^array_agg\s*\(/)) {
        return { type: "unknown", isArray: true };
    }

    if (exprLower.match(/^string_agg\s*\(/)) {
        return { type: "text", isArray: false };
    }

    if (exprLower.match(/^bool_and\s*\(/) || exprLower.match(/^bool_or\s*\(/)) {
        return { type: "boolean", isArray: false };
    }

    if (exprLower.match(/^json(b)?_agg\s*\(/)) {
        return {
            type: exprLower.includes("jsonb") ? "jsonb" : "json",
            isArray: false,
        };
    }

    if (exprLower.match(/^json(b)?_object_agg\s*\(/)) {
        return {
            type: exprLower.includes("jsonb") ? "jsonb" : "json",
            isArray: false,
        };
    }

    if (
        exprLower.match(/^now\s*\(\s*\)/) ||
        exprLower.match(/^current_timestamp/)
    ) {
        return { type: "timestamp with time zone", isArray: false };
    }

    if (exprLower.match(/^current_date/)) {
        return { type: "date", isArray: false };
    }

    if (exprLower.match(/^current_time/)) {
        return { type: "time with time zone", isArray: false };
    }

    if (exprLower.match(/^case\s+/)) {
        return { type: "unknown", isArray: false };
    }

    if (exprLower.match(/^\d+(\.\d+)?$/)) {
        return {
            type: exprLower.includes(".") ? "numeric" : "integer",
            isArray: false,
        };
    }

    if (exprLower.match(/^'.*'$/)) {
        return { type: "text", isArray: false };
    }

    if (exprLower === "true" || exprLower === "false") {
        return { type: "boolean", isArray: false };
    }

    return { type: "unknown", isArray: false };
}

/**
 * Parse a single column expression from SELECT clause
 */
function parseColumnExpression(
    expr: string,
    tables: Map<string, TableDefinition>
): ColumnDefinition | null {
    expr = expr.trim();

    let columnName = "";
    let columnType: string;
    let isArray = false;
    let nullable = true;

    const castMatchNoAlias = expr.match(/^(.+)::([\w\s\[\]]+)$/i);
    if (castMatchNoAlias && !expr.toLowerCase().includes(" as ")) {
        const typePart = castMatchNoAlias[2].trim();
        isArray = typePart.includes("[");
        columnType = typePart.replace(/\[\]/g, "").trim();
        columnName = castMatchNoAlias[1].trim().replace(/^.*\./, "");

        return {
            name: columnName,
            type: columnType,
            nullable,
            defaultValue: null,
            isArray,
            isPrimaryKey: false,
            isUnique: false,
        };
    }

    const castFnMatchNoAlias = expr.match(
        /^cast\s*\((.+?)\s+as\s+([\w\s\[\]]+)\)$/i
    );
    if (castFnMatchNoAlias && !expr.toLowerCase().match(/\)\s+as\s+\w+$/)) {
        const typePart = castFnMatchNoAlias[2].trim();
        isArray = typePart.includes("[");
        columnType = typePart.replace(/\[\]/g, "").trim();
        columnName = castFnMatchNoAlias[1].trim().replace(/^.*\./, "");

        return {
            name: columnName,
            type: columnType,
            nullable,
            defaultValue: null,
            isArray,
            isPrimaryKey: false,
            isUnique: false,
        };
    }

    const aliasMatch = expr.match(/(.+)\s+as\s+(\w+)$/i);
    if (aliasMatch) {
        const sourceExpr = aliasMatch[1].trim();
        columnName = aliasMatch[2];

        const castMatch = sourceExpr.match(/(.+)::([\w\s\[\]]+)$/i);
        if (castMatch) {
            const typePart = castMatch[2].trim();
            isArray = typePart.includes("[");
            columnType = typePart.replace(/\[\]/g, "").trim();

            return {
                name: columnName,
                type: columnType,
                nullable,
                defaultValue: null,
                isArray,
                isPrimaryKey: false,
                isUnique: false,
            };
        }

        const castFnMatch = sourceExpr.match(
            /cast\s*\((.+?)\s+as\s+([\w\s\[\]]+)\)$/i
        );
        if (castFnMatch) {
            const typePart = castFnMatch[2].trim();
            isArray = typePart.includes("[");
            columnType = typePart.replace(/\[\]/g, "").trim();

            return {
                name: columnName,
                type: columnType,
                nullable,
                defaultValue: null,
                isArray,
                isPrimaryKey: false,
                isUnique: false,
            };
        }

        const qualifiedMatch = sourceExpr.match(/(?:(\w+)\.)?(\w+)$/);
        if (qualifiedMatch) {
            const tableAlias = qualifiedMatch[1];
            const colName = qualifiedMatch[2];

            if (tableAlias && tables.has(tableAlias)) {
                const table = tables.get(tableAlias)!;
                const col = table.columns.find((c) => c.name === colName);
                if (col) {
                    return {
                        name: columnName,
                        type: col.type,
                        nullable: col.nullable,
                        defaultValue: null,
                        isArray: col.isArray,
                        isPrimaryKey: false,
                        isUnique: false,
                    };
                }
            } else if (!tableAlias) {
                for (const table of tables.values()) {
                    const col = table.columns.find((c) => c.name === colName);
                    if (col) {
                        return {
                            name: columnName,
                            type: col.type,
                            nullable: col.nullable,
                            defaultValue: null,
                            isArray: col.isArray,
                            isPrimaryKey: false,
                            isUnique: false,
                        };
                    }
                }
            }
        }

        const inferred = inferTypeFromExpression(sourceExpr);
        return {
            name: columnName,
            type: inferred.type,
            nullable,
            defaultValue: null,
            isArray: inferred.isArray,
            isPrimaryKey: false,
            isUnique: false,
        };
    }

    const qualifiedMatch = expr.match(/(?:(\w+)\.)?(\w+)$/);
    if (qualifiedMatch) {
        const tableAlias = qualifiedMatch[1];
        const colName = qualifiedMatch[2];
        columnName = colName;

        if (tableAlias && tables.has(tableAlias)) {
            const table = tables.get(tableAlias)!;
            const col = table.columns.find((c) => c.name === colName);
            if (col) {
                return {
                    name: columnName,
                    type: col.type,
                    nullable: col.nullable,
                    defaultValue: null,
                    isArray: col.isArray,
                    isPrimaryKey: false,
                    isUnique: false,
                };
            }
        } else if (!tableAlias) {
            for (const table of tables.values()) {
                const col = table.columns.find((c) => c.name === colName);
                if (col) {
                    return {
                        name: columnName,
                        type: col.type,
                        nullable: col.nullable,
                        defaultValue: null,
                        isArray: col.isArray,
                        isPrimaryKey: false,
                        isUnique: false,
                    };
                }
            }
        }
    }

    const inferred = inferTypeFromExpression(expr);
    const baseName = expr
        .replace(/^.*\./, "")
        .replace(/\(.*\)/, "")
        .trim();
    columnName = baseName || "column";

    return {
        name: columnName,
        type: inferred.type,
        nullable,
        defaultValue: null,
        isArray: inferred.isArray,
        isPrimaryKey: false,
        isUnique: false,
    };
}

const SQL_KEYWORDS = new Set([
    "where",
    "join",
    "group",
    "order",
    "limit",
    "having",
    "union",
    "intersect",
    "except",
    "inner",
    "left",
    "right",
    "outer",
    "cross",
    "natural",
    "on",
    "as",
]);

const JOIN_PATTERN = /join\s+(\w+)(?:\s+as\s+(\w+)|\s+(?!on\b)(\w+))?/gi;

/**
 * Extract table and alias from a FROM/JOIN clause
 */
function extractTableAndAlias(
    clause: string
): { tableName: string; alias: string } | null {
    const tokens = clause.trim().split(/\s+/);
    const tableName = tokens[0];
    let alias = tableName;

    if (tokens.length >= 3 && tokens[1].toLowerCase() === "as") {
        if (tokens[2] && !SQL_KEYWORDS.has(tokens[2].toLowerCase())) {
            alias = tokens[2];
        }
    } else if (
        tokens.length >= 2 &&
        !SQL_KEYWORDS.has(tokens[1].toLowerCase())
    ) {
        alias = tokens[1];
    }

    return { tableName, alias };
}

/**
 * Extract table references from FROM and JOIN clauses
 */
function extractTableReferences(
    selectStatement: string,
    allTables: TableDefinition[],
    defaultSchema: string
): Map<string, TableDefinition> {
    const tables = new Map<string, TableDefinition>();

    const fromMatch = selectStatement.match(/from\s+([^\s;]+)/i);
    if (fromMatch) {
        const fromClause = selectStatement
            .slice(fromMatch.index! + 4)
            .match(/^\s+([^\s;]+(\s+as\s+\w+|\s+\w+)?)/i);

        if (fromClause) {
            const tableAlias = extractTableAndAlias(fromClause[0]);
            if (tableAlias) {
                const { tableName, alias } = tableAlias;
                const table = allTables.find(
                    (t) => t.name === tableName && t.schema === defaultSchema
                );
                if (table) {
                    tables.set(alias, table);
                    if (alias !== tableName) {
                        tables.set(tableName, table);
                    }
                }
            }
        }
    }

    JOIN_PATTERN.lastIndex = 0;
    let joinMatch;
    while ((joinMatch = JOIN_PATTERN.exec(selectStatement)) !== null) {
        const afterJoin = selectStatement
            .slice(joinMatch.index + 4)
            .match(/^\s+([^\s;]+(\s+as\s+\w+|\s+\w+)?)/i);

        if (afterJoin) {
            const tableAlias = extractTableAndAlias(afterJoin[0]);
            if (tableAlias) {
                const { tableName, alias } = tableAlias;
                const table = allTables.find(
                    (t) => t.name === tableName && t.schema === defaultSchema
                );
                if (table) {
                    tables.set(alias, table);
                    if (alias !== tableName) {
                        tables.set(tableName, table);
                    }
                }
            }
        }
    }

    return tables;
}

/**
 * Parse SELECT column list
 */
function parseSelectColumns(
    selectStatement: string,
    tables: Map<string, TableDefinition>,
    defaultSchema: string
): ColumnDefinition[] {
    let selectMatch = selectStatement.match(/select\s+([\s\S]+?)\s+from/i);
    let columnList: string;

    if (selectMatch) {
        columnList = selectMatch[1].trim();
    } else {
        selectMatch = selectStatement.match(
            /select\s+([\s\S]+?)(?:\s+where|\s+group\s+by|\s+order\s+by|;|$)/i
        );
        if (!selectMatch) {
            return [];
        }
        columnList = selectMatch[1].trim();
    }

    if (columnList === "*") {
        const allColumns: ColumnDefinition[] = [];
        const seen = new Set<string>();

        for (const table of tables.values()) {
            for (const col of table.columns) {
                if (!seen.has(col.name)) {
                    seen.add(col.name);
                    allColumns.push({
                        name: col.name,
                        type: col.type,
                        nullable: col.nullable,
                        defaultValue: null,
                        isArray: col.isArray,
                        isPrimaryKey: false,
                        isUnique: false,
                    });
                }
            }
        }
        return allColumns;
    }

    const columnExpressions: string[] = [];
    let depth = 0;
    let inString = false;
    let stringChar = "";
    let currentExpr = "";

    for (let i = 0; i < columnList.length; i++) {
        const char = columnList[i];

        if (char === "'" || char === '"') {
            if (!inString) {
                inString = true;
                stringChar = char;
                currentExpr += char;
            } else if (char === stringChar) {
                if (columnList[i + 1] === char) {
                    currentExpr += char + char;
                    i++;
                } else {
                    inString = false;
                    stringChar = "";
                    currentExpr += char;
                }
            } else {
                currentExpr += char;
            }
        } else if (char === "(" && !inString) {
            depth++;
            currentExpr += char;
        } else if (char === ")" && !inString) {
            depth--;
            currentExpr += char;
        } else if (char === "," && depth === 0 && !inString) {
            columnExpressions.push(currentExpr.trim());
            currentExpr = "";
        } else {
            currentExpr += char;
        }
    }

    if (currentExpr.trim()) {
        columnExpressions.push(currentExpr.trim());
    }

    const columns: ColumnDefinition[] = [];
    for (const expr of columnExpressions) {
        const col = parseColumnExpression(expr, tables);
        if (col) {
            columns.push(col);
        }
    }

    return columns;
}

/**
 * Parse CREATE VIEW or CREATE MATERIALIZED VIEW statements
 */
export function parseViewDefinition(
    sqlContent: string,
    schema: string = "public",
    allTables: TableDefinition[] = []
): ViewDefinition | null {
    const viewMatch = sqlContent.match(
        /create\s+(materialized\s+)?view\s+(?:if\s+not\s+exists\s+)?(?:(?:"([^"]+)"|'([^']+)'|(\w+))\.)?(?:"([^"]+)"|'([^']+)'|(\w+))\s+as\s+([\s\S]+?)(?=\s+with\s+(?:no\s+)?data|;|$)/i
    );

    if (!viewMatch) {
        return null;
    }

    const isMaterialized = !!viewMatch[1];
    const viewSchema = viewMatch[2] || viewMatch[3] || viewMatch[4] || schema;
    const viewName = viewMatch[5] || viewMatch[6] || viewMatch[7];
    const definition = viewMatch[8].trim();

    const tables = extractTableReferences(definition, allTables, viewSchema);
    const columns = parseSelectColumns(definition, tables, viewSchema);

    return {
        schema: viewSchema,
        name: viewName,
        columns,
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
