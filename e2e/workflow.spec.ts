import { test, expect } from "@playwright/test";

test.describe("Matos VoiceDocs End-to-End Workflow", () => {
  test("Complete flow: Voice scenario selection, discrepancy detection, resolution, and invoice issuance", async ({ page }) => {
    // 1. Visit application
    await page.goto("/");
    await expect(page).toHaveTitle(/Matos/i);
    await expect(page.getByRole("banner").getByText("Matos VoiceDocs")).toBeVisible();

    // 2. Switch to Demo Scenarios tab
    await page.getByRole("button", { name: "Demo Scenarios" }).click();
    await expect(page.getByText("Scenario B: Spoken Discrepancy Flag")).toBeVisible();

    // 3. Click Scenario B to test discrepancy detection (Test B)
    await page.getByText("Scenario B: Spoken Discrepancy Flag").click();

    // Wait for step 2 (Review & Edit) to load
    await expect(page.getByText("Step 2: AI Review & Deterministic Calculation")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Spoken Total Discrepancy Detected")).toBeVisible();
    await expect(page.getByText("£205.00")).toBeVisible();

    // Verify issuance is blocked while discrepancy exists
    const previewBtn = page.getByRole("button", { name: /Preview PDF & Issue/i });
    await expect(previewBtn).toBeDisabled();

    // Resolve discrepancy by clicking 'Accept Calculated Total'
    const resolveBtn = page.getByRole("button", { name: /Accept Calculated Total/i });
    await resolveBtn.click();

    // Discrepancy banner disappears and preview button becomes enabled
    await expect(page.getByText("Spoken Total Discrepancy Detected")).not.toBeVisible();
    await expect(previewBtn).toBeEnabled();

    // 4. Click Preview PDF & Issue
    await previewBtn.click();
    await expect(page.getByText("Step 3: Branded PDF & Document Snapshot")).toBeVisible();
    await expect(page.getByText("DRAFT INVOICE")).toBeVisible();

    // 5. Open Email Preparation Modal
    await page.getByRole("button", { name: /Prepare Email/i }).click();
    await expect(page.getByRole("heading", { name: "Prepare Customer Email" })).toBeVisible();
    await expect(page.getByText("Attachment Notice")).toBeVisible();
    await expect(page.getByRole("button", { name: /Copy Email Text/i })).toBeVisible();
    await page.getByLabel("Close modal").click({ force: true });

    // 6. Open Issue Confirmation Modal
    await page.getByRole("button", { name: /Issue Official Invoice/i }).click();
    await expect(page.getByText("Formal document approval & locking")).toBeVisible();

    // Confirm Issuance
    await page.getByRole("button", { name: /Confirm & Issue Invoice/i }).click();

    // Verify official issued state with SHA-256 integrity digest
    await expect(page.getByText("Officially Issued")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Snapshot Verified & Recorded")).toBeVisible();
    await expect(page.getByText("SHA-256 Digest:")).toBeVisible();
  });

  test("Test C: 18% Malta VAT-inclusive calculation (€118 -> €100 net, €18 VAT)", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Demo Scenarios" }).click();
    await page.getByText("Scenario C: 18% Malta VAT-Inclusive").click();

    await expect(page.getByText("Step 2: AI Review & Deterministic Calculation")).toBeVisible({ timeout: 10000 });
    
    // Check that subtotal net is €100.00, VAT is €18.00, and total is €118.00
    await expect(page.getByText("€100.00")).toBeVisible();
    await expect(page.getByText("€18.00")).toBeVisible();
    await expect(page.getByText("€118.00").first()).toBeVisible();
  });
});
