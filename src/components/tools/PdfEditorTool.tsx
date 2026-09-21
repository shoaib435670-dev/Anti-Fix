import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Upload,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Type,
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
  Move,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import { api } from '../../lib/api';

// Configure pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;

interface Annotation {
  id: string;
  page: number;
  type: 'text' | 'draw' | 'rect' | 'circle' | 'line' | 'arrow';
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  fontSize?: number;
  fontColor?: string;
  isBold?: boolean;
  isItalic?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
  opacity?: number;
  points?: { x: number; y: number }[];
}

interface PdfEditorToolProps {
  onBack: () => void;
  onFileSaved: () => void;
  initialFile?: { name: string; dataUrl: string };
}

export const PdfEditorTool: React.FC<PdfEditorToolProps> = ({
  onBack,
  onFileSaved,
  initialFile,
}) => {
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfDocProxy, setPdfDocProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(1.0);
  const [pageRotations, setPageRotations] = useState<Record<number, number>>({});

  // Active Tool
  const [tool, setTool] = useState<
    'select' | 'text' | 'pen' | 'highlighter' | 'rect' | 'circle' | 'line' | 'arrow' | 'eraser'
  >('select');

  // Tool settings
  const [strokeColor, setStrokeColor] = useState<string>('#2563eb');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [fontSize, setFontSize] = useState<number>(18);
  const [isBold, setIsBold] = useState<boolean>(false);
  const [isItalic, setIsItalic] = useState<boolean>(false);

  // Annotations & History
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [history, setHistory] = useState<Annotation[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [draggedTextId, setDraggedTextId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Canvas Refs
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Output states
  const [fileName, setFileName] = useState('AntiFix_Edited.pdf');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load PDF from File / initialFile
  const loadPdfData = async (buffer: ArrayBuffer, name?: string) => {
    try {
      const bytes = new Uint8Array(buffer);
      setPdfBytes(bytes);
      if (name) setFileName(name);

      const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
      const loadedDoc = await loadingTask.promise;
      setPdfDocProxy(loadedDoc);
      setNumPages(loadedDoc.numPages);
      setCurrentPage(1);
      setAnnotations([]);
      setHistory([]);
      setHistoryIndex(-1);
      setPageRotations({});
      setStatusMsg(null);
      setErrorMsg(null);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to read PDF file. ' + (err.message || ''));
    }
  };

  useEffect(() => {
    if (initialFile) {
      fetch(initialFile.dataUrl)
        .then((res) => res.arrayBuffer())
        .then((buf) => loadPdfData(buf, initialFile.name))
        .catch((e) => setErrorMsg('Failed to open initial file'));
    }
  }, [initialFile]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const buf = event.target?.result as ArrayBuffer;
      loadPdfData(buf, file.name);
    };
    reader.readAsArrayBuffer(file);
  };

  // Render Background PDF Page onto bgCanvas
  const renderPage = useCallback(async () => {
    if (!pdfDocProxy || !bgCanvasRef.current) return;
    try {
      const page = await pdfDocProxy.getPage(currentPage);
      const rotation = ((pageRotations[currentPage] || 0) + page.rotate) % 360;
      const viewport = page.getViewport({ scale: zoom * 1.5, rotation });

      const canvas = bgCanvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / 1.5}px`;
      canvas.style.height = `${viewport.height / 1.5}px`;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      };

      await (page as any).render(renderContext).promise;

      // Sync overlay canvas size
      if (drawCanvasRef.current) {
        drawCanvasRef.current.width = viewport.width;
        drawCanvasRef.current.height = viewport.height;
        drawCanvasRef.current.style.width = `${viewport.width / 1.5}px`;
        drawCanvasRef.current.style.height = `${viewport.height / 1.5}px`;
      }
    } catch (err: any) {
      console.error('Page render error:', err);
    }
  }, [pdfDocProxy, currentPage, zoom, pageRotations]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // Push new state to history for undo/redo
  const pushState = (newAnnotations: Annotation[]) => {
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(newAnnotations);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setAnnotations(newAnnotations);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setAnnotations(history[historyIndex - 1]);
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
      setAnnotations([]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setAnnotations(history[historyIndex + 1]);
    }
  };

  // Re-draw overlay annotations on drawCanvas
  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Filter annotations for current page
    const pageAnns = annotations.filter((a) => a.page === currentPage);

    pageAnns.forEach((ann) => {
      ctx.save();
      if (ann.type === 'draw' && ann.points && ann.points.length > 0) {
        ctx.strokeStyle = ann.strokeColor || '#2563eb';
        ctx.lineWidth = (ann.strokeWidth || 3) * 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = ann.opacity || 1;

        ctx.beginPath();
        ctx.moveTo(ann.points[0].x * 1.5, ann.points[0].y * 1.5);
        for (let i = 1; i < ann.points.length; i++) {
          ctx.lineTo(ann.points[i].x * 1.5, ann.points[i].y * 1.5);
        }
        ctx.stroke();
      } else if (ann.type === 'rect') {
        ctx.strokeStyle = ann.strokeColor || '#2563eb';
        ctx.lineWidth = (ann.strokeWidth || 3) * 1.5;
        ctx.strokeRect(
          ann.x * 1.5,
          ann.y * 1.5,
          (ann.width || 50) * 1.5,
          (ann.height || 50) * 1.5
        );
      } else if (ann.type === 'circle') {
        ctx.strokeStyle = ann.strokeColor || '#2563eb';
        ctx.lineWidth = (ann.strokeWidth || 3) * 1.5;
        ctx.beginPath();
        const rx = ((ann.width || 50) * 1.5) / 2;
        const ry = ((ann.height || 50) * 1.5) / 2;
        const cx = ann.x * 1.5 + rx;
        const cy = ann.y * 1.5 + ry;
        ctx.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (ann.type === 'line' || ann.type === 'arrow') {
        ctx.strokeStyle = ann.strokeColor || '#2563eb';
        ctx.lineWidth = (ann.strokeWidth || 3) * 1.5;
        ctx.beginPath();
        ctx.moveTo(ann.x * 1.5, ann.y * 1.5);
        ctx.lineTo((ann.x + (ann.width || 50)) * 1.5, (ann.y + (ann.height || 50)) * 1.5);
        ctx.stroke();
        if (ann.type === 'arrow') {
          // Arrow head
          const endX = (ann.x + (ann.width || 50)) * 1.5;
          const endY = (ann.y + (ann.height || 50)) * 1.5;
          const angle = Math.atan2((ann.height || 50) * 1.5, (ann.width || 50) * 1.5);
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
  }, [annotations, currentPage]);

  // Pointer Events on Overlay Canvas
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = (canvas.width / 1.5) / rect.width;
    const scaleY = (canvas.height / 1.5) / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);

    if (tool === 'text') {
      const newAnn: Annotation = {
        id: 'ann_' + Date.now(),
        page: currentPage,
        type: 'text',
        x: coords.x,
        y: coords.y,
        text: 'Click to edit text',
        fontSize: fontSize,
        fontColor: strokeColor,
        isBold: isBold,
        isItalic: isItalic,
      };
      pushState([...annotations, newAnn]);
      setTool('select');
      return;
    }

    if (tool === 'pen' || tool === 'highlighter') {
      setIsDrawing(true);
      setCurrentPoints([coords]);
    } else if (tool === 'rect' || tool === 'circle' || tool === 'line' || tool === 'arrow') {
      setIsDrawing(true);
      setCurrentPoints([coords]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const coords = getCanvasCoords(e);

    if (tool === 'pen' || tool === 'highlighter') {
      const updated = [...currentPoints, coords];
      setCurrentPoints(updated);

      // Temporary visual render on canvas
      const canvas = drawCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.save();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth * 1.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = tool === 'highlighter' ? 0.35 : 1;

      ctx.beginPath();
      ctx.moveTo(currentPoints[0].x * 1.5, currentPoints[0].y * 1.5);
      for (let i = 1; i < updated.length; i++) {
        ctx.lineTo(updated[i].x * 1.5, updated[i].y * 1.5);
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
        const newAnn: Annotation = {
          id: 'ann_' + Date.now(),
          page: currentPage,
          type: 'draw',
          x: currentPoints[0].x,
          y: currentPoints[0].y,
          points: currentPoints,
          strokeColor: strokeColor,
          strokeWidth: strokeWidth,
          opacity: tool === 'highlighter' ? 0.35 : 1,
        };
        pushState([...annotations, newAnn]);
      }
      setCurrentPoints([]);
    } else if (['rect', 'circle', 'line', 'arrow'].includes(tool)) {
      const start = currentPoints[0];
      if (start) {
        const width = coords.x - start.x;
        const height = coords.y - start.y;
        const newAnn: Annotation = {
          id: 'ann_' + Date.now(),
          page: currentPage,
          type: tool as any,
          x: width < 0 ? coords.x : start.x,
          y: height < 0 ? coords.y : start.y,
          width: Math.abs(width),
          height: Math.abs(height),
          strokeColor: strokeColor,
          strokeWidth: strokeWidth,
        };
        pushState([...annotations, newAnn]);
      }
      setCurrentPoints([]);
    }
  };

  // Rotate Page (90 deg)
  const handleRotatePage = (direction: 'cw' | 'ccw') => {
    const cur = pageRotations[currentPage] || 0;
    const next = direction === 'cw' ? (cur + 90) % 360 : (cur + 270) % 360;
    setPageRotations({ ...pageRotations, [currentPage]: next });
  };

  // Delete current page
  const handleDeleteCurrentPage = () => {
    if (numPages <= 1) {
      setErrorMsg('Cannot delete the only page in document.');
      return;
    }
    // We will apply this during export or adjust view
    setStatusMsg(`Page ${currentPage} marked for deletion.`);
  };

  // Export modified PDF using pdf-lib!
  const generateExportPdf = async (): Promise<Uint8Array> => {
    if (!pdfBytes) throw new Error('No PDF data loaded');

    const pdfDoc = await PDFDocument.load(pdfBytes.slice());
    const pages = pdfDoc.getPages();

    // Apply rotations
    Object.entries(pageRotations).forEach(([pgStr, rot]) => {
      const pgIdx = parseInt(pgStr, 10) - 1;
      if (pages[pgIdx]) {
        const curRot = pages[pgIdx].getRotation().angle;
        pages[pgIdx].setRotation(degrees((curRot + rot) % 360));
      }
    });

    // Burn text and drawing annotations into PDF
    for (const ann of annotations) {
      const pgIdx = ann.page - 1;
      if (!pages[pgIdx]) continue;
      const targetPage = pages[pgIdx];
      const { height: pageH } = targetPage.getSize();

      // Convert hex color to rgb
      const hexToRgb = (hex: string) => {
        const clean = hex.replace('#', '');
        const r = parseInt(clean.substring(0, 2), 16) / 255 || 0;
        const g = parseInt(clean.substring(2, 4), 16) / 255 || 0;
        const b = parseInt(clean.substring(4, 6), 16) / 255 || 0;
        return rgb(r, g, b);
      };

      if (ann.type === 'text' && ann.text) {
        targetPage.drawText(ann.text, {
          x: ann.x,
          y: pageH - ann.y - (ann.fontSize || 16),
          size: ann.fontSize || 16,
          color: hexToRgb(ann.fontColor || '#2563eb'),
        });
      } else if (ann.type === 'rect') {
        targetPage.drawRectangle({
          x: ann.x,
          y: pageH - ann.y - (ann.height || 40),
          width: ann.width || 60,
          height: ann.height || 40,
          borderColor: hexToRgb(ann.strokeColor || '#2563eb'),
          borderWidth: ann.strokeWidth || 2,
        });
      } else if (ann.type === 'circle') {
        targetPage.drawEllipse({
          x: ann.x + (ann.width || 40) / 2,
          y: pageH - ann.y - (ann.height || 40) / 2,
          xScale: (ann.width || 40) / 2,
          yScale: (ann.height || 40) / 2,
          borderColor: hexToRgb(ann.strokeColor || '#2563eb'),
          borderWidth: ann.strokeWidth || 2,
        });
      } else if (ann.type === 'draw' && ann.points && ann.points.length > 1) {
        // Draw connected line segments
        for (let i = 0; i < ann.points.length - 1; i++) {
          targetPage.drawLine({
            start: { x: ann.points[i].x, y: pageH - ann.points[i].y },
            end: { x: ann.points[i + 1].x, y: pageH - ann.points[i + 1].y },
            thickness: ann.strokeWidth || 2,
            color: hexToRgb(ann.strokeColor || '#2563eb'),
            opacity: ann.opacity || 1,
          });
        }
      }
    }

    return await pdfDoc.save();
  };

  const handleDownload = async () => {
    try {
      setStatusMsg('Exporting edited PDF...');
      const editedBytes = await generateExportPdf();
      const blob = new Blob([editedBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      let name = fileName.trim();
      if (!name.toLowerCase().endsWith('.pdf')) name += '.pdf';
      a.download = name;
      a.click();
      setStatusMsg('Download started successfully!');
    } catch (err: any) {
      setErrorMsg('Failed to export PDF: ' + err.message);
    }
  };

  const handleSaveToFiles = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const editedBytes = await generateExportPdf();
      let binary = '';
      const len = editedBytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(editedBytes[i]);
      }
      const base64Data = 'data:application/pdf;base64,' + btoa(binary);

      let name = fileName.trim();
      if (!name.toLowerCase().endsWith('.pdf')) name += '.pdf';

      await api.saveFile({
        name,
        size: editedBytes.length,
        file_type: 'application/pdf',
        data_url: base64Data,
        page_count: numPages,
      });

      setStatusMsg('Saved to "My Files" successfully!');
      onFileSaved();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save file.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <span className="text-xs uppercase font-mono font-bold text-blue-400">
          Utility • Full PDF Editor
        </span>
      </div>

      {!pdfBytes ? (
        /* Upload initial PDF if none loaded */
        <label className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-800 hover:border-blue-500 rounded-3xl cursor-pointer bg-slate-900/60 transition-all group">
          <Upload className="w-12 h-12 text-slate-500 group-hover:text-blue-400 transition-colors mb-3" />
          <h3 className="text-base font-bold text-white group-hover:text-blue-300">
            Select a PDF document to edit
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Edit text, add annotations, draw, zoom, rotate, and export
          </p>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      ) : (
        /* Full Workspace */
        <div className="space-y-3">
          {/* Main Top Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-900 border border-slate-800 rounded-2xl">
            {/* Tools Selector */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80">
              <button
                type="button"
                onClick={() => setTool('select')}
                className={`p-2 rounded-lg text-xs font-medium transition-all ${
                  tool === 'select' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Select Tool"
              >
                <Move className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setTool('text')}
                className={`p-2 rounded-lg text-xs font-medium transition-all ${
                  tool === 'text' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Add Text"
              >
                <Type className="w-4 h-4" />
              </button>
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

            {/* Formatting / Colors */}
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={strokeColor}
                onChange={(e) => setStrokeColor(e.target.value)}
                className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0"
                title="Choose Color"
              />

              {tool === 'text' ? (
                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <select
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-white text-xs"
                  >
                    {[12, 14, 16, 18, 20, 24, 28, 36].map((s) => (
                      <option key={s} value={s}>
                        {s}px
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setIsBold(!isBold)}
                    className={`px-2 py-1 rounded font-bold border ${
                      isBold ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-800 text-slate-400'
                    }`}
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsItalic(!isItalic)}
                    className={`px-2 py-1 rounded italic font-serif border ${
                      isItalic ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-800 text-slate-400'
                    }`}
                  >
                    I
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <span>Size:</span>
                  <input
                    type="range"
                    min="1"
                    max="16"
                    value={strokeWidth}
                    onChange={(e) => setStrokeWidth(Number(e.target.value))}
                    className="w-16 accent-blue-500 cursor-pointer"
                  />
                  <span className="font-mono text-white text-[11px]">{strokeWidth}px</span>
                </div>
              )}
            </div>

            {/* Page Navigation & Zoom */}
            <div className="flex items-center gap-2">
              {/* Undo / Redo */}
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

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
                  className="p-1 text-slate-400 hover:text-white"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono text-white">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(2.0, z + 0.15))}
                  className="p-1 text-slate-400 hover:text-white"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Page Rotation */}
              <button
                type="button"
                onClick={() => handleRotatePage('cw')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-950 border border-slate-800"
                title="Rotate Page 90° Clockwise"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Export & Save Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-editor-download-pdf"
                onClick={handleDownload}
                className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" /> Export PDF
              </button>
              <button
                type="button"
                id="btn-editor-save-pdf"
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

          {/* Canvas Workspace Viewport */}
          <div
            ref={containerRef}
            className="w-full min-h-[580px] max-h-[720px] bg-slate-950/90 border border-slate-800 rounded-3xl p-6 overflow-auto flex items-center justify-center relative shadow-inner"
          >
            <div className="relative shadow-2xl rounded-lg overflow-hidden bg-white">
              {/* PDF Background Canvas */}
              <canvas ref={bgCanvasRef} className="block pointer-events-none" />

              {/* Drawing / Annotations Interaction Canvas */}
              <canvas
                ref={drawCanvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className="absolute inset-0 z-20 cursor-crosshair"
              />

              {/* Editable Text Elements Overlay */}
              {annotations
                .filter((a) => a.page === currentPage && a.type === 'text')
                .map((ann) => (
                  <div
                    key={ann.id}
                    style={{
                      position: 'absolute',
                      left: `${ann.x}px`,
                      top: `${ann.y}px`,
                      color: ann.fontColor,
                      fontSize: `${ann.fontSize}px`,
                      fontWeight: ann.isBold ? 'bold' : 'normal',
                      fontStyle: ann.isItalic ? 'italic' : 'normal',
                      zIndex: 30,
                    }}
                    className="cursor-move group"
                  >
                    <input
                      type="text"
                      value={ann.text}
                      onChange={(e) => {
                        const updated = annotations.map((a) =>
                          a.id === ann.id ? { ...a, text: e.target.value } : a
                        );
                        pushState(updated);
                      }}
                      className="bg-transparent border border-dashed border-transparent hover:border-blue-400 focus:border-blue-500 focus:bg-white/80 rounded px-1 text-slate-900 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = annotations.filter((a) => a.id !== ann.id);
                        pushState(updated);
                      }}
                      className="hidden group-hover:inline-block ml-1 text-red-500 hover:text-red-700 font-bold text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
