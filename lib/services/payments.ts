import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { authorities, feeDemands, payments, requests } from "@/lib/db/schema";
import { RTI_FEE_PAISE } from "@/lib/contract";
import { paidLine } from "@/lib/card";
import { badRequest, conflict, forbidden, notFound } from "@/lib/http";
import type { User } from "@/lib/auth/rbac";
import { addEvent, type Tx } from "./events";
import { nextRegNo } from "./regno-db";
import { notifyCitizen } from "./notify";

export type CheckoutResult =
  | { kind: "checkout"; paymentId: string; amountPaise: number }
  | { kind: "filed"; regNo: string };

/**
 * Starts (or reuses) a checkout for the request's fee or its outstanding additional fee.
 * BPL requests skip payment and are filed straight away.
 */
export async function startCheckout(user: User, requestId: string, now: Date): Promise<CheckoutResult> {
  const db = await getDb();
  const [req] = await db.select().from(requests).where(eq(requests.id, requestId));
  if (!req) throw notFound();
  if (req.citizenId !== user.id) throw forbidden();

  let purpose: "fee" | "additional";
  let amountPaise: number;
  let feeDemandId: string | null = null;
  if (req.status === "pending_payment") {
    if (req.bpl) {
      const filed = await db.transaction((tx) => fileRequestTx(tx, req.id, randomUUID(), now, { bpl: true }));
      if (filed.fresh) await notifyFiled(filed, req.id);
      return { kind: "filed", regNo: filed.regNo };
    }
    purpose = "fee";
    amountPaise = RTI_FEE_PAISE;
  } else if (req.status === "fee_requested") {
    const [demand] = await db
      .select()
      .from(feeDemands)
      .where(eq(feeDemands.requestId, req.id))
      .orderBy(feeDemands.sentAt);
    const open = demand && !demand.paidAt ? demand : null;
    if (!open) throw conflict("There is no fee to pay on this request.");
    purpose = "additional";
    amountPaise = open.totalPaise;
    feeDemandId = open.id;
  } else {
    throw conflict("Nothing to pay on this request.");
  }

  // A double click or a refresh reuses the open checkout instead of creating a second one.
  const [pending] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.requestId, req.id), eq(payments.purpose, purpose), eq(payments.status, "pending")));
  if (pending) return { kind: "checkout", paymentId: pending.id, amountPaise: pending.amountPaise };

  const [created] = await db
    .insert(payments)
    .values({ requestId: req.id, purpose, feeDemandId, amountPaise, idempotencyKey: randomUUID(), createdAt: now })
    .returning();
  return { kind: "checkout", paymentId: created.id, amountPaise };
}

export function signWebhook(paymentId: string, outcome: "success" | "failure"): string {
  const secret = process.env.MOCK_PAYMENT_SECRET ?? "dev-mock-payment-secret";
  return createHmac("sha256", secret).update(`${paymentId}.${outcome}`).digest("hex");
}

/** What the mock gateway calls back. Verifies the signature, then completes the payment idempotently. */
export type { CardSummary } from "@/lib/card";
import type { CardSummary } from "@/lib/card";

export async function handleWebhook(
  paymentId: string,
  body: { outcome: "success" | "failure"; signature: string; card?: CardSummary },
  now: Date,
) {
  const expected = Buffer.from(signWebhook(paymentId, body.outcome));
  const given = Buffer.from(body.signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    throw badRequest("Invalid webhook signature.");
  }
  return completePayment(paymentId, body.outcome, now, body.card);
}

export type PaymentOutcome = { status: "succeeded" | "failed" | "pending"; requestId: string; regNo: string | null };

