import { useState, useEffect, useCallback } from 'react';
import { cullingSession } from '../../../../core/culling/cullingSession';
import { SmartImage } from '../components/SmartImage';
import { assetStore } from '../../../../core/dam/assetStore';
import { handleAction as coreHandleAction } from '../../../../core/culling/inputHandler';
import { calculateAIScore } from '../../../../core/culling/aiScoring';
import { getAssetUIData, loadAssetUIData } from '../../../../core/dam/assetUrlCache';
import { trashEngine } from '../../../../core/trash/trashEngine';
import { backupTracker } from '../../../../core/storage/backupTracker';
import DeleteSafetyModal from '../components/DeleteSafetyModal';
import { SwipeLayer } from './SwipeLayer';
import { Sparkles, ArrowRight, ArrowLeft, ArrowDown, CheckCircle2, Trash2, HelpCircle, X, Hand, Bot, Flag, X as XIcon } from 'lucide-react';
import { useToastStore } from '../components/toastStore';

type CullingStep = 'select_mode' | 'wizard' | 'culling' | 'done';

export function CullingView({ 
  initialAssetIds, 
  onClose, 
  onReview,
  onFinish,
  mode = 'culling',
  reviewedCategories = []
}: { 
  initialAssetIds: string[], 
  onClose: () => void, 
  onReview: (status: 'maybe'|'trash') => void,
  onFinish: () => void,
  mode?: 'culling' | 'review_maybe' | 'review_trash',
  reviewedCategories?: ('maybe' | 'trash')[]
}) {
  const [step, setStep] = useState<CullingStep>(mode === 'culling' ? 'select_mode' : 'culling');
  const [aiEnabled, setAiEnabled] = useState(false);
  const [currentId, setCurrentId] = useState<string | undefined>();
  const [, setForceRender] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteSafety, setShowDeleteSafety] = useState(false);
  const addToast = useToastStore(state => state.addToast);

  useEffect(() => {
    cullingSession.start(initialAssetIds);
    setCurrentId(cullingSession.current());
    const unsubscribe = cullingSession.subscribe(() => {
      setCurrentId(cullingSession.current());
    });
    return () => { unsubscribe(); };
  }, [initialAssetIds]);

  useEffect(() => {
    setStep(mode === 'culling' ? 'select_mode' : 'culling');
  }, [mode]);

  useEffect(() => {
    if (currentId && !getAssetUIData(currentId)) {
      loadAssetUIData(currentId).then(() => setForceRender(prev => prev + 1));
    }
  }, [currentId]);

  const handleUserAction = useCallback((action: 'keep' | 'maybe' | 'trash' | 'back') => {
    if (step !== 'culling') return;
    if (action === 'back') {
      cullingSession.prev();
      return;
    }
    
    // Restrict actions based on mode
    // if (mode === 'review_maybe' && action === 'maybe') return;
    // if (mode === 'review_trash' && action === 'trash') return;

    const isLast = cullingSession.currentIndex() === cullingSession.total() - 1;
    coreHandleAction(action);
    if (isLast) {
      setStep('done');
    }
  }, [step]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (step !== 'culling') return;
    
    // Pick Flag shortcuts
    if (e.key === 'p' || e.key === 'P') {
      const id = cullingSession.current();
      if (id) {
        const asset = assetStore.get(id);
        const newStatus = asset?.pickStatus === 'picked' ? 'unflagged' : 'picked';
        assetStore.update(id, { pickStatus: newStatus });
      }
      return;
    }
    if (e.key === 'x' || e.key === 'X') {
      const id = cullingSession.current();
      if (id) {
        const asset = assetStore.get(id);
        const newStatus = asset?.pickStatus === 'rejected' ? 'unflagged' : 'rejected';
        assetStore.update(id, { pickStatus: newStatus });
      }
      return;
    }
    if (e.key === 'u' || e.key === 'U') {
      const id = cullingSession.current();
      if (id) assetStore.update(id, { pickStatus: 'unflagged' });
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const id = cullingSession.current();
      if (id) {
        const asset = assetStore.get(id);
        if (asset) {
          const backupState = backupTracker.getBackupState(asset);
          if (backupState === 'NOT_BACKED_UP') {
            setShowDeleteSafety(true);
          } else {
            trashEngine.moveToTrash([id]);
            addToast('Moved to Trash', {
              label: 'Undo',
              onClick: () => trashEngine.restoreFromTrash([id])
            });
            const isLast = cullingSession.currentIndex() === cullingSession.total() - 1;
            cullingSession.next();
            if (isLast) setStep('done');
          }
        }
      }
      return;
    }

    switch (e.key) {
      case 'ArrowRight': handleUserAction('keep'); break;
      case 'ArrowLeft': handleUserAction('trash'); break;
      case 'ArrowDown': handleUserAction('maybe'); break;
      case 'ArrowUp': 
        cullingSession.prev();
        break;
    }
  }, [step, handleUserAction]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const renderSelectMode = () => (
    <div className="w-full h-full flex flex-col items-center justify-start md:justify-center p-4 md:p-8 bg-zinc-950 text-white overflow-y-auto">
      <div className="max-w-4xl w-full flex flex-col items-center py-8">
        <h1 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight text-center">How would you like to cull?</h1>
        <p className="text-zinc-400 text-base md:text-lg mb-8 md:mb-12 max-w-lg text-center">
          Choose your preferred workflow. You can always change this later.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <button 
            onClick={() => { setAiEnabled(false); setStep('wizard'); }}
            className="flex flex-col items-center p-6 md:p-10 bg-zinc-900 border-2 border-zinc-800 hover:border-indigo-500 rounded-2xl transition-all group"
          >
            <div className="w-16 h-16 md:w-20 md:h-20 bg-zinc-800 group-hover:bg-indigo-500/20 rounded-full flex items-center justify-center mb-4 md:mb-6 transition-colors">
              <Hand className="w-8 h-8 md:w-10 md:h-10 text-zinc-300 group-hover:text-indigo-400" />
            </div>
            <h2 className="text-xl md:text-2xl font-semibold mb-2">Manual Culling</h2>
            <p className="text-zinc-500 text-center text-sm md:text-base">You are in full control. Swipe or use keyboard arrows to decide the fate of each photo.</p>
          </button>

          <button 
            onClick={() => { setAiEnabled(true); setStep('wizard'); }}
            className="flex flex-col items-center p-6 md:p-10 bg-zinc-900 border-2 border-zinc-800 hover:border-emerald-500 rounded-2xl transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] md:text-xs font-bold px-2 py-1 md:px-3 rounded-bl-lg">RECOMMENDED</div>
            <div className="w-16 h-16 md:w-20 md:h-20 bg-zinc-800 group-hover:bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 md:mb-6 transition-colors">
              <Bot className="w-8 h-8 md:w-10 md:h-10 text-zinc-300 group-hover:text-emerald-400" />
            </div>
            <h2 className="text-xl md:text-2xl font-semibold mb-2">AI Assisted</h2>
            <p className="text-zinc-500 text-center text-sm md:text-base">AI suggests the best shots based on sharpness and composition, but you make the final call.</p>
          </button>
        </div>
        
        <button onClick={onClose} className="mt-8 md:mt-12 text-zinc-500 hover:text-white transition-colors text-sm md:text-base pb-8">
          Cancel and return to library
        </button>
      </div>
    </div>
  );

  const renderWizard = () => (
    <div className="w-full h-full flex flex-col items-center justify-start md:justify-center p-4 md:p-8 bg-zinc-950 text-white overflow-y-auto">
      <div className="max-w-2xl w-full bg-zinc-900 rounded-3xl p-6 md:p-10 border border-zinc-800 shadow-2xl my-8">
        <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-center">How to Cull</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mb-8 md:mb-12">
          <div>
            <h3 className="text-lg md:text-xl font-semibold mb-4 md:mb-6 text-indigo-400 flex items-center gap-2">
              <span className="p-2 bg-indigo-500/20 rounded-lg">📱</span> On Mobile
            </h3>
            <ul className="space-y-4 md:space-y-6">
              <li className="flex items-center gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center font-bold text-lg md:text-xl shrink-0">→</div>
                <div>
                  <div className="font-semibold text-base md:text-lg">Swipe Right</div>
                  <div className="text-zinc-400 text-sm md:text-base">Keep photo</div>
                </div>
              </li>
              <li className="flex items-center gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center font-bold text-lg md:text-xl shrink-0">←</div>
                <div>
                  <div className="font-semibold text-base md:text-lg">Swipe Left</div>
                  <div className="text-zinc-400 text-sm md:text-base">Trash photo</div>
                </div>
              </li>
              <li className="flex items-center gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-zinc-500/20 text-zinc-400 rounded-full flex items-center justify-center font-bold text-lg md:text-xl shrink-0">↓</div>
                <div>
                  <div className="font-semibold text-base md:text-lg">Swipe Down</div>
                  <div className="text-zinc-400 text-sm md:text-base">Mark as Maybe</div>
                </div>
              </li>
              <li className="flex items-center gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-zinc-500/20 text-zinc-400 rounded-full flex items-center justify-center font-bold text-lg md:text-xl shrink-0">↑</div>
                <div>
                  <div className="font-semibold text-base md:text-lg">Swipe Up</div>
                  <div className="text-zinc-400 text-sm md:text-base">Go Back</div>
                </div>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg md:text-xl font-semibold mb-4 md:mb-6 text-indigo-400 flex items-center gap-2">
              <span className="p-2 bg-indigo-500/20 rounded-lg">💻</span> On Desktop
            </h3>
            <ul className="space-y-4 md:space-y-6">
              <li className="flex items-center gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-zinc-800 border border-zinc-700 rounded-lg flex items-center justify-center font-bold text-lg md:text-xl shadow-inner shrink-0">→</div>
                <div>
                  <div className="font-semibold text-base md:text-lg">Right Arrow</div>
                  <div className="text-zinc-400 text-sm md:text-base">Keep photo</div>
                </div>
              </li>
              <li className="flex items-center gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-zinc-800 border border-zinc-700 rounded-lg flex items-center justify-center font-bold text-lg md:text-xl shadow-inner shrink-0">←</div>
                <div>
                  <div className="font-semibold text-base md:text-lg">Left Arrow</div>
                  <div className="text-zinc-400 text-sm md:text-base">Trash photo</div>
                </div>
              </li>
              <li className="flex items-center gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-zinc-800 border border-zinc-700 rounded-lg flex items-center justify-center font-bold text-lg md:text-xl shadow-inner shrink-0">↓</div>
                <div>
                  <div className="font-semibold text-base md:text-lg">Down Arrow</div>
                  <div className="text-zinc-400 text-sm md:text-base">Mark as Maybe</div>
                </div>
              </li>
              <li className="flex items-center gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-zinc-800 border border-zinc-700 rounded-lg flex items-center justify-center font-bold text-lg md:text-xl shadow-inner shrink-0">↑</div>
                <div>
                  <div className="font-semibold text-base md:text-lg">Up Arrow</div>
                  <div className="text-zinc-400 text-sm md:text-base">Go Back</div>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {aiEnabled && (
          <div className="mb-8 md:mb-10 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-4">
            <Sparkles className="w-6 h-6 text-emerald-400 shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-emerald-400 mb-1">AI Suggestions Enabled</h4>
              <p className="text-xs md:text-sm text-emerald-400/80">Look for the AI badge. It will suggest actions based on sharpness and composition, but you always have the final say.</p>
            </div>
          </div>
        )}

        <div className="mb-8 md:mb-10 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-start gap-4">
          <CheckCircle2 className="w-6 h-6 text-indigo-400 shrink-0 mt-1" />
          <div>
            <h4 className="font-semibold text-indigo-400 mb-1">What happens when I'm done?</h4>
            <p className="text-xs md:text-sm text-indigo-400/80">After culling all photos, you will see a summary screen. From there, you can review your "Maybe" and "Trash" photos, permanently delete the trashed ones, and return to your library.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={() => setStep('select_mode')}
            className="w-full py-4 rounded-xl font-bold text-lg transition-all bg-zinc-800 hover:bg-zinc-700 text-white"
          >
            Back
          </button>
          <button 
            onClick={() => setStep('culling')}
            className="w-full py-4 rounded-xl font-bold text-lg transition-all bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)]"
          >
            Got it! Let's go
          </button>
        </div>
      </div>
    </div>
  );

  const renderCulling = () => {
    if (!currentId) return null;
    const asset = assetStore.get(currentId);
    if (!asset) return null;

    const uiData = getAssetUIData(currentId);
    const aiScore = aiEnabled ? calculateAIScore(asset) : null;
    const currentIndex = cullingSession.currentIndex();
    const total = cullingSession.total();

    return (
      <div className="w-full h-full bg-black flex flex-col relative overflow-hidden">
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 pointer-events-none">
          <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-full text-white font-medium text-sm border border-white/10 pointer-events-auto">
            {currentIndex + 1} / {total}
          </div>
          
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors border border-white/10 pointer-events-auto"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Badge */}
        {aiEnabled && aiScore && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <div className={`px-4 py-2 rounded-full backdrop-blur-md border flex items-center gap-2 shadow-2xl ${
              aiScore.suggestion === 'keep' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' :
              aiScore.suggestion === 'trash' ? 'bg-red-500/20 border-red-500/50 text-red-400' :
              'bg-zinc-500/20 border-zinc-500/50 text-zinc-300'
            }`}>
              <Sparkles className="w-4 h-4" />
              <span className="font-semibold text-sm tracking-wide uppercase">
                AI Suggests: {aiScore.suggestion}
              </span>
            </div>
          </div>
        )}

        {/* Main Image Area */}
        <div className="flex-1 relative">
          <SwipeLayer onAction={handleUserAction}>
            <div className="w-full h-full flex items-center justify-center p-4 md:p-12 relative">
              {uiData?.previewUrl ? (
                <>
                  <SmartImage 
                    src={uiData.previewUrl} 
                    assetId={asset.assetId}
                    className="w-full h-full object-contain drop-shadow-2xl rounded-lg"
                    alt={asset.fileName}
                    retryCount={5}
                  />
                  {/* Pick Flag Indicator */}
                  {asset.pickStatus === 'picked' && (
                    <div className="absolute top-20 right-8 bg-black/50 backdrop-blur-md p-3 rounded-full border border-white/10 shadow-2xl z-50">
                      <Flag className="w-8 h-8 text-white fill-white" />
                    </div>
                  )}
                  {asset.pickStatus === 'rejected' && (
                    <div className="absolute top-20 right-8 bg-black/50 backdrop-blur-md p-3 rounded-full border border-white/10 shadow-2xl z-50">
                      <XIcon className="w-8 h-8 text-zinc-400" />
                    </div>
                  )}
                </>
              ) : (
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
          </SwipeLayer>
        </div>

        {/* Visual Cues */}
        <div className="absolute inset-x-0 bottom-8 flex justify-between items-center px-8 pointer-events-none z-40">
          <div className="hidden md:flex flex-col items-center gap-2 text-zinc-500">
            <div className="flex gap-2">
              <div className="w-10 h-10 rounded-lg border border-zinc-700 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm">
                <ArrowLeft className="w-5 h-5 text-red-400" />
              </div>
            </div>
            <span className="text-xs font-medium uppercase tracking-wider">Reject</span>
          </div>
          
          {mode === 'culling' && (
            <div className="hidden md:flex flex-col items-center gap-2 text-zinc-500">
              <div className="w-10 h-10 rounded-lg border border-zinc-700 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm">
                <ArrowDown className="w-5 h-5 text-zinc-400" />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider">Unflag</span>
            </div>
          )}

          <div className="hidden md:flex flex-col items-center gap-2 text-zinc-500">
            <div className="w-10 h-10 rounded-lg border border-zinc-700 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm">
              <ArrowRight className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-xs font-medium uppercase tracking-wider">Pick</span>
          </div>
        </div>

        {/* Mobile Swipe Cues */}
        <div className="md:hidden absolute inset-x-0 bottom-8 flex justify-between items-center px-4 pointer-events-none z-40">
          <div className="flex flex-col items-center gap-1 opacity-50">
            <ArrowLeft className="w-6 h-6 text-red-400" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-red-400">Swipe Trash</span>
          </div>
          {mode === 'culling' && (
            <div className="flex flex-col items-center gap-1 opacity-50">
              <ArrowDown className="w-6 h-6 text-zinc-400" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">Swipe Maybe</span>
            </div>
          )}
          <div className="flex flex-col items-center gap-1 opacity-50">
            <ArrowRight className="w-6 h-6 text-emerald-400" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-400">Swipe Keep</span>
          </div>
        </div>
      </div>
    );
  };

  const renderDone = () => {
    const keepCount = initialAssetIds.filter(id => assetStore.get(id)?.culling === 'keep').length;
    const trashCount = initialAssetIds.filter(id => assetStore.get(id)?.culling === 'trash').length;
    const maybeCount = initialAssetIds.filter(id => assetStore.get(id)?.culling === 'maybe').length;

    const handleDeleteTrash = async () => {
      const trashIds = initialAssetIds.filter(id => assetStore.get(id)?.culling === 'trash');
      trashEngine.moveToTrash(trashIds);
      addToast(`Moved ${trashIds.length} item${trashIds.length === 1 ? '' : 's'} to Trash`, {
        label: 'Undo',
        onClick: () => trashEngine.restoreFromTrash(trashIds)
      });
      setShowDeleteConfirm(false);
      onClose();
    };

    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-zinc-950 text-white relative">
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl">
              <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Move to Trash?</h3>
              <p className="text-zinc-400 mb-8">
                Move {trashCount} rejected photos to the Trash collection? You can restore them later.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteTrash}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors"
                >
                  Move to Trash
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="w-24 h-24 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-8">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">Culling Complete!</h1>
        <p className="text-zinc-400 text-lg mb-12 text-center">
          You've gone through all {initialAssetIds.length} photos. Here's your summary.
        </p>

        <div className="grid grid-cols-3 gap-4 w-full max-w-2xl mb-12">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center">
            <div className="text-4xl font-bold text-emerald-500 mb-2">{keepCount}</div>
            <div className="text-zinc-500 font-medium uppercase tracking-wider text-sm">Kept</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center">
            <div className="text-4xl font-bold text-zinc-300 mb-2">{maybeCount}</div>
            <div className="text-zinc-500 font-medium uppercase tracking-wider text-sm">Maybe</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center">
            <div className="text-4xl font-bold text-red-500 mb-2">{trashCount}</div>
            <div className="text-zinc-500 font-medium uppercase tracking-wider text-sm">Trashed</div>
          </div>
        </div>

        <div className="flex flex-col gap-4 w-full max-w-2xl">
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            {maybeCount > 0 && !reviewedCategories.includes('maybe') && (
              <button 
                onClick={() => onReview('maybe')}
                className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors"
              >
                Review Maybes
              </button>
            )}
            {trashCount > 0 && !reviewedCategories.includes('trash') && (
              <button 
                onClick={() => onReview('trash')}
                className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors"
              >
                Review Trash
              </button>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              disabled={trashCount === 0}
              className="flex-1 py-4 bg-red-600/20 hover:bg-red-600/30 text-red-500 border border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-5 h-5" /> Move to Trash
            </button>
            <button 
              onClick={onFinish}
              className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-indigo-500/20"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black">
      {step === 'select_mode' && renderSelectMode()}
      {step === 'wizard' && renderWizard()}
      {step === 'culling' && renderCulling()}
      {step === 'done' && renderDone()}

      <DeleteSafetyModal 
        isOpen={showDeleteSafety}
        unbackedCount={1}
        totalCount={1}
        onCancel={() => setShowDeleteSafety(false)}
        onDeleteAnyway={() => {
          const id = cullingSession.current();
          if (id) {
            trashEngine.moveToTrash([id]);
            addToast('Moved to Trash', {
              label: 'Undo',
              onClick: () => trashEngine.restoreFromTrash([id])
            });
            const isLast = cullingSession.currentIndex() === cullingSession.total() - 1;
            cullingSession.next();
            if (isLast) setStep('done');
          }
          setShowDeleteSafety(false);
        }}
        onBackupFirst={() => {
          setShowDeleteSafety(false);
          // In a real app, this might open the storage manager
        }}
      />
    </div>
  );
}
