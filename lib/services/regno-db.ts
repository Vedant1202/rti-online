import { sql } from "drizzle-orm";
import { regCounters } from "@/lib/db/schema";
import { formatRegNo } from "@/lib/rti/regno";
import type { Receipt, RequestKind } from "@/lib/contract";
import type { Tx } from "./events";

/** Year in India Standard Time (UTC+5:30), so a request filed at 1 a.m. IST on 1 Jan gets the new year. */
export function istYear(date: Date): number {
  return new Date(date.getTime() + 5.5 * 60 * 60 * 1000).getUTCFullYear();
}

/** Atomically takes the next serial for (authority, kind, receipt, year). Safe under concurrent calls. */
export async function nextRegNo(
  tx: Tx,
  p: { authorityCode: string; kind: RequestKind; receipt: Receipt; at: Date },
): Promise<string> {
  const year = istYear(p.at);
  const [row] = await tx
    .insert(regCounters)
    .values({ authorityCode: p.authorityCode, kind: p.kind, receipt: p.receipt, year, lastSerial: 1 })
    .onConflictDoUpdate({
      target: [regCounters.authorityCode, regCounters.kind, regCounters.receipt, regCounters.year],
      set: { lastSerial: sql`${regCounters.lastSerial} + 1` },
    })
    .returning({ serial: regCounters.lastSerial });
  return formatRegNo({ authorityCode: p.authorityCode, kind: p.kind, receipt: p.receipt, year, serial: row.serial });
}
