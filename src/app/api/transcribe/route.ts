import { NextRequest, NextResponse } from "next/server";

// Maximum audio file size: 25MB
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

const ALLOWED_MIME_PREFIXES = [
  "audio/",
  "video/webm",
  "video/mp4",
  "application/octet-stream",
];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: "No audio file provided in request." },
        { status: 400 }
      );
    }

    if (audioFile.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `Audio file exceeds maximum size of 25MB (received ${(
            audioFile.size /
            (1024 * 1024)
          ).toFixed(1)}MB).`,
        },
        { status: 413 }
      );
    }

    const mimeType = audioFile.type || "audio/webm";
    const isValidType = ALLOWED_MIME_PREFIXES.some((prefix) =>
      mimeType.startsWith(prefix)
    );

    if (!isValidType) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported audio format: ${mimeType}. Please upload WAV, MP3, M4A, WEBM, or OGG.`,
        },
        { status: 415 }
      );
    }

    const apiKey = process.env.DEEPGRAM_API_KEY;

    if (!apiKey || apiKey.trim() === "" || apiKey.startsWith("placeholder")) {
      return NextResponse.json(
        {
          success: false,
          isLiveApi: false,
          requiresKey: true,
          error:
            "Deepgram API key is not configured. Please add DEEPGRAM_API_KEY to your .env.local file, or use the provided demo presets / manual transcript mode.",
        },
        { status: 200 }
      );
    }

    // In-memory buffer processing for privacy; audio is NEVER saved to disk
    const arrayBuffer = await audioFile.arrayBuffer();

    // Call Deepgram prerecorded API endpoint directly
    const deepgramUrl =
      "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true&language=en";

    const response = await fetch(deepgramUrl, {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": mimeType,
      },
      body: arrayBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          success: false,
          isLiveApi: true,
          error: `Deepgram API error (${response.status}): ${errorText}`,
        },
        { status: 502 }
      );
    }

    const result = await response.json();
    const transcript =
      result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
    const confidence =
      result?.results?.channels?.[0]?.alternatives?.[0]?.confidence ?? 1.0;

    return NextResponse.json({
      success: true,
      isLiveApi: true,
      transcript,
      confidence,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Transcription error:", errorMsg);
    return NextResponse.json(
      {
        success: false,
        error: `Transcription service error: ${errorMsg}`,
      },
      { status: 500 }
    );
  }
}
