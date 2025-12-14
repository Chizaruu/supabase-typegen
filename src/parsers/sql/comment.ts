/**
 * Comment statement parsing from SQL
 */

export function parseTableComment(
    sqlContent: string,
    schema: string = "public"
): { tableName: string; comment: string; schema: string } | null {
    const commentMatch = sqlContent.match(
        /comment\s+on\s+table\s+(?:["']?(\w+)["']?\.)?["']?(\w+)["']?\s+is\s+'([^']+)'/i
    );

    if (!commentMatch) {
        return null;
    }

    const tableSchema = commentMatch[1] || schema;
    const tableName = commentMatch[2];
    const comment = commentMatch[3];

    return {
        tableName,
        comment,
        schema: tableSchema,
    };
}

export function parseColumnComment(
    sqlContent: string,
    schema: string = "public"
): {
    tableName: string;
    columnName: string;
    comment: string;
    schema: string;
} | null {
    const commentMatch = sqlContent.match(
        /comment\s+on\s+column\s+(?:["']?(\w+)["']?\.)?["']?(\w+)["']?\.["']?(\w+)["']?\s+is\s+'([^']+)'/i
    );

    if (!commentMatch) {
        return null;
    }

    const tableSchema = commentMatch[1] || schema;
    const tableName = commentMatch[2];
    const columnName = commentMatch[3];
    const comment = commentMatch[4];

    return {
        tableName,
        columnName,
        comment,
        schema: tableSchema,
    };
}
