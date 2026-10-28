import { pgTable, text, timestamp, boolean, integer, numeric, jsonb, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceNumber: text("invoice_number"),
  status: text("status", { enum: ["draft", "issued"] }).default("draft").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  issueDate: text("issue_date"),
  serviceDate: text("service_date"),
  dueDate: text("due_date"),
  paymentTerms: text("payment_terms").default("14 days"),
  currency: text("currency", { enum: ["EUR", "GBP"] }).default("EUR").notNull(),
  
  // Tax / VAT configuration
  isVatRegistered: boolean("is_vat_registered").default(true).notNull(),
  vatRatePercent: numeric("vat_rate_percent").default("18.00").notNull(),
  isVatInclusive: boolean("is_vat_inclusive").default(false).notNull(),
  vatExemptReason: text("vat_exempt_reason"),

  // Supplier
  supplierName: text("supplier_name").default("Matos Technical Solutions Ltd").notNull(),
  supplierAddress: text("supplier_address").default("Tower Business Centre, Swatar, BKR 4013, Malta"),
  supplierEmail: text("supplier_email").default("invoicing@matos-solutions.com"),
  supplierPhone: text("supplier_phone").default("+356 2134 5678"),
  supplierVatNumber: text("supplier_vat_number").default("MT 2458-9912"),
  supplierBankName: text("supplier_bank_name").default("Bank of Valletta"),
  supplierIban: text("supplier_iban").default("MT84BOVS0000000001234567890"),
  supplierBic: text("supplier_bic").default("BOVSMTM3"),

  // Client
  clientName: text("client_name").default("").notNull(),
  clientAddress: text("client_address"),
  clientEmail: text("client_email"),
  clientPhone: text("client_phone"),

  // Work description & notes
  descriptionOfWork: text("description_of_work"),
  spokenTotalCents: integer("spoken_total_cents"),
  notes: text("notes"),

  // Calculated amounts in integer minor currency units (cents/pence)
  subtotalCents: integer("subtotal_cents").default(0).notNull(),
  vatAmountCents: integer("vat_amount_cents").default(0).notNull(),
  totalCents: integer("total_cents").default(0).notNull(),

  // Audit and transcription metadata
  rawTranscript: text("raw_transcript"),
  missingFields: jsonb("missing_fields").$type<string[]>().default([]),
  integrityHash: text("integrity_hash"),
  issuedAt: timestamp("issued_at", { withTimezone: true }),
});

export const invoiceItems = pgTable("invoice_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "cascade" }).notNull(),
  position: integer("position").default(0).notNull(),
  description: text("description").notNull(),
  quantity: numeric("quantity").default("1").notNull(),
  unitPriceCents: integer("unit_price_cents").default(0).notNull(),
  totalCents: integer("total_cents").default(0).notNull(),
});

export const issuedSnapshots = pgTable("issued_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id").references(() => invoices.id).notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  snapshotData: jsonb("snapshot_data").notNull(),
  integrityHash: text("integrity_hash").notNull(),
  issuedAt: timestamp("issued_at", { withTimezone: true }).defaultNow().notNull(),
});

export const invoicesRelations = relations(invoices, ({ many }) => ({
  items: many(invoiceItems),
  snapshots: many(issuedSnapshots),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}));

export const issuedSnapshotsRelations = relations(issuedSnapshots, ({ one }) => ({
  invoice: one(invoices, {
    fields: [issuedSnapshots.invoiceId],
    references: [invoices.id],
  }),
}));

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type NewInvoiceItem = typeof invoiceItems.$inferInsert;
export type IssuedSnapshot = typeof issuedSnapshots.$inferSelect;
export type NewIssuedSnapshot = typeof issuedSnapshots.$inferInsert;
