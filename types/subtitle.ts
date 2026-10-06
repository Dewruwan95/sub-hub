export interface SubtitleBlock {
  id: number;
  startTime: string;
  endTime: string;
  originalText: string;
  translatedText: string;
}

export interface AppSettings {
  apiKey: string;
  selectedModel: string;
  targetLanguage: string;
  batchSize: number; // Blocks count per request
  interBatchDelay?: number; // Delay between batches in milliseconds (eg: 1500ms)
  contextPrompt?: string;
}
