import type { Db } from "@/lib/db/client";
import { requestEvents } from "@/lib/db/schema";
import type { EventType } from "@/lib/contract";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0] | Db;

export async function addEvent(
  tx: Tx,
  e: { requestId: string; type: EventType; actorId?: string | null; at: Date; payload?: Record<string, unknown> },
) {
  await tx.insert(requestEvents).values({
    requestId: e.requestId,
    type: e.type,
    actorId: e.actorId ?? null,
    at: e.at,
    payload: e.payload ?? {},
  });
}

export type { Tx };
