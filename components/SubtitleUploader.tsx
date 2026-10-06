"use client";

import { useState } from "react";
import { SubtitleBlock, AppSettings } from "@/types/subtitle";
import { parseSRT } from "@/lib/srtParser";

interface Props {
  settings: AppSettings;
  onSettingsChange: (newSettings: AppSettings) => void;
  onFileParsed: (blocks: SubtitleBlock[], fileName: string) => void;
  onStartTranslation: () => void;
  isTranslating: boolean;
  progress: number;
  hasBlocks: boolean;
}

export default function SubtitleUploader({
  settings,
  onSettingsChange,
  onFileParsed,
  onStartTranslation,
  isTranslating,
  progress,
  hasBlocks,
}: Props) {
  const [fileName, setFileName] = useState<string>("");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [totalLines, setTotalLines] = useState<number>(0);

  const processFile = (file: File) => {
    if (!file.name.endsWith(".srt")) {
      alert("Please upload a valid .srt file!");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const parsedBlocks = parseSRT(content);
      setTotalLines(parsedBlocks.length);
      onFileParsed(parsedBlocks, file.name);
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
          📂 Subtitle Upload & Controls
        </h2>
        {fileName && (
          <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-md font-mono">
            {fileName} ({totalLines} lines)
          </span>
        )}
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer relative ${
          isDragging
            ? "border-blue-500 bg-blue-500/5"
            : "border-gray-800 hover:border-gray-700 bg-gray-950/50"
        }`}
      >
        <input
          type="file"
          accept=".srt"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="space-y-2 pointer-events-none">
          <div className="text-3xl">📄</div>
          <p className="text-sm font-medium text-gray-300">
            Drag & Drop your{" "}
            <span className="text-blue-400 font-semibold">.srt</span> file here,
            or click to browse
          </p>
          <p className="text-xs text-gray-500">
            Supports standard SRT subtitle files
          </p>
        </div>
      </div>

      {/* Control Grid: Batch Size & Context Prompt */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Batch Request Count Control */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Batch Size (Blocks per Request)
          </label>
          <input
            type="number"
            min={5}
            max={100}
            value={settings.batchSize}
            onChange={(e) =>
              onSettingsChange({
                ...settings,
                batchSize: parseInt(e.target.value) || 20,
              })
            }
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
          />
          <p className="text-[10px] text-gray-500 mt-1">
            Higher values translate faster, lower values prevent API timeouts.
          </p>
        </div>

        {/* Optional Context Description */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Movie/Context Description (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Action movie with military slang, medical drama..."
            value={settings.contextPrompt || ""}
            onChange={(e) =>
              onSettingsChange({
                ...settings,
                contextPrompt: e.target.value,
              })
            }
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
          />
          <p className="text-[10px] text-gray-500 mt-1">
            Helps Gemini AI choose accurate vocabulary for specialized themes.
          </p>
        </div>
      </div>

      {/* Translation Action Button & Progress */}
      <div className="pt-2 border-t border-gray-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-gray-400">
          Status:{" "}
          <span className="text-gray-200 font-medium">
            {isTranslating
              ? "Translating in progress..."
              : hasBlocks
                ? "Ready for translation"
                : "Awaiting SRT file"}
          </span>
        </div>

        <button
          onClick={onStartTranslation}
          disabled={isTranslating || !hasBlocks}
          className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium px-8 py-2.5 rounded-lg text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20"
        >
          {isTranslating ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              Translating...
            </>
          ) : (
            <>
              <span>🚀</span>
              <span>Start Translation</span>
            </>
          )}
        </button>
      </div>

      {/* Progress Bar */}
      {isTranslating && (
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Processing subtitle batches...</span>
            <span className="font-mono text-purple-400 font-semibold">
              {progress}%
            </span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden p-0.5 border border-gray-700">
            <div
              className="bg-linear-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
