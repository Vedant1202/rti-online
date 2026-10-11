import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requirePageUser } from "@/lib/auth/guard";
import { getDb } from "@/lib/db/client";
import { payments, requests } from "@/lib/db/schema";
import { formatRupees } from "@/lib/rti/fees";
import { GatewayActions } from "./gateway-actions";

/** A stand-in for a payment gateway page. It looks deliberately different from the app. */
export default async function MockGatewayPage(props: PageProps<"/pay/mock/[checkoutId]">) {
  const { checkoutId } = await props.params;
  const user = await requirePageUser(`/pay/mock/${checkoutId}`, ["citizen"]);
  const db = await getDb();
  const [payment] = await db.select().from(payments).where(eq(payments.id, checkoutId));
  if (!payment) notFound();
  const [req] = await db.select().from(requests).where(eq(requests.id, payment.requestId));
  if (req.citizenId !== user.id) notFound();
  if (payment.status !== "pending") redirect(`/requests/${req.id}`);

  return (
    <div className="mx-auto grid max-w-md gap-4 rounded-xl border-2 border-dashed border-warn bg-surface p-6">
      <div className="grid gap-1">
        <p className="font-mono text-xs uppercase tracking-widest text-warn">MockPay · test gateway</p>
        <h1 className="text-xl font-bold">No real money moves here</h1>
        <p className="text-sm text-muted">
          This page stands in for a bank or UPI gateway. Pick an outcome to see how the app handles it.
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <dt className="text-muted">Merchant</dt>
        <dd>RTI Online Rebuild</dd>
        <dt className="text-muted">Purpose</dt>
        <dd>{payment.purpose === "fee" ? "RTI application fee" : "Additional fee"}</dd>
        <dt className="text-muted">Amount</dt>
        <dd className="text-lg font-bold tabular-nums">{formatRupees(payment.amountPaise)}</dd>
        <dt className="text-muted">Reference</dt>
        <dd className="truncate font-mono text-xs">{payment.id}</dd>
      </dl>
      <GatewayActions checkoutId={payment.id} cancelUrl={`/requests/${req.id}/pay`} />
    </div>
  );
}
