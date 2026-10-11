import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import type {
  DocumentKind,
  EventType,
  FeeItem,
  LifeLiberty,
  Receipt,
  RequestKind,
  RequestStatus,
  Role,
} from "@/lib/contract";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const createdAt = () => ts("created_at").notNull().defaultNow();

export const authorities = pgTable("authorities", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  ministry: text("ministry").notNull(),
  isCentral: boolean("is_central").notNull().default(true),
  keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  role: text("role").$type<Role>().notNull().default("citizen"),
  authorityId: uuid("authority_id").references(() => authorities.id),
  createdAt: createdAt(),
});

export const requests = pgTable(
  "requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    regNo: text("reg_no").unique(),
    kind: text("kind").$type<RequestKind>().notNull().default("R"),
    receipt: text("receipt").$type<Receipt>().notNull().default("E"),
    // For a split part: the request it was split from. For an appeal: the request appealed.
    parentId: uuid("parent_id"),
    transferredFromId: uuid("transferred_from_id"),
    citizenId: uuid("citizen_id")
      .notNull()
      .references(() => users.id),
    authorityId: uuid("authority_id")
      .notNull()
      .references(() => authorities.id),
    assignedCpioId: uuid("assigned_cpio_id").references(() => users.id),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    bpl: boolean("bpl").notNull().default(false),
    lifeLiberty: text("life_liberty").$type<LifeLiberty>().notNull().default("none"),
    lifeLibertyReason: text("life_liberty_reason"),
    appealGround: text("appeal_ground"),
    appealDelayReason: text("appeal_delay_reason"),
    status: text("status").$type<RequestStatus>().notNull().default("pending_payment"),
    filedAt: ts("filed_at"),
    closedAt: ts("closed_at"),
    createdAt: createdAt(),
  },
  (t) => [
    index("requests_citizen_idx").on(t.citizenId),
    index("requests_authority_idx").on(t.authorityId),
    index("requests_parent_idx").on(t.parentId),
  ],
);

export const requestEvents = pgTable(
  "request_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => requests.id),
    type: text("type").$type<EventType>().notNull(),
    actorId: uuid("actor_id").references(() => users.id),
    at: ts("at").notNull().defaultNow(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => [index("events_request_idx").on(t.requestId, t.at)],
);

export const feeDemands = pgTable("fee_demands", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestId: uuid("request_id")
    .notNull()
    .references(() => requests.id),
  items: jsonb("items").$type<FeeItem[]>().notNull(),
  totalPaise: integer("total_paise").notNull(),
  sentAt: ts("sent_at").notNull(),
  paidAt: ts("paid_at"),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestId: uuid("request_id")
    .notNull()
    .references(() => requests.id),
  purpose: text("purpose").$type<"fee" | "additional">().notNull(),
  feeDemandId: uuid("fee_demand_id").references(() => feeDemands.id),
  amountPaise: integer("amount_paise").notNull(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  status: text("status").$type<"pending" | "succeeded" | "failed">().notNull().default("pending"),
  // Receipt only: the card brand and last 4 digits. Full numbers and CVCs are never received.
  cardBrand: text("card_brand").$type<"visa" | "mastercard" | "amex" | "rupay">(),
  cardLast4: text("card_last4"),
  createdAt: createdAt(),
  completedAt: ts("completed_at"),
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestId: uuid("request_id").references(() => requests.id),
  kind: text("kind").$type<DocumentKind>().notNull(),
  storageKey: text("storage_key").notNull(),
  filename: text("filename").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  uploadedBy: uuid("uploaded_by")
    .notNull()
    .references(() => users.id),
  createdAt: createdAt(),
});

export const drafts = pgTable("drafts", {
  citizenId: uuid("citizen_id")
    .primaryKey()
    .references(() => users.id),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const otps = pgTable(
  "otps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    codeHash: text("code_hash").notNull(),
    expiresAt: ts("expires_at").notNull(),
    usedAt: ts("used_at"),
    attempts: integer("attempts").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("otps_email_idx").on(t.email, t.createdAt)],
);

export const regCounters = pgTable(
  "reg_counters",
  {
    authorityCode: text("authority_code").notNull(),
    kind: text("kind").$type<RequestKind>().notNull(),
    receipt: text("receipt").$type<Receipt>().notNull(),
    year: integer("year").notNull(),
    lastSerial: integer("last_serial").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.authorityCode, t.kind, t.receipt, t.year] })],
);

export const sentReminders = pgTable(
  "sent_reminders",
  {
    requestId: uuid("request_id")
      .notNull()
      .references(() => requests.id),
    kind: text("kind").notNull(),
    sentAt: ts("sent_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.requestId, t.kind] })],
);

export const aiUsage = pgTable(
  "ai_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    kind: text("kind").notNull(),
    at: ts("at").notNull().defaultNow(),
  },
  (t) => [index("ai_usage_user_idx").on(t.userId, t.at)],
);
