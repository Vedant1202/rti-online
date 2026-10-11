import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft, Landmark } from "lucide-react";
import { requirePageUser } from "@/lib/auth/guard";
import { getDb } from "@/lib/db/client";
import { authorities, feeDemands, payments, requests } from "@/lib/db/schema";
import { formatRupees } from "@/lib/rti/fees";
import { CardForm } from "./card-form";

export default async function CheckoutPage(props: PageProps<"/pay/[checkoutId]">) {
  const { checkoutId } = await props.params;
  const user = await requirePageUser(`/pay/${checkoutId}`, ["citizen"]);
  const db = await getDb();
  const [payment] = await db.select().from(payments).where(eq(payments.id, checkoutId));
  if (!payment) notFound();
  const [req] = await db.select().from(requests).where(eq(requests.id, payment.requestId));
  if (req.citizenId !== user.id) notFound();
  if (payment.status !== "pending") redirect(`/requests/${req.id}`);
  const [authority] = await db.select().from(authorities).where(eq(authorities.id, req.authorityId));
  const demand = payment.feeDemandId
    ? (await db.select().from(feeDemands).where(eq(feeDemands.id, payment.feeDemandId)))[0]
    : null;
  const amount = formatRupees(payment.amountPaise);

  return (
    <div className="mx-auto grid w-full max-w-4xl overflow-hidden rounded-xl border border-line bg-surface shadow-sm md:grid-cols-[1fr_1.1fr]">
      <section className="grid content-start gap-6 border-b border-line bg-paper p-6 md:border-b-0 md:border-r md:p-10" aria-labelledby="summary-heading">
        <Link href={`/requests/${req.id}/pay`} className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft size={16} aria-hidden="true" /> Back
        </Link>
        <div className="grid gap-1">
          <p className="flex items-center gap-2 text-sm text-muted">
            <Landmark size={16} aria-hidden="true" /> {authority.name}
          </p>
          <h2 id="summary-heading" className="text-sm font-semibold text-muted">
            {payment.purpose === "fee" ? "RTI application fee" : "Additional fee"}
          </h2>
          <p className="text-4xl font-bold tabular-nums">{amount}</p>
        </div>
        <dl className="grid gap-2 border-t border-line pt-4 text-sm">
          {(demand?.items ?? [{ label: "Application fee (RTI Rules 2012, rule 3)", quantity: 1, unitPaise: payment.amountPaise }]).map((i) => (
            <div key={i.label} className="flex justify-between gap-4">
              <dt className="text-muted">
                {i.label}
                {i.quantity > 1 && ` × ${i.quantity}`}
              </dt>
              <dd className="tabular-nums">{formatRupees(i.quantity * i.unitPaise)}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-4 border-t border-line pt-2 font-semibold">
            <dt>Total due</dt>
            <dd className="tabular-nums">{amount}</dd>
          </div>
        </dl>
        <p className="text-xs text-muted">
          For: <span className="text-ink">{req.subject}</span>
        </p>
      </section>
      <section className="p-6 md:p-10" aria-labelledby="pay-heading">
        <CardForm checkoutId={payment.id} amount={amount} />
      </section>
    </div>
  );
}
