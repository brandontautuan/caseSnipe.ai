/**
 * CaseSnipe.ai — Lazy loader for precedent vector store
 * Loads from data/precedent-index/index.json (built by npm run build:precedent)
 */

import * as fs from "fs";
import * as path from "path";
import { Document } from "@langchain/core/documents";
import type { EmbeddingsInterface } from "@langchain/core/embeddings";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import type { VectorStore } from "@langchain/core/vectorstores";

const INDEX_PATH = path.join(process.cwd(), "data", "precedent-index", "index.json");

let cachedStore: VectorStore | null = null;

interface IndexPayload {
  documents: Array<{ pageContent: string; metadata: Record<string, unknown> }>;
  vectors: number[][];
}

/**
 * Lazily loads the precedent vector store from disk.
 * Takes embeddings as parameter to keep loader decoupled from config.
 * Returns null if index not built (run npm run build:precedent).
 */
export async function getPrecedentStore(embeddings: EmbeddingsInterface): Promise<VectorStore | null> {
  if (cachedStore) return cachedStore;

  if (!fs.existsSync(INDEX_PATH)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(INDEX_PATH, "utf-8");
    const payload = JSON.parse(raw) as IndexPayload;
    const docs = payload.documents.map(
      (d) => new Document({ pageContent: d.pageContent, metadata: d.metadata })
    );
    const store = new MemoryVectorStore(embeddings);
    await store.addVectors(payload.vectors, docs);
    cachedStore = store;
    return store;
  } catch {
    return null;
  }
}
