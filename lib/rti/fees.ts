import type { FeeItem } from "@/lib/contract";

export function feeTotalPaise(items: FeeItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity * i.unitPaise, 0);
}

export function formatRupees(paise: number): string {
  const rupees = paise / 100;
  return `₹${Number.isInteger(rupees) ? rupees : rupees.toFixed(2)}`;
}
