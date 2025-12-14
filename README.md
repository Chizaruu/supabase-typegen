# supabase-typegen

[![npm version](https://img.shields.io/npm/v/supabase-typegen.svg)](https://www.npmjs.com/package/supabase-typegen)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/supabase-typegen.svg)](https://nodejs.org)

> 🚀 Advanced SQL-to-TypeScript type generator for Supabase projects with comprehensive schema support

Generate type-safe TypeScript definitions from your Supabase SQL migration files with support for tables, enums, functions, composite types, JSONB inference, indexes, and more.

## ✨ Features

### Core Type Generation

-   ✅ **Tables** - Full support for Row, Insert, and Update types
-   ✅ **Enums** - Type-safe enum definitions with runtime constants
-   ✅ **Functions** - Function signatures with typed arguments and returns
-   ✅ **Composite Types** - PostgreSQL composite type definitions
-   ✅ **Views** - Read-only view types (including materialized views)
-   ✅ **Indexes** - Index metadata (optional with `--include-indexes`)

### Advanced Features

-   ✅ **JSONB Type Inference** - Automatically infer TypeScript types from JSONB defaults
-   ✅ **Nested Type Extraction** - Deep type extraction for complex JSONB structures
-   ✅ **Geometric Types** - Point, Line, Box, Circle, Polygon support
-   ✅ **Relationships** - Foreign key relationships with one-to-one detection
-   ✅ **Comments** - Preserve SQL comments as JSDoc
-   ✅ **Multi-Schema** - Support for multiple database schemas
-   ✅ **Type Deduplication** - Automatic removal of duplicate JSONB types

### Developer Experience

-   🎨 **Naming Conventions** - `preserve`, `PascalCase`, `camelCase`, `snake_case`, `SCREAMING_SNAKE_CASE`
-   📝 **Prettier Integration** - Respects your Prettier configuration
-   🔤 **Alphabetical Sorting** - Deterministic output ordering
-   🎯 **Smart Defaults** - Sensible defaults, minimal configuration needed
-   📦 **Runtime Constants** - Enum values for dropdowns and validation

## 📦 Installation

```bash
npm install supabase-typegen --save-dev
# or
yarn add -D supabase-typegen
# or
pnpm add -D supabase-typegen
```

## 🚀 Quick Start

### Basic Usage

```bash
# Generate types from default Supabase directory
npx supabase-typegen

# Specify custom workdir
npx supabase-typegen --local ./my-supabase

# Custom output directory
npx supabase-typegen --output ./src/types
```

### Using Generated Types

```typescript
import type {
    Database,
    Tables,
    TablesInsert,
    TablesUpdate,
    Enums,
} from "./database";

// Table types
type User = Tables<"users">;
type UserInsert = TablesInsert<"users">;
type UserUpdate = TablesUpdate<"users">;

// Enum types
type UserStatus = Enums<"user_status">;

// Access nested types
type UserRow = Database["public"]["Tables"]["users"]["Row"];

// With Supabase client
import { createClient } from "@supabase/supabase-js";

const supabase = createClient<Database>(url, anonKey);

// Fully typed queries
const { data } = await supabase
    .from("users")
    .select("*")
    .eq("status", "active"); // Type-safe!
```

## 📖 Usage

### Command Line Options

#### Source & Schema

```bash
# Use local SQL files (default)
npx supabase-typegen --local [workdir]

# Use live database connection
npx supabase-typegen --db --connection-string "postgresql://..."

# Specify target schema
npx supabase-typegen --schema public
```

#### Output & Formatting

```bash
# Custom output directory
npx supabase-typegen --output ./src/lib/types

# Naming convention
npx supabase-typegen --naming camelCase
# Options: preserve, PascalCase, camelCase, snake_case, SCREAMING_SNAKE_CASE

# Alphabetical sorting
npx supabase-typegen --alphabetical

# Custom indentation
npx supabase-typegen --indent-size 4

# Use Prettier config
npx supabase-typegen --use-prettier
```

#### Type Features

```bash
# Include index metadata in types
npx supabase-typegen --include-indexes

# Extract nested JSONB types
npx supabase-typegen --extract-nested

# Enable/disable type deduplication
npx supabase-typegen --deduplicate        # Enable (default)
npx supabase-typegen --no-deduplicate     # Disable

# Exclude comments from output
npx supabase-typegen --no-comments
```

#### Logging

```bash
# Disable verbose logging
npx supabase-typegen --silent
npx supabase-typegen --no-logs
npx supabase-typegen --quiet
```

### Configuration File

The generator reads your `supabase/config.toml` automatically:

```toml
[db.migrations]
schema_paths = [
  "migrations/*.sql",
  "migrations/schemas/**/*.sql"
]
```

## 🎯 Type Generation Examples

### Tables

**Input SQL:**

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  status user_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE users IS 'Application users';
COMMENT ON COLUMN users.email IS 'User email address';
```

**Generated Types:**

```typescript
/**
 * Application users
 */
users: {
  Row: {
    id: string
    /** User email address */
    email: string
    status: Database['public']['Enums']['user_status']
    created_at: string
  }
  Insert: {
    id?: string
    email: string
    status?: Database['public']['Enums']['user_status']
    created_at?: string
  }
  Update: {
    id?: string
    email?: string
    status?: Database['public']['Enums']['user_status']
    created_at?: string
  }
  Relationships: []
}
```

### Enums

**Input SQL:**

```sql
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'pending');
```

**Generated Types:**

```typescript
Enums: {
    user_status: "active" | "inactive" | "pending";
}

// Runtime constants
Constants: {
    public: {
        Enums: {
            user_status: ["active", "inactive", "pending"];
        }
    }
}
```

### Functions

**Input SQL:**

```sql
CREATE FUNCTION get_user_posts(user_id UUID, limit_count INT DEFAULT 10)
RETURNS TABLE (id UUID, title TEXT, created_at TIMESTAMPTZ)
LANGUAGE SQL;
```

**Generated Types:**

```typescript
Functions: {
  get_user_posts: {
    Args: {
      user_id: string
      limit_count?: number
    }
    Returns: {
      id: string
      title: string
      created_at: string
    }[]
  }
}
```

### JSONB Types

**Input SQL:**

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY,
  metadata JSONB DEFAULT '{"tags": [], "featured": false, "rating": 0}'::jsonb
);
```

**Generated Types:**

```typescript
// Automatically inferred JSONB type
export type products_metadata = {
    tags: unknown[];
    featured: boolean;
    rating: number;
};

// Merged into table
products: {
    Row: {
        id: string;
        metadata: products_metadata | null;
    }
    // ...
}
```

### Relationships

**Input SQL:**

```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, id)  -- One-to-one relationship detected
);
```

**Generated Types:**

```typescript
posts: {
  Row: { /* ... */ }
  Insert: { /* ... */ }
  Update: { /* ... */ }
  Relationships: [
    {
      foreignKeyName: "posts_user_id_fkey"
      columns: ["user_id"]
      isOneToOne: true
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
  ]
}
```

### Composite Types

**Input SQL:**

```sql
CREATE TYPE address AS (
  street TEXT,
  city TEXT,
  zip TEXT
);
```

**Generated Types:**

```typescript
CompositeTypes: {
    address: {
        street: string;
        city: string;
        zip: string;
    }
}
```

## 🎨 Naming Conventions

The generator supports multiple naming conventions for generated types:

```bash
# Original SQL names (default)
npx supabase-typegen --naming preserve
# → user_profiles, created_at

# PascalCase
npx supabase-typegen --naming PascalCase
# → UserProfiles, CreatedAt

# camelCase
npx supabase-typegen --naming camelCase
# → userProfiles, createdAt

# snake_case
npx supabase-typegen --naming snake_case
# → user_profiles, created_at

# SCREAMING_SNAKE_CASE
npx supabase-typegen --naming SCREAMING_SNAKE_CASE
# → USER_PROFILES, CREATED_AT
```

## 🔍 Advanced Features

### JSONB Type Inference

The generator can automatically infer TypeScript types from JSONB default values:

```sql
-- Simple JSONB
settings JSONB DEFAULT '{"theme": "dark", "notifications": true}'::jsonb

-- Generated:
export type table_settings = {
  theme: string
  notifications: boolean
}

-- Nested JSONB (with --extract-nested)
metadata JSONB DEFAULT jsonb_build_object(
  'user', jsonb_build_object('name', '', 'age', 0),
  'preferences', jsonb_build_object('theme', 'light')
)

-- Generated (nested types extracted):
export type table_metadata_user = {
  name: string
  age: number
}

export type table_metadata_preferences = {
  theme: string
}

export type table_metadata = {
  user: table_metadata_user
  preferences: table_metadata_preferences
}
```

### Index Metadata

With `--include-indexes`, index information is included in the generated types:

```typescript
users: {
  Row: { /* ... */ }
  Insert: { /* ... */ }
  Update: { /* ... */ }
  Relationships: []
  Indexes: [
    {
      name: "users_email_idx"
      columns: ["email"]
      isUnique: true
      method: "btree"
    },
    {
      name: "users_created_at_idx"
      columns: ["created_at"]
      isUnique: false
      method: "btree"
      where: "deleted_at IS NULL"
    }
  ]
}
```

### Geometric Types

PostgreSQL geometric types are automatically detected and typed:

```sql
CREATE TABLE locations (
  id UUID PRIMARY KEY,
  position POINT,
  area POLYGON
);
```

```typescript
// Auto-generated geometric type definitions
export type Point = { x: number; y: number } | string;
export type Polygon = { points: Point[] } | string;

// Used in table types
locations: {
    Row: {
        id: string;
        position: Point | null;
        area: Polygon | null;
    }
}
```

### Multi-Schema Support

Generate types for multiple schemas:

```typescript
export interface Database {
    public: {
        Tables: {
            /* ... */
        };
        Enums: {
            /* ... */
        };
    };
    auth: {
        Tables: {
            /* ... */
        };
    };
    storage: {
        Tables: {
            /* ... */
        };
    };
}

// Access specific schema
type AuthUser = Database["auth"]["Tables"]["users"]["Row"];
```

## 🏗️ Project Structure

```
your-project/
├── supabase/
│   ├── config.toml
│   └── migrations/
│       ├── 20240101000000_initial.sql
│       ├── 20240102000000_add_users.sql
│       └── 20240103000000_add_posts.sql
├── src/
│   └── lib/
│       └── types/
│           └── generated/
│               └── database.ts  ← Generated types
└── package.json
```

## 🤝 Integration Examples

### With Supabase Client

```typescript
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database";

const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

// Fully typed CRUD operations
const { data: users } = await supabase
    .from("users")
    .select("id, email, status")
    .eq("status", "active");

// Type: { id: string; email: string; status: "active" | "inactive" | "pending" }[]
```

### With React Hook Form + Zod

```typescript
import { useForm } from "react-hook-form";
import type { TablesInsert } from "./database";

type UserInsert = TablesInsert<"users">;

function CreateUserForm() {
    const { register, handleSubmit } = useForm<UserInsert>();

    const onSubmit = async (data: UserInsert) => {
        await supabase.from("users").insert(data);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <input {...register("email")} type="email" required />
            <button type="submit">Create User</button>
        </form>
    );
}
```

### With tRPC

```typescript
import type { Database, TablesInsert } from "./database";

export const userRouter = router({
    create: publicProcedure
        .input(
            z.object({
                email: z.string().email(),
                name: z.string(),
            })
        )
        .mutation(
            async ({
                input,
            }): Promise<Database["public"]["Tables"]["users"]["Row"]> => {
                const { data } = await supabase
                    .from("users")
                    .insert(input)
                    .select()
                    .single();

                return data;
            }
        ),
});
```

## 📚 Helper Types

The generator provides several helper types for convenience:

```typescript
// Get table Row type
type User = Tables<"users">;
type Post = Tables<"posts">;

// Get Insert type (optional fields for defaults)
type UserInsert = TablesInsert<"users">;
type PostInsert = TablesInsert<"posts">;

// Get Update type (all fields optional)
type UserUpdate = TablesUpdate<"users">;
type PostUpdate = TablesUpdate<"posts">;

// Get Enum type
type UserStatus = Enums<"user_status">;

// Multi-schema support
type AuthUser = Tables<"users", { schema: "auth" }>;

// Composite types
type Address = CompositeTypes<"address">;
```

## 🎯 Best Practices

### 1. Version Control Generated Files

```gitignore
# Don't ignore generated types!
# src/lib/types/generated/database.ts
```

Commit generated types so team members get type safety without running the generator.

### 2. Regenerate After Migrations

Add to your migration workflow:

```json
{
    "scripts": {
        "db:migrate": "supabase migration up && npm run types:generate",
        "types:generate": "supabase-typegen"
    }
}
```

### 3. Use Type-Safe Queries

```typescript
// ✅ Good - Fully typed
const { data } = await supabase
    .from("users")
    .select("id, email, posts(title)")
    .eq("status", "active");

// ❌ Bad - Loses type safety
const { data } = await supabase.from("users").select("*");
```

### 4. Leverage Enums

```typescript
import { Constants } from "./database";

// Use runtime enum values for dropdowns
const statusOptions = Constants.public.Enums.user_status.map((status) => ({
    value: status,
    label: status.charAt(0).toUpperCase() + status.slice(1),
}));
```

## 🔧 Configuration Options

### CLI Flags Summary

| Flag                        | Description                | Default                     |
| --------------------------- | -------------------------- | --------------------------- |
| `--local [workdir]`         | Use local SQL files        | `./supabase`                |
| `--workdir <path>`          | Explicit workdir path      | -                           |
| `--db`                      | Use database connection    | `false`                     |
| `--connection-string <url>` | Database connection URL    | `$DATABASE_URL`             |
| `--schema <name>`           | Target schema              | `public`                    |
| `--output <dir>`            | Output directory           | `./src/lib/types/generated` |
| `--naming <convention>`     | Naming convention          | `preserve`                  |
| `--alphabetical`            | Sort alphabetically        | `false`                     |
| `--extract-nested`          | Extract nested JSONB types | `false`                     |
| `--deduplicate`             | Deduplicate types          | `true`                      |
| `--no-deduplicate`          | Disable deduplication      | -                           |
| `--indent-size <n>`         | Indentation (1-8)          | `2`                         |
| `--use-prettier`            | Use Prettier config        | `false`                     |
| `--include-indexes`         | Include index metadata     | `false`                     |
| `--no-comments`             | Exclude SQL comments       | `false`                     |
| `--silent`                  | Disable logging            | `false`                     |

## 🚧 Roadmap

### Coming Soon

-   [ ] **Row Level Security (RLS) Policies** - Policy metadata in table types
-   [ ] **Check Constraints** - Constraint metadata for validation
-   [ ] **Runtime Validators** - Zod/Valibot schema generation
-   [ ] **Type Guards** - Runtime type checking functions
-   [ ] **Triggers** - Trigger metadata
-   [ ] **Domain Types** - Custom domain type support
-   [ ] **Range Types** - PostgreSQL range type support

### Under Consideration

-   [ ] Database introspection mode (read from live DB)
-   [ ] Migration diff generator
-   [ ] GraphQL schema generation
-   [ ] OpenAPI schema generation

## 🐛 Known Limitations

-   **View Columns**: Currently requires explicit column typing or database introspection
-   **Complex JSONB**: Very deep nesting (5+ levels) may need manual type refinement
-   **Recursive Types**: Self-referential types need manual handling
-   **Computed Columns**: Generated/computed columns not yet supported

## 💡 Tips & Tricks

### Custom Type Overrides

Override generated types for special cases:

```typescript
import type { Database as GeneratedDatabase } from "./generated/database";

// Extend or override types
export interface Database extends GeneratedDatabase {
    public: GeneratedDatabase["public"] & {
        Tables: GeneratedDatabase["public"]["Tables"] & {
            users: {
                Row: GeneratedDatabase["public"]["Tables"]["users"]["Row"] & {
                    // Add computed fields
                    fullName: string;
                };
            };
        };
    };
}
```

### Monorepo Setup

```json
{
    "scripts": {
        "types:generate:app1": "supabase-typegen --workdir ./apps/app1/supabase --output ./apps/app1/src/types",
        "types:generate:app2": "supabase-typegen --workdir ./apps/app2/supabase --output ./apps/app2/src/types",
        "types:generate:all": "npm run types:generate:app1 && npm run types:generate:app2"
    }
}
```

### CI/CD Integration

```yaml
# .github/workflows/types.yml
name: Check Types

on: [pull_request]

jobs:
    check-types:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v3
            - uses: actions/setup-node@v3
            - run: npm ci
            - run: npm run types:generate
            - run: git diff --exit-code src/lib/types/generated/
              name: Verify types are up to date
```

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 📄 License

MIT © [chizaruu](https://github.com/chizaruu)

## 🙏 Acknowledgments

-   Built for [Supabase](https://supabase.com/) projects
-   Inspired by the official `supabase gen types` command
-   Uses battle-tested SQL parsing techniques

## 📞 Support

-   📖 [Documentation](https://github.com/chizaruu/supabase-typegen#readme)
-   💬 [Discussions](https://github.com/chizaruu/supabase-typegen/discussions)
-   🐛 [Issue Tracker](https://github.com/chizaruu/supabase-typegen/issues)

---

**Made with ❤️ for the Supabase community**
