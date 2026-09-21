import React, { useState } from 'react';
import {
  Upload,
  ArrowLeft,
  Trash2,
  RotateCw,
  ArrowUp,
  ArrowDown,
  Download,
  Save,
  CheckCircle2,
  FileText,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { PDFDocument, PageSizes } from 'pdf-lib';
import { api } from '../../lib/api';

interface ImageItem {
  id: string;
  name: string;
  dataUrl: string;
  rotation: number; // 0, 90, 180, 270
  fileType: string;
}

interface ImageToPdfToolProps {
  onBack: () => void;
  onFileSaved: () => void;
}

export const ImageToPdfTool: React.FC<ImageToPdfToolProps> = ({ onBack, onFileSaved }) => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [pageSize, setPageSize] = useState<'A4' | 'Letter' | 'Fit'>('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [margin, setMargin] = useState<number>(20); // in points

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
  const [generatedPdfBytes, setGeneratedPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfFileName, setPdfFileName] = useState('AntiFix_Images.pdf');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFilesAdded = (files: FileList | null) => {
    if (!files) return;
    setErrorMsg(null);
    setStatusMsg(null);

    const newItems: ImageItem[] = [];
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    Array.from(files).forEach((file) => {
      if (!validTypes.includes(file.type)) {
        setErrorMsg('Some files were skipped. Only JPG, PNG, and WEBP are supported.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setImages((prev) => [
          ...prev,
          {
            id: 'img_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            name: file.name,
            dataUrl: e.target?.result as string,
            rotation: 0,
            fileType: file.type,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRotate = (id: string) => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, rotation: (img.rotation + 90) % 360 } : img))
    );
  };

  const handleDelete = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const updated = [...images];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setImages(updated);
  };

  const convertImageToOrientedDataUrl = async (
    dataUrl: string,
    rotation: number
  ): Promise<string> => {
    if (rotation === 0) return dataUrl;

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        if (rotation === 90 || rotation === 270) {
          canvas.width = img.height;
          canvas.height = img.width;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      img.src = dataUrl;
    });
  };

  const handleGeneratePdf = async () => {
    if (images.length === 0) {
      setErrorMsg('Please upload at least one image.');
      return;
    }

    setGenerating(true);
    setErrorMsg(null);
    setStatusMsg(null);

    try {
      const pdfDoc = await PDFDocument.create();

      for (const item of images) {
        // Apply client rotation to image canvas before embedding
        const orientedDataUrl = await convertImageToOrientedDataUrl(item.dataUrl, item.rotation);

        let embeddedImage;
        if (item.fileType === 'image/png') {
          // Check if png embedding works or fallback to jpeg
          try {
            embeddedImage = await pdfDoc.embedPng(orientedDataUrl);
          } catch {
            embeddedImage = await pdfDoc.embedJpg(orientedDataUrl);
          }
        } else {
          embeddedImage = await pdfDoc.embedJpg(orientedDataUrl);
        }

        const imgWidth = embeddedImage.width;
        const imgHeight = embeddedImage.height;

        let pageWidth: number;
        let pageHeight: number;

        if (pageSize === 'Fit') {
          pageWidth = imgWidth + margin * 2;
          pageHeight = imgHeight + margin * 2;
        } else {
          const standardSize = pageSize === 'Letter' ? PageSizes.Letter : PageSizes.A4;
          if (orientation === 'landscape') {
            pageWidth = standardSize[1];
            pageHeight = standardSize[0];
          } else {
            pageWidth = standardSize[0];
            pageHeight = standardSize[1];
          }
        }

        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        // Calculate aspect fit inside page margins
        const availableWidth = pageWidth - margin * 2;
        const availableHeight = pageHeight - margin * 2;

        const scale = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);
        const drawWidth = imgWidth * scale;
        const drawHeight = imgHeight * scale;

        const x = (pageWidth - drawWidth) / 2;
        const y = (pageHeight - drawHeight) / 2;

        page.drawImage(embeddedImage, {
          x,
          y,
          width: drawWidth,
          height: drawHeight,
        });
      }

      const pdfBytes = await pdfDoc.save();
      setGeneratedPdfBytes(pdfBytes);

      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setGeneratedPdfUrl(url);
      setStatusMsg('PDF generated successfully!');
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to generate PDF. ' + (err.message || ''));
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedPdfUrl) return;
    const a = document.createElement('a');
    a.href = generatedPdfUrl;
    let name = pdfFileName.trim();
    if (!name.toLowerCase().endsWith('.pdf')) name += '.pdf';
    a.download = name;
    a.click();
  };

  const handleSaveToFiles = async () => {
    if (!generatedPdfBytes) return;
    setSaving(true);
    setErrorMsg(null);

    try {
      // Convert bytes to base64
      let binary = '';
      const len = generatedPdfBytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(generatedPdfBytes[i]);
      }
      const base64Data = 'data:application/pdf;base64,' + btoa(binary);

      let name = pdfFileName.trim();
      if (!name.toLowerCase().endsWith('.pdf')) name += '.pdf';

      await api.saveFile({
        name,
        size: generatedPdfBytes.length,
        file_type: 'application/pdf',
        data_url: base64Data,
        page_count: images.length,
      });

      setStatusMsg('Saved to "My Files" successfully!');
      onFileSaved();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save file.');
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
          Utility • Image to PDF Converter
        </span>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Upload & Image List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Upload Zone */}
          <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-800 hover:border-blue-500 rounded-3xl cursor-pointer bg-slate-900/60 transition-all group">
            <Upload className="w-10 h-10 text-slate-500 group-hover:text-blue-400 transition-colors mb-3" />
            <h3 className="text-sm font-bold text-white group-hover:text-blue-300">
              Drag & drop images or click to select
            </h3>
            <p className="text-xs text-slate-400 mt-1">Supports JPG, PNG, WEBP (Multiple allowed)</p>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => handleFilesAdded(e.target.files)}
              className="hidden"
            />
          </label>

          {/* Feedback messages */}
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

          {/* Image List Preview & Reorder */}
          {images.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Images Queue ({images.length})
                </span>
                <button
                  type="button"
                  onClick={() => setImages([])}
                  className="text-xs text-red-400 hover:text-red-300 font-medium"
                >
                  Clear All
                </button>
              </div>

              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {images.map((img, idx) => (
                  <div
                    key={img.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800/80 gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono font-bold text-slate-400 w-5">
                        #{idx + 1}
                      </span>
                      <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                        <img
                          src={img.dataUrl}
                          alt={img.name}
                          style={{ transform: `rotate(${img.rotation}deg)` }}
                          className="w-full h-full object-cover transition-transform duration-200"
                        />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-semibold text-white truncate">{img.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Rotation: {img.rotation}°
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRotate(img.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                        title="Rotate 90° Clockwise"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMove(idx, 'up')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30"
                        title="Move Up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === images.length - 1}
                        onClick={() => handleMove(idx, 'down')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30"
                        title="Move Down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(img.id)}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/40"
                        title="Delete Image"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Options, Generation & Output */}
        <div className="space-y-5">
          {/* Settings Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              PDF Page Settings
            </h4>

            {/* Page Size */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Page Size
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['A4', 'Letter', 'Fit'] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setPageSize(sz)}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                      pageSize === sz
                        ? 'bg-blue-600/10 border-blue-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {sz === 'Fit' ? 'Fit Image' : sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Orientation */}
            {pageSize !== 'Fit' && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Orientation
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['portrait', 'landscape'] as const).map((ori) => (
                    <button
                      key={ori}
                      type="button"
                      onClick={() => setOrientation(ori)}
                      className={`py-2 text-xs font-semibold capitalize rounded-xl border transition-all ${
                        orientation === ori
                          ? 'bg-blue-600/10 border-blue-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {ori}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Margins */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Page Margin
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: 'None', val: 0 },
                  { label: 'Small', val: 15 },
                  { label: 'Normal', val: 30 },
                  { label: 'Large', val: 50 },
                ].map((m) => (
                  <button
                    key={m.label}
                    type="button"
                    onClick={() => setMargin(m.val)}
                    className={`py-1.5 text-[11px] font-medium rounded-lg border transition-all ${
                      margin === m.val
                        ? 'bg-blue-600/10 border-blue-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* File Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Output File Name
              </label>
              <input
                type="text"
                value={pdfFileName}
                onChange={(e) => setPdfFileName(e.target.value)}
                placeholder="MyDocument.pdf"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Convert Button */}
            <button
              id="btn-generate-pdf-from-images"
              type="button"
              disabled={generating || images.length === 0}
              onClick={handleGeneratePdf}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {generating ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <FileText className="w-4 h-4" /> Convert {images.length} Image(s) to PDF
                </>
              )}
            </button>
          </div>

          {/* Generated PDF Actions Preview */}
          {generatedPdfUrl && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" /> PDF Ready!
              </div>

              {/* PDF Preview Frame */}
              <div className="w-full h-48 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
                <iframe
                  src={generatedPdfUrl}
                  title="PDF Preview"
                  className="w-full h-full border-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  id="btn-download-converted-pdf"
                  onClick={handleDownload}
                  className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-4 h-4" /> Download
                </button>
                <button
                  type="button"
                  id="btn-save-converted-pdf"
                  disabled={saving}
                  onClick={handleSaveToFiles}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  {saving ? (
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
        </div>
      </div>
    </div>
  );
};
