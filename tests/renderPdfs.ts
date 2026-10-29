import fs from "fs";
import path from "path";
import { chromium } from "@playwright/test";
import { generateInvoicePdf, InvoicePdfData } from "@/lib/pdfGenerator";

const outputDir = path.resolve(
  "C:/Users/Admin/.gemini/antigravity-ide/brain/08fc36ff-78b1-4074-8e88-4bd7a10dd3fd/scratch"
);

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 1. Standard Draft
const draftStandardData: InvoicePdfData = {
  invoiceNumber: "INV-2026-0001",
  status: "draft",
  issueDate: "2026-10-28",
  paymentTerms: "14 days",
  dueDate: "2026-11-11",
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
  clientEmail: "procurement@wayne-enterprises.sample",
  subtotalCents: 10000,
  vatAmountCents: 1800,
  totalCents: 11800,
  items: [
    {
      description: "Comprehensive diagnostic & electrical inspection",
      quantity: 1,
      unitPriceCents: 10000,
      totalCents: 10000,
    },
  ],
};

// 2. Standard Issued
const issuedStandardData: InvoicePdfData = {
  ...draftStandardData,
  status: "issued",
  integrityHash: "a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0",
};

// 3. Long Supplier Name, Long Client Name, Multiline Addresses
const longSupplierData: InvoicePdfData = {
  ...draftStandardData,
  supplierName:
    "[DEMO] Matos Technical Solutions, Construction & Industrial Systems Global Operations Ltd (Sample Business)",
  supplierAddress:
    "Suite 14B, Floor 3, North Wing, Tower Business Complex, Triq l-Imdina, Swatar, BKR 4013, Birkirkara, Island of Malta",
  clientName:
    "International Logistics, Shipping, Harbor Management & Marine Engineering Consortium PLC",
  clientAddress:
    "Dockyard Wharf 7, Grand Harbour Industrial Estate, Marsa MRS 1934, Southern Region, Republic of Malta",
  notes:
    "Comprehensive structural reinforcement and architectural carpentry repair work conducted over 3 weeks across docks 4 and 5.",
};

// 4. Multi-Page Invoice (24 detailed items)
const manyItems: InvoicePdfData["items"] = [];
for (let i = 1; i <= 24; i++) {
  manyItems.push({
    description: `Line Item #${i}: Precision fabricated structural steel beam bracket assembly with custom anti-corrosion protective coating`,
    quantity: i,
    unitPriceCents: 8500,
    totalCents: i * 8500,
  });
}

const multiPageData: InvoicePdfData = {
  ...draftStandardData,
  items: manyItems,
  subtotalCents: 2550000,
  vatAmountCents: 459000,
  totalCents: 3009000,
  notes:
    "Payment terms strictly 14 days upon receipt of certified vector documentation. All materials comply with ISO-9001 standards.",
};

const pdfs = [
  { name: "draft_standard", data: draftStandardData },
  { name: "issued_standard", data: issuedStandardData },
  { name: "draft_long_supplier", data: longSupplierData },
  { name: "draft_multipage", data: multiPageData },
];

async function main() {
  console.log("Generating PDFs...");
  const generatedFiles: Array<{ name: string; path: string }> = [];

  for (const item of pdfs) {
    const doc = generateInvoicePdf(item.data);
    const pdfPath = path.join(outputDir, `${item.name}.pdf`);
    const buffer = Buffer.from(doc.output("arraybuffer"));
    fs.writeFileSync(pdfPath, buffer);
    console.log(`Saved: ${item.name}.pdf (pages: ${doc.getNumberOfPages()}, bytes: ${buffer.length})`);
    generatedFiles.push({ name: item.name, path: pdfPath });
  }

  console.log("Launching Playwright to render PDF canvases to PNG...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 1600 } });

  const viewerHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
    <style>
      body { margin: 0; padding: 20px; background: #525659; display: flex; flex-direction: column; align-items: center; }
      canvas { box-shadow: 0 4px 12px rgba(0,0,0,0.5); margin-bottom: 20px; background: white; }
    </style>
  </head>
  <body>
    <div id="container"></div>
    <script>
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      
      window.renderPdfBuffer = async function(base64Data) {
        const container = document.getElementById('container');
        container.innerHTML = '';
        const raw = atob(base64Data);
        const uint8Array = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) uint8Array[i] = raw.charCodeAt(i);
        
        const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
        const pdf = await loadingTask.promise;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.id = 'page-' + pageNum;
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const context = canvas.getContext('2d');
          
          await page.render({ canvasContext: context, viewport: viewport }).promise;
          container.appendChild(canvas);
        }
        return pdf.numPages;
      };
    </script>
  </body>
  </html>
  `;

  await page.setContent(viewerHtml, { waitUntil: "networkidle" });

  for (const item of generatedFiles) {
    const pdfBase64 = fs.readFileSync(item.path).toString("base64");
    const numPages = await page.evaluate(async (b64) => {
      // @ts-expect-error window.renderPdfBuffer is injected in page content
      return await window.renderPdfBuffer(b64);
    }, pdfBase64);

    for (let p = 1; p <= numPages; p++) {
      const canvasHandle = await page.$(`#page-${p}`);
      if (canvasHandle) {
        const pngPath = path.join(outputDir, `${item.name}_page${p}.png`);
        await canvasHandle.screenshot({ path: pngPath });
        console.log(`Rendered PNG: ${item.name}_page${p}.png`);
      }
    }
  }

  await browser.close();
  console.log("All PDF renderings completed successfully!");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
