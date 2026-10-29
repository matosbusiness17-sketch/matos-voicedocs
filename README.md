# Matos VoiceDocs — Voice-to-Invoice Drafting Engine

> **Portfolio Prototype for Matos Systems**  
> Voice-powered invoice drafting application with AI transcription, structured extraction, deterministic financial validation, and branded PDF generation.

---

## 🎯 Executive Overview

**Matos VoiceDocs** is a mobile-first, commercial-grade web application engineered for tradespeople, field contractors, and small service businesses. It streamlines job completion documentation by allowing a professional to speak job notes naturally, convert the audio into structured invoice items, deterministically calculate tax and totals, verify arithmetic integrity against claimed spoken totals, and issue branded PDF invoices.

### Core Value Propositions
- **Spoken Invoice Creation**: Record natural job descriptions on site using mobile or desktop browser microphone, upload pre-recorded audio, or use text fallback.
- **AI Extraction with Zero Hallucination**: Strict OpenAI Structured Outputs schema extracts line items, quantities, rates, customer details, and payment terms without inventing missing addresses or dates.
- **Deterministic Financial Engine**: Pure TypeScript integer minor-unit math eliminates floating-point rounding errors and never relies on LLM arithmetic.
- **Spoken Discrepancy Guard**: Flags any difference between a spoken total (e.g., *"total is £2,085"*) and calculated sum of items (*£1,880*), blocking document issuance until resolved.
- **VAT Act Compliance**: Configurable Maltese (18%), UK (20%), reduced, and exempt VAT regimes with both VAT-exclusive and VAT-inclusive calculations.
- **Publication-Ready PDF & Document Integrity**: Generates vector PDF invoices featuring diagonal `DRAFT` watermarks during editing, immutable snapshots, and SHA-256 integrity audit digests upon issuance.
- **Customer Email Handoff**: Prepares customer email draft via `mailto:` with clear attachment guidance.

---

## 🏗️ Architecture & Technical Stack

```mermaid
graph TD
    A[Voice Input / Mobile Microphone] -->|MediaRecorder / Stream| B[Deepgram Nova-2 API]
    C[Uploaded Audio File] -->|In-Memory Buffer| B
    D[Manual Transcript / Test Scenarios] -->|Raw Text| E[OpenAI Structured Extraction]
    B -->|Clean Transcript| E
    E -->|Structured JSON| F[Deterministic Calculation Engine]
    F -->|Cents / Minor Units Math| G[Invoice Editor & Discrepancy Guard]
    G -->|Draft Storage| H[(PostgreSQL via Docker Compose)]
    G -->|User Approval & Lock| I[SHA-256 Integrity Hasher]
    I -->|Immutable Snapshot| H
    I -->|Vector PDF| J[jsPDF Branded Generator]
    I -->|Mailto Payload| K[Customer Email Handoff]
```

- **Framework**: Next.js 16 (App Router, Turbopack, React 19)
- **Language**: TypeScript 5 (Strict Mode)
- **Styling**: Tailwind CSS 4 with dark obsidian aesthetic tailored for Matos Systems
- **Database**: PostgreSQL 16 via dedicated Docker Compose service (`matos_voicedocs_postgres` on port `5434`)
- **ORM**: Drizzle ORM with schema migrations
- **Speech-to-Text**: Deepgram Prerecorded Nova-2 REST API with in-memory streaming
- **AI Extraction**: OpenAI GPT-4o-mini with Structured Outputs (`json_schema`) and deterministic pattern-matching fallback
- **Validation**: Zod 3 schemas
- **PDF Generation**: `jspdf` & `jspdf-autotable`
- **Unit & Integration Testing**: Vitest 5
- **Unit & Integration Testing**: Vitest 5 (30 automated tests)
- **End-to-End Browser Testing**: Playwright 1.64 across Desktop Chromium and Mobile Chrome (6 automated tests)

---

## 📸 Portfolio Evidence & Visual Tour

High-resolution visual evidence generated strictly using synthetic demonstration data:

