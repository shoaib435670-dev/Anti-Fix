import React, { useState } from 'react';
import {
  FolderLock,
  FileText,
  Download,
  Trash2,
  Edit2,
  ExternalLink,
  Search,
  Calendar,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  X,
  FileCode,
} from 'lucide-react';
import { UserFile } from '../types';
import { api } from '../lib/api';

interface MyFilesProps {
  files: UserFile[];
  onRefresh: () => void;
  onOpenFileInEditor: (file: { name: string; dataUrl: string }) => void;
}

export const MyFiles: React.FC<MyFilesProps> = ({ files, onRefresh, onOpenFileInEditor }) => {
  const [search, setSearch] = useState('');
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');

  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDownload = async (file: UserFile) => {
    try {
      setLoadingAction(file.id);
      const res = await api.getFile(file.id);
      const a = document.createElement('a');
      a.href = res.file.data_url;
      a.download = file.name;
      a.click();
    } catch (err: any) {
      setErrorMsg('Failed to download: ' + err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleOpenEditor = async (file: UserFile) => {
    try {
      setLoadingAction(file.id);
      const res = await api.getFile(file.id);
      onOpenFileInEditor({ name: file.name, dataUrl: res.file.data_url });
    } catch (err: any) {
      setErrorMsg('Failed to open file: ' + err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleStartRename = (file: UserFile) => {
    setRenamingFileId(file.id);
    setRenameInput(file.name);
  };

  const handleSaveRename = async () => {
    if (!renamingFileId || !renameInput.trim()) return;
    try {
      setLoadingAction(renamingFileId);
      await api.renameFile(renamingFileId, renameInput.trim());
      setRenamingFileId(null);
      setStatusMsg('File renamed successfully.');
      onRefresh();
    } catch (err: any) {
      setErrorMsg('Rename failed: ' + err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingFileId) return;
    try {
      setLoadingAction(deletingFileId);
      await api.deleteFile(deletingFileId);
      setDeletingFileId(null);
      setStatusMsg('File deleted permanently.');
      onRefresh();
    } catch (err: any) {
      setErrorMsg('Delete failed: ' + err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <FolderLock className="w-6 h-6 text-blue-400" /> My Saved Files
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Access your secure personal cloud storage. Only you can view or download these documents.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search saved files..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Feedback alerts */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)}>
            <X className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      )}

      {statusMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{statusMsg}</span>
          </div>
          <button onClick={() => setStatusMsg(null)}>
            <X className="w-3.5 h-3.5 text-emerald-400" />
          </button>
        </div>
      )}

      {/* Files List / Grid */}
      {filteredFiles.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-12 text-center max-w-lg mx-auto">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No Saved Files Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            When you create, convert, or edit PDFs using any AntiFix tool, click "Save to My Files"
            to keep them permanently stored here.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="divide-y divide-slate-800/80">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors"
              >
                {/* File info */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-5 h-5" />
                  </div>

                  <div className="min-w-0">
                    {renamingFileId === file.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={renameInput}
                          onChange={(e) => setRenameInput(e.target.value)}
                          className="bg-slate-950 border border-blue-500 rounded-lg px-2.5 py-1 text-xs text-white"
                        />
                        <button
                          type="button"
                          onClick={handleSaveRename}
                          className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setRenamingFileId(null)}
                          className="px-2 py-1 text-xs text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <h4 className="text-sm font-bold text-white truncate">{file.name}</h4>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-1">
                      <span className="flex items-center gap-1 font-mono">
                        <HardDrive className="w-3 h-3 text-slate-500" />
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                      {file.page_count && (
                        <span>• {file.page_count} page(s)</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {new Date(file.created_at).toLocaleDateString([], {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEditor(file)}
                    disabled={loadingAction === file.id}
                    className="py-1.5 px-3 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open in Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartRename(file)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Rename File"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload(file)}
                    disabled={loadingAction === file.id}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Download File"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingFileId(file.id)}
                    className="p-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-950/40 transition-colors"
                    title="Delete File"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingFileId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-white">Delete Document</h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to permanently delete this file from your personal cloud? This action cannot be undone.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingFileId(null)}
                className="py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
