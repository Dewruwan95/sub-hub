"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { SubtitleBlock, AppSettings } from "@/types/subtitle";
import { parseSRT } from "@/lib/srtParser";
import { translateBatchWithRetry } from "@/lib/geminiTranslator";
import SettingsBar from "@/components/SettingsBar";
import SubtitleEditor from "@/components/SubtitleEditor";
import { toast } from "sonner";

// Inter-batch pause helper
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function Dashboard() {
  const router = useRouter();
  const { status } = useSession();

  // Load Saved Local Storage Settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    const defaultSettings: AppSettings = {
      apiKey: "",
      selectedModel: "gemini-3.5-flash-lite",
      targetLanguage: "Sinhala",
      batchSize: 20,
      interBatchDelay: 1500, // Default 1.5 seconds delay
      contextPrompt: "",
    };

    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("subhub_settings");
        if (saved) {
          const parsed = JSON.parse(saved);
          return { ...defaultSettings, ...parsed };
        }
      } catch (error) {
        console.error("Failed to parse settings:", error);
      }
    }

    return defaultSettings;
  });

  const [srtBlocks, setSrtBlocks] = useState<SubtitleBlock[]>([]);
  const [fileName, setFileName] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);

  // NextAuth Protection Logic
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  // Handle SRT File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const parsed = parseSRT(content);
      setSrtBlocks(parsed);
    };
    reader.readAsText(file);
  };

  // State Calculations
  const totalBlocks = srtBlocks.length;
  const translatedCount = srtBlocks.filter((b) =>
    b.translatedText?.trim(),
  ).length;
  const hasPartialTranslation =
    translatedCount > 0 && translatedCount < totalBlocks;
  const isFullyTranslated = totalBlocks > 0 && translatedCount === totalBlocks;

  // 🎯 Smart Batch Translation Logic
  const handleStartTranslation = async () => {
    if (!settings.apiKey) {
      toast.error("API Key Missing", {
        description: "Please enter your Gemini API Key in settings first.",
      });
      return;
    }
    if (totalBlocks === 0) {
      toast.error("No Subtitles Loaded", {
        description: "Please upload an SRT file first.",
      });
      return;
    }

    setIsTranslating(true);

    try {
      let updatedBlocks = [...srtBlocks];

      // සියල්ලම Translate වී ඇත්නම් (Re-translate All), මුලින්ම clear කරගනී
      if (isFullyTranslated) {
        updatedBlocks = updatedBlocks.map((b) => ({
          ...b,
          translatedText: "",
        }));
        setSrtBlocks(updatedBlocks);
      }

      // 🔍 1. Translate වී නැති (Empty) Blocks වල Original Index ටික පමණක් ලබා ගැනීම
      const untranslatedIndices = updatedBlocks
        .map((block, idx) => (!block.translatedText?.trim() ? idx : -1))
        .filter((idx) => idx !== -1);

      const batchSize = settings.batchSize || 20;
      const interBatchDelayMs = settings.interBatchDelay ?? 1500;

      // 🚀 2. Translate නොවූ Blocks පමණක් Batch කර යැවීම
      for (let i = 0; i < untranslatedIndices.length; i += batchSize) {
        const currentBatchIndices = untranslatedIndices.slice(i, i + batchSize);
        const currentBatchBlocks = currentBatchIndices.map(
          (idx) => updatedBlocks[idx],
        );

        try {
          const translatedTexts = await translateBatchWithRetry(
            currentBatchBlocks,
            settings,
          );

          // Translate වූ පෙළ නිවැරදි Block Index එකට සිතියම්ගත (Map) කිරීම
          translatedTexts.forEach((text, index) => {
            const targetIdx = currentBatchIndices[index];
            if (updatedBlocks[targetIdx]) {
              updatedBlocks[targetIdx].translatedText = text;
            }
          });

          // State Update
          setSrtBlocks([...updatedBlocks]);

          // ⏱️ User Configured Inter-Batch Delay
          if (i + batchSize < untranslatedIndices.length) {
            await delay(interBatchDelayMs);
          }
        } catch (error) {
          console.error("Batch error at indices:", currentBatchIndices, error);

          const currentDone = updatedBlocks.filter((b) =>
            b.translatedText?.trim(),
          ).length;
          toast.error("Translation Paused", {
            description: `Stopped due to error. Saved ${currentDone}/${totalBlocks} blocks. Click 'Resume Translation' to continue.`,
          });

          break; // Stop loop on error
        }
      }
    } finally {
      // 🛑 3. සාර්ථක වුවත් නැතත් Button එකේ Loading State එක අනිවාර්යයෙන්ම Reset වේ
      setIsTranslating(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm">Authenticating...</span>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  const currentProgress =
    totalBlocks > 0
      ? Math.min(100, Math.round((translatedCount / totalBlocks) * 100))
      : 0;

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold bg-linear-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            SubHub 🎬
          </h1>
          <p className="text-xs text-gray-400">
            Next-Gen Gemini AI Subtitle Translator & Studio
          </p>
        </div>
      </header>

      {/* Settings Bar */}
      <SettingsBar settings={settings} onSaveSettings={setSettings} />

      {/* Subtitle File Upload & Batch Config Section */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg space-y-4">
        <h2 className="text-lg font-semibold text-gray-100">
          📂 SRT Subtitle Upload & Controls
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          {/* File Upload Input */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Select Subtitle File (.srt)
            </label>
            <input
              type="file"
              accept=".srt"
              onChange={handleFileUpload}
              className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
            />
          </div>

          {/* Batch Size Control */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Batch Size (Blocks/Req)
            </label>
            <input
              type="number"
              min={5}
              max={100}
              value={settings.batchSize}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  batchSize: parseInt(e.target.value) || 20,
                })
              }
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none"
            />
          </div>

          {/* ⏱️ Custom Inter-Batch Delay Control (Seconds) */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Batch Delay (Seconds)
            </label>
            <input
              type="number"
              step={0.5}
              min={0.5}
              max={10}
              value={(settings.interBatchDelay ?? 1500) / 1000}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  interBatchDelay: Math.max(
                    500,
                    parseFloat(e.target.value) * 1000 || 1500,
                  ),
                })
              }
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none"
            />
          </div>
        </div>

        {/* Dynamic Translation Trigger Button & Stats */}
        <div className="pt-2 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {totalBlocks > 0
              ? `Loaded ${totalBlocks} blocks (${translatedCount}/${totalBlocks} translated)`
              : "No file uploaded"}
          </span>

          <button
            onClick={handleStartTranslation}
            disabled={isTranslating || totalBlocks === 0}
            className={`font-medium px-6 py-2 rounded-lg text-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              isTranslating
                ? "bg-gray-800 text-gray-400 border border-gray-700"
                : hasPartialTranslation
                  ? "bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/20"
                  : isFullyTranslated
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
                    : "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20"
            }`}
          >
            {isTranslating ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Translating... ({currentProgress}%)</span>
              </>
            ) : hasPartialTranslation ? (
              <>
                <span>⏯️</span>
                <span>
                  Resume Translation ({translatedCount}/{totalBlocks})
                </span>
              </>
            ) : isFullyTranslated ? (
              <>
                <span>🔄</span>
                <span>Re-translate All</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>Start Translation</span>
              </>
            )}
          </button>
        </div>

        {/* Live Progress Bar */}
        {(isTranslating || translatedCount > 0) && (
          <div className="space-y-1 pt-2">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Translation Progress</span>
              <span>{currentProgress}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 transition-all duration-300 ${
                  hasPartialTranslation
                    ? "bg-amber-500"
                    : isFullyTranslated
                      ? "bg-emerald-500"
                      : "bg-purple-500"
                }`}
                style={{ width: `${currentProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Subtitle Inline Editor & Download Section */}
      {totalBlocks > 0 && (
        <SubtitleEditor
          blocks={srtBlocks}
          onBlocksUpdate={setSrtBlocks}
          fileName={fileName}
        />
      )}
    </main>
  );
}
