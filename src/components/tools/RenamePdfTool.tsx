import React, { useState } from 'react';
import {
  ArrowLeft,
  Upload,
  FileText,
  Download,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Calendar,
  Hash,
} from 'lucide-react';
import { api } from '../../lib/api';

interface RenamePdfToolProps {
  onBack: () => void;
  onFileSaved: () => void;
}

export const RenamePdfTool: React.FC<RenamePdfToolProps> = ({ onBack, onFileSaved }) => {
  const [originalName, setOriginalName] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('Please upload a valid PDF file.');
      return;
    }

    setOriginalName(file.name);
    // Strip .pdf for editing convenience
    setNewName(file.name.replace(/\.pdf$/i, ''));
    setFileSize(file.size);
    setErrorMsg(null);
    setStatusMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      setFileDataUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Quick helper transformers
  const cleanBase = (name: string) => name.replace(/\.pdf$/i, '');

  const applyTodayDatePrefix = () => {
    const today = new Date().toISOString().split('T')[0];
    const base = cleanBase(newName || originalName);
    setNewName(`${today}_${base}`);
  };

  const applyTodayDateSuffix = () => {
    const today = new Date().toISOString().split('T')[0];
    const base = cleanBase(newName || originalName);
    setNewName(`${base}_${today}`);
  };

  const applyUnderscores = () => {
    setNewName(cleanBase(newName).replace(/\s+/g, '_'));
  };

  const applyHyphens = () => {
    setNewName(cleanBase(newName).replace(/\s+/g, '-'));
  };

  const applyLowercase = () => {
    setNewName(cleanBase(newName).toLowerCase());
  };

  const applyTitleCase = () => {
    const base = cleanBase(newName);
    setNewName(
      base.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.substring(1).toLowerCase())
    );
  };

  const finalizedFileName = () => {
    let name = newName.trim();
    if (!name) name = 'Renamed_Document';
    if (!name.toLowerCase().endsWith('.pdf')) {
      name += '.pdf';
    }
    // Remove invalid filename characters
    return name.replace(/[/\\?%*:|"<>]/g, '_');
  };

  const handleDownload = () => {
    if (!fileDataUrl) return;
    const a = document.createElement('a');
    a.href = fileDataUrl;
    a.download = finalizedFileName();
    a.click();
    setStatusMsg('Renamed PDF downloaded successfully!');
  };

  const handleSaveToFiles = async () => {
    if (!fileDataUrl) return;
    setSaving(true);
    setErrorMsg(null);

    try {
      await api.saveFile({
        name: finalizedFileName(),
        size: fileSize,
        file_type: 'application/pdf',
        data_url: fileDataUrl,
      });

      setStatusMsg('Renamed document saved to "My Files" successfully!');
      onFileSaved();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save renamed document.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <span className="text-xs uppercase font-mono font-bold text-blue-400">
          Utility • Rename PDF
        </span>
      </div>

      {!fileDataUrl ? (
        <label className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-800 hover:border-blue-500 rounded-3xl cursor-pointer bg-slate-900/60 transition-all group">
          <Upload className="w-12 h-12 text-slate-500 group-hover:text-blue-400 transition-colors mb-3" />
          <h3 className="text-base font-bold text-white group-hover:text-blue-300">
            Select a PDF document to rename
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Standardize filenames, apply auto-date tags, clean spaces, and preserve extension
          </p>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      ) : (
        <div className="max-w-2xl mx-auto space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {statusMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{statusMsg}</span>
            </div>
          )}

          {/* Current File Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs text-slate-400 uppercase font-mono font-semibold">
                    Original File Name
                  </h4>
                  <p className="text-sm font-bold text-white mt-0.5 truncate max-w-sm">
                    {originalName}
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {(fileSize / (1024 * 1024)).toFixed(2)} MB
              </span>
            </div>

            {/* Input New Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                New File Name
              </label>
              <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 px-3 py-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Enter custom filename..."
                  className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
                />
                <span className="text-xs font-mono font-bold text-blue-400 select-none pl-2 border-l border-slate-800">
                  .pdf
                </span>
              </div>
            </div>

            {/* Quick Action Pills */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">
                Quick Formatting Presets
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={applyTodayDatePrefix}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5 text-blue-400" /> + Date Prefix (YYYY-MM-DD_)
                </button>
                <button
                  type="button"
                  onClick={applyTodayDateSuffix}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" /> + Date Suffix (_YYYY-MM-DD)
                </button>
                <button
                  type="button"
                  onClick={applyUnderscores}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  <Hash className="w-3.5 h-3.5 text-amber-400" /> Spaces to Underscores
                </button>
                <button
                  type="button"
                  onClick={applyHyphens}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Spaces to Hyphens
                </button>
                <button
                  type="button"
                  onClick={applyLowercase}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 hover:text-white transition-colors"
                >
                  lowercase
                </button>
                <button
                  type="button"
                  onClick={applyTitleCase}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 hover:text-white transition-colors"
                >
                  Title Case
                </button>
              </div>
            </div>

            {/* Real-time Preview */}
            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800/80">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Final Result Preview:
              </span>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-sm font-mono font-bold text-emerald-400 break-all">
                  {finalizedFileName()}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                id="btn-download-renamed-pdf"
                onClick={handleDownload}
                className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all"
              >
                <Download className="w-4 h-4" /> Download Renamed PDF
              </button>
              <button
                type="button"
                id="btn-save-renamed-pdf"
                disabled={saving}
                onClick={handleSaveToFiles}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-700 transition-all"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 text-emerald-400" /> Save to My Files
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
