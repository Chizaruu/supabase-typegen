/**
 * Function definition parsing from SQL
 */

import type { FunctionDefinition } from "../../types/index.ts";

export function parseFunctionDefinition(
    sqlContent: string,
    schema: string = "public"
): FunctionDefinition | null {
    const functionMatch = sqlContent.match(
        /create\s+(?:or\s+replace\s+)?function\s+(?:["']?(\w+)["']?\.)?["']?(\w+)["']?\s*\(([^)]*)\)\s+returns\s+(.*?)(?=\s+(?:language|as|security|stable|immutable|volatile|strict|leakproof|called|parallel|cost|rows|support|window|set|begin))/is
    );

    if (!functionMatch) {
        return null;
    }

    const funcSchema = functionMatch[1] || schema;
    const funcName = functionMatch[2];
    const argsStr = functionMatch[3];
    const returnsType = functionMatch[4].trim().replace(/^["']|["']$/g, "");

    const args: Array<{ name: string; type: string; hasDefault?: boolean }> =
        [];

    if (argsStr && argsStr.trim().length > 0) {
        const argParts = argsStr.split(",");

        for (const argPart of argParts) {
            const trimmed = argPart.trim();
            if (!trimmed) {
                continue;
            }

            let argMatch = trimmed.match(
                /^"(\w+)"\s+"([\w\s[\]().,]+)"(?:\s+default\s+.+)?$/i
            );

            if (!argMatch) {
                argMatch = trimmed.match(
                    /^"(\w+)"\s+([\w\s[\]().,]+?)(?:\s+default\s+.+)?$/i
                );
            }

            if (!argMatch) {
                argMatch = trimmed.match(
                    /^(\w+)\s+"([\w\s[\]().,]+)"(?:\s+default\s+.+)?$/i
                );
            }

            if (!argMatch) {
                argMatch = trimmed.match(
                    /^(\w+)\s+([\w\s[\]().,]+?)(?:\s+default\s+.+)?$/i
                );
            }

            if (argMatch) {
                const hasDefault = /\bdefault\b/i.test(trimmed);
                args.push({
                    name: argMatch[1],
                    type: argMatch[2].trim(),
                    hasDefault,
                });
            }
        }
    }

    return {
        schema: funcSchema,
        name: funcName,
        args,
        returns: returnsType,
    };
}
