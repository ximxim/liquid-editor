import { PGlite } from '@electric-sql/pglite'

export interface DbInstance {
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: T[] }>
  exec(sql: string): Promise<unknown>
}

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    template_initial TEXT NOT NULL,
    schema_json JSONB NOT NULL,
    system_prompt TEXT
  );

  CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    tool_calls JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    seq INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES checkpoints(id),
    template_text TEXT NOT NULL,
    context_data JSONB,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    seq INTEGER NOT NULL
  );
`

export async function initDatabase(): Promise<DbInstance> {
  const db = new PGlite('idb://liquid-ai-editor')
  await db.exec(SCHEMA_SQL)
  return db as unknown as DbInstance
}
