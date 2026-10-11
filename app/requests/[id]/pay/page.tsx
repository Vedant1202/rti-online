import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requirePageUser } from "@/lib/auth/guard";
import { getDb } from "@/lib/db/client";
import { authorities, feeDemands, requests } from "@/lib/db/schema";
import { RTI_FEE_PAISE } from "@/lib/contract";
import { formatRupees } from "@/lib/rti/fees";
import { PayButton } from "./pay-button";
import { HelpTip } from "@/components/help-tip";

export default async function PayPage(props: PageProps<"/requests/[id]/pay">) {
  const { id } = await props.params;
  const { failed } = await props.searchParams;
  const user = await requirePageUser(`/requests/${id}/pay`, ["citizen"]);
  const db = await getDb();
  const [req] = await db.select().from(requests).where(eq(requests.id, id));
  if (!req || req.citizenId !== user.id) notFound();
  if (req.status !== "pending_payment" && req.status !== "fee_requested") redirect(`/requests/${id}`);
  const [authority] = await db.select().from(authorities).where(eq(authorities.id, req.authorityId));

  let amount = req.bpl ? 0 : RTI_FEE_PAISE;
  let items: { label: string; quantity: number; unitPaise: number }[] = [];
  if (req.status === "fee_requested") {
    const demands = await db.select().from(feeDemands).where(eq(feeDemands.requestId, id));
    const open = demands.find((d) => !d.paidAt);
    amount = open?.totalPaise ?? 0;
    items = open?.items ?? [];
  }

  return (
    <div className="grid max-w-xl gap-6">
      <h1 className="text-2xl font-bold">{req.status === "fee_requested" ? "Pay the additional fee" : "Pay the RTI fee"}</h1>
      {failed && (
        <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          The payment didn&apos;t go through. No money was taken. Try again.
        </p>
      )}
      <div className="card grid gap-3">
        <p className="text-sm text-muted">{authority.name}</p>
        <p className="font-semibold">{req.subject}</p>
        {items.length > 0 && (
          <table className="w-full text-sm">
            <tbody>
              {items.map((i) => (
                <tr key={i.label} className="border-b border-line">
                  <td className="py-1">{i.label}</td>
                  <td className="py-1 text-right tabular-nums">
                    {i.quantity} × {formatRupees(i.unitPaise)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="flex items-center gap-1 text-3xl font-bold tabular-nums">
          {formatRupees(amount)} <HelpTip topic={req.status === "fee_requested" ? "pausedClock" : "fee"} />
        </p>
        <PayButton
          requestId={req.id}
          label={req.bpl && req.status === "pending_payment" ? "File request (no fee)" : `Pay ${formatRupees(amount)}`}
        />
      </div>
    </div>
  );
}
