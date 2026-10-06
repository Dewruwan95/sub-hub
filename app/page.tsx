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

export default function Dashboard() {
  const router = useRouter();
  const { status } = useSession(); // NextAuth Session Status

  // Load Saved Local Storage Settings directly in useState initializer
  const [settings, setSettings] = useState<AppSettings>(() => {
    const defaultSettings: AppSettings = {
      apiKey: "",
      selectedModel: "gemini-3.7-flash",
      targetLanguage: "Sinhala",
      batchSize: 20,
      contextPrompt: "",
    };

    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("subhub_settings");
        if (saved) {
          return JSON.parse(saved);
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
  const [progress, setProgress] = useState(0);

  // 1. NextAuth Protection Logic
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

  // Start Batch Translation Process
  const handleStartTranslation = async () => {
    if (!settings.apiKey)
      return alert("Please enter your Gemini API Key first!");
    if (srtBlocks.length === 0)
      return alert("Please upload an SRT file first!");

    setIsTranslating(true);
    setProgress(0);

    const total = srtBlocks.length;
    const batchSize = settings.batchSize || 20;
    const updatedBlocks = [...srtBlocks];

    for (let i = 0; i < total; i += batchSize) {
      const currentBatch = updatedBlocks.slice(i, i + batchSize);

      try {
        const translatedTexts = await translateBatchWithRetry(
          currentBatch,
          settings,
        );

        // Update block translations
        translatedTexts.forEach((text, index) => {
          if (updatedBlocks[i + index]) {
            updatedBlocks[i + index].translatedText = text;
          }
        });

        setSrtBlocks([...updatedBlocks]);
        setProgress(Math.min(100, Math.round(((i + batchSize) / total) * 100)));
      } catch (error) {
        console.error("Batch error at line:", i, error);
        toast.error("Translation Failed", {
          description: `Error at block ${i + 1}: ${error instanceof Error ? error.message : "Service Unavailable"}`,
        });
        break;
      }
    }

    setIsTranslating(false);
  };

  // Loading Screen
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

  // Auth නැති නම් Redirect වෙන තෙක් Screen එක හිස්ව තැබීම
  if (status === "unauthenticated") {
    return null;
  }

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
          📂 SRT Subtitle Upload
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
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

          {/* Batch Size / Blocks Control */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Blocks per Request (Batch Size)
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
        </div>

        {/* Translation Trigger Button */}
        <div className="pt-2 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {srtBlocks.length > 0
              ? `Loaded ${srtBlocks.length} subtitle blocks`
              : "No file uploaded"}
          </span>

          <button
            onClick={handleStartTranslation}
            disabled={isTranslating || srtBlocks.length === 0}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium px-6 py-2 rounded-lg text-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            {isTranslating ? "Translating..." : "🚀 Start Translation"}
          </button>
        </div>

        {/* Live Progress Bar */}
        {isTranslating && (
          <div className="space-y-1 pt-2">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Translation Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-purple-500 h-2 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Subtitle Inline Editor & Download Section */}
      {srtBlocks.length > 0 && (
        <SubtitleEditor
          blocks={srtBlocks}
          onBlocksUpdate={setSrtBlocks}
          fileName={fileName}
        />
      )}
    </main>
  );
}
