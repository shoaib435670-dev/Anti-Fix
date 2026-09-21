import React, { useState } from 'react';
import {
  FileImage,
  Edit,
  FileSignature,
  Lock,
  Type,
  PenTool,
  Trash2,
  Sparkles,
  ArrowRight,
  Search,
  Clock,
  HardDrive,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { FeatureConfig, UserProfile, UserFile } from '../types';

interface DashboardProps {
  features: FeatureConfig[];
  user: UserProfile;
  files: UserFile[];
  onSelectFeature: (featureId: string) => void;
  onOpenMyFiles: () => void;
  onOpenUpgradeModal: (featureId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  features,
  user,
  files,
  onSelectFeature,
  onOpenMyFiles,
  onOpenUpgradeModal,
}) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | 'convert' | 'edit' | 'security' | 'organize'>('all');

  // Helper icons map
  const getToolIcon = (id: string) => {
    switch (id) {
      case 'image-to-pdf':
        return FileImage;
      case 'edit-pdf':
        return Edit;
      case 'rename-pdf':
        return FileSignature;
      case 'lock-pdf':
        return Lock;
      case 'edit-pdf-text':
        return Type;
      case 'draw-on-pdf':
        return PenTool;
      case 'delete-pdf-pages':
        return Trash2;
      default:
        return Layers;
    }
  };

  const getToolCategory = (id: string): 'convert' | 'edit' | 'security' | 'organize' => {
    if (id === 'image-to-pdf') return 'convert';
    if (id === 'lock-pdf') return 'security';
    if (id === 'rename-pdf' || id === 'delete-pdf-pages') return 'organize';
    return 'edit';
  };

  const isFeatureUnlocked = (featureId: string) => {
    const feat = features.find((f) => f.id === featureId);
    if (!feat || !feat.is_paid) return true;
    return user.subscriptions?.some(
      (s) => s.feature_id === featureId && s.status === 'active'
    );
  };

  const filteredFeatures = features
    .filter((f) => f.enabled)
    .filter((f) => {
      if (category !== 'all' && getToolCategory(f.id) !== category) return false;
      if (search) {
        const query = search.toLowerCase();
        return f.name.toLowerCase().includes(query) || f.description.toLowerCase().includes(query);
      }
      return true;
    });

  const totalStorageBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
  const activeSubCount = user.subscriptions?.filter((s) => s.status === 'active').length || 0;

  return (
    <div className="space-y-8">
      {/* Welcome Banner & Quick Stats */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/40 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-3">
              <ShieldCheck className="w-3.5 h-3.5" /> Client-Side Fast & Secure Processing
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, <span className="text-blue-400">{user.username}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
              All 7 modern PDF utilities are ready. Choose a tool below to transform, lock, or edit your documents instantly.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3 shrink-0">
            <div className="bg-slate-950/70 border border-slate-800/80 p-3.5 rounded-2xl text-center">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Saved Files</span>
              <span className="text-lg font-bold text-white mt-0.5 block">{files.length}</span>
            </div>
            <div className="bg-slate-950/70 border border-slate-800/80 p-3.5 rounded-2xl text-center">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Cloud Storage</span>
              <span className="text-lg font-bold text-blue-400 mt-0.5 block">
                {(totalStorageBytes / (1024 * 1024)).toFixed(1)}M
              </span>
            </div>
            <div className="bg-slate-950/70 border border-slate-800/80 p-3.5 rounded-2xl text-center">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Active Passes</span>
              <span className="text-lg font-bold text-amber-400 mt-0.5 block">{activeSubCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Tools' },
            { id: 'convert', label: 'Convert' },
            { id: 'edit', label: 'Edit & Draw' },
            { id: 'security', label: 'Security & Lock' },
            { id: 'organize', label: 'Organize & Pages' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                category === cat.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search all 7 PDF tools..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* 7 PDF Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredFeatures.map((feat) => {
          const Icon = getToolIcon(feat.id);
          const unlocked = isFeatureUnlocked(feat.id);

          return (
            <div
              key={feat.id}
              id={`tool-card-${feat.id}`}
              className={`group relative bg-slate-900 border rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between hover:shadow-2xl hover:shadow-blue-500/5 ${
                unlocked
                  ? 'border-slate-800 hover:border-blue-500/50 hover:-translate-y-1'
                  : 'border-slate-800/80 bg-slate-900/60'
              }`}
            >
              <div>
                {/* Header: Icon & Badge */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                      unlocked
                        ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                        : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>

                  {feat.is_paid ? (
                    unlocked ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" /> Unlocked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 border border-amber-500/20 text-amber-400">
                        <Sparkles className="w-3 h-3" /> Pro • Rs.{feat.weekly_price}/wk
                      </span>
                    )
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-500/10 border border-blue-500/20 text-blue-400">
                      Free
                    </span>
                  )}
                </div>

                {/* Title & Description */}
                <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                  {feat.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
                  {feat.description}
                </p>
              </div>

              {/* Action Button */}
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-500 uppercase">
                  {getToolCategory(feat.id)}
                </span>

                {unlocked ? (
                  <button
                    type="button"
                    onClick={() => onSelectFeature(feat.id)}
                    className="py-1.5 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                  >
                    Launch Tool <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenUpgradeModal(feat.id)}
                    className="py-1.5 px-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-600/20 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Unlock Access
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Files Horizontal Section */}
      {files.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" /> Recent Documents in My Files
            </h3>
            <button
              type="button"
              onClick={onOpenMyFiles}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
            >
              View All ({files.length}) <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {files.slice(0, 4).map((f) => (
              <div
                key={f.id}
                onClick={onOpenMyFiles}
                className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-all space-y-1.5 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400">
                    {(f.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(f.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-200 group-hover:text-blue-400 truncate">
                  {f.name}
                </h4>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
