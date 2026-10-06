import { SubtitleBlock, AppSettings } from "@/types/subtitle";

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function translateBatchWithRetry(
  blocksBatch: SubtitleBlock[],
  settings: AppSettings,
  maxRetries = 3,
): Promise<string[]> {
  // 1. Valid Model Name Check (Default to gemini-2.0-flash if missing/invalid)
  const selectedModel = settings.selectedModel || "gemini-2.0-flash";

  const promptText = `You are a professional movie subtitle translator.
Target Language: ${settings.targetLanguage}
${settings.contextPrompt ? `Context/Topic: ${settings.contextPrompt}` : ""}

Instructions:
1. Translate the following JSON array of subtitle texts into ${settings.targetLanguage}.
2. Maintain natural spoken tone suitable for movie subtitles.
3. Keep line breaks intact.
4. Output MUST be ONLY a valid JSON array of translated strings matching the exact same order and length as input array.

Input Array:
${JSON.stringify(blocksBatch.map((b) => b.originalText))}`;

  let attempt = 0;
  let waitTime = 4000; // Start with 4 seconds

  while (attempt < maxRetries) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${settings.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        },
      );

      // Server Overload (503) or Rate Limit (429)
      if (res.status === 503 || res.status === 429) {
        attempt++;
        const errorData = await res.json().catch(() => ({}));
        console.warn(
          `Server busy (${res.status}) on attempt ${attempt}. Message:`,
          errorData?.error?.message || "No error details",
        );

        if (attempt < maxRetries) {
          console.warn(`Retrying in ${waitTime / 1000}s...`);
          await delay(waitTime);
          waitTime *= 2; // Exponential Backoff
          continue;
        }
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(
          `API Error (${res.status}): ${errJson?.error?.message || res.statusText}`,
        );
      }

      const data = await res.json();
      let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error("Empty response received from Gemini AI.");
      }

      // Markdown Code block තිබුණොත් clean කිරීම
      rawText = rawText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const parsedTranslations: string[] = JSON.parse(rawText);
      return parsedTranslations;
    } catch (err) {
      if (attempt >= maxRetries - 1) throw err;
      attempt++;
      await delay(waitTime);
    }
  }

  throw new Error(
    "Translation failed after multiple retries. Please verify your API Key and Model Name.",
  );
}
