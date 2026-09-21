import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Upload,
  ChevronLeft,
  ChevronRight,
  PenTool,
  Highlighter,
  Square,
  Circle,
  Minus,
  ArrowUpRight,
  Eraser,
  Undo2,
  Redo2,
  Download,
  Save,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Palette,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb } from 'pdf-lib';
import { api } from '../../lib/api';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;

interface DrawingShape {
  id: string;
  page: number;
  type: 'pen' | 'highlighter' | 'eraser' | 'line' | 'rect' | 'circle' | 'arrow';
  points?: { x: number; y: number }[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color: string;
  strokeWidth: number;
  opacity: number;
}

interface DrawOnPdfToolProps {
  onBack: () => void;
  onFileSaved: () => void;
}

const PRESET_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#a855f7', // Purple
  '#000000', // Black
  '#ffffff', // White
];

export const DrawOnPdfTool: React.FC<DrawOnPdfToolProps> = ({ onBack, onFileSaved }) => {
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfDocProxy, setPdfDocProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [fileName, setFileName] = useState('AntiFix_Drawn.pdf');

  // Tool state
  const [tool, setTool] = useState<
    'pen' | 'highlighter' | 'eraser' | 'line' | 'rect' | 'circle' | 'arrow'
  >('pen');
  const [color, setColor] = useState('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [opacity, setOpacity] = useState(1.0);

  // Drawing elements
  const [shapes, setShapes] = useState<DrawingShape[]>([]);
  const [history, setHistory] = useState<DrawingShape[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);

  // Canvases
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);

  // Status
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      setShapes([]);
      setHistory([]);
      setHistoryIndex(-1);
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

  const renderPage = useCallback(async () => {
    if (!pdfDocProxy || !bgCanvasRef.current) return;
    try {
      const page = await pdfDocProxy.getPage(currentPage);
      const viewport = page.getViewport({ scale: 1.35 });

      const bgCanvas = bgCanvasRef.current;
      const ctx = bgCanvas.getContext('2d');
      if (!ctx) return;

      bgCanvas.width = viewport.width;
      bgCanvas.height = viewport.height;

      await (page as any).render({ canvasContext: ctx, viewport, canvas: bgCanvas }).promise;

      if (drawCanvasRef.current) {
        drawCanvasRef.current.width = viewport.width;
        drawCanvasRef.current.height = viewport.height;
      }
    } catch (err) {
      console.error(err);
    }
  }, [pdfDocProxy, currentPage]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // Push new history frame
  const pushShapes = (newShapes: DrawingShape[]) => {
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(newShapes);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setShapes(newShapes);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setShapes(history[historyIndex - 1]);
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
      setShapes([]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setShapes(history[historyIndex + 1]);
    }
  };

  const handleClearPage = () => {
    const remaining = shapes.filter((s) => s.page !== currentPage);
    pushShapes(remaining);
  };

  // Re-draw overlay shapes on drawCanvas
  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pageShapes = shapes.filter((s) => s.page === currentPage);
    pageShapes.forEach((s) => {
      ctx.save();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.strokeWidth;
      ctx.globalAlpha = s.opacity;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if ((s.type === 'pen' || s.type === 'highlighter') && s.points && s.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(s.points[0].x, s.points[0].y);
        for (let i = 1; i < s.points.length; i++) {
          ctx.lineTo(s.points[i].x, s.points[i].y);
        }
        ctx.stroke();
      } else if (s.type === 'rect') {
        ctx.strokeRect(s.x || 0, s.y || 0, s.width || 40, s.height || 40);
      } else if (s.type === 'circle') {
        ctx.beginPath();
        const rx = (s.width || 40) / 2;
        const ry = (s.height || 40) / 2;
        const cx = (s.x || 0) + rx;
        const cy = (s.y || 0) + ry;
        ctx.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (s.type === 'line' || s.type === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(s.x || 0, s.y || 0);
        ctx.lineTo((s.x || 0) + (s.width || 40), (s.y || 0) + (s.height || 40));
        ctx.stroke();

        if (s.type === 'arrow') {
          const endX = (s.x || 0) + (s.width || 40);
          const endY = (s.y || 0) + (s.height || 40);
          const angle = Math.atan2(s.height || 40, s.width || 40);
          const headlen = 14;
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - headlen * Math.cos(angle - Math.PI / 6),
            endY - headlen * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - headlen * Math.cos(angle + Math.PI / 6),
            endY - headlen * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
        }
      }
      ctx.restore();
    });
  }, [shapes, currentPage]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    setIsDrawing(true);
    setCurrentPoints([coords]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const coords = getCanvasCoords(e);

    if (tool === 'pen' || tool === 'highlighter') {
      const updated = [...currentPoints, coords];
      setCurrentPoints(updated);

      const canvas = drawCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.globalAlpha = tool === 'highlighter' ? 0.35 : opacity;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
      for (let i = 1; i < updated.length; i++) {
        ctx.lineTo(updated[i].x, updated[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const coords = getCanvasCoords(e);

    if (tool === 'pen' || tool === 'highlighter') {
      if (currentPoints.length > 1) {
        const newShape: DrawingShape = {
          id: 'shape_' + Date.now(),
          page: currentPage,
          type: tool,
          points: currentPoints,
          color,
          strokeWidth,
          opacity: tool === 'highlighter' ? 0.35 : opacity,
        };
        pushShapes([...shapes, newShape]);
      }
      setCurrentPoints([]);
    } else if (['rect', 'circle', 'line', 'arrow'].includes(tool)) {
      const start = currentPoints[0];
      if (start) {
        const w = coords.x - start.x;
        const h = coords.y - start.y;
        const newShape: DrawingShape = {
          id: 'shape_' + Date.now(),
          page: currentPage,
          type: tool as any,
          x: w < 0 ? coords.x : start.x,
          y: h < 0 ? coords.y : start.y,
          width: Math.abs(w),
          height: Math.abs(h),
          color,
          strokeWidth,
          opacity,
        };
        pushShapes([...shapes, newShape]);
      }
      setCurrentPoints([]);
    }
  };

  // Export PDF with burned drawings
  const generateExportPdf = async (): Promise<Uint8Array> => {
    if (!pdfBytes) throw new Error('No PDF loaded');

    const pdfDoc = await PDFDocument.load(pdfBytes.slice());
    const pages = pdfDoc.getPages();

    const hexToRgb = (hex: string) => {
      const clean = hex.replace('#', '');
      const r = parseInt(clean.substring(0, 2), 16) / 255 || 0;
      const g = parseInt(clean.substring(2, 4), 16) / 255 || 0;
      const b = parseInt(clean.substring(4, 6), 16) / 255 || 0;
      return rgb(r, g, b);
    };

    shapes.forEach((s) => {
      const pageIndex = s.page - 1;
      if (!pages[pageIndex]) return;
      const targetPage = pages[pageIndex];
      const { height: pageH } = targetPage.getSize();
      // Scale factor from canvas (scale 1.35) to pdf pt
      const scale = 1 / 1.35;

      if ((s.type === 'pen' || s.type === 'highlighter') && s.points && s.points.length > 1) {
        for (let i = 0; i < s.points.length - 1; i++) {
          targetPage.drawLine({
            start: { x: s.points[i].x * scale, y: pageH - s.points[i].y * scale },
            end: { x: s.points[i + 1].x * scale, y: pageH - s.points[i + 1].y * scale },
            thickness: s.strokeWidth * scale,
            color: hexToRgb(s.color),
            opacity: s.opacity,
          });
        }
      } else if (s.type === 'rect') {
        targetPage.drawRectangle({
          x: (s.x || 0) * scale,
          y: pageH - ((s.y || 0) + (s.height || 40)) * scale,
          width: (s.width || 40) * scale,
          height: (s.height || 40) * scale,
          borderColor: hexToRgb(s.color),
          borderWidth: s.strokeWidth * scale,
          opacity: s.opacity,
        });
      } else if (s.type === 'circle') {
        targetPage.drawEllipse({
          x: ((s.x || 0) + (s.width || 40) / 2) * scale,
          y: pageH - ((s.y || 0) + (s.height || 40) / 2) * scale,
          xScale: ((s.width || 40) / 2) * scale,
          yScale: ((s.height || 40) / 2) * scale,
          borderColor: hexToRgb(s.color),
          borderWidth: s.strokeWidth * scale,
          opacity: s.opacity,
        });
      }
    });

    return await pdfDoc.save();
  };

  const handleDownload = async () => {
    try {
      setStatusMsg('Exporting drawing to PDF...');
      const bytes = await generateExportPdf();
      const blob = new Blob([bytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      let name = fileName.trim();
      if (!name.toLowerCase().endsWith('.pdf')) name += '.pdf';
      a.download = name;
      a.click();
      setStatusMsg('PDF with drawings downloaded successfully!');
    } catch (err: any) {
      setErrorMsg('Export failed: ' + err.message);
    }
  };

  const handleSaveToFiles = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const bytes = await generateExportPdf();
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

      setStatusMsg('Saved drawing to "My Files" successfully!');
      onFileSaved();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save file.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
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
          Utility • Draw & Annotate on PDF
        </span>
      </div>

      {!pdfBytes ? (
        <label className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-800 hover:border-blue-500 rounded-3xl cursor-pointer bg-slate-900/60 transition-all group">
          <Upload className="w-12 h-12 text-slate-500 group-hover:text-blue-400 transition-colors mb-3" />
          <h3 className="text-base font-bold text-white group-hover:text-blue-300">
            Select a PDF document to draw on
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Freehand pen, highlighter, shapes, lines, arrows, opacity and stroke controls
          </p>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      ) : (
        <div className="space-y-3">
          {/* Main Drawing Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900 border border-slate-800 rounded-2xl">
            {/* Shapes / Tool selector */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setTool('pen')}
                className={`p-2 rounded-lg text-xs font-medium transition-all ${
                  tool === 'pen' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Pen"
              >
                <PenTool className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setTool('highlighter')}
                className={`p-2 rounded-lg text-xs font-medium transition-all ${
                  tool === 'highlighter' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Highlighter"
              >
                <Highlighter className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setTool('rect')}
                className={`p-2 rounded-lg text-xs font-medium transition-all ${
                  tool === 'rect' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Rectangle"
              >
                <Square className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setTool('circle')}
                className={`p-2 rounded-lg text-xs font-medium transition-all ${
                  tool === 'circle' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Circle"
              >
                <Circle className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setTool('line')}
                className={`p-2 rounded-lg text-xs font-medium transition-all ${
                  tool === 'line' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Line"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setTool('arrow')}
                className={`p-2 rounded-lg text-xs font-medium transition-all ${
                  tool === 'arrow' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Arrow"
              >
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            {/* Colors Preset Chips */}
            <div className="flex items-center gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full transition-transform border border-slate-700 ${
                    color === c ? 'scale-125 ring-2 ring-blue-500' : 'hover:scale-110'
                  }`}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 ml-1"
                title="Custom Color"
              />
            </div>

            {/* Stroke Width & Opacity */}
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <span>Width:</span>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  className="w-16 accent-blue-500"
                />
                <span className="font-mono text-white text-[11px]">{strokeWidth}px</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span>Opacity:</span>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-16 accent-blue-500"
                />
                <span className="font-mono text-white text-[11px]">
                  {Math.round(opacity * 100)}%
                </span>
              </div>
            </div>

            {/* Navigation & Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={historyIndex < 0}
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
                onClick={handleClearPage}
                className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/40"
                title="Clear Page Drawings"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="h-4 w-px bg-slate-800" />

              {/* Page Nav */}
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
                  {currentPage} / {numPages}
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

              {/* Download & Save */}
              <button
                type="button"
                id="btn-download-drawn-pdf"
                onClick={handleDownload}
                className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Export
              </button>
              <button
                type="button"
                id="btn-save-drawn-pdf"
                disabled={isSaving}
                onClick={handleSaveToFiles}
                className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 border border-slate-700"
              >
                <Save className="w-3.5 h-3.5 text-emerald-400" /> Save
              </button>
            </div>
          </div>

          {/* Feedback */}
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

          {/* Drawing Canvas Area */}
          <div className="w-full min-h-[580px] max-h-[720px] bg-slate-950/90 border border-slate-800 rounded-3xl p-6 overflow-auto flex items-center justify-center relative shadow-inner">
            <div className="relative shadow-2xl rounded-lg overflow-hidden bg-white">
              <canvas ref={bgCanvasRef} className="block pointer-events-none" />
              <canvas
                ref={drawCanvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className="absolute inset-0 z-20 cursor-crosshair"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
