/**
 * CaseSnipe.ai — Build precedent index for RAG
 * Loads joelniklaus/legal_case_document_summarization, embeds summaries, saves to data/precedent-index/
 *
 * Run: npm run build:precedent
 * Requires: OPENROUTER_API_KEY in .env.local
 */

import * as path from "path";
import { config } from "dotenv";

// Load .env.local so OPENROUTER_API_KEY is available (tsx does not auto-load it)
config({ path: path.resolve(process.cwd(), ".env.local") });

import { HFDataset } from "hf-dataset";
import { Document } from "@langchain/core/documents";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import * as fs from "fs";

const INDEX_DIR = path.join(process.cwd(), "data", "precedent-index");
// Cap for demo cost/time; full dataset ~8k would incur significant embedding cost at OpenRouter rates
const DOC_CAP = 1500;
const DATASET_ID = "joelniklaus/legal_case_document_summarization";
// main has .jsonl.xz (unsupported); parquet branch has .parquet
const DATASET_REVISION = "refs/convert/parquet";
// Dataset columns: judgement, dataset_name, summary (HuggingFace viewer)
const SUMMARY_FIELD = "summary";

const EMBED_MODEL = "openai/text-embedding-3-small";
const EMBED_BATCH = 10; // Fallback to 1-by-1 if batch fails (OpenRouter can be flaky)

async function embedBatch(texts: string[], apiKey: string): Promise<number[][]> {
  const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (json.error) {
    const err = json.error as { message?: string; code?: number };
    throw new Error(`Embedding API error: ${err.message ?? JSON.stringify(json.error)}`);
  }
  const data = json.data ?? json.embeddings ?? json.result;
  if (!Array.isArray(data)) {
    console.error("Embedding response keys:", Object.keys(json));
    throw new Error("Invalid embedding response: missing data array");
  }
  const sorted = data.length > 1 && (data[0] as { index?: number }).index != null
    ? [...data].sort((a, b) => ((a as { index?: number }).index ?? 0) - ((b as { index?: number }).index ?? 0))
    : data;
  return sorted.map((d) => (d as { embedding: number[] }).embedding);
}

async function main() {
  console.log("Building precedent index...");
  console.log(`Dataset: ${DATASET_ID}`);
  console.log(`Cap: ${DOC_CAP} documents`);
  console.log(`Field: ${SUMMARY_FIELD}`);

  let docs: Document[] = [];
  try {
    const dataset = await HFDataset.create(DATASET_ID, { revision: DATASET_REVISION });
    let count = 0;
    for await (const row of dataset) {
      if (count >= DOC_CAP) break;
      const raw = (row as Record<string, unknown>)[SUMMARY_FIELD];
      const summary = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : String(raw ?? "");
      let content = typeof summary === "string" ? summary.trim() : "";
      // Skip empty; truncate very long (embedding models have ~8k token limit)
      if (content.length > 0) {
        if (content.length > 8000) content = content.slice(0, 8000) + "...";
        docs.push(
          new Document({
            pageContent: content,
            metadata: { id: count, source: DATASET_ID },
          })
        );
        count++;
      }
    }
    console.log(`Loaded ${docs.length} documents`);
  } catch (err) {
    console.error("ERROR: Failed to load dataset:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  if (docs.length === 0) {
    console.error("ERROR: No documents with field '" + SUMMARY_FIELD + "' found");
    process.exit(1);
  }

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    console.error("ERROR: OPENROUTER_API_KEY not set");
    process.exit(1);
  }

  // Use raw fetch for OpenRouter (LangChain client has response parsing issues)
  const allVectors: number[][] = [];
  for (let i = 0; i < docs.length; i += EMBED_BATCH) {
    const batch = docs.slice(i, i + EMBED_BATCH);
    const texts = batch.map((d) => d.pageContent);
    try {
      const batchVectors = await embedBatch(texts, apiKey);
      allVectors.push(...batchVectors);
    } catch (err) {
      // Fallback: embed one by one if batch fails
      console.warn(`  Batch failed at ${i}, embedding individually...`);
      for (const text of texts) {
        const v = await embedBatch([text], apiKey);
        allVectors.push(v[0]);
      }
    }
    if ((i + EMBED_BATCH) % 200 === 0 || i + EMBED_BATCH >= docs.length) {
      console.log(`  Embedded ${Math.min(i + EMBED_BATCH, docs.length)} / ${docs.length}`);
    }
  }

  // Store needs embeddings for runtime similaritySearch; use OpenAIEmbeddings for that
  const embeddings = new OpenAIEmbeddings({
    model: EMBED_MODEL,
    apiKey,
    configuration: { baseURL: "https://openrouter.ai/api/v1" },
  });

  let store: MemoryVectorStore;
  try {
    store = new MemoryVectorStore(embeddings);
    await store.addVectors(allVectors, docs);
  } catch (err) {
    console.error("ERROR: Failed to build store:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  // Persist to JSON (MemoryVectorStore has no native save)
  fs.mkdirSync(INDEX_DIR, { recursive: true });
  const vectors = (store as any).memoryVectors as Array<{ content: string; embedding: number[]; metadata: Record<string, unknown> }>;
  const payload = {
    documents: vectors.map((v) => ({ pageContent: v.content, metadata: v.metadata })),
    vectors: vectors.map((v) => v.embedding),
  };
  fs.writeFileSync(path.join(INDEX_DIR, "index.json"), JSON.stringify(payload), "utf-8");
  console.log(`Saved to ${INDEX_DIR}/index.json`);
  console.log("Done.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
