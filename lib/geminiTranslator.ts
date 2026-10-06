import { SubtitleBlock, AppSettings } from "@/types/subtitle";

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 🧹 Non-Sinhala Scripts (Hindi, Tamil, Malayalam, Ethiopic/Amharic) Auto-Sanitizer
function sanitizeText(text: string, targetLanguage: string): string {
  if (targetLanguage.toLowerCase() === "sinhala") {
    return text
      .replace(/[\u0900-\u097F]/g, "") // Devanagari (Hindi)
      .replace(/[\u0B80-\u0BFF]/g, "") // Tamil
      .replace(/[\u0D00-\u0D7F]/g, "") // Malayalam
      .replace(/[\u1200-\u137F]/g, "") // Ethiopic / Amharic (e.g. 'ደ')
      .replace(/[ ]+/g, " ") // Extra Spaces clean කිරීම
      .trim();
  }
  return text;
}

export async function translateBatchWithRetry(
  blocksBatch: SubtitleBlock[],
  settings: AppSettings,
  maxRetries = 3,
): Promise<string[]> {
  const selectedModel = settings.selectedModel || "gemini-2.0-flash";
  const targetLang = settings.targetLanguage || "Sinhala";

  // 🎬 Natural Movie Subtitle Translation Prompt
  const promptText = `You are a professional native Sinhala movie subtitle translator and localizer.

TRANSLATION RULES:
1. Target Language: Natural, everyday spoken ${targetLang} (නිරවුල්, ස්වාභාවික කතාබහ කරන සිංහල). Avoid textbook/overly formal language.
2. Sound Effects & Bracketed Descriptions: Translate atmospheric tags inside [...] or (...) into standard natural Sinhala sound descriptions.
   Examples:
   - "[bell rings]" -> "-[සීනුව නාද වෙයි]" or "-[ඝණ්ඨාර හඬ]"
   - "[indistinct chatter]" -> "-[අස්පැහැදිලි කතාබහ]"
   - "[sighs]" -> "-[සුසුම් හෙළයි]"
   - "[music playing]" -> "-[සංගීතය වාදනය වේ]"
   - "[screams]" -> "-[කෑගසයි]"
3. Pure Script Enforcement: Output MUST contain ONLY ${targetLang} script. Strictly DO NOT output any Amharic (ደ), Tamil, Hindi, or foreign symbols.
4. Formatting: Keep formatting, dashes (-), and brackets intact.
5. Output format: Strictly return a valid JSON array of strings matching exact same length (${blocksBatch.length}) and order as input array.

${settings.contextPrompt ? `Movie Context/Topic: ${settings.contextPrompt}` : ""}

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
              temperature: 0.2,
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

      // Clean non-Sinhala scripts
      return parsedTranslations.map((text) => sanitizeText(text, targetLang));
    } catch (err) {
      if (attempt >= maxRetries - 1) throw err;
      attempt++;
      await delay(waitTime);
    }
  }

  throw new Error("Translation failed after multiple retries.");
}
