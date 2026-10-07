import { SubtitleBlock, AppSettings } from "@/types/subtitle";

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 🧹 Non-Sinhala Scripts (Hindi, Tamil, Malayalam, Ethiopic/Amharic) Auto-Sanitizer
function sanitizeText(text: string, targetLanguage: string): string {
  if (targetLanguage.toLowerCase() === "sinhala") {
    return text
      .replace(/[\u0900-\u097F]/g, "") // Devanagari (Hindi)
      .replace(/[\u0980-\u09FF]/g, "") // Bengali
      .replace(/[\u0B80-\u0BFF]/g, "") // Tamil
      .replace(/[\u0D00-\u0D7F]/g, "") // Malayalam
      .replace(/[\u1200-\u137F]/g, "") // Ethiopic / Amharic (e.g. 'ደ')
      .replace(/-/g, "") // Remove all dashes
      .replace(/[ ]+/g, " ") // Clean extra spaces
      .trim();
  }
  return text;
}

export async function translateBatchWithRetry(
  blocksBatch: SubtitleBlock[],
  settings: AppSettings,
  previousContextBlocks: SubtitleBlock[] = [],
  maxRetries = 3,
): Promise<string[]> {
  const selectedModel = settings.selectedModel || "gemini-3.5-flash-lite";
  const targetLang = settings.targetLanguage || "Sinhala";

  // 🎬 Natural Movie Subtitle Translation Prompt
  const promptText = `You are a professional Sri Lankan TV drama dubbing scriptwriter and subtitle translator. Your job is to translate English subtitle lines into the kind of ${targetLang} that would actually be spoken by voice actors in a Sinhala teledrama dub — NOT formal written Sinhala, NOT textbook Sinhala, but the living, breathing spoken Sinhala (කතාබහ සිංහල) that Sri Lankans use in daily conversation.

THINK LIKE THE CHARACTER, NOT LIKE A TRANSLATOR. Before translating each line, imagine you ARE the character. Feel what they feel. Then say what they would say in Sinhala — naturally, the way it flows from your mouth, not from a grammar book.

FORMAL → SPOKEN TRANSFORMATION TABLE (apply these systematically):
VERB ENDINGS:
  Formal "කරයි"     → Spoken "කරනවා"
  Formal "ගියේය"     → Spoken "ගියා"
  Formal "පැමිණේ"    → Spoken "එනවා"
  Formal "පැවසුවා"   → Spoken "කිව්වා"
  Formal "අනුභව කළේය" → Spoken "කෑවා"
  Formal "කළේය"      → Spoken "කළා" / "කරා"
  Formal "කියයි"     → Spoken "කියනවා"
  Formal "වෙයි"      → Spoken "වෙනවා"
  Formal "ඇත"       → Spoken "තියෙනවා"
  Formal "නැත"      → Spoken "නෑ"
  Formal "දැනගත්තේය" → Spoken "දැනගත්තා"

PRONOUNS & WORDS:
  Formal "ඔබ"     → Spoken "ඔයා" / "ඕගොල්ලා"
  Formal "ඔහු"     → Spoken "එයා"
  Formal "ඇය"     → Spoken "එයා"
  Formal "ඔවුන්"   → Spoken "එයාලා"
  Formal "මෙය"     → Spoken "මේක"
  Formal "කුමක්ද"  → Spoken "මොකක්ද" / "මොකද"

CRITICAL RULES:
1. NEVER use these formal words in subtitles: තෙමේ, එබැවින්, එසේවූ කලී, කෙසේ වෙතත්, නිසාවෙන්, අදාළව, සම්බන්ධයෙන්, ආකාරයට, වශයෙන්, බවට.
2. NEVER use "සහ" (and). It is strictly written Sinhala. Use commas, "එක්ක", or blend words (e.g. "මම සහ ඔයා" → "මමයි ඔයයි").
3. ADAPT IDIOMS & SLANG: Do not translate idioms literally. "Bailing me out" → "මාව බේරගත්තට" (NOT "මඩෙන් ගොඩගත්තට"). "What the hell" → "මොකක්ද කරන්නේ".
4. NO OVER-LOCALIZATION: Keep the original story context intact. Do NOT translate cultural concepts like "Fireworks" as "New Year" / "අලුත් අවුරුදු". ("Fireworks" = "රතිඤ්ඤා" / "ගිනිකෙළි").
5. SOUND EFFECTS: Keep brackets but DO NOT output any dashes (-). Remove all leading dashes even if they exist in the original English text. "[sighs]" → "[සුසුම් හෙළයි]", "[bell rings]" → "[සීනුව නාද වෙයි]".
6. PURE SCRIPT: Output MUST contain ONLY ${targetLang} script. Strictly DO NOT output any Amharic (ደ), Tamil, Hindi, Bengali (e.g. 'ভাগ'), or foreign symbols.
7. CONTINUOUS SENTENCES (CRITICAL): Sentences are often split across multiple blocks. Read the surrounding blocks to understand the grammatical flow, and ensure the Sinhala translation pieces together naturally.
8. OUTPUT FORMAT: Return a JSON array of objects. Preserve the exact 'id' for every translated item. Example: [{"id": 0, "text": "translation"}, {"id": 1, "text": "translation"}]. Do NOT output any markdown or explanations.

FEW-SHOT EXAMPLES:
English: "What are you doing here?"
Translation: "ඔයා මෙහෙ මොකක්ද කරන්නේ?"

English: "I don't know what you're talking about."
Translation: "ඔයා මොකක් ගැන කියනවද කියලා මට තේරෙන්නේ නෑ."

English: "Let's get out of here before they come back."
Translation: "එයාලා එන්න කලින් අපි මෙතනින් යමු."

English: "Are you serious right now?"
Translation: "ඔයා මේ සිරාවටමද කියන්නේ?"

English: "Come on, we don't have all day."
Translation: "අනේ යමු, අපිට දවසම නෑ."

English: "He's been acting weird lately."
Translation: "එයා මේ ටිකේම හරි අමුතු විදිහට හැසිරෙන්නේ."

English: "I told you not to come here."
Translation: "මම ඔයාට කිව්වා නේද මෙහෙ එන්න එපා කියලා."

English: "I can't do this anymore."
Translation: "මට නම් මේක තවත් කරන්න බෑ."

English: "Just leave me alone."
Translation: "මට පාඩුවේ ඉන්න දෙනවා."

English: "Are you out of your mind?"
Translation: "ඔයාට පිස්සුද හැදිලාද?"

${settings.contextPrompt ? `Movie Context/Topic: ${settings.contextPrompt}` : ""}

${previousContextBlocks.length > 0 ? `PREVIOUS CONTEXT (Do NOT translate these, use only for story continuity):
${JSON.stringify(previousContextBlocks.map((b) => b.originalText))}\n` : ""}
CURRENT BATCH TO TRANSLATE:
${JSON.stringify(blocksBatch.map((b, idx) => ({ id: idx, text: b.originalText })))}`;

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
              temperature: 0.3,
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

      const parsedTranslations: { id: number; text: string }[] = JSON.parse(rawText);

      const finalTranslations: string[] = new Array(blocksBatch.length).fill("");

      parsedTranslations.forEach(item => {
        if (item.id >= 0 && item.id < blocksBatch.length) {
          finalTranslations[item.id] = sanitizeText(item.text, targetLang);
        }
      });

      return finalTranslations;
    } catch (err) {
      if (attempt >= maxRetries - 1) throw err;
      attempt++;
      await delay(waitTime);
    }
  }

  throw new Error("Translation failed after multiple retries.");
}
