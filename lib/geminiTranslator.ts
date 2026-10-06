import { SubtitleBlock, AppSettings } from "@/types/subtitle";

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 🧹 Non-Sinhala Scripts auto-remove Sanitizer function
function sanitizeText(text: string, targetLanguage: string): string {
  if (targetLanguage.toLowerCase() === "sinhala") {
    return text
      .replace(/[\u0900-\u097F]/g, "") // Remove Devanagari (Hindi)
      .replace(/[\u0B80-\u0BFF]/g, "") // Remove Tamil
      .replace(/[\u0D00-\u0D7F]/g, "") // Remove Malayalam
      .replace(/[ ]+/g, " ") // Extra Spaces manage
      .trim();
  }
  return text;
}

export async function translateBatchWithRetry(
  blocksBatch: SubtitleBlock[],
  settings: AppSettings,
  maxRetries = 3,
): Promise<string[]> {
  // Better using standard gemini-2.0-flash insted of Lite model
  const selectedModel = settings.selectedModel || "gemini-2.0-flash";
  const targetLang = settings.targetLanguage || "Sinhala";

  const promptText = `You are a professional movie subtitle translator.

STRICT TRANSLATION RULES:
1. Target Language: ${targetLang}
2. Output ONLY in pure ${targetLang} script/language.
3. DO NOT include any Tamil, Hindi, or Malayalam script or letters under any circumstances.
4. Keep line breaks (\\n) intact.
5. Output MUST be strictly a valid JSON array of strings matching the exact same length (${blocksBatch.length}) as the input array.

${settings.contextPrompt ? `Context: ${settings.contextPrompt}` : ""}

Input Array:
${JSON.stringify(blocksBatch.map((b) => b.originalText))}`;

  let attempt = 0;
  let waitTime = 4000;

  while (attempt < maxRetries) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${settings.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2, // 👈 Hallucination අවම කිරීමට 0.2 සකසන ලදී
            },
          }),
        },
      );

      if (res.status === 503 || res.status === 429) {
        attempt++;
        if (attempt < maxRetries) {
          await delay(waitTime);
          waitTime *= 2;
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

      rawText = rawText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const parsedTranslations: string[] = JSON.parse(rawText);

      // 🧹 2. Text auto-sanitize and return
      const cleanedTranslations = parsedTranslations.map((text) =>
        sanitizeText(text, targetLang),
      );

      return cleanedTranslations;
    } catch (err) {
      if (attempt >= maxRetries - 1) throw err;
      attempt++;
      await delay(waitTime);
    }
  }

  throw new Error("Translation failed after multiple retries.");
}
