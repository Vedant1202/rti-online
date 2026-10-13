import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { authorities, documents, feeDemands, requestEvents, requests, users } from "@/lib/db/schema";
import { caseClocks } from "@/lib/rti/case-clock";
import { notFound } from "@/lib/http";
import type { User } from "@/lib/auth/rbac";
import { assertCanView, canView } from "./access";
import { nextAction, type NextAction } from "@/lib/next-action";

type Req = typeof requests.$inferSelect;

async function loadClockInputs(ids: string[]) {
  const db = await getDb();
  if (ids.length === 0) return { events: [], demands: [] };
  const [events, demands] = await Promise.all([
    db.select().from(requestEvents).where(inArray(requestEvents.requestId, ids)).orderBy(asc(requestEvents.at)),
    db.select().from(feeDemands).where(inArray(feeDemands.requestId, ids)).orderBy(asc(feeDemands.sentAt)),
  ]);
  return { events, demands };
}

function clocksFor(req: Req, inputs: Awaited<ReturnType<typeof loadClockInputs>>, now: Date) {
  return caseClocks(
    req,
    inputs.events.filter((e) => e.requestId === req.id),
    inputs.demands.filter((d) => d.requestId === req.id),
    now,
  );
}

/** Follows transfers forward: original → transferred copy → … The last one is the live request. */
async function transferChain(start: Req): Promise<Req[]> {
  const db = await getDb();
  const chain = [start];
  for (let i = 0; i < 5; i++) {
    const [next] = await db.select().from(requests).where(eq(requests.transferredFromId, chain.at(-1)!.id));
    if (!next) break;
    chain.push(next);
  }
  return chain;
}

export async function getCaseView(user: User, id: string, now: Date) {
  const db = await getDb();
  const [root] = await db.select().from(requests).where(eq(requests.id, id));
  if (!root) throw notFound();
  assertCanView(user, root);

  const chain = await transferChain(root);
  const visibleChain = chain.filter((r) => canView(user, r));
  const current = chain.at(-1)!;
  const ids = chain.map((r) => r.id);

  const parts = await db
    .select()
    .from(requests)
    .where(and(inArray(requests.parentId, ids), eq(requests.kind, "R")))
    .orderBy(asc(requests.regNo));
  const appeals = await db
    .select()
    .from(requests)
    .where(and(inArray(requests.parentId, [...ids, ...parts.map((p) => p.id)]), eq(requests.kind, "A")))
    .orderBy(asc(requests.createdAt));
  const parent = root.kind === "R" && root.parentId
    ? (await db.select().from(requests).where(eq(requests.id, root.parentId)))[0] ?? null
    : null;

  const inputs = await loadClockInputs([...ids, ...parts.map((p) => p.id)]);
  const authorityIds = [...new Set([...chain, ...parts].map((r) => r.authorityId))];
  const authorityRows = await db.select().from(authorities).where(inArray(authorities.id, authorityIds));
  const authorityName = (aid: string) => authorityRows.find((a) => a.id === aid)?.name ?? "";

  const actorIds = [...new Set(inputs.events.map((e) => e.actorId).filter((x): x is string => Boolean(x)))];
  const actors = actorIds.length ? await db.select().from(users).where(inArray(users.id, actorIds)) : [];
  const docs = await db
    .select()
    .from(documents)
    .where(inArray(documents.requestId, [...ids, ...parts.map((p) => p.id)]))
    .orderBy(asc(documents.createdAt));
  const cpioIds = [...new Set([current, ...parts].map((r) => r.assignedCpioId).filter((x): x is string => Boolean(x)))];
  const cpios = cpioIds.length ? await db.select().from(users).where(inArray(users.id, cpioIds)) : [];

  const timeline = inputs.events
    .filter((e) => visibleChain.some((r) => r.id === e.requestId))
    .map((e) => {
      const actor = actors.find((a) => a.id === e.actorId);
      return { ...e, actorRole: actor?.role ?? null, actorName: actor?.name ?? null };
    });

  return {
    root,
    current,
    chain: visibleChain.map((r) => ({ id: r.id, regNo: r.regNo, authority: authorityName(r.authorityId), status: r.status })),
    authority: authorityName(current.authorityId),
    parent,
    parts: parts.map((p) => ({
      ...p,
      authority: authorityName(p.authorityId),
      cpioName: cpios.find((c) => c.id === p.assignedCpioId)?.name ?? null,
      clocks: clocksFor(p, inputs, now),
    })),
    appeals,
    timeline,
    documents: docs,
    demands: inputs.demands.filter((d) => d.requestId === current.id),
    cpioName: cpios.find((c) => c.id === current.assignedCpioId)?.name ?? null,
    clocks: clocksFor(current, inputs, now),
  };
}

export type CaseView = Awaited<ReturnType<typeof getCaseView>>;

/** A citizen's requests, newest first. Transfers and split parts appear under their original. */
export async function listCitizenRequests(user: User, now: Date) {
  const db = await getDb();
  const roots = await db
    .select()
    .from(requests)
    .where(
      and(
        eq(requests.citizenId, user.id),
        eq(requests.kind, "R"),
        isNull(requests.parentId),
        isNull(requests.transferredFromId),
      ),
    )
    .orderBy(desc(requests.createdAt));

  const out = [];
  for (const root of roots) {
    const chain = await transferChain(root);
    const current = chain.at(-1)!;
    const ids = chain.map((r) => r.id);
    const parts = await db
      .select()
      .from(requests)
      .where(and(inArray(requests.parentId, ids), eq(requests.kind, "R")))
      .orderBy(asc(requests.regNo));
    const appeals = await db
      .select({ parentId: requests.parentId })
      .from(requests)
      .where(and(inArray(requests.parentId, [...ids, ...parts.map((p) => p.id)]), eq(requests.kind, "A")));
    const inputs = await loadClockInputs([current.id, ...parts.map((p) => p.id)]);
    const [authority] = await db.select().from(authorities).where(eq(authorities.id, current.authorityId));

    // A split request's next steps come from its parts, in part order (/1, /2, …).
    const actions = (parts.length ? parts : [current])
      .map((r) =>
        nextAction({
          id: r.id,
          status: r.status,
          bpl: r.bpl,
          openFeePaise: inputs.demands.find((d) => d.requestId === r.id && !d.paidAt)?.totalPaise ?? null,
          appeal: clocksFor(r, inputs, now).appeal,
          appealed: appeals.some((a) => a.parentId === r.id || (parts.length === 0 && ids.includes(a.parentId!))),
          hasParts: false,
        }),
      )
      .filter((a): a is NextAction => a !== null);

    out.push({
      id: root.id,
      regNo: current.regNo ?? root.regNo,
      subject: root.subject,
      authority: authority?.name ?? "",
      status: current.status,
      createdAt: root.createdAt,
      reply: clocksFor(current, inputs, now).reply,
      actions,
    });
  }
  return out;
}
