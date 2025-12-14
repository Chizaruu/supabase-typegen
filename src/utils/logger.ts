/**
 * Console output utilities
 */

import type { ColorName } from "../types/index.ts";

export const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    green: "\x1b[32m",
    blue: "\x1b[34m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    cyan: "\x1b[36m",
} as const;

let VERBOSE_LOGGING = true;

export function setVerboseLogging(verbose: boolean): void {
    VERBOSE_LOGGING = verbose;
}

export function log(
    message: string,
    color: ColorName = "reset",
    force = false
): void {
    if (VERBOSE_LOGGING || force) {
        console.log(`${colors[color]}${message}${colors.reset}`);
    }
}
