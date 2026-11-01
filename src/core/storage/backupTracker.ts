import { Asset } from '../dam/types';
import { BackupState } from './storageTypes';

class BackupTracker {
  getBackupState(asset: Asset): BackupState {
    const status = asset.backupStatus;
    if (!status) return 'NOT_BACKED_UP';
    
    const backedUpCount = [status.local, status.external, status.cloud].filter(Boolean).length;
    
    if (backedUpCount === 3) return 'FULLY_BACKED_UP';
    if (backedUpCount > 0) return 'PARTIAL';
    return 'NOT_BACKED_UP';
  }

  getGlobalMetrics(assets: Asset[]) {
    if (assets.length === 0) return {
      percentFullyBackedUp: 0,
      percentNotBackedUp: 0,
      totalPendingBackup: 0
    };

    let fullyBackedUp = 0;
    let notBackedUp = 0;
    let pendingBackup = 0;

    for (const asset of assets) {
      const state = this.getBackupState(asset);
      if (state === 'FULLY_BACKED_UP') {
        fullyBackedUp++;
      } else if (state === 'NOT_BACKED_UP') {
        notBackedUp++;
        pendingBackup++;
      } else {
        pendingBackup++;
      }
    }

    return {
      percentFullyBackedUp: Math.round((fullyBackedUp / assets.length) * 100),
      percentNotBackedUp: Math.round((notBackedUp / assets.length) * 100),
      totalPendingBackup: pendingBackup
    };
  }
}

export const backupTracker = new BackupTracker();
