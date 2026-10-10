import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";

/**
 * File storage: Vercel Blob (private) when BLOB_READ_WRITE_TOKEN is set,
 * otherwise .data/uploads on disk for local dev, or memory in tests.
 */
const memory = new Map<string, Uint8Array>();
const blobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN) && process.env.NODE_ENV !== "test";
const localPath = (key: string) => path.join(process.cwd(), ".data", "uploads", key);

export async function putFile(key: string, bytes: Uint8Array, contentType: string): Promise<void> {
  if (process.env.NODE_ENV === "test") {
    memory.set(key, bytes);
  } else if (blobEnabled()) {
    const { put } = await import("@vercel/blob");
    await put(key, Buffer.from(bytes), { access: "private", contentType, addRandomSuffix: false });
  } else {
    await mkdir(path.dirname(localPath(key)), { recursive: true });
    await writeFile(localPath(key), bytes);
  }
}

export async function getFile(key: string): Promise<Uint8Array | null> {
  if (process.env.NODE_ENV === "test") return memory.get(key) ?? null;
  if (blobEnabled()) {
    const { get } = await import("@vercel/blob");
    const result = await get(key, { access: "private" });
    if (!result || result.statusCode !== 200) return null;
    return new Uint8Array(await new Response(result.stream).arrayBuffer());
  }
  try {
    return new Uint8Array(await readFile(localPath(key)));
  } catch {
    return null;
  }
}
