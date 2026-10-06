import { NextResponse } from "next/server";

interface Model {
  supportedGenerationMethods?: string[];
  name: string;
  displayName?: string;
}

export async function POST(req: Request) {
  try {
    const { apiKey } = await req.json();

    if (typeof apiKey !== "string" || !apiKey.trim()) {
      return NextResponse.json(
        { error: "API Key is required" },
        { status: 400 },
      );
    }

    // Call Google AI Studio Models List REST API
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models",
      { headers: { "x-goog-api-key": apiKey } },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Invalid API Key or Service Error" },
        { status: response.status },
      );
    }

    const data = await response.json();

    // Filter only Gemini text generation models
    const availableModels = (data.models || [])
      .filter(
        (m: Model) =>
          m.supportedGenerationMethods?.includes("generateContent") &&
          m.name.includes("gemini"),
      )
      .map((m: Model) => ({
        id: m.name.replace("models/", ""),
        displayName: m.displayName || m.name,
      }));

    return NextResponse.json({ models: availableModels });
  } catch (error) {
    console.error("An error occurred:", error);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 },
    );
  }
}
