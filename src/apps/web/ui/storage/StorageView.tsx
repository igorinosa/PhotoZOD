import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SmartImage } from '../components/SmartImage';
import { 
  Database, 
  ShieldCheck, 
  ShieldAlert, 
  Shield, 
  HardDrive, 
  Cloud, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  X,
  ChevronRight,
  FileText,
  Calendar,
  Folder,
  BarChart3,
  Trash2
} from 'lucide-react';
import { assetStore } from '../../../../core/dam/assetStore';
import { storageAnalyzer } from '../../../../core/storage/storageAnalyzer';
import { backupTracker } from '../../../../core/storage/backupTracker';
import { backupEngine } from '../../../../core/storage/backupEngine';
import { useToastStore } from '../components/toastStore';
import { StorageAnalysis, BackupProgress, BackupDestination } from '../../../../core/storage/storageTypes';
import { ImportedAsset } from '../../../../shared/types';

interface StorageViewProps {
  onClose: () => void;
}

export default function StorageView({ onClose }: StorageViewProps) {
  const [analysis, setAnalysis] = useState<StorageAnalysis | null>(null);
  const [progress, setProgress] = useState<BackupProgress | null>(null);
  const [activeTab, setActiveTab] = useState<'format' | 'date' | 'folder' | 'status'>('format');
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<BackupDestination>('external');
  const [showFailedFiles, setShowFailedFiles] = useState(false);

  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [selectedFailedIds, setSelectedFailedIds] = useState<Set<string>>(new Set());
  const [autoResume, setAutoResume] = useState(() => {
    const saved = localStorage.getItem('dam_auto_resume_backup');
    return saved === null ? true : saved === 'true';
  });

  const addToast = useToastStore(state => state.addToast);

  const assets = assetStore.getAll() as ImportedAsset[];
  const metrics = useMemo(() => backupTracker.getGlobalMetrics(assets), [assets]);

  useEffect(() => {
    const result = storageAnalyzer.analyze(assets);
    setAnalysis(result);
  }, [assets]);

  useEffect(() => {
    const unsubscribe = backupEngine.subscribe(p => {
      setProgress(p);
      if (p && !p.isComplete && !p.isPaused && !p.isTimedOut) {
        setShowBackupModal(true);
      }
    });
    
    // Check for persisted job on mount
    const job = backupEngine.getPersistedJob();
    if (job) {
      if (autoResume) {
        backupEngine.resume(job.assetIds, job.destination);
        addToast("Resuming backup job in background...", {
          label: "View",
          onClick: () => setShowBackupModal(true)
        });
      } else {
        setShowRecoveryModal(true);
      }
    }

    return () => { unsubscribe(); };
  }, [autoResume]);

  useEffect(() => {
    localStorage.setItem('dam_auto_resume_backup', String(autoResume));
  }, [autoResume]);

  const handleStartBackup = () => {
    const pendingIds = assets
      .filter(a => backupTracker.getBackupState(a) !== 'FULLY_BACKED_UP')
      .map(a => a.assetId);
    
    if (pendingIds.length === 0) return;
    
    backupEngine.runBackup(pendingIds, selectedDestination);
    setShowBackupModal(true);
  };

  const handleExportFailedList = () => {
    const failedIds = backupEngine.getFailedIds();
    const failedAssets = failedIds.map(id => assetStore.get(id)).filter(Boolean);
    const csv = [
      ['ID', 'File Name', 'Path'],
      ...failedAssets.map(a => [a!.assetId, a!.fileName || '', a!.path])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `failed_backups_${new Date().toISOString()}.csv`;
    a.click();
  };

  const renderProgressBar = (value: number, total: number, color: string = 'bg-indigo-500') => {
    const percent = total > 0 ? (value / total) * 100 : 0;
    return (
      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          className={`h-full ${color}`}
        />
      </div>
    );
  };

  const renderSummary = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <Database className="w-5 h-5" />
          </div>
          <span className="text-zinc-400 text-sm font-medium">Total Storage</span>
        </div>
        <div className="text-3xl font-black text-white">
          {analysis ? storageAnalyzer.formatSize(analysis.totalSize) : '0 GB'}
        </div>
        <div className="mt-2 text-xs text-zinc-500">
          Across {assets.length} assets
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl md:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-zinc-400 text-sm font-medium">Backup Health</span>
          </div>
          <span className="text-emerald-400 font-bold">{metrics.percentFullyBackedUp}% Protected</span>
        </div>
        {renderProgressBar(metrics.percentFullyBackedUp, 100, 'bg-emerald-500')}
        <div className="mt-4 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-zinc-400">{metrics.percentFullyBackedUp}% Fully Backed Up</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-xs text-zinc-400">{100 - metrics.percentFullyBackedUp}% Pending</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabs = () => {
    const tabs = [
      { id: 'format', label: 'By Format', icon: FileText },
      { id: 'date', label: 'By Date', icon: Calendar },
      { id: 'folder', label: 'By Folder', icon: Folder },
      { id: 'status', label: 'By Status', icon: BarChart3 },
    ] as const;

    return (
      <div className="flex gap-1 bg-zinc-900 p-1 rounded-2xl mb-6 overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shrink-0 ${
              activeTab === tab.id ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>
    );
  };

  const renderAnalysisContent = () => {
    if (!analysis) return null;

    let data: Record<string, number> = {};
    if (activeTab === 'format') data = analysis.byFormat;
    else if (activeTab === 'date') data = analysis.byDate;
    else if (activeTab === 'folder') data = analysis.byFolder;
    else if (activeTab === 'status') {
      data = {
        'Picked': analysis.byCulling.picked,
        'Rejected': analysis.byCulling.rejected,
        'Unflagged': analysis.byCulling.unflagged
      };
    }

    const sortedData = Object.entries(data).sort((a, b) => b[1] - a[1]);
    const maxVal = Math.max(...Object.values(data), 1);

    return (
      <div className="space-y-4">
        {sortedData.map(([key, value]) => (
          <div key={key} className="group">
            <div className="flex justify-between items-end mb-2">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-zinc-200 capitalize">{key}</span>
                <span className="text-[10px] text-zinc-500 font-medium">{storageAnalyzer.formatSize(value)}</span>
              </div>
              <span className="text-xs font-black text-zinc-400">{Math.round((value / analysis.totalSize) * 100)}%</span>
            </div>
            <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/50">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(value / maxVal) * 100}%` }}
                className={`h-full transition-all duration-500 ${
                  activeTab === 'status' && key === 'Rejected' ? 'bg-red-500/50' :
                  activeTab === 'status' && key === 'Picked' ? 'bg-emerald-500/50' :
                  'bg-indigo-500/50'
                }`}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex flex-col md:flex-row overflow-hidden">
      {/* Header Mobile */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-black tracking-tight">Storage</h2>
        </div>
        <button onClick={onClose} className="p-2 rounded-full bg-zinc-800 text-zinc-400">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-12 no-scrollbar">
        <div className="max-w-5xl mx-auto">
          {/* Desktop Header */}
          <div className="hidden md:flex items-center justify-between mb-12">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-white mb-2">Storage & Backup</h1>
              <p className="text-zinc-500 font-medium">Manage your library footprint and safety</p>
            </div>
            <button 
              onClick={onClose}
              className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {renderSummary()}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-zinc-900/30 border border-zinc-800/50 p-8 rounded-[2.5rem]">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold text-white">Storage Breakdown</h3>
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
                    <BarChart3 className="w-4 h-4" />
                    Live Analysis
                  </div>
                </div>
                {renderTabs()}
                {renderAnalysisContent()}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-500/20">
                <h3 className="text-xl font-bold mb-2">Backup Engine</h3>
                <p className="text-indigo-100/70 text-sm mb-8 leading-relaxed">
                  Ensure your files are safe across external drives and cloud storage.
                </p>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-center justify-between p-4 bg-white/10 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-3">
                      <HardDrive className="w-5 h-5" />
                      <span className="text-sm font-bold">External Drive</span>
                    </div>
                    <input 
                      type="radio" 
                      checked={selectedDestination === 'external'} 
                      onChange={() => setSelectedDestination('external')}
                      className="w-5 h-5 accent-white"
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/10 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-3">
                      <Cloud className="w-5 h-5" />
                      <span className="text-sm font-bold">Cloud Storage</span>
                    </div>
                    <input 
                      type="radio" 
                      checked={selectedDestination === 'cloud'} 
                      onChange={() => setSelectedDestination('cloud')}
                      className="w-5 h-5 accent-white"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleStartBackup}
                  disabled={metrics.totalPendingBackup === 0 || (progress && !progress.isComplete && !progress.isPaused)}
                  className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 shadow-xl"
                >
                  <Shield className="w-4 h-4" />
                  {progress && !progress.isComplete && !progress.isPaused ? 'Backup in Progress...' : 'Backup Now'}
                </button>
                
                {metrics.totalPendingBackup > 0 && (
                  <p className="mt-4 text-center text-[10px] font-bold text-indigo-200 uppercase tracking-widest">
                    {metrics.totalPendingBackup} Files Pending
                  </p>
                )}

                <div className="mt-8 pt-8 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white uppercase tracking-widest">Auto-Resume</span>
                      <span className="text-[10px] text-indigo-200/50 font-medium">Silently resume backups on app reload</span>
                    </div>
                    <button 
                      onClick={() => setAutoResume(!autoResume)}
                      className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${autoResume ? 'bg-white' : 'bg-white/10'}`}
                    >
                      <div className={`w-4 h-4 rounded-full transition-all duration-300 ${autoResume ? 'bg-indigo-600 translate-x-6' : 'bg-zinc-500 translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              </div>

              {progress && progress.failed > 0 && (
                <button 
                  onClick={() => setShowFailedFiles(true)}
                  className="w-full p-6 bg-red-500/10 border border-red-500/20 rounded-[2rem] flex items-center justify-between group hover:bg-red-500/20 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-500">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-bold text-red-500">{progress.failed} Files Failed</span>
                      <span className="text-[10px] text-red-400/70 font-medium uppercase tracking-wider">View Details</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-red-500 group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recovery Modal */}
      <AnimatePresence>
        {showRecoveryModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-zinc-800 p-8 rounded-[3rem] max-w-md w-full shadow-2xl"
            >
              <div className="text-center mb-8">
                <div className="w-20 h-20 rounded-3xl bg-amber-500/10 flex items-center justify-center text-amber-500 mx-auto mb-6">
                  <RefreshCw className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-white mb-2">Resume Backup?</h3>
                <p className="text-zinc-500 text-sm font-medium">
                  An unfinished backup job was found. Would you like to resume it?
                </p>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={() => {
                    const saved = localStorage.getItem('dam_backup_job');
                    if (saved) {
                      const job = JSON.parse(saved);
                      backupEngine.resume(job.assetIds, job.destination);
                    }
                    setShowRecoveryModal(false);
                    setShowBackupModal(true);
                  }}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-indigo-500/20"
                >
                  Resume Backup
                </button>
                <button 
                  onClick={() => {
                    backupEngine.discardJob();
                    setShowRecoveryModal(false);
                    handleStartBackup();
                  }}
                  className="w-full py-4 bg-zinc-800 text-white rounded-2xl font-black text-sm hover:bg-zinc-700 transition-all"
                >
                  Restart New
                </button>
                <button 
                  onClick={() => {
                    backupEngine.discardJob();
                    setShowRecoveryModal(false);
                  }}
                  className="w-full py-4 bg-transparent text-zinc-500 rounded-2xl font-black text-sm hover:text-zinc-300 transition-all"
                >
                  Discard
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backup Progress Modal */}
      <AnimatePresence>
        {showBackupModal && progress && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-zinc-800 p-8 rounded-[3rem] max-w-md w-full shadow-2xl"
            >
              <div className="text-center mb-8">
                <div className="w-20 h-20 rounded-3xl bg-indigo-600 flex items-center justify-center text-white mx-auto mb-6 shadow-2xl shadow-indigo-500/40">
                  <RefreshCw className={`w-10 h-10 ${!progress.isComplete && !progress.isPaused ? 'animate-spin' : ''}`} />
                </div>
                <h3 className="text-2xl font-black text-white mb-2">
                  {progress.isComplete ? 'Backup Complete' : progress.isTimedOut ? 'Backup Timed Out' : 'Backing Up Files'}
                </h3>
                <p className="text-zinc-500 text-sm font-medium">
                  {progress.processed} of {progress.total} files processed
                </p>
                {progress.isTimedOut && (
                  <p className="text-red-400 text-xs font-bold mt-2 uppercase tracking-wider">
                    Job exceeded 30 minute limit
                  </p>
                )}
              </div>

              <div className="space-y-6">
                {!progress.isComplete && !progress.isTimedOut && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-800/30 p-3 rounded-xl border border-zinc-800/50 text-center">
                      <div className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1">Speed</div>
                      <div className="text-white font-black text-sm">{progress.speed || 0} f/s</div>
                    </div>
                    <div className="bg-zinc-800/30 p-3 rounded-xl border border-zinc-800/50 text-center">
                      <div className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1">ETA</div>
                      <div className="text-white font-black text-sm">{progress.eta ? `${Math.floor(progress.eta / 60)}m ${progress.eta % 60}s` : '--'}</div>
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex justify-between text-xs font-bold text-zinc-400 mb-2 uppercase tracking-widest">
                    <span>Progress</span>
                    <span>{Math.round((progress.processed / progress.total) * 100)}%</span>
                  </div>
                  {renderProgressBar(progress.processed, progress.total)}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-800">
                    <div className="text-emerald-400 font-black text-xl">{progress.success}</div>
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Success</div>
                  </div>
                  <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-800">
                    <div className="text-red-400 font-black text-xl">{progress.failed}</div>
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Failed</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  {progress.isComplete ? (
                    <button 
                      onClick={() => setShowBackupModal(false)}
                      className="flex-1 py-4 bg-white text-zinc-900 rounded-2xl font-black text-sm"
                    >
                      Done
                    </button>
                  ) : progress.isTimedOut ? (
                    <>
                      <button 
                        onClick={() => {
                          backupEngine.discardJob();
                          setShowBackupModal(false);
                        }}
                        className="flex-1 py-4 bg-zinc-800 text-white rounded-2xl font-black text-sm"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => backupEngine.retryFailed(selectedDestination)}
                        className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm"
                      >
                        Retry
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => backupEngine.pause()}
                        className="flex-1 py-4 bg-zinc-800 text-white rounded-2xl font-black text-sm"
                      >
                        Pause
                      </button>
                      {progress.failed > 0 && (
                        <button 
                          onClick={() => backupEngine.retryFailed(selectedDestination)}
                          className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm"
                        >
                          Retry Failed
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Failed Files Modal */}
      <AnimatePresence>
        {showFailedFiles && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-[3rem] max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl"
            >
              <div className="p-8 border-b border-zinc-800 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-white">Failed Backups</h3>
                  <p className="text-zinc-500 text-sm font-medium">The following files could not be backed up</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleExportFailedList}
                    className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white transition-all"
                    title="Export List"
                  >
                    <FileText className="w-5 h-5" />
                  </button>
                  <button onClick={() => setShowFailedFiles(false)} className="p-2 rounded-full bg-zinc-800 text-zinc-400">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {backupEngine.getFailedIds().map(id => {
                  const asset = assetStore.get(id) as ImportedAsset | undefined;
                  const isSelected = selectedFailedIds.has(id);
                  return (
                    <div 
                      key={id} 
                      onClick={() => {
                        const next = new Set(selectedFailedIds);
                        if (isSelected) next.delete(id);
                        else next.add(id);
                        setSelectedFailedIds(next);
                      }}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-zinc-800/30 border-zinc-800/50 hover:bg-zinc-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-zinc-800 overflow-hidden relative">
                          {asset?.previewUrl && (
                            <SmartImage 
                              src={asset.previewUrl} 
                              assetId={asset.assetId}
                              alt="" 
                              className="w-full h-full object-cover" 
                              retryCount={5}
                            />
                          )}
                          {isSelected && (
                            <div className="absolute inset-0 bg-indigo-500/40 flex items-center justify-center">
                              <CheckCircle2 className="w-6 h-6 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white">{asset?.fileName || 'Unknown File'}</span>
                          <span className="text-xs text-zinc-500">{asset?.path}</span>
                        </div>
                      </div>
                      <div className="text-red-400">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-8 border-t border-zinc-800 flex gap-4">
                <button 
                  onClick={() => {
                    if (selectedFailedIds.size > 0) {
                      backupEngine.runBackup(Array.from(selectedFailedIds), selectedDestination);
                      setSelectedFailedIds(new Set());
                      setShowFailedFiles(false);
                    }
                  }}
                  disabled={selectedFailedIds.size === 0}
                  className="flex-1 py-4 bg-zinc-800 text-white rounded-2xl font-black text-sm disabled:opacity-50"
                >
                  Retry Selected ({selectedFailedIds.size})
                </button>
                <button 
                  onClick={() => {
                    backupEngine.retryFailed(selectedDestination);
                    setShowFailedFiles(false);
                  }}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm"
                >
                  Retry All
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
