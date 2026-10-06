"use client";

import { useState, useEffect } from "react";
import { AppSettings } from "@/types/subtitle";

interface Props {
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
}

interface Model {
  id: string;
  displayName: string;
}

const LANGUAGES = [
  "Sinhala",
  "French",
  "Spanish",
  "German",
  "Tamil",
  "Japanese",
  "Hindi",
  "Italian",
];

export default function SettingsBar({ settings, onSaveSettings }: Props) {
  const [apiKey, setApiKey] = useState(settings.apiKey || "");
  const [selectedModel, setSelectedModel] = useState(
    settings.selectedModel || "",
  );
  const [targetLanguage, setTargetLanguage] = useState(
    settings.targetLanguage || "Sinhala",
  );
  const [models, setModels] = useState<{ id: string; displayName: string }[]>(
    [],
  );
  const [loadingModels, setLoadingModels] = useState(false);
  const [savedStatus, setSavedStatus] = useState(false);

  // Auto-fetch models when API Key is entered
  useEffect(() => {
    if (!apiKey || apiKey.length < 20) return;

    const fetchModels = async () => {
      setLoadingModels(true);
      try {
        const res = await fetch("/api/models", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey }),
        });
        const data = await res.json();
        if (data.models && data.models.length > 0) {
          setModels(data.models);
          // Set default model if current selection isn't in list
          if (
            !selectedModel ||
            !data.models.some((m: Model) => m.id === selectedModel)
          ) {
            setSelectedModel(data.models[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load models", err);
      } finally {
        setLoadingModels(false);
      }
    };

    const timer = setTimeout(() => fetchModels(), 800);
    return () => clearTimeout(timer);
  }, [apiKey, selectedModel]);

  const handleSaveLocally = () => {
    const updated: AppSettings = {
      ...settings,
      apiKey,
      selectedModel,
      targetLanguage,
    };
    localStorage.setItem("subhub_settings", JSON.stringify(updated));
    onSaveSettings(updated);

    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 2000);
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg space-y-4">
      <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
        ⚙️ Configuration & Credentials
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* API Key Input */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-gray-400">
              Google AI Studio API Key
            </label>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 hover:underline transition-colors flex items-center gap-0.5"
            >
              <span>Get key</span>
              <span className="text-[10px]">↗</span>
            </a>
          </div>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Paste Gemini API Key..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Dynamic Model Dropdown */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Gemini Model {loadingModels && "(Fetching...)"}
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={models.length === 0}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          >
            {models.length === 0 ? (
              <option value="">Enter API Key First...</option>
            ) : (
              models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName} ({m.id})
                </option>
              ))
            )}
          </select>
        </div>

        {/* Target Language Dropdown */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Target Language
          </label>
          <select
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Save Locally Button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSaveLocally}
          className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2"
        >
          💾 Save Locally
        </button>
        {savedStatus && (
          <span className="text-green-400 text-xs self-center ml-3 animate-pulse">
            Saved to LocalStorage!
          </span>
        )}
      </div>
    </div>
  );
}
