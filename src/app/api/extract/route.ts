import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { extractInvoiceData } from "@/lib/extractor";

const RequestSchema = z.object({
  transcript: z.string().min(1, "Transcript cannot be empty").max(10000, "Transcript is too long"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues.map((i) => i.message).join(", "),
        },
        { status: 400 }
      );
    }

    const { transcript } = parsed.data;
    const { extracted, isLiveApi, error } = await extractInvoiceData(transcript);

    return NextResponse.json({
      success: true,
      extracted,
      isLiveApi,
      originalTranscript: transcript,
      notice: error || null,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Extraction error:", errorMsg);
    return NextResponse.json(
      {
        success: false,
        error: `Extraction service error: ${errorMsg}`,
      },
      { status: 500 }
    );
  }
}
