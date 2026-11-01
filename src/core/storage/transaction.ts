import { systemDB } from './db';
import { Asset } from '../dam/types';
import { Entity } from '../entities/schema';
import { opfsManager } from './opfs';

export class TransactionManager {
  /**
   * PART 0J.5 - TRANSACTION SYSTEM
   * Groups writes into a single atomic transaction.
   * If any write fails, the entire transaction is rolled back.
   */
  async runTransaction(
    operations: {
      assets?: Asset[];
      entities?: Entity[];
      systemData?: { key: string; data: any }[];
    }
  ) {
    const stores: ('assets' | 'entities' | 'system')[] = [];
    if (operations.assets?.length) stores.push('assets');
    if (operations.entities?.length) stores.push('entities');
    if (operations.systemData?.length) stores.push('system');

    if (stores.length === 0) return;

    await systemDB.runTransaction(stores, 'readwrite', async (tx) => {
      if (operations.assets?.length) {
        const assetStore = tx.objectStore('assets');
        for (const asset of operations.assets) {
          await assetStore.put(asset);
        }
      }

      if (operations.entities?.length) {
        const entityStore = tx.objectStore('entities');
        for (const entity of operations.entities) {
          await entityStore.put(entity);
        }
      }

      if (operations.systemData?.length) {
        const systemStore = tx.objectStore('system');
        for (const item of operations.systemData) {
          await systemStore.put(item.data, item.key);
        }
      }
    });
  }

  /**
   * PART 0J.4 - ATOMIC WRITES (CRITICAL)
   * Writes a file to OPFS atomically.
   */
  async writeBinaryAtomic(assetId: string, type: 'original' | 'preview', blob: Blob) {
    await opfsManager.saveFile(assetId, type, blob);
  }
}

export const transactionManager = new TransactionManager();
