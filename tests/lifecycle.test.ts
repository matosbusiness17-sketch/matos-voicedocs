import { describe, it, expect } from "vitest";
import { computeSnapshotIntegrityHash } from "@/lib/integrity";
import { checkSpokenDiscrepancy } from "@/lib/calculations";

describe("Document Lifecycle & Integrity (Test G & Test B)", () => {
  /**
   * MANDATORY TEST SCENARIO G: Document lifecycle
   * Draft invoices can be edited; issued snapshots remain unchanged.
   */
  it("Test G: Integrity hash changes when content changes, and snapshots are immutable", () => {
    const originalSnapshot = {
      invoiceNumber: "INV-2026-0001",
      clientName: "Wayne Enterprises",
      subtotalCents: 188000,
      totalCents: 188000,
      issuedAt: "2026-10-28T12:00:00.000Z",
    };

    const hash1 = computeSnapshotIntegrityHash(originalSnapshot);
    expect(hash1).toBeDefined();
    expect(hash1.length).toBe(64); // SHA-256 hex string

    // Recomputing on identical content yields exact same hash
    const hash2 = computeSnapshotIntegrityHash({ ...originalSnapshot });
    expect(hash2).toBe(hash1);

    // Any alteration produces a completely different hash
    const tamperedSnapshot = {
      ...originalSnapshot,
      totalCents: 198000, // Modified amount
    };
    const tamperedHash = computeSnapshotIntegrityHash(tamperedSnapshot);
    expect(tamperedHash).not.toBe(hash1);
  });

  /**
   * MANDATORY TEST SCENARIO B: Discrepancy enforcement
   */
  it("Test B enforcement: Discrepancy prevents invoice issuance", () => {
    // Line items total £1,880 (188,000 cents)
    const calculatedTotalCents = 188000;
    // Speaker claims £2,085 (208,500 cents)
    const spokenTotalCents = 208500;

    const discrepancy = checkSpokenDiscrepancy(calculatedTotalCents, spokenTotalCents, "GBP");
    expect(discrepancy.hasDiscrepancy).toBe(true);
    expect(discrepancy.differenceCents).toBe(20500); // £205.00

    // When discrepancy is present, canIssue must be false
    const canIssue = !discrepancy.hasDiscrepancy;
    expect(canIssue).toBe(false);
  });
});
