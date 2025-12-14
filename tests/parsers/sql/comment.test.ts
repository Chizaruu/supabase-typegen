/**
 * Tests for comment statement parser
 */

import { describe, it, expect } from "vitest";
import {
    parseTableComment,
    parseColumnComment,
} from "../../../src/parsers/sql/comment.ts";

describe("parseTableComment", () => {
    it("should parse basic table comment", () => {
        const sql = "COMMENT ON TABLE users IS 'User accounts';";
        const result = parseTableComment(sql);

        expect(result).toBeTruthy();
        expect(result!.tableName).toBe("users");
        expect(result!.comment).toBe("User accounts");
        expect(result!.schema).toBe("public");
    });

    it("should parse table comment with schema prefix", () => {
        const sql = "COMMENT ON TABLE myschema.users IS 'User accounts';";
        const result = parseTableComment(sql);

        expect(result).toBeTruthy();
        expect(result!.schema).toBe("myschema");
    });

    it("should use custom schema parameter", () => {
        const sql = "COMMENT ON TABLE users IS 'User accounts';";
        const result = parseTableComment(sql, "custom");

        expect(result!.schema).toBe("custom");
    });

    it("should prefer SQL schema over parameter", () => {
        const sql = "COMMENT ON TABLE myschema.users IS 'User accounts';";
        const result = parseTableComment(sql, "custom");

        expect(result!.schema).toBe("myschema");
    });

    it("should parse table comment with quoted table name", () => {
        const sql = "COMMENT ON TABLE \"users\" IS 'User accounts';";
        const result = parseTableComment(sql);

        expect(result).toBeTruthy();
        expect(result!.tableName).toBe("users");
    });

    it("should parse comment with special characters", () => {
        const sql = "COMMENT ON TABLE users IS 'User''s accounts & data!';";
        const result = parseTableComment(sql);

        expect(result!.comment).toBe("User's accounts & data!");
    });

    it("should parse empty comment", () => {
        const sql = "COMMENT ON TABLE users IS '';";
        const result = parseTableComment(sql);

        expect(result).toBeTruthy();
        expect(result!.comment).toBe("");
    });

    it("should parse comment with extra whitespace", () => {
        const sql = "COMMENT   ON   TABLE   users   IS   'User accounts';";
        const result = parseTableComment(sql);

        expect(result).toBeTruthy();
    });

    it("should return null for non-comment SQL", () => {
        const sql = "CREATE TABLE users (id UUID);";
        const result = parseTableComment(sql);

        expect(result).toBeNull();
    });

    it("should return null for column comment", () => {
        const sql = "COMMENT ON COLUMN users.email IS 'Email';";
        const result = parseTableComment(sql);

        expect(result).toBeNull();
    });

    it("should return null for empty string", () => {
        const result = parseTableComment("");

        expect(result).toBeNull();
    });

    it("should return null for malformed syntax", () => {
        const sql = "COMMENT ON TABLE users;";
        const result = parseTableComment(sql);

        expect(result).toBeNull();
    });

    it("should return null without IS keyword", () => {
        const sql = "COMMENT ON TABLE users 'User accounts';";
        const result = parseTableComment(sql);

        expect(result).toBeNull();
    });
});

describe("parseColumnComment", () => {
    it("should parse basic column comment", () => {
        const sql = "COMMENT ON COLUMN users.email IS 'Email address';";
        const result = parseColumnComment(sql);

        expect(result).toBeTruthy();
        expect(result!.tableName).toBe("users");
        expect(result!.columnName).toBe("email");
        expect(result!.comment).toBe("Email address");
        expect(result!.schema).toBe("public");
    });

    it("should parse column comment with schema prefix", () => {
        const sql =
            "COMMENT ON COLUMN myschema.users.email IS 'Email address';";
        const result = parseColumnComment(sql);

        expect(result).toBeTruthy();
        expect(result!.schema).toBe("myschema");
    });

    it("should use custom schema parameter", () => {
        const sql = "COMMENT ON COLUMN users.email IS 'Email address';";
        const result = parseColumnComment(sql, "custom");

        expect(result!.schema).toBe("custom");
    });

    it("should prefer SQL schema over parameter", () => {
        const sql =
            "COMMENT ON COLUMN myschema.users.email IS 'Email address';";
        const result = parseColumnComment(sql, "custom");

        expect(result!.schema).toBe("myschema");
    });

    it("should parse column comment with quoted table", () => {
        const sql = "COMMENT ON COLUMN \"users\".email IS 'Email address';";
        const result = parseColumnComment(sql);

        expect(result).toBeTruthy();
        expect(result!.tableName).toBe("users");
    });

    it("should parse comment with special characters", () => {
        const sql = "COMMENT ON COLUMN users.email IS 'User''s email & info!';";
        const result = parseColumnComment(sql);

        expect(result!.comment).toBe("User's email & info!");
    });

    it("should parse empty comment", () => {
        const sql = "COMMENT ON COLUMN users.email IS '';";
        const result = parseColumnComment(sql);

        expect(result).toBeTruthy();
        expect(result!.comment).toBe("");
    });

    it("should parse comment with extra whitespace", () => {
        const sql = "COMMENT   ON   COLUMN   users.email   IS   'Email';";
        const result = parseColumnComment(sql);

        expect(result).toBeTruthy();
    });

    it("should return null for non-comment SQL", () => {
        const sql = "CREATE TABLE users (id UUID);";
        const result = parseColumnComment(sql);

        expect(result).toBeNull();
    });

    it("should return null for table comment", () => {
        const sql = "COMMENT ON TABLE users IS 'User accounts';";
        const result = parseColumnComment(sql);

        expect(result).toBeNull();
    });

    it("should return null for empty string", () => {
        const result = parseColumnComment("");

        expect(result).toBeNull();
    });

    it("should return null for malformed syntax", () => {
        const sql = "COMMENT ON COLUMN users.email;";
        const result = parseColumnComment(sql);

        expect(result).toBeNull();
    });

    it("should return null without IS keyword", () => {
        const sql = "COMMENT ON COLUMN users.email 'Email';";
        const result = parseColumnComment(sql);

        expect(result).toBeNull();
    });

    it("should return null without column name", () => {
        const sql = "COMMENT ON COLUMN users IS 'Comment';";
        const result = parseColumnComment(sql);

        expect(result).toBeNull();
    });
});
