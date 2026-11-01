import React, { useEffect } from 'react';
import { useImportQueue } from '../../../../core/dam/import/importQueue';
import { importOrchestrator } from '../../../../core/pipeline/import/importOrchestrator';
import { Play, Pause, X, AlertCircle, RefreshCw, Trash2, Copy, CheckCircle2 } from 'lucide-react';

export function ImportPanel() {
  const { jobs, activeJobId, pauseJob, resumeJob, cancelJob, updateJob, retryJob } = useImportQueue();

  useEffect(() => {
    importOrchestrator.start();
  }, []);

  if (jobs.length === 0) {
    return null;
  }

  const clearCompleted = () => {
    useImportQueue.setState(state => ({
      jobs: state.jobs.filter(j => j.status !== 'completed' && j.status !== 'cancelled' && j.status !== 'failed')
    }));
  };

  const hasRemovableJobs = jobs.some(j => ['completed', 'cancelled', 'failed'].includes(j.status));

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col">
      <div className="bg-zinc-950 px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-zinc-200">Import Queue</h3>
          <span className="text-xs text-zinc-500">{jobs.length} jobs</span>
        </div>
        {hasRemovableJobs && (
          <button 
            onClick={clearCompleted}
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <Trash2 size={12} />
            <span>Clear</span>
          </button>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto p-2 flex flex-col gap-2">
        {jobs.map(job => (
          <div key={job.id} className="bg-zinc-800/50 rounded-xl p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-300">
                  {job.status === 'processing' && 'Processing...'}
                  {job.status === 'ingesting' && 'Ingesting...'}
                  {job.status === 'duplicate' && 'Duplicate Found'}
                  {job.status === 'paused' && 'Paused'}
                  {job.status === 'pending' && 'Queued'}
                  {job.status === 'completed' && 'Completed'}
                  {job.status === 'failed' && 'Failed'}
                  {job.status === 'cancelled' && 'Cancelled'}
                </span>
                <span className="text-[10px] text-zinc-500">
                  {job.processedCount} / {job.totalCount} files
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                {job.status === 'failed' && (
                  <button onClick={() => retryJob(job.id)} className="p-1.5 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors" title="Retry">
                    <RefreshCw size={14} />
                  </button>
                )}
                {['processing', 'ingesting'].includes(job.status) && (
                  <button onClick={() => pauseJob(job.id)} className="p-1.5 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors">
                    <Pause size={14} />
                  </button>
                )}
                {job.status === 'paused' && (
                  <button onClick={() => resumeJob(job.id)} className="p-1.5 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors">
                    <Play size={14} />
                  </button>
                )}
                {['pending', 'processing', 'ingesting', 'paused', 'duplicate'].includes(job.status) && (
                  <button onClick={() => cancelJob(job.id)} className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400 hover:text-red-300 transition-colors">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  job.status === 'failed' ? 'bg-red-500' : 
                  job.status === 'paused' ? 'bg-yellow-500' : 
                  job.status === 'duplicate' ? 'bg-orange-500' : 
                  job.status === 'completed' ? 'bg-green-500' : 
                  'bg-indigo-500'
                }`}
                style={{ width: `${job.progress}%` }}
              />
            </div>
            
            {job.progressDetail && ['processing', 'ingesting'].includes(job.status) && (
              <div className="text-[10px] text-zinc-500 flex justify-between">
                <span>Stage: {job.progressDetail.stage}</span>
                <span>{job.progressDetail.percent}%</span>
              </div>
            )}

            {job.requiresDecision && (
              <div className="mt-1 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-orange-400 text-xs font-bold">
                  <Copy size={14} />
                  <span>Duplicate Detected</span>
                </div>
                <div className="text-xs text-orange-300/80">
                  File {job.processedCount + 1} is a duplicate. What would you like to do?
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <button 
                    onClick={() => updateJob(job.id, { decision: 'keep' })}
                    className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded transition-colors"
                  >
                    Keep Both
                  </button>
                  <button 
                    onClick={() => updateJob(job.id, { decision: 'skip' })}
                    className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded transition-colors"
                  >
                    Skip
                  </button>
                  <button 
                    onClick={() => updateJob(job.id, { decision: 'replace' })}
                    className="flex-1 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-xs rounded transition-colors"
                  >
                    Replace
                  </button>
                </div>
              </div>
            )}

            {job.status === 'completed' && job.summary && (
              <div className="mt-1 p-2 bg-green-500/10 border border-green-500/20 rounded-lg flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-green-400 text-[10px] font-bold uppercase tracking-wider">
                  <CheckCircle2 size={12} />
                  <span>Import Summary</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs text-green-300/80 mt-1">
                  <div>Imported: {job.summary.completed}</div>
                  <div>Duplicates: {job.summary.duplicates}</div>
                  <div>Skipped: {job.summary.skipped}</div>
                  <div>Failed: {job.summary.failed}</div>
                </div>
              </div>
            )}

            {job.errors.length > 0 && (
              <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-red-400 text-[10px] font-bold uppercase tracking-wider">
                  <AlertCircle size={12} />
                  <span>{job.errors.length} Errors {job.errorType ? `(${job.errorType})` : ''}</span>
                </div>
                <div className="text-xs text-red-300/80 line-clamp-2">
                  {job.errors[job.errors.length - 1]}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
