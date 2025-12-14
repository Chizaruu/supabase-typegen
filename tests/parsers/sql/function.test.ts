/**
 * Tests for function definition parser
 */

import { describe, it, expect } from "vitest";
import { parseFunctionDefinition } from "../../../src/parsers/sql/function.js";

describe("parseFunctionDefinition", () => {
    it("should parse basic function", () => {
        const sql = `
      create function get_user(user_id uuid)
      returns table(id uuid, email text)
      language sql
      as $$
        select id, email from users where id = user_id;
      $$;
    `;
        const result = parseFunctionDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.name).toBe("get_user");
        expect(result!.schema).toBe("public");
        expect(result!.args).toHaveLength(1);
        expect(result!.args[0].name).toBe("user_id");
        expect(result!.args[0].type).toBe("uuid");
    });

    it("should parse function with schema", () => {
        const sql = `
      create function auth.verify_user(email text)
      returns boolean
      language plpgsql
      as $$
      begin
        return exists(select 1 from auth.users where users.email = verify_user.email);
      end;
      $$;
    `;
        const result = parseFunctionDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.schema).toBe("auth");
        expect(result!.name).toBe("verify_user");
    });

    it("should parse function with multiple arguments", () => {
        const sql = `
      create function calculate_total(quantity integer, price numeric)
      returns numeric
      language sql
      as $$
        select quantity * price;
      $$;
    `;
        const result = parseFunctionDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.args).toHaveLength(2);
        expect(result!.args[0].name).toBe("quantity");
        expect(result!.args[0].type).toBe("integer");
        expect(result!.args[1].name).toBe("price");
        expect(result!.args[1].type).toBe("numeric");
    });

    it("should parse function with default argument", () => {
        const sql = `
      create function greet(name text default 'World')
      returns text
      language sql
      as $$
        select 'Hello, ' || name;
      $$;
    `;
        const result = parseFunctionDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.args[0].hasDefault).toBe(true);
    });

    it("should parse function with or replace", () => {
        const sql = `
      create or replace function test_func()
      returns integer
      language sql
      as $$
        select 1;
      $$;
    `;
        const result = parseFunctionDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.name).toBe("test_func");
    });

    it("should return null for invalid SQL", () => {
        const sql = "not a function definition";
        const result = parseFunctionDefinition(sql);

        expect(result).toBeNull();
    });

    it("should handle quoted function names", () => {
        const sql = `
      create function "myFunction"()
      returns integer
      language sql
      as $$
        select 1;
      $$;
    `;
        const result = parseFunctionDefinition(sql);

        expect(result).toBeTruthy();
        expect(result!.name).toBe("myFunction");
    });

    it("should handle extra commas/whitespace in arguments (lines 33-34)", () => {
        const sql = `
      create function test_func(arg1 text, , arg2 integer)
      returns void
      language sql
      as $$
        select null;
      $$;
    `;
        const result = parseFunctionDefinition(sql);

        expect(result).toBeTruthy();
        // Should skip the empty argument and parse the valid ones
        expect(result!.args.length).toBeGreaterThanOrEqual(1);
    });
});
