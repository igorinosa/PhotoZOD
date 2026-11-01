import { processFile } from './importManager';
import { assetStore } from '../../dam/assetStore';
import { entityManager } from '../../entities/pipeline';

async function runValidationTest() {
  console.log('--- STAGE 0A VALIDATION TEST ---');
  
  // 1. Create a mock file
  const content = 'mock-image-content-deterministic-seed-42';
  const blob = new Blob([content], { type: 'image/jpeg' });
  const file1 = new File([blob], 'photo1.jpg', { type: 'image/jpeg' });
  const file2 = new File([blob], 'photo1_copy.jpg', { type: 'image/jpeg' });
  const file3 = new File([blob], 'photo1_final.jpg', { type: 'image/jpeg' });
  const file4 = new File([blob], 'vacation/photo1.jpg', { type: 'image/jpeg' });
  const file5 = new File([blob], 'backup/photo1.jpg', { type: 'image/jpeg' });

  const files = [file1, file2, file3, file4, file5];
  
  console.log(`Uploading same file ${files.length} times...`);
  
  const results = [];
  for (const file of files) {
    const result = await processFile(file);
    results.push(result);
  }
  
  const assetId = results[0].assetId;
  const asset = assetStore.get(assetId);
  
  console.log('\n--- RESULTS ---');
  console.log(`Asset ID: ${assetId}`);
  console.log(`Assets in Store: ${assetStore.getAll().length}`);
  console.log(`Duplicate Paths Found: ${asset?.duplicatePaths.length}`);
  console.log(`Duplicate Paths:`, asset?.duplicatePaths);
  
  const entities = await entityManager.getAll();
  const linkedEntities = entities.filter(e => e.appearances.some(a => a.assetId === assetId));
  
  console.log(`Entities Linked to Asset: ${linkedEntities.length}`);
  
  if (assetStore.getAll().length === 1 && asset?.duplicatePaths.length === 4 && linkedEntities.length === 1) {
    console.log('\n✅ VALIDATION SUCCESS: 1 Asset, 4 Duplicate References, 1 Entity');
  } else {
    console.log('\n❌ VALIDATION FAILED');
    console.log(`Expected: 1 Asset, 4 Duplicates, 1 Entity`);
    console.log(`Actual: ${assetStore.getAll().length} Assets, ${asset?.duplicatePaths.length} Duplicates, ${linkedEntities.length} Entities`);
  }
}

// In a real environment, we'd run this. For now, we'll just define it.
// runValidationTest();
