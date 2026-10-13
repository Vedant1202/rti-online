import { z } from "zod";

/** The shared contract: statuses, event types and inputs that every part of the app uses. */

export const ROLES = ["citizen", "nodal", "cpio", "faa", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const REQUEST_KINDS = ["R", "A"] as const; // R = request, A = appeal
export type RequestKind = (typeof REQUEST_KINDS)[number];

// Receipt types from the RTI Online manual: E online, P physical, T transferred, X part-transfer, L legacy.
export const RECEIPTS = ["E", "P", "T", "X", "L"] as const;
export type Receipt = (typeof RECEIPTS)[number];

export const REQUEST_STATUSES = [
  "pending_payment", // created, fee not yet paid
  "filed", // paid, with the nodal officer
  "forwarded", // with a CPIO
  "split", // parent of several CPIO parts; each part carries its own status
  "transferred", // moved to another authority under a new number
  "fee_requested", // CPIO asked for an additional fee; reply clock paused
  "documents_requested", // CPIO asked the applicant for a document
  "replied",
  "rejected",
  "closed_unpaid", // additional fee not paid within 30 days
  "appeal_filed", // appeal is with the FAA
  "appeal_decided",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const EVENT_TYPES = [
  "filed",
  "forwarded",
  "split",
  "transferred_out",
  "transferred_in",
  "fee_requested",
  "fee_paid",
  "documents_requested",
  "documents_uploaded",
  "replied",
  "rejected",
  "closed_unpaid",
  "life_liberty_claimed",
  "life_liberty_accepted",
  "life_liberty_declined",
  "appeal_filed",
  "appeal_extended",
  "appeal_decided",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const LIFE_LIBERTY = ["none", "claimed", "accepted", "declined"] as const;
export type LifeLiberty = (typeof LIFE_LIBERTY)[number];

export const DOCUMENT_KINDS = [
  "attachment",
  "bpl_certificate",
  "reply",
  "requested_document",
  "order",
] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

// The five grounds offered by the real portal's first-appeal form.
export const APPEAL_GROUNDS = [
  "Refused access to information requested",
  "No response within the time limit",
  "Unreasonable amount of fee required to pay",
  "Provided incomplete, misleading or false information",
  "Any other ground",
] as const;
export type AppealGround = (typeof APPEAL_GROUNDS)[number];
/** Dictionary keys for showing each ground in the visitor's language (the stored value stays English). */
export const APPEAL_GROUND_KEY = {
  "Refused access to information requested": "refused",
  "No response within the time limit": "noResponse",
  "Unreasonable amount of fee required to pay": "fee",
  "Provided incomplete, misleading or false information": "incomplete",
  "Any other ground": "other",
} as const satisfies Record<AppealGround, string>;

export const MAX_REQUEST_CHARS = 20_000;
export const SOFT_WORD_LIMIT = 500;
export const MAX_UPLOAD_BYTES = 1_000_000;
export const RTI_FEE_PAISE = 1_000; // ₹10, RTI Rules 2012 rule 3

const uuid = z.uuid();
const text = (max: number) => z.string().trim().min(1).max(max);

export const otpSendInput = z.object({ email: z.email().toLowerCase() });
export const otpVerifyInput = z.object({
  email: z.email().toLowerCase(),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const createRequestInput = z.object({
  authorityId: uuid,
  subject: text(150),
  body: text(MAX_REQUEST_CHARS),
  bpl: z.boolean().default(false),
  attachmentId: uuid.optional(),
  bplCertificateId: uuid.optional(),
  lifeLibertyReason: z.string().trim().max(2_000).optional(),
});
export type CreateRequestInput = z.infer<typeof createRequestInput>;

export const forwardInput = z.object({ cpioIds: z.array(uuid).min(1).max(10) });
export const transferInput = z.object({
  toAuthorityId: uuid,
  note: text(1_000),
});
export const replyInput = z.object({ body: text(MAX_REQUEST_CHARS), documentId: uuid.optional() });
export const rejectInput = z.object({ reason: text(2_000) });
export const feeItem = z.object({
  label: text(120),
  quantity: z.int().min(1).max(10_000),
  unitPaise: z.int().min(0).max(10_000_000),
});
export const feeDemandInput = z.object({ items: z.array(feeItem).min(1).max(20) });
export type FeeItem = z.infer<typeof feeItem>;
export const documentsRequestInput = z.object({ note: text(1_000) });
export const documentsUploadInput = z.object({ documentId: uuid });
export const lifeLibertyDecisionInput = z.object({
  accept: z.boolean(),
  reason: text(1_000),
});
export const appealInput = z.object({
  requestId: uuid,
  ground: z.enum(APPEAL_GROUNDS),
  body: text(MAX_REQUEST_CHARS),
  delayReason: z.string().trim().max(2_000).optional(),
});
export const extendInput = z.object({ reason: text(1_000) });
export const decideInput = z.object({ order: text(MAX_REQUEST_CHARS), documentId: uuid.optional() });
export const draftInput = z.object({ payload: z.record(z.string(), z.unknown()) });

// Card checkout: only the brand and the last 4 digits may reach the server. Anything else is rejected.
export const checkoutInput = z.strictObject({
  brand: z.enum(["visa", "mastercard", "amex", "rupay"]),
  last4: z.string().regex(/^\d{4}$/),
});
