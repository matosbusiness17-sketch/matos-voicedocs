import fs from "fs";
import path from "path";
import { chromium } from "@playwright/test";
import { generateInvoicePdf, InvoicePdfData } from "../src/lib/pdfGenerator";

async function main() {
  const evidenceDir = path.resolve(process.cwd(), "docs/evidence");
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  console.log("=== CAPTURING HIGH-RESOLUTION PORTFOLIO EVIDENCE ===");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2, // HiDPI for crisp portfolio evidence
  });
  const page = await context.newPage();

  try {
    // 1. Step 1: Voice Input & Presets
    await page.goto("http://localhost:3008");
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(evidenceDir, "01_workflow_voice_input.png"),
      fullPage: false,
    });
    console.log("✓ Captured 01_workflow_voice_input.png");

    // 2. Step 2 with Spoken Discrepancy Flag
    await page.getByRole("button", { name: "Demo Scenarios" }).click();
    await page.getByText("Scenario B: Spoken Discrepancy Flag").click();
    await page.getByText("Step 2: AI Review & Deterministic Calculation").waitFor({ timeout: 10000 });
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(evidenceDir, "02_spoken_discrepancy_safeguard.png"),
      fullPage: true,
    });
    console.log("✓ Captured 02_spoken_discrepancy_safeguard.png");

    // 3. Resolve discrepancy and configure Malta 18% VAT Exclusive
    await page.getByRole("button", { name: /Accept Calculated Total/i }).click();
    await page.waitForTimeout(300);

    // Fill customer address
    const clientAddr = page.getByPlaceholder(/100 Gotham Boulevard/i);
    await clientAddr.fill("100 Gotham Boulevard, Suite 400, Gotham City");

    // Enable VAT
    const vatCheckbox = page.getByRole("checkbox", { name: /VAT Registered Business/i });
    if (!(await vatCheckbox.isChecked())) {
      await vatCheckbox.check();
    }
    const vatSelect = page.locator("select").filter({ hasText: /Malta Standard/i });
    await vatSelect.selectOption("18");
    const pricingSelect = page.locator("select").filter({ hasText: /VAT Exclusive/i });
    await pricingSelect.selectOption("exclusive");

    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(evidenceDir, "03_invoice_editor_vat_calculation.png"),
      fullPage: true,
    });
    console.log("✓ Captured 03_invoice_editor_vat_calculation.png");

    // 4. Step 3: Preview and Email Handoff
    await page.getByRole("button", { name: /Preview PDF & Issue/i }).click();
    await page.getByText("Step 3: Branded PDF & Document Snapshot").waitFor();
    await page.waitForTimeout(500);

    // Open email modal
    await page.getByRole("button", { name: /Prepare Email/i }).click();
    await page.getByRole("heading", { name: "Prepare Customer Email" }).waitFor();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(evidenceDir, "04_customer_email_handoff.png"),
      fullPage: false,
    });
    console.log("✓ Captured 04_customer_email_handoff.png");

    await page.getByLabel("Close modal").click({ force: true });
    await page.waitForTimeout(300);

    // 5. Issuance Confirmation Modal with Synthetic Demo Warning
    await page.getByRole("button", { name: /Issue Official Invoice/i }).click();
    await page.getByRole("heading", { name: "Issue Official Invoice" }).waitFor();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(evidenceDir, "05_issuance_confirmation_safeguards.png"),
      fullPage: false,
    });
    console.log("✓ Captured 05_issuance_confirmation_safeguards.png");

    // 6. Officially Issue Invoice and Capture Locked Snapshot
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: /Confirm & Issue Official Invoice/i }).click();
    await page.getByText("Officially Issued").waitFor({ timeout: 10000 });
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(evidenceDir, "06_issued_invoice_sha256_snapshot.png"),
      fullPage: true,
    });
    console.log("✓ Captured 06_issued_invoice_sha256_snapshot.png");

    // 7. Render sample generated PDF
    const samplePdfData: InvoicePdfData = {
      invoiceNumber: "INV-2026-0001",
      status: "issued",
      issueDate: "2026-10-29",
      serviceDate: "2026-10-29",
      dueDate: "2026-11-12",
      paymentTerms: "14 days",
      currency: "EUR",
      isVatRegistered: true,
      vatRatePercent: 18,
      isVatInclusive: false,
      isDemoSupplier: true,
      supplierName: "[DEMO] Matos Technical Solutions Ltd (Sample Business)",
      supplierAddress: "Sample Business Address, Tower Business Centre, Swatar, Malta [DEMO]",
      supplierEmail: "demo-invoicing@matos-solutions.sample",
      supplierPhone: "+356 0000 0000 [DEMO]",
      supplierVatNumber: "MT 0000-0000 [DEMO]",
      supplierBankName: "Sample Bank of Valletta [DEMO]",
      supplierIban: "MT00DEMO0000000000000000000",
      supplierBic: "DEMOMTM3",
      clientName: "Wayne Enterprises",
      clientAddress: "100 Gotham Boulevard, Suite 400, Gotham City",
      clientEmail: "accounts@wayne-enterprises.sample",
      descriptionOfWork: "Commercial facility electrical audit & safety certification",
      subtotalCents: 10000,
      vatAmountCents: 1800,
      totalCents: 11800,
      integrityHash: "3f8b724492c10b42c4bc92716c52a0a2df3d1796cbe4980bbd067e23118bfa92",
      items: [
        {
          description: "Technical labor & equipment diagnostics",
          quantity: 1,
          unitPriceCents: 8000,
          totalCents: 8000,
        },
        {
          description: "Testing consumables and documentation",
          quantity: 1,
          unitPriceCents: 2000,
          totalCents: 2000,
        },
      ],
    };

    const doc = generateInvoicePdf(samplePdfData);
    const pdfBytes = doc.output("arraybuffer");
    fs.writeFileSync(path.join(evidenceDir, "sample_issued_invoice.pdf"), Buffer.from(pdfBytes));
    console.log("✓ Generated sample_issued_invoice.pdf");

    // Render PDF page 1 to PNG using PDF.js via data URI in browser
    const base64Pdf = Buffer.from(pdfBytes).toString("base64");
    const renderHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
        <style>
          body { margin: 0; background: #0f172a; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
          canvas { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); border-radius: 4px; }
        </style>
      </head>
      <body>
        <canvas id="pdfCanvas"></canvas>
        <script>
          const raw = atob("${base64Pdf}");
          const uint8Array = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i++) {
            uint8Array[i] = raw.charCodeAt(i);
          }
          pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          pdfjsLib.getDocument({ data: uint8Array }).promise.then(pdf => {
            return pdf.getPage(1).then(page => {
              const viewport = page.getViewport({ scale: 2.0 });
              const canvas = document.getElementById("pdfCanvas");
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              const ctx = canvas.getContext("2d");
              return page.render({ canvasContext: ctx, viewport: viewport }).promise.then(() => {
                window.__RENDERED__ = true;
              });
            });
          });
        </script>
      </body>
      </html>
    `;

    await page.setContent(renderHtml);
    await page.waitForFunction(() => (window as unknown as { __RENDERED__?: boolean }).__RENDERED__ === true, { timeout: 15000 });
    const canvasElement = page.locator("#pdfCanvas");
    await canvasElement.screenshot({
      path: path.join(evidenceDir, "07_sample_invoice_pdf.png"),
    });
    console.log("✓ Captured 07_sample_invoice_pdf.png");

    console.log("=== ALL PORTFOLIO EVIDENCE CAPTURED SUCCESSFULLY ===");
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Evidence capture error:", err);
  process.exit(1);
});