/** Idempotent: only the first successful call files the request and assigns the number. */
export async function completePayment(
  paymentId: string,
  outcome: "success" | "failure",
  now: Date,
  card?: CardSummary,
): Promise<PaymentOutcome> {
  const db = await getDb();
  const result = await db.transaction(async (tx) => {
    const [won] = await tx
      .update(payments)
      .set({
        status: outcome === "success" ? "succeeded" : "failed",
        completedAt: now,
        cardBrand: outcome === "success" ? (card?.brand ?? null) : null,
        cardLast4: outcome === "success" ? (card?.last4 ?? null) : null,
      })
      .where(and(eq(payments.id, paymentId), eq(payments.status, "pending")))
      .returning();
    if (!won) {
      const [existing] = await tx.select().from(payments).where(eq(payments.id, paymentId));
      if (!existing) throw notFound("Unknown payment.");
      const [req] = await tx.select().from(requests).where(eq(requests.id, existing.requestId));
      return { status: existing.status, requestId: req.id, regNo: req.regNo, notify: null, filed: null };
    }
    if (outcome === "failure") {
      return { status: "failed" as const, requestId: won.requestId, regNo: null, notify: null, filed: null };
    }
    if (won.purpose === "fee") {
      const filed = await fileRequestTx(tx, won.requestId, won.id, now, {
        bpl: false,
        receipt: { amountPaise: won.amountPaise, card: card ?? null },
      });
      return { status: "succeeded" as const, requestId: won.requestId, regNo: filed.regNo, notify: null, filed };
    }
    // Additional fee: close the demand and resume the reply clock (s.7(3)).
    await tx.update(feeDemands).set({ paidAt: now }).where(eq(feeDemands.id, won.feeDemandId!));
    const [req] = await tx
      .update(requests)
      .set({ status: "forwarded" })
      .where(eq(requests.id, won.requestId))
      .returning();
    await addEvent(tx, {
      requestId: req.id,
      type: "fee_paid",
      actorId: req.citizenId,
      at: now,
      payload: { amountPaise: won.amountPaise, card: card ?? null },
    });
    return {
      status: "succeeded" as const,
      requestId: req.id,
      regNo: req.regNo,
      notify: { citizenId: req.citizenId, regNo: req.regNo, amountPaise: won.amountPaise, card: card ?? null },
      filed: null,
    };
  });

  // Emails go out only after the transaction has committed.
  if (result.filed?.fresh) await notifyFiled(result.filed, result.requestId);
  if (result.notify) {
    await notifyCitizen(result.notify.citizenId, {
      subject: `Additional fee received for ${result.notify.regNo}`,
      lines: [
        "We received your additional fee. The reply clock has started again.",
        paidLine(result.notify.amountPaise, result.notify.card),
      ],
      requestId: result.requestId,
    });
  }
  return { status: result.status, requestId: result.requestId, regNo: result.regNo };
}

type Receipt = { amountPaise: number; card: CardSummary | null };
type Filed = {
  regNo: string;
  fresh: boolean;
  citizenId: string;
  authorityName: string;
  subject: string;
  receipt?: Receipt;
};

/** Marks a paid (or BPL) request as filed with its new registration number. Runs inside a transaction. */
async function fileRequestTx(
  tx: Tx,
  requestId: string,
  paymentKey: string,
  now: Date,
  opts: { bpl: boolean; receipt?: Receipt },
): Promise<Filed> {
  const [req] = await tx.select().from(requests).where(eq(requests.id, requestId));
  const [authority] = await tx.select().from(authorities).where(eq(authorities.id, req.authorityId));
  if (req.regNo) return { regNo: req.regNo, fresh: false, citizenId: req.citizenId, authorityName: authority.name, subject: req.subject };
  if (opts.bpl) {
    // The unique idempotency key makes a repeated BPL filing a no-op.
    await tx
      .insert(payments)
      .values({
        requestId,
        purpose: "fee",
        amountPaise: 0,
        idempotencyKey: `bpl:${requestId}`,
        status: "succeeded",
        createdAt: now,
        completedAt: now,
      })
      .onConflictDoNothing({ target: payments.idempotencyKey });
  }
  const regNo = await nextRegNo(tx, { authorityCode: authority.code, kind: "R", receipt: "E", at: now });
  await tx.update(requests).set({ regNo, status: "filed", filedAt: now }).where(eq(requests.id, requestId));
  await addEvent(tx, {
    requestId,
    type: "filed",
    actorId: req.citizenId,
    at: now,
    payload: {
      regNo,
      authority: authority.name,
      paymentKey,
      bpl: opts.bpl,
      amountPaise: opts.receipt?.amountPaise ?? 0,
      card: opts.receipt?.card ?? null,
    },
  });
  if (req.lifeLiberty === "claimed") {
    await addEvent(tx, {
      requestId,
      type: "life_liberty_claimed",
      actorId: req.citizenId,
      at: now,
      payload: { reason: req.lifeLibertyReason },
    });
  }
  return {
    regNo,
    fresh: true,
    citizenId: req.citizenId,
    authorityName: authority.name,
    subject: req.subject,
    receipt: opts.receipt,
  };
}

async function notifyFiled(filed: Filed, requestId: string) {
  await notifyCitizen(filed.citizenId, {
    subject: `RTI request filed: ${filed.regNo}`,
    lines: [
      `Your RTI request has been filed with the ${filed.authorityName}.`,
      `Registration number: ${filed.regNo}`,
      `Subject: ${filed.subject}`,
      ...(filed.receipt ? [paidLine(filed.receipt.amountPaise, filed.receipt.card)] : []),
      "The authority must reply within 30 days. We'll email you at each step.",
    ],
    requestId,
  });
}
