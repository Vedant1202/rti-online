import { REQUEST_KINDS, RECEIPTS, type Receipt, type RequestKind } from "@/lib/contract";

export type RegNoParts = {
  authorityCode: string;
  kind: RequestKind;
  receipt: Receipt;
  year: number;
  serial: number;
};

/** AUTHCODE/R|A/E|P|T|X|L/YY/NNNNN, the format documented in the RTI Online manual (p.29). */
export function formatRegNo({ authorityCode, kind, receipt, year, serial }: RegNoParts): string {
  if (!Number.isInteger(serial) || serial < 1 || serial > 99_999) {
    throw new RangeError(`Serial ${serial} does not fit in 5 digits`);
  }
  const yy = String(year % 100).padStart(2, "0");
  return `${authorityCode}/${kind}/${receipt}/${yy}/${String(serial).padStart(5, "0")}`;
}

/** A request split across CPIOs gets one number per part: parent/1, parent/2… (manual p.25). */
export function splitRegNo(parent: string, part: number): string {
  return `${parent}/${part}`;
}

const PATTERN = /^([A-Z&]{2,10})\/([A-Z])\/([A-Z])\/(\d{2})\/(\d{5})(?:\/(\d+))?$/;

export function parseRegNo(value: string): (RegNoParts & { part: number | null }) | null {
  const m = PATTERN.exec(value.trim());
  if (!m) return null;
  const [, authorityCode, kind, receipt, yy, serial, part] = m;
  if (!REQUEST_KINDS.includes(kind as RequestKind) || !RECEIPTS.includes(receipt as Receipt)) {
    return null;
  }
  return {
    authorityCode,
    kind: kind as RequestKind,
    receipt: receipt as Receipt,
    year: 2000 + Number(yy),
    serial: Number(serial),
    part: part ? Number(part) : null,
  };
}
