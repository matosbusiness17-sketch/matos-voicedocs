import { describe, it, expect } from "vitest";
import { extractInvoiceDeterministic, extractInvoiceData } from "@/lib/extractor";

describe("AI & Heuristic Invoice Extraction", () => {
  /**
   * MANDATORY TEST SCENARIO D: Missing information
   * A recording without a customer address or specified due date
   * must NOT hallucinate those fields.
   */
  it("Test D: Missing customer address and due date are NOT hallucinated", () => {
    const transcript =
      "Invoice for John Smith. Completed plumbing repair. Labor £150, new piping £80. Payment due in 14 days.";

    const extracted = extractInvoiceDeterministic(transcript);

    // Client name should be John Smith
    expect(extracted.clientName).toBe("John Smith");
    // Customer address was NOT in transcript -> must remain null
    expect(extracted.clientAddress).toBeNull();
    // Due date was not explicitly given (only payment terms) -> dueDate must remain null
    expect(extracted.dueDate).toBeNull();
    // missingFields checklist must explicitly list missing address
    expect(extracted.missingFields).toContain("Client address");
  });

  /**
   * MANDATORY TEST SCENARIO E: Payment terms
   * 'Payment due in 14 days' must be retained rather than replaced with a hardcoded 30-day default.
   */
  it("Test E: Payment terms '14 days' are retained instead of default 30 days", () => {
    const transcript =
      "Invoice to Apex Builders. Roofing installation. Materials £1,085. Payment due in 14 days.";

    const extracted = extractInvoiceDeterministic(transcript);

    expect(extracted.paymentTerms).toBe("14 days");
    expect(extracted.paymentTerms).not.toBe("30 days");
  });

  /**
   * MANDATORY TEST SCENARIO B extraction:
   * Spoken total £2,085 vs sum of items £1,880
   */
  it("extracts spoken total £2,085 for discrepancy checking", () => {
    const transcript =
      "Invoice to Wayne Enterprises. Labor £750, materials £1,085, and waste disposal £45. The total comes to £2,085. Payment due in 14 days.";

    const extracted = extractInvoiceDeterministic(transcript);

    expect(extracted.spokenTotalCents).toBe(208500); // 208,500 cents = £2,085
    expect(extracted.lineItems.length).toBe(3);
    expect(extracted.currency).toBe("GBP");
  });

  /**
   * MANDATORY TEST SCENARIO H: API failure handling
   * Missing or invalid API keys must produce recoverable errors without fabricated success results.
   */
  it("Test H: Missing/invalid OpenAI key falls back safely without fabricating live API success", async () => {
    const transcript = "Plumbing service for Sarah Connor. Labor €200.";

    // Pass invalid key
    const result = await extractInvoiceData(transcript, "invalid-key-test");

    // Must be marked as not live API
    expect(result.isLiveApi).toBe(false);
    expect(result.extracted).toBeDefined();
    // Must contain error indicator
    expect(result.error).toBeDefined();
    expect(result.error).toContain("OpenAI API");
  });
});
