/**
 * Vector Database Module
 *
 * Provides vector storage and similarity search for AI applications
 */

export type VectorDBProvider = 'pinecone' | 'supabase-pgvector' | 'chroma' | 'weaviate';

export interface VectorDBModuleConfig {
  provider: VectorDBProvider;
  dimension?: number; // 1536 for OpenAI, 768 for others
  indexType?: string;
}

export interface VectorDBModuleOutput {
  files: Array<{ path: string; content: string }>;
  envVars: string[];
  dependencies: string[];
  instructions: string[];
}

const pineconeTemplate = `import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const indexName = process.env.PINECONE_INDEX_NAME || 'default';

export async function upsertVectors(vectors: Array<{ id: string; values: number[]; metadata?: Record<string, any> }>) {
  const index = pinecone.index(indexName);
  await index.upsert(vectors);
}

export async function queryVectors(vector: number[], topK = 5) {
  const index = pinecone.index(indexName);
  const results = await index.query({
    vector,
    topK,
    includeMetadata: true,
  });
  return results.matches;
}`;

const supabasePgvectorTemplate = `import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function upsertVector(id: string, embedding: number[], metadata: any) {
  const { error } = await supabase
    .from('embeddings')
    .upsert({
      id,
      embedding,
      metadata,
    });

  if (error) throw error;
}

export async function searchSimilar(queryEmbedding: number[], matchCount = 5) {
  const { data, error } = await supabase.rpc('match_embeddings', {
    query_embedding: queryEmbedding,
    match_count: matchCount,
  });

  if (error) throw error;
  return data;
}`;

const migrationSQL = `-- Enable pgvector extension
create extension if not exists vector;

-- Create embeddings table
create table if not exists embeddings (
  id text primary key,
  embedding vector(1536),
  metadata jsonb,
  created_at timestamp with time zone default now()
);

-- Create index for faster similarity search
create index if not exists embeddings_embedding_idx
  on embeddings
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Create function for similarity search
create or replace function match_embeddings (
  query_embedding vector(1536),
  match_count int default 5
)
returns table (
  id text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    embeddings.id,
    embeddings.metadata,
    1 - (embeddings.embedding <=> query_embedding) as similarity
  from embeddings
  order by embeddings.embedding <=> query_embedding
  limit match_count;
end;
$$;`;

export function generateVectorDBModule(config: VectorDBModuleConfig): VectorDBModuleOutput {
  const files: Array<{ path: string; content: string }> = [];
  const envVars: string[] = [];
  const dependencies: string[] = [];
  const instructions: string[] = [];

  if (config.provider === 'pinecone') {
    files.push({ path: 'lib/vector-db/pinecone.ts', content: pineconeTemplate });
    dependencies.push('@pinecone-database/pinecone');
    envVars.push('PINECONE_API_KEY', 'PINECONE_INDEX_NAME');
    instructions.push('Create a Pinecone index with dimension ' + (config.dimension || 1536));
  } else if (config.provider === 'supabase-pgvector') {
    files.push(
      { path: 'lib/vector-db/supabase.ts', content: supabasePgvectorTemplate },
      { path: 'supabase/migrations/enable-pgvector.sql', content: migrationSQL }
    );
    dependencies.push('pgvector');
    envVars.push('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY');
    instructions.push('Run the migration to enable pgvector extension in Supabase');
    instructions.push('Enable pgvector in Supabase dashboard: Database > Extensions');
  }

  return { files, envVars, dependencies, instructions };
}

export function getVectorDBModulePrompt(config: VectorDBModuleConfig): string {
  return `## Vector Database Module\n\nProvider: ${config.provider}\nDimension: ${config.dimension || 1536}\n\nIncludes vector storage, similarity search, and embedding management.`;
}
