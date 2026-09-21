import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Upload,
  ChevronLeft,
  ChevronRight,
  Type,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Download,
  Save,
  Plus,
  Trash2,
  Undo2,
  Redo2,
  CheckCircle2,
  AlertCircle,
  ScanText,
  FileQuestion,
  Search,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb } from 'pdf-lib';
import { api } from '../../lib/api';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;

interface ExtractedTextItem {
  id: string;
  originalText: string;
  currentText: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  align: 'left' | 'center' | 'right';
  page: number;
  isCustom?: boolean;
}

interface EditPdfTextToolProps {
  onBack: () => void;
  onFileSaved: () => void;
}

export const EditPdfTextTool: React.FC<EditPdfTextToolProps> = ({ onBack, onFileSaved }) => {
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfDocProxy, setPdfDocProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [fileName, setFileName] = useState('AntiFix_Edited_Text.pdf');

  // Text Items
  const [textItems, setTextItems] = useState<ExtractedTextItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isScannedImage, setIsScannedImage] = useState<boolean>(false);
  const [filterSearch, setFilterSearch] = useState<string>('');

  // History
  const [history, setHistory] = useState<ExtractedTextItem[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Status
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const loadPdf = async (buffer: ArrayBuffer, name?: string) => {
    try {
      const bytes = new Uint8Array(buffer);
      setPdfBytes(bytes);
      if (name) setFileName(name);

      const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
      const loadedDoc = await loadingTask.promise;
      setPdfDocProxy(loadedDoc);
      setNumPages(loadedDoc.numPages);
      setCurrentPage(1);
      setErrorMsg(null);
      setStatusMsg(null);
    } catch (err: any) {
      setErrorMsg('Failed to load PDF: ' + err.message);
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

  // Extract text and render page canvas
  const processPage = useCallback(async () => {
    if (!pdfDocProxy || !canvasRef.current) return;
    try {
      const page = await pdfDocProxy.getPage(currentPage);
      const viewport = page.getViewport({ scale: 1.25 });

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await (page as any).render({ canvasContext: ctx, viewport, canvas }).promise;

      // Extract native text content
      const textContent = await page.getTextContent();
      const rawItems = textContent.items as any[];

      const hasVisibleText = rawItems.some((item) => item.str && item.str.trim().length > 0);
      setIsScannedImage(!hasVisibleText);

      // Only build text items list if not already extracted for this page
      const currentItemsForPage = textItems.filter((t) => t.page === currentPage);
      if (currentItemsForPage.length === 0 && hasVisibleText) {
        const extracted: ExtractedTextItem[] = rawItems
          .filter((item) => item.str && item.str.trim().length > 0)
          .map((item, idx) => {
            const tx = item.transform; // [scaleX, skewY, skewX, scaleY, transX, transY]
            const fontSize = Math.round(Math.hypot(tx[2], tx[3]) || 14);
            const x = Math.round(tx[4]);
            const y = Math.round(viewport.height - tx[5]); // in canvas coordinates

            return {
              id: `item_${currentPage}_${idx}_${Date.now()}`,
              originalText: item.str,
              currentText: item.str,
              x,
              y,
              width: item.width || 80,
              height: item.height || fontSize,
              fontSize,
              color: '#0f172a',
              isBold: false,
              isItalic: false,
              isUnderline: false,
              align: 'left',
              page: currentPage,
              isCustom: false,
            };
          });

        const merged = [...textItems, ...extracted];
        setTextItems(merged);
        pushHistory(merged);
      }
    } catch (err: any) {
      console.error(err);
    }
  }, [pdfDocProxy, currentPage]);

  useEffect(() => {
    processPage();
  }, [processPage]);

  const pushHistory = (newItems: ExtractedTextItem[]) => {
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(newItems);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setTextItems(newItems);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setTextItems(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setTextItems(history[historyIndex + 1]);
    }
  };

  // Add new Custom Text Block
  const handleAddTextBlock = () => {
    const newBlock: ExtractedTextItem = {
      id: `custom_${currentPage}_${Date.now()}`,
      originalText: '',
      currentText: 'New text block',
      x: 60,
      y: 100,
      width: 150,
      height: 24,
      fontSize: 16,
      color: '#2563eb',
      isBold: false,
      isItalic: false,
      isUnderline: false,
      align: 'left',
      page: currentPage,
      isCustom: true,
    };
    pushHistory([...textItems, newBlock]);
    setSelectedItemId(newBlock.id);
  };

  const updateSelectedItem = (updates: Partial<ExtractedTextItem>) => {
    if (!selectedItemId) return;
    const updated = textItems.map((item) =>
      item.id === selectedItemId ? { ...item, ...updates } : item
    );
    pushHistory(updated);
  };

  const selectedItem = textItems.find((item) => item.id === selectedItemId);

  // Generate exported PDF using pdf-lib
  const generateUpdatedPdf = async (): Promise<Uint8Array> => {
    if (!pdfBytes) throw new Error('No PDF loaded');

    const pdfDoc = await PDFDocument.load(pdfBytes.slice());
    const pages = pdfDoc.getPages();

    // Group modified items and custom items
    const modifiedItems = textItems.filter(
      (item) => item.isCustom || item.currentText !== item.originalText
    );

    modifiedItems.forEach((item) => {
      const pageIndex = item.page - 1;
      if (!pages[pageIndex]) return;
      const targetPage = pages[pageIndex];
      const { height: pageH } = targetPage.getSize();

      // Mask out old text with clean white patch if modifying existing text
      if (!item.isCustom) {
        targetPage.drawRectangle({
          x: item.x - 2,
          y: pageH - item.y - item.fontSize - 2,
          width: item.width + 4,
          height: item.height + 4,
          color: rgb(1, 1, 1),
        });
      }

      // Draw replacement or new text
      targetPage.drawText(item.currentText, {
        x: item.x,
        y: pageH - item.y - item.fontSize,
        size: item.fontSize || 14,
        color: rgb(0.1, 0.1, 0.2),
      });
    });

    return await pdfDoc.save();
  };

  const handleDownload = async () => {
    try {
      setStatusMsg('Exporting updated PDF...');
      const bytes = await generateUpdatedPdf();
      const blob = new Blob([bytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      let name = fileName.trim();
      if (!name.toLowerCase().endsWith('.pdf')) name += '.pdf';
      a.download = name;
      a.click();
      setStatusMsg('Updated PDF downloaded successfully!');
    } catch (err: any) {
      setErrorMsg('Export failed: ' + err.message);
    }
  };

  const handleSaveToFiles = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const bytes = await generateUpdatedPdf();
      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Data = 'data:application/pdf;base64,' + btoa(binary);

      let name = fileName.trim();
      if (!name.toLowerCase().endsWith('.pdf')) name += '.pdf';

      await api.saveFile({
        name,
        size: bytes.length,
        file_type: 'application/pdf',
        data_url: base64Data,
        page_count: numPages,
      });

      setStatusMsg('Updated document saved to "My Files" successfully!');
      onFileSaved();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save file.');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter current page items
  const currentPageItems = textItems
    .filter((item) => item.page === currentPage)
    .filter((item) =>
      filterSearch ? item.currentText.toLowerCase().includes(filterSearch.toLowerCase()) : true
    );

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
          Utility • Edit PDF Text & Content
        </span>
      </div>

      {!pdfBytes ? (
        <label className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-800 hover:border-blue-500 rounded-3xl cursor-pointer bg-slate-900/60 transition-all group">
          <Upload className="w-12 h-12 text-slate-500 group-hover:text-blue-400 transition-colors mb-3" />
          <h3 className="text-base font-bold text-white group-hover:text-blue-300">
            Select a PDF to inspect and edit text layers
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Detects native text strings, provides inline editing, text replacement, and custom blocks
          </p>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      ) : (
        <div className="space-y-4">
          {/* Top Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900 border border-slate-800 rounded-2xl">
            {/* Page navigation */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs font-semibold text-white bg-slate-950 px-2 py-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px]">
                  Page {currentPage} of {numPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= numPages}
                  onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Undo / Redo */}
              <button
                type="button"
                disabled={historyIndex <= 0}
                onClick={handleUndo}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30"
                title="Undo"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={historyIndex >= history.length - 1}
                onClick={handleRedo}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30"
                title="Redo"
              >
                <Redo2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleAddTextBlock}
                className="py-1.5 px-3 rounded-xl bg-blue-600/10 border border-blue-500/30 text-blue-400 hover:bg-blue-600/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Text Block
              </button>
            </div>

            {/* Export & Save */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-download-text-edited-pdf"
                onClick={handleDownload}
                className="py-1.5 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" /> Download PDF
              </button>
              <button
                type="button"
                id="btn-save-text-edited-pdf"
                disabled={isSaving}
                onClick={handleSaveToFiles}
                className="py-1.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 border border-slate-700"
              >
                <Save className="w-3.5 h-3.5 text-emerald-400" /> Save
              </button>
            </div>
          </div>

          {/* Scanned Image / OCR Alert if detected */}
          {isScannedImage && (
            <div className="p-4 rounded-2xl bg-amber-950/50 border border-amber-800/80 text-amber-200 text-xs sm:text-sm flex items-start gap-3">
              <ScanText className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-300">
                  This page contains image-based text. OCR is required to edit this text.
                </h4>
                <p className="text-amber-200/80 text-xs mt-0.5 leading-relaxed">
                  No selectable digital text vectors were found on Page {currentPage}. You can still
                  add new custom text blocks overlaying this page using the "Add Text Block" tool.
                </p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {statusMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{statusMsg}</span>
            </div>
          )}

          {/* Grid: Left Page Canvas vs Right Text Items Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Canvas Preview */}
            <div className="lg:col-span-7 bg-slate-950/90 border border-slate-800 rounded-3xl p-5 flex items-center justify-center overflow-auto max-h-[640px]">
              <div className="relative shadow-2xl rounded-lg overflow-hidden bg-white">
                <canvas ref={canvasRef} className="block" />
              </div>
            </div>

            {/* Right Side: Text Items List & Editor */}
            <div className="lg:col-span-5 space-y-4">
              {/* Selected Item Editor Panel */}
              {selectedItem ? (
                <div className="bg-slate-900 border border-blue-500/40 rounded-3xl p-5 space-y-3.5 shadow-lg shadow-blue-500/5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Type className="w-4 h-4" /> Edit Selected Text Block
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        pushHistory(textItems.filter((t) => t.id !== selectedItemId));
                        setSelectedItemId(null);
                      }}
                      className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Text Content
                    </label>
                    <textarea
                      rows={2}
                      value={selectedItem.currentText}
                      onChange={(e) => updateSelectedItem({ currentText: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Font size */}
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-400">Size:</span>
                      <select
                        value={selectedItem.fontSize}
                        onChange={(e) =>
                          updateSelectedItem({ fontSize: parseInt(e.target.value, 10) })
                        }
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white"
                      >
                        {[10, 12, 14, 16, 18, 20, 24, 28, 32].map((s) => (
                          <option key={s} value={s}>
                            {s}px
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Styles: Bold, Italic */}
                    <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        onClick={() => updateSelectedItem({ isBold: !selectedItem.isBold })}
                        className={`p-1.5 rounded text-xs ${
                          selectedItem.isBold ? 'bg-blue-600 text-white' : 'text-slate-400'
                        }`}
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSelectedItem({ isItalic: !selectedItem.isItalic })}
                        className={`p-1.5 rounded text-xs ${
                          selectedItem.isItalic ? 'bg-blue-600 text-white' : 'text-slate-400'
                        }`}
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Alignment */}
                    <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                      {(['left', 'center', 'right'] as const).map((a) => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => updateSelectedItem({ align: a })}
                          className={`p-1.5 rounded text-xs ${
                            selectedItem.align === a ? 'bg-blue-600 text-white' : 'text-slate-400'
                          }`}
                        >
                          {a === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                          {a === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                          {a === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Detected Text List */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Detected Text Blocks on Page {currentPage} ({currentPageItems.length})
                  </span>
                </div>

                {/* Filter search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    placeholder="Search text on page..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {currentPageItems.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No text found on this page. Click "Add Text Block" to add new text.
                    </div>
                  ) : (
                    currentPageItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItemId(item.id)}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                          selectedItemId === item.id
                            ? 'bg-blue-600/10 border-blue-500 text-white ring-1 ring-blue-500'
                            : 'bg-slate-950 border-slate-800/80 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                          <span className="font-mono">
                            {item.isCustom ? 'Custom Text' : 'Native Text'} • {item.fontSize}px
                          </span>
                          {item.currentText !== item.originalText && (
                            <span className="text-emerald-400 font-semibold">Modified</span>
                          )}
                        </div>
                        <p className="text-xs font-medium leading-relaxed truncate">
                          {item.currentText}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
