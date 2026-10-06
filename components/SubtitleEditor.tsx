"use client";

import { useState } from "react";
import { SubtitleBlock } from "@/types/subtitle";
import { buildSRT } from "@/lib/srtParser";

interface Props {
  blocks: SubtitleBlock[];
  onBlocksUpdate: (updated: SubtitleBlock[]) => void;
  fileName: string;
}

export default function SubtitleEditor({
  blocks,
  onBlocksUpdate,
  fileName,
}: Props) {
  const [searchTerm, setSearchTerm] = useState("");

  const handleTextChange = (id: number, newText: string) => {
    const updated = blocks.map((b) =>
      b.id === id ? { ...b, translatedText: newText } : b,
    );
    onBlocksUpdate(updated);
  };

  const handleDownload = () => {
    const srtData = buildSRT(blocks);
    const blob = new Blob([srtData], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `translated_${fileName || "subtitle.srt"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredBlocks = blocks.filter(
    (b) =>
      b.originalText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.translatedText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.id.toString().includes(searchTerm),
  );

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-gray-100">
          📝 Subtitle Editor & Preview ({blocks.length} Lines)
        </h3>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Search Filter Input */}
          <input
            type="text"
            placeholder="Search lines or text..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none"
          />

          {/* Download SRT Button */}
          <button
            onClick={handleDownload}
            className="bg-green-600 hover:bg-green-500 text-white font-medium px-4 py-1.5 rounded-lg text-xs transition-all flex items-center gap-2 whitespace-nowrap"
          >
            📥 Download SRT
          </button>
        </div>
      </div>

      {/* Side-by-Side Editor Table */}
      <div className="max-h-125 overflow-y-auto border border-gray-800 rounded-lg">
        <table className="w-full text-left text-xs text-gray-300">
          <thead className="bg-gray-800 text-gray-400 sticky top-0 uppercase text-[10px] tracking-wider">
            <tr>
              <th className="p-3 w-16">#</th>
              <th className="p-3 w-36">Timestamp</th>
              <th className="p-3 w-1/2">Original Subtitle</th>
              <th className="p-3 w-1/2">Translated Subtitle (Editable)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filteredBlocks.map((block) => (
              <tr
                key={block.id}
                className="hover:bg-gray-800/40 transition-colors"
              >
                <td className="p-3 font-mono text-gray-500">{block.id}</td>
                <td className="p-3 font-mono text-gray-400 whitespace-nowrap">
                  {block.startTime}
                </td>
                <td className="p-3 text-gray-300 whitespace-pre-wrap">
                  {block.originalText}
                </td>
                <td className="p-3">
                  <textarea
                    rows={2}
                    value={block.translatedText}
                    onChange={(e) => handleTextChange(block.id, e.target.value)}
                    placeholder="Translation will appear here..."
                    className="w-full bg-gray-950 border border-gray-700 focus:border-blue-500 rounded p-2 text-xs text-blue-200 focus:outline-none resize-none"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
