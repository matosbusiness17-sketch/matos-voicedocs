import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Matos VoiceDocs — Voice-to-Invoice Creator",
  description:
    "Voice-powered invoice drafting application with AI transcription, structured extraction, deterministic financial validation, and branded PDF generation.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#090d16] text-slate-100">
        {children}
      </body>
    </html>
  );
}
