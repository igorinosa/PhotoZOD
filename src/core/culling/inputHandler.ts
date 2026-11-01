import { cullingSession } from './cullingSession';
import { assetStore } from '../dam/assetStore';
import { indexer } from '../dam/indexer';
import { CullingStatus } from '../dam/types';
import { goNext } from './navigation';

export function updateIndexes(id: string, status: CullingStatus) {
  // remove from all
  indexer.statusIndex.keep.delete(id);
  indexer.statusIndex.maybe.delete(id);
  indexer.statusIndex.trash.delete(id);
  indexer.statusIndex.unrated.delete(id);

  // add to new
  indexer.statusIndex[status].add(id);
}

export function handleAction(action: "keep" | "maybe" | "trash") {
  const id = cullingSession.current();
  if (!id) return;

  // Map culling actions to pickStatus (Primary Layer)
  const pickStatus = action === 'keep' ? 'picked' : action === 'trash' ? 'rejected' : 'unflagged';
  
  assetStore.update(id, { 
    culling: action,
    pickStatus: pickStatus
  });
  updateIndexes(id, action);
  
  return goNext();
}
