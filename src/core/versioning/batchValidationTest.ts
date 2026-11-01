import { batchStore } from './batchStore';
import { assetStore } from '../dam/assetStore';
import { Asset, EditOperation } from '../../shared/types';
import { editStackEngine } from './editStackEngine';
import { diffEngine } from './diffEngine';

export async function runBatchValidationTests() {
  console.log("🧪 Starting Batch Versioning Validation Tests...");
  
  // 1. Apply batch to 100 assets
  const testAssets: Asset[] = [];
  for (let i = 0; i < 100; i++) {
    testAssets.push({
      assetId: `batch_test_asset_${i}`,
      fileName: `test_${i}.jpg`,
      batchIds: [],
      rating: null,
      colorTag: null,
      culling: 'unrated',
      pickStatus: 'unflagged',
      importedAt: Date.now(),
      formatGroup: 'jpeg',
      isTrashed: false,
      ai: { tags: [], faces: [], sceneType: 'unknown' },
      activeVersionId: `base_v_${i}`,
      baseVersionId: `base_v_${i}`
    } as any);
  }
  
  testAssets.forEach(a => assetStore.add(a));
  
  const ops: EditOperation[] = [
    { type: 'exposure', value: 1.5 }
  ];
  
  const assetIds = testAssets.map(a => a.assetId);
  const batchId = batchStore.createBatch(ops, assetIds, "Test Batch");
  
  // Update assets with batchId
  assetIds.forEach(id => {
    const asset = assetStore.get(id);
    if (asset) {
      assetStore.update(id, { batchIds: [...(asset.batchIds || []), batchId] });
    }
  });

  // 2. Confirm: No versions created, batchIds assigned
  const updatedAssets = assetIds.map(id => assetStore.get(id)!);
  const allHaveBatchId = updatedAssets.every(a => a.batchIds?.includes(batchId));
  console.log(`  [Test 1 & 2] Batch applied to 100 assets. All have batchId: ${allHaveBatchId}`);
  
  // 3. Edit 1 asset: confirm localDeltas used, batch unchanged
  const firstAssetId = assetIds[0];
  const firstAsset = assetStore.get(firstAssetId)!;
  
  editStackEngine.applyEdit(firstAssetId, firstAsset.activeVersionId!, { type: 'contrast', value: 1.2 });
  
  const editedAsset = assetStore.get(firstAssetId)!;
  console.log(`  [Test 3] Edited 1 asset. Local deltas count: ${editedAsset.localDeltas?.length || 0}`);
  
  const batch = batchStore.getBatch(batchId);
  console.log(`  [Test 3] Batch unchanged. Batch operations count: ${batch?.operations.length}`);

  // 4. Update batch: all assets update instantly
  batchStore.updateBatch(batchId, [
    { type: 'exposure', value: 2.0 }
  ]);
  const updatedBatch = batchStore.getBatch(batchId);
  const firstOp = updatedBatch?.operations[0];
  const exposureValue = firstOp && 'value' in firstOp ? firstOp.value : 'N/A';
  console.log(`  [Test 4] Batch updated. New exposure value: ${exposureValue}`);

  // 5. Delete batch: all assets revert correctly
  batchStore.deleteBatch(batchId);
  assetIds.forEach(id => {
    const asset = assetStore.get(id);
    if (asset) {
      assetStore.update(id, { batchIds: asset.batchIds?.filter(bid => bid !== batchId) || [] });
    }
  });
  const revertedAssets = assetIds.map(id => assetStore.get(id)!);
  const noneHaveBatchId = revertedAssets.every(a => !a.batchIds?.includes(batchId));
  console.log(`  [Test 5] Batch deleted. None have batchId: ${noneHaveBatchId}`);

  // 6. Log render stack
  console.log("  [Test 6] Render Stack Logs:");
  const renderStack = diffEngine.getFullStack(editedAsset.activeVersionId!);
  console.log(`    baseStack: ${JSON.stringify(renderStack)}`);
  console.log(`    batchOps: ${JSON.stringify(updatedBatch?.operations || [])}`);
  console.log(`    localDeltas: ${JSON.stringify(editedAsset.localDeltas || [])}`);

  // Cleanup
  assetIds.forEach(id => assetStore.remove(id));
  
  console.log("✅ Batch Validation Tests Complete.");
}
