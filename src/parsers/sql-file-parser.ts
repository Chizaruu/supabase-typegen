/**
 * Main SQL file parsing orchestrator
 */

import { readFileSync } from "fs";
import type {
    TableDefinition,
    EnumDefinition,
    FunctionDefinition,
    CompositeTypeDefinition,
    IndexDefinition,
    ViewDefinition,
} from "../types/index.js";
import { log } from "../utils/logger.js";
import {
    parseTableDefinition,
    parseEnumDefinition,
    parseFunctionDefinition,
    parseCompositeType,
    parseIndexDefinition,
    parseTableComment,
    parseColumnComment,
    parseAlterTableForeignKey,
    parseAlterTableUnique,
    parseViewDefinition,
    parseViewComment,
} from "./sql-parsers.js";

export function parseSqlFiles(
    filePaths: string[],
    schema: string,
    includeComments: boolean = true
): {
    tables: TableDefinition[];
    enums: EnumDefinition[];
    functions: FunctionDefinition[];
    compositeTypes: CompositeTypeDefinition[];
    views: ViewDefinition[]; // ADDED
} {
    log("\n📊 Step 1: Parsing SQL schema files...", "bright");

    const tables: TableDefinition[] = [];
    const enums: EnumDefinition[] = [];
    const functions: FunctionDefinition[] = [];
    const compositeTypes: CompositeTypeDefinition[] = [];
    const views: ViewDefinition[] = []; // ADDED
    const indexesByTable: Map<string, IndexDefinition[]> = new Map();
    const alterTableForeignKeys: Array<{
        tableName: string;
        relationship: any;
    }> = [];
    const alterTableUniques: Array<{ tableName: string; columns: string[] }> =
        [];

    for (const filePath of filePaths) {
        try {
            const content = readFileSync(filePath, "utf8");
            const fileName = filePath.split(/[/\\]/).pop() || filePath;

            log(`\n  Processing: ${fileName}`, "cyan");

            const statements = content.split(/;(?:\s*\n|$)/);

            const tableComments = includeComments
                ? new Map<string, string>()
                : null;
            const columnComments = includeComments
                ? new Map<string, Map<string, string>>()
                : null;
            const viewComments = includeComments
                ? new Map<string, string>()
                : null;

            // Track tables added in this file for comment attachment
            const tablesAddedInThisFile: TableDefinition[] = [];
            const viewsAddedInThisFile: ViewDefinition[] = [];

            for (const statement of statements) {
                const trimmed = statement.trim();
                if (!trimmed) continue;

                const table = parseTableDefinition(trimmed, schema);
                if (table) {
                    tables.push(table);
                    tablesAddedInThisFile.push(table);
                    continue;
                }

                const enumDef = parseEnumDefinition(trimmed, schema);
                if (enumDef) {
                    enums.push(enumDef);
                    continue;
                }

                const funcDef = parseFunctionDefinition(trimmed, schema);
                if (funcDef) {
                    functions.push(funcDef);
                    continue;
                }

                const compositeDef = parseCompositeType(trimmed, schema);
                if (compositeDef) {
                    compositeTypes.push(compositeDef);
                    continue;
                }

                const viewDef = parseViewDefinition(trimmed, schema);
                if (viewDef) {
                    views.push(viewDef);
                    viewsAddedInThisFile.push(viewDef);
                    continue;
                }

                const indexDef = parseIndexDefinition(trimmed, schema);
                if (indexDef) {
                    if (!indexesByTable.has(indexDef.tableName)) {
                        indexesByTable.set(indexDef.tableName, []);
                    }
                    indexesByTable.get(indexDef.tableName)!.push(indexDef);
                    continue;
                }

                const alterFK = parseAlterTableForeignKey(trimmed, schema);
                if (alterFK) {
                    alterTableForeignKeys.push(alterFK);
                    continue;
                }

                const alterUnique = parseAlterTableUnique(trimmed, schema);
                if (alterUnique) {
                    alterTableUniques.push(alterUnique);
                    continue;
                }

                if (includeComments) {
                    const tableComment = parseTableComment(trimmed, schema);
                    if (tableComment) {
                        tableComments!.set(
                            tableComment.tableName,
                            tableComment.comment
                        );
                        continue;
                    }

                    const columnComment = parseColumnComment(trimmed, schema);
                    if (columnComment) {
                        if (!columnComments!.has(columnComment.tableName)) {
                            columnComments!.set(
                                columnComment.tableName,
                                new Map()
                            );
                        }
                        columnComments!
                            .get(columnComment.tableName)!
                            .set(
                                columnComment.columnName,
                                columnComment.comment
                            );
                        continue;
                    }

                    const viewComment = parseViewComment(trimmed, schema);
                    if (viewComment) {
                        viewComments!.set(
                            viewComment.viewName,
                            viewComment.comment
                        );
                        continue;
                    }
                }
            }

            // Attach comments to tables added in THIS file only
            if (includeComments && tableComments && columnComments) {
                for (const table of tablesAddedInThisFile) {
                    const tableComment = tableComments.get(table.name);
                    if (tableComment) {
                        table.comment = tableComment;
                    }

                    const colComments = columnComments.get(table.name);
                    if (colComments) {
                        for (const column of table.columns) {
                            const comment = colComments.get(column.name);
                            if (comment) {
                                column.comment = comment;
                            }
                        }
                    }
                }
            }

            if (includeComments && viewComments) {
                for (const view of viewsAddedInThisFile) {
                    const viewComment = viewComments.get(view.name);
                    if (viewComment) {
                        view.comment = viewComment;
                    }
                }
            }
        } catch (error) {
            const errorMsg =
                error instanceof Error ? error.message : String(error);
            log(`  ✗ Error parsing ${filePath}: ${errorMsg}`, "red");
        }
    }

    // Attach indexes to tables
    for (const table of tables) {
        const tableIndexes = indexesByTable.get(table.name) || [];
        table.indexes = tableIndexes;
    }

    // Apply ALTER TABLE UNIQUE constraints
    for (const alterUnique of alterTableUniques) {
        const table = tables.find((t) => t.name === alterUnique.tableName);
        if (table) {
            for (const colName of alterUnique.columns) {
                const column = table.columns.find((c) => c.name === colName);
                if (column) {
                    column.isUnique = true;
                }
            }
        }
    }

    // Attach ALTER TABLE foreign keys
    for (const alterFK of alterTableForeignKeys) {
        const table = tables.find((t) => t.name === alterFK.tableName);
        if (table) {
            const fkColumns = alterFK.relationship.columns;
            let isOneToOne = false;

            if (fkColumns.length === 1) {
                const colName = fkColumns[0];
                const column = table.columns.find((c) => c.name === colName);
                const columnHasUnique =
                    column?.isUnique || column?.isPrimaryKey;
                const hasUniqueIndex = table.indexes.some(
                    (idx) =>
                        idx.isUnique &&
                        idx.columns.length === 1 &&
                        idx.columns[0] === colName
                );
                isOneToOne = columnHasUnique || hasUniqueIndex;
            }

            if (isOneToOne) {
                alterFK.relationship.isOneToOne = true;
            }

            table.relationships.push(alterFK.relationship);
        }
    }

    log(`\n  ✓ Parsed ${tables.length} table(s)`, "green");
    if (enums.length > 0) log(`  ✓ Parsed ${enums.length} enum(s)`, "green");
    if (functions.length > 0)
        log(`  ✓ Parsed ${functions.length} function(s)`, "green");
    if (compositeTypes.length > 0)
        log(`  ✓ Parsed ${compositeTypes.length} composite type(s)`, "green");
    if (views.length > 0) log(`  ✓ Parsed ${views.length} view(s)`, "green");

    return { tables, enums, functions, compositeTypes, views };
}
