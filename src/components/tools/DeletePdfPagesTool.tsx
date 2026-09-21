import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Download,
  Save,
  CheckSquare,
  Square,
  RotateCcw,
  FileText,
  AlertTriangle,
  X,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { api } from '../../lib/api';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;

interface PageThumb {
  pageNum: number;
  dataUrl: string;
}

interface DeletePdfPagesToolProps {
  onBack: () => void;
  onFileSaved: () => void;
}

export const DeletePdfPagesTool: React.FC<DeletePdfPagesToolProps> = ({ onBack, onFileSaved }) => {
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [originalName, setOriginalName] = useState<string>('');
  const [numPages, setNumPages] = useState<number>(0);
  const [thumbnails, setThumbnails] = useState<PageThumb[]>([]);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [rangeInput, setRangeInput] = useState<string>('');

  // Modals & Status
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processedBytes, setProcessedBytes] = useState<Uint8Array | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadPdf = async (buffer: ArrayBuffer, name?: string) => {
    try {
      const bytes = new Uint8Array(buffer);
      setPdfBytes(bytes);
      if (name) setOriginalName(name);

      const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
      const loadedDoc = await loadingTask.promise;
      setNumPages(loadedDoc.numPages);
      setSelectedPages([]);
      setProcessedBytes(null);
      setProcessedUrl(null);
      setErrorMsg(null);
      setStatusMsg(null);

      // Render thumbnails for all pages
      const thumbs: PageThumb[] = [];
      for (let i = 1; i <= loadedDoc.numPages; i++) {
        const page = await loadedDoc.getPage(i);
        const viewport = page.getViewport({ scale: 0.35 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await (page as any).render({ canvasContext: ctx, viewport, canvas }).promise;
        thumbs.push({ pageNum: i, dataUrl: canvas.toDataURL() });
      }
      setThumbnails(thumbs);
    } catch (err: any) {
      setErrorMsg('Failed to process PDF: ' + err.message);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const buf = event.target?.result as ArrayBuffer;
      loadPdf(buf, file.name);
    };
    reader.readAsArrayBuffer(file);
  };

  const togglePageSelection = (pageNum: number) => {
    if (selectedPages.includes(pageNum)) {
      setSelectedPages(selectedPages.filter((p) => p !== pageNum));
    } else {
      setSelectedPages([...selectedPages, pageNum]);
    }
  };

  const handleSelectAll = () => {
    const all = Array.from({ length: numPages }, (_, i) => i + 1);
    setSelectedPages(all);
  };

  const handleDeselectAll = () => {
    setSelectedPages([]);
  };

  const handleInvertSelection = () => {
    const inverted = Array.from({ length: numPages }, (_, i) => i + 1).filter(
      (p) => !selectedPages.includes(p)
    );
    setSelectedPages(inverted);
  };

  const handleApplyRange = () => {
    if (!rangeInput.trim()) return;
    setErrorMsg(null);
    try {
      const parts = rangeInput.split(',');
      const selected = new Set<number>();

      parts.forEach((part) => {
        const trimmed = part.trim();
        if (trimmed.includes('-')) {
          const [startStr, endStr] = trimmed.split('-');
          const start = parseInt(startStr, 10);
          const end = parseInt(endStr, 10);
          if (isNaN(start) || isNaN(end)) return;
          for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
            if (i >= 1 && i <= numPages) selected.add(i);
          }
        } else {
          const num = parseInt(trimmed, 10);
          if (!isNaN(num) && num >= 1 && num <= numPages) {
            selected.add(num);
          }
        }
      });

      setSelectedPages(Array.from(selected));
    } catch (err) {
      setErrorMsg('Invalid page range format. Example: 1-3, 5, 8-10');
    }
  };

  const handleOpenConfirm = () => {
    setErrorMsg(null);
    if (selectedPages.length === 0) {
      setErrorMsg('Please select at least one page to delete.');
      return;
    }
    if (selectedPages.length >= numPages) {
      setErrorMsg('Cannot delete all pages. The PDF must keep at least 1 page.');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleExecuteDelete = async () => {
    setShowConfirmModal(false);
    if (!pdfBytes) return;

    setIsProcessing(true);
    setErrorMsg(null);
    setStatusMsg(null);

    try {
      const pdfDoc = await PDFDocument.load(pdfBytes.slice());
      // Sort in descending order to avoid index shifting
      const sortedPagesToDelete = [...selectedPages].sort((a, b) => b - a);

      sortedPagesToDelete.forEach((p) => {
        pdfDoc.removePage(p - 1);
      });

      const newBytes = await pdfDoc.save();
      setProcessedBytes(newBytes);

      const blob = new Blob([newBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setProcessedUrl(url);

      setStatusMsg(
        `Successfully deleted ${selectedPages.length} page(s). Remaining: ${
          numPages - selectedPages.length
        } page(s).`
      );
    } catch (err: any) {
      setErrorMsg('Failed to delete pages: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const outputFileName = () => {
    const base = originalName.replace(/\.pdf$/i, '');
    return `${base}_pages_removed.pdf`;
  };

  const handleDownload = () => {
    if (!processedUrl) return;
    const a = document.createElement('a');
    a.href = processedUrl;
    a.download = outputFileName();
    a.click();
  };

  const handleSaveToFiles = async () => {
    if (!processedBytes) return;
    setIsSaving(true);
    setErrorMsg(null);

    try {
      let binary = '';
      const len = processedBytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(processedBytes[i]);
      }
      const base64Data = 'data:application/pdf;base64,' + btoa(binary);

      await api.saveFile({
        name: outputFileName(),
        size: processedBytes.length,
        file_type: 'application/pdf',
        data_url: base64Data,
        page_count: numPages - selectedPages.length,
      });

      setStatusMsg('Updated PDF saved to "My Files" successfully!');
      onFileSaved();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save file.');
    } finally {
      setIsSaving(false);
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
          Utility • Delete PDF Pages
        </span>
      </div>

      {!pdfBytes ? (
        <label className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-800 hover:border-blue-500 rounded-3xl cursor-pointer bg-slate-900/60 transition-all group">
          <Upload className="w-12 h-12 text-slate-500 group-hover:text-blue-400 transition-colors mb-3" />
          <h3 className="text-base font-bold text-white group-hover:text-blue-300">
            Select a PDF document to remove pages
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Visual thumbnail grid, multi-select, custom page ranges, and instant deletion
          </p>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      ) : (
        <div className="space-y-5">
          {/* Controls Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs text-slate-400 uppercase font-mono font-semibold">
                    Document Selected
                  </h4>
                  <p className="text-sm font-bold text-white truncate max-w-sm">{originalName}</p>
                </div>
              </div>

              {/* Selection status */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-300">
                  {selectedPages.length} of {numPages} selected for deletion
                </span>
                <button
                  type="button"
                  id="btn-delete-selected-pages"
                  disabled={selectedPages.length === 0}
                  onClick={handleOpenConfirm}
                  className="py-2 px-4 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-red-600/20 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Delete Selected ({selectedPages.length})
                </button>
              </div>
            </div>

            {/* Quick Select Actions & Range Input */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-blue-400" /> Select All
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  <Square className="w-3.5 h-3.5 text-slate-400" /> Deselect All
                </button>
                <button
                  type="button"
                  onClick={handleInvertSelection}
                  className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" /> Invert
                </button>
              </div>

              {/* Range input */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Page Range:</span>
                <input
                  type="text"
                  value={rangeInput}
                  onChange={(e) => setRangeInput(e.target.value)}
                  placeholder="e.g. 1-3, 5"
                  className="w-32 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleApplyRange}
                  className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>

          {/* Feedback messages */}
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

          {/* Processed PDF Download Section */}
          {processedUrl && (
            <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-5 flex flex-wrap items-center justify-between gap-4 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    New PDF Ready!
                  </h4>
                  <p className="text-xs text-slate-400">{outputFileName()}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-download-deleted-pages-pdf"
                  onClick={handleDownload}
                  className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/25"
                >
                  <Download className="w-4 h-4" /> Download New PDF
                </button>
                <button
                  type="button"
                  id="btn-save-deleted-pages-pdf"
                  disabled={isSaving}
                  onClick={handleSaveToFiles}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 border border-slate-700"
                >
                  {isSaving ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-emerald-400" /> Save to My Files
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Visual Page Thumbnails Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {thumbnails.map((thumb) => {
              const isSelected = selectedPages.includes(thumb.pageNum);
              return (
                <div
                  key={thumb.pageNum}
                  onClick={() => togglePageSelection(thumb.pageNum)}
                  className={`relative rounded-2xl overflow-hidden border p-2 cursor-pointer transition-all flex flex-col items-center group ${
                    isSelected
                      ? 'bg-red-950/40 border-red-500 ring-2 ring-red-500/70'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Thumbnail Image */}
                  <div className="w-full h-40 bg-white rounded-xl overflow-hidden shadow-inner flex items-center justify-center relative">
                    <img
                      src={thumb.dataUrl}
                      alt={`Page ${thumb.pageNum}`}
                      className="w-full h-full object-contain"
                    />

                    {/* Overlay badge when selected */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-red-900/60 backdrop-blur-[1px] flex items-center justify-center">
                        <Trash2 className="w-8 h-8 text-white drop-shadow-md" />
                      </div>
                    )}
                  </div>

                  {/* Page number label */}
                  <div className="flex items-center justify-between w-full mt-2 px-1 text-xs">
                    <span
                      className={`font-mono font-bold ${
                        isSelected ? 'text-red-400' : 'text-slate-300'
                      }`}
                    >
                      Page {thumb.pageNum}
                    </span>
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                        isSelected
                          ? 'bg-red-500 text-white font-bold'
                          : 'border border-slate-700 text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Confirmation Modal */}
          {showConfirmModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
              <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>

                <div className="text-center">
                  <h3 className="text-lg font-bold text-white">Confirm Page Deletion</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Are you sure you want to permanently delete {selectedPages.length} page(s)?
                  </p>
                  <p className="text-xs font-mono text-red-400 mt-2 bg-red-950/40 p-2 rounded-xl border border-red-900/50">
                    Pages to remove: {selectedPages.sort((a, b) => a - b).join(', ')}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(false)}
                    className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    id="btn-confirm-delete-action"
                    onClick={handleExecuteDelete}
                    className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30"
                  >
                    Yes, Delete Pages
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