| Workflow Stage | Description | Asset Link |
| :--- | :--- | :--- |
| **1. Voice Input & Preset Picker** | Desktop/mobile mic recording, file upload, text fallback, and 5 instant benchmark scenarios | [`01_workflow_voice_input.png`](file:///c:/Users/Admin/OneDrive/Documents/Coding/matos-voicedocs/docs/evidence/01_workflow_voice_input.png) |
| **2. Spoken Discrepancy Safeguard** | Discrepancy detection engine flagging arithmetic differences and disabling issuance | [`02_spoken_discrepancy_safeguard.png`](file:///c:/Users/Admin/OneDrive/Documents/Coding/matos-voicedocs/docs/evidence/02_spoken_discrepancy_safeguard.png) |
| **3. Financial Review & VAT Engine** | Line items editor, Malta 18% standard VAT, UK 20%, inclusive/exclusive modes, and integer minor-unit math | [`03_invoice_editor_vat_calculation.png`](file:///c:/Users/Admin/OneDrive/Documents/Coding/matos-voicedocs/docs/evidence/03_invoice_editor_vat_calculation.png) |
| **4. Customer Email Handoff** | One-click `mailto:` generator with resolved due dates, payment details, and browser attachment guidance | [`04_customer_email_handoff.png`](file:///c:/Users/Admin/OneDrive/Documents/Coding/matos-voicedocs/docs/evidence/04_customer_email_handoff.png) |
| **5. Issuance Safeguards Modal** | Centralized validation checks, client billing address requirement, and demo supplier confirmation | [`05_issuance_confirmation_safeguards.png`](file:///c:/Users/Admin/OneDrive/Documents/Coding/matos-voicedocs/docs/evidence/05_issuance_confirmation_safeguards.png) |
| **6. Officially Issued & Locked State** | Sequential invoice numbering, immutable audit snapshot, and SHA-256 integrity digest display | [`06_issued_invoice_sha256_snapshot.png`](file:///c:/Users/Admin/OneDrive/Documents/Coding/matos-voicedocs/docs/evidence/06_issued_invoice_sha256_snapshot.png) |
| **7. Branded Vector PDF Output** | Publication-grade PDF with wrapped addresses, dynamic pagination, and watermark | [`07_sample_invoice_pdf.png`](file:///c:/Users/Admin/OneDrive/Documents/Coding/matos-voicedocs/docs/evidence/07_sample_invoice_pdf.png) • [`sample_issued_invoice.pdf`](file:///c:/Users/Admin/OneDrive/Documents/Coding/matos-voicedocs/docs/evidence/sample_issued_invoice.pdf) |

---

## 🧪 Verification of Mandatory Test Scenarios

The test suite includes **30 automated Vitest unit/integration tests** and **6 Playwright end-to-end browser tests** verifying every functional requirement:

| Test Scenario | Description | Expected Outcome | Verification Status |
| :--- | :--- | :--- | :---: |
| **Test A — Correct Arithmetic** | Labor £750 + Materials £1,085 + Waste £45 | Net Subtotal: £1,880.00 without VAT | ✅ **Verified** (`tests/calculations.test.ts`) |
| **Test B — Spoken Discrepancy** | Line items £1,880, speaker claims £2,085 | Flags £205.00 difference, blocks issuance | ✅ **Verified** (`tests/calculations.test.ts`, `e2e/workflow.spec.ts`) |
| **Test C — VAT Included** | 18% VAT-inclusive gross amount €118 | Net: €100.00, VAT: €18.00, Total: €118.00 | ✅ **Verified** (`tests/calculations.test.ts`, `e2e/workflow.spec.ts`) |
| **Test D — Missing Information** | Recording without address or due date | Address & due date remain `null`, flagged in checklist | ✅ **Verified** (`tests/extraction.test.ts`) |
| **Test E — Payment Terms** | "Payment due in 14 days" spoken | Retained as "14 days", not default 30 days; auto-derives due date | ✅ **Verified** (`tests/extraction.test.ts`, `tests/issuanceRegression.test.ts`) |
| **Test F — Audio Privacy** | Audio uploaded for transcription | In-memory buffer only, zero disk retention | ✅ **Verified** (`tests/privacy.test.ts`) |
| **Test G — Document Lifecycle** | Drafts vs Issued snapshots | Drafts editable; issued snapshots immutable with SHA-256 | ✅ **Verified** (`tests/lifecycle.test.ts`) |
| **Test H — API Failure Resilience** | Missing or invalid API keys | Graceful fallback without fabricating success | ✅ **Verified** (`tests/extraction.test.ts`) |
| **Critical QA — Mandatory Address** | Customer billing address missing | Blocks official issuance, permits draft preview/saving | ✅ **Verified** (`tests/issuanceRegression.test.ts`, `e2e/workflow.spec.ts`) |
| **Critical QA — VAT Persistence** | Enable Malta 18% exclusive (€80 + €20) | Persists €100 net + €18 VAT across save, preview, PDF, DB | ✅ **Verified** (`tests/issuanceRegression.test.ts`, `e2e/workflow.spec.ts`) |
| **Critical QA — Server Recalculation** | Server-side issuance verification | Recomputes totals deterministically; rejects 422 if inconsistent | ✅ **Verified** (`tests/issuanceRegression.test.ts`, `/api/invoices/[id]/issue`) |
| **Critical QA — Email Due Date** | Due date handoff in email modal | Renders actual/derived date; preserves unknown dates without inventing | ✅ **Verified** (`src/components/EmailHandoffModal.tsx`) |

---

## 🚀 Installation & Local Launch

### Prerequisites
- Node.js 20+ (Node.js 24 recommended)
- Docker Desktop (for local PostgreSQL database)
- npm 10+

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/matos-systems/matos-voicedocs.git
cd matos-voicedocs
npm install
```

### 2. Configure Environment
Copy the example environment file:
```bash
cp .env.example .env.local
```

Configure your environment variables in `.env.local`:
```env
# Database connection string (PostgreSQL via Docker Compose on port 5434)
DATABASE_URL="postgres://postgres:postgres_secure_password@localhost:5434/matos_voicedocs"

# Optional API Keys for Live Integration (App runs fully in demo/heuristic mode without them)
DEEPGRAM_API_KEY=""
OPENAI_API_KEY=""

NEXT_PUBLIC_APP_URL="http://localhost:3008"
```

### 3. Start PostgreSQL Database
```bash
docker compose up -d
npm run db:push
```

### 4. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:3008](http://localhost:3008)** in your browser.

---

## 📊 Running Tests & Quality Checks

### Unit & Integration Tests (Vitest — 30 tests)
```bash
npm test
```

### End-to-End Browser Tests (Playwright — 6 tests across Desktop & Mobile)
```bash
npm run test:e2e
```

### TypeScript Strict Typecheck
```bash
npx tsc --noEmit
```

### Code Style & Linting (ESLint)
```bash
npm run lint
```

### Production Build Validation
```bash
npm run build
```

---

## 🔒 Security, Privacy & Legal Limitations

1. **In-Memory Audio Processing**: Uploaded and recorded voice notes are streamed in memory over HTTPS directly to Deepgram and immediately garbage-collected. No audio files are ever written to server disk or persistent storage.
2. **Server-Side API Key Isolation**: Deepgram and OpenAI keys reside exclusively in server environment variables. Zero credentials are exposed to client bundles.
3. **Immutable Audit Digest**: Issued invoices calculate a deterministic canonical SHA-256 hash. *Note: As documented, this provides change-detection and snapshot auditability, and does not purport to replace a qualified electronic signature under eIDAS regulations.*
4. **Portfolio Prototype & Legal Status**: Matos VoiceDocs is an architectural portfolio prototype and invoice-drafting utility. It is **not** an officially certified fiscal receipt printer, cash register, or certified legal tax compliance software under Malta VAT Department regulations. Businesses must ensure statutory reporting compliance through certified accountants and fiscal systems.
5. **Email Attachment Guidance**: Standard web browsers cannot automatically attach files to `mailto:` protocols. The application provides clear inline guidance instructing the user to download the PDF invoice and attach it to their prepared email draft.

---

## 📂 Project Structure

```
matos-voicedocs/
├── docker-compose.yml             # Isolated PostgreSQL service on port 5434
├── drizzle.config.ts              # Drizzle ORM configuration
├── playwright.config.ts           # Playwright e2e configuration (port 3008)
├── vitest.config.mts              # Vitest test runner configuration
├── .env.example                   # Environment configuration template
├── e2e/
│   └── workflow.spec.ts           # Playwright e2e tests (Desktop & Mobile)
├── tests/
│   ├── calculations.test.ts       # Test A, Test B, Test C arithmetic tests
│   ├── extraction.test.ts         # Test D, Test E, Test H extraction tests
│   ├── lifecycle.test.ts          # Test G immutable lifecycle tests
│   ├── pdf.test.ts                # PDF generator & watermark tests
│   └── privacy.test.ts            # Test F disk privacy leak tests
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── extract/route.ts       # OpenAI structured extraction endpoint
│   │   │   ├── invoices/route.ts      # List & create draft invoices
│   │   │   ├── invoices/[id]/route.ts # Retrieve, update, & delete drafts
│   │   │   ├── invoices/[id]/issue/   # Formal issuance & SHA-256 snapshot
│   │   │   └── transcribe/route.ts    # Deepgram in-memory transcription
│   │   ├── globals.css                # Obsidian & emerald theme styles
│   │   ├── layout.tsx                 # Root layout & metadata
│   │   └── page.tsx                   # Main 3-step interactive application
│   ├── components/
│   │   ├── AudioRecorder.tsx          # Real mic recording, upload, & presets
│   │   ├── EmailHandoffModal.tsx      # Mailto email drafting with guidance
│   │   ├── Header.tsx                 # Brand navigation & history indicator
│   │   ├── InvoiceEditor.tsx          # Deterministic editor & discrepancy guard
│   │   ├── InvoiceHistoryModal.tsx    # PostgreSQL drafts & issued invoices
│   │   ├── InvoicePreview.tsx         # Document canvas & PDF download action
│   │   └── IssueConfirmationModal.tsx # Explicit approval locking modal
│   ├── db/
│   │   ├── index.ts                   # Drizzle Postgres client connection
│   │   └── schema.ts                  # Invoices, items, and snapshot tables
│   └── lib/
│       ├── calculations.ts            # Integer minor currency calculation engine
│       ├── extractionSchema.ts        # Zod extraction schema
│       ├── extractor.ts               # Structured Outputs & deterministic parser
│       ├── integrity.ts               # SHA-256 canonical snapshot hasher
│       └── pdfGenerator.ts            # Vector branded PDF generator with watermark
```

---

## 🏷️ Repository & Portfolio Details

- **GitHub Repository Name**: `matos-voicedocs`
- **GitHub Repository Description**:
  > "Voice-powered invoice drafting application with AI transcription, structured extraction, deterministic financial validation, and branded PDF generation."
- **Developer / Creator**: Built as a portfolio prototype for **Matos Systems**.
