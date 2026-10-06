import { SubtitleBlock } from "@/types/subtitle";

export function parseSRT(srtContent: string): SubtitleBlock[] {
  const normalized = srtContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blocks = normalized.trim().split(/\n\n+/);

  return blocks.map((block, index) => {
    const lines = block.split("\n");
    const id = parseInt(lines[0], 10) || index + 1;
    const timeMatch = lines[1]?.match(/(.+?)\s*-->\s*(.+)/);

    const startTime = timeMatch ? timeMatch[1].trim() : "00:00:00,000";
    const endTime = timeMatch ? timeMatch[2].trim() : "00:00:00,000";
    const text = lines.slice(2).join("\n");

    return {
      id,
      startTime,
      endTime,
      originalText: text,
      translatedText: "",
    };
  });
}

export function buildSRT(blocks: SubtitleBlock[]): string {
  return blocks
    .map((block) => {
      const text = block.translatedText || block.originalText;
      return `${block.id}\n${block.startTime} --> ${block.endTime}\n${text}\n`;
    })
    .join("\n");
}
