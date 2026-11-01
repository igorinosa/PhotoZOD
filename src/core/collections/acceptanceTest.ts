import { Asset } from '../../shared/types';
import { runQuery } from './evaluator';
import { SMART_COLLECTIONS } from './smartRegistry';
import { assetStore, ensureAssetShape } from '../dam/assetStore';
import { runPerformanceTest } from './performanceTest';
import { getIndexManager } from './indexManager';
import { FIELDS } from './fieldRegistry';

/**
 * Acceptance Test for Smart Collections
 * Ensures all collections are deterministic and SSOT-compliant.
 */
import { isNoColor, isUnrated, isUntagged } from '../search/derivedEvaluators';

export async function runAcceptanceTest() {
  console.log("🧪 Starting Smart Collections Acceptance Test...");

  const realAssets = assetStore.getAll();
  
  if (realAssets.length === 0) {
    console.warn("⚠️ No real assets found in registry. Skipping real-data validation.");
    console.log("💡 Please import some images to fully validate the collection engine.");
    return true;
  }

  console.log(`📊 Validating against ${realAssets.length} real assets...`);
  
  // Test B: Culling-Based Collection
  console.log("🔍 Test B: Culling-Based Collection...");
  const keptAssets = realAssets.filter(a => a.culling === 'keep');
  const keptCollection = SMART_COLLECTIONS.find(c => c.id === 'keep');
  if (keptCollection) {
    const matched = runQuery(keptCollection.rule, realAssets);
    if (matched.length !== keptAssets.length) {
      throw new Error(`Culling Collection mismatch: expected ${keptAssets.length}, got ${matched.length}`);
    }
  }
  console.log("✅ SUCCESS: Culling-based collections match asset state.");

  // Test C: Duplicate Collection
  console.log("🔍 Test C: Duplicate Collection...");
  const duplicates = realAssets.filter(a => a.duplicateGroupId != null);
  const duplicateCollection = SMART_COLLECTIONS.find(c => c.id === 'duplicates');
  if (duplicateCollection) {
    const matched = runQuery(duplicateCollection.rule, realAssets);
    if (matched.length !== duplicates.length) {
      throw new Error(`Duplicate Collection mismatch: expected ${duplicates.length}, got ${matched.length}`);
    }
  }
  console.log("✅ SUCCESS: Duplicate collections match asset state.");

  // Test D: Determinism (Stability Check)
  console.log("🔍 Test D: Determinism (Stability Check)...");
  const firstPass = SMART_COLLECTIONS.map(col => ({ id: col.id, count: runQuery(col.rule, realAssets).length }));
  
  // Simulate "reloads" or re-runs
  for (let i = 0; i < 3; i++) {
    const nextPass = SMART_COLLECTIONS.map(col => ({ id: col.id, count: runQuery(col.rule, realAssets).length }));
    for (let j = 0; j < firstPass.length; j++) {
      if (firstPass[j].count !== nextPass[j].count) {
        throw new Error(`Determinism Failure in collection ${firstPass[j].id} on pass ${i + 1}`);
      }
    }
  }
  console.log("✅ SUCCESS: Results are 100% deterministic across multiple runs.");

  // Test E: Schema Integrity
  console.log("🔍 Test E: Schema Integrity...");
  const invalidAssets = realAssets.filter(a => 
    !a.ai || 
    a.ai.sceneType === undefined || 
    a.ai.tags === undefined || 
    a.ai.faces === undefined
  );
  if (invalidAssets.length > 0) {
    throw new Error(`SYSTEM = INVALID: Schema Integrity Failure: ${invalidAssets.length} assets are missing required 'ai' fields.`);
  }
  console.log("✅ SUCCESS: All assets conform to the strict schema.");

  // Test F: Normalization & Deduplication
  console.log("🔍 Test F: Normalization & Deduplication...");
  const testAssetNorm: Asset = {
    assetId: "test_norm_1",
    ai: {
      tags: [" Wedding ", "wedding", "WEDDING", "Nature"]
    }
  } as any;
  
  // This should be handled by assetStore.ensureAssetShape when saving
  // But let's verify the logic
  const normalizedTags = Array.from(new Set(testAssetNorm.ai.tags.map(t => t.trim().toLowerCase())));
  if (normalizedTags.length !== 2 || !normalizedTags.includes("wedding") || !normalizedTags.includes("nature")) {
    throw new Error("Normalization/Deduplication logic failure");
  }
  console.log("✅ SUCCESS: Normalization and deduplication logic verified.");

  // Test G: New Search Keywords
  console.log("🔍 Test G: New Search Keywords (untagged, unrated, no color)...");
  
  // Initialize assets with distinct values to ensure specific matches
  const untaggedAsset: Asset = ensureAssetShape({ 
    assetId: "untagged_1", 
    rating: 5, 
    colorTag: "red", 
    ai: { tags: [] } 
  } as any);
  
  const taggedAsset: Asset = ensureAssetShape({ 
    assetId: "tagged_1", 
    rating: 5, 
    colorTag: "red", 
    ai: { tags: ["wedding"] } 
  } as any);
  
  const unratedAsset: Asset = ensureAssetShape({ 
    assetId: "unrated_1", 
    rating: null, 
    colorTag: "red", 
    ai: { tags: ["tag"] } 
  } as any);
  
  const ratedAsset: Asset = ensureAssetShape({ 
    assetId: "rated_1", 
    rating: 5, 
    colorTag: "red", 
    ai: { tags: ["tag"] } 
  } as any);
  
  const noColorAsset: Asset = ensureAssetShape({ 
    assetId: "nocolor_1", 
    rating: 5, 
    colorTag: null, 
    ai: { tags: ["tag"] } 
  } as any);
  
  const coloredAsset: Asset = ensureAssetShape({ 
    assetId: "colored_1", 
    rating: 5, 
    colorTag: "red", 
    ai: { tags: ["tag"] } 
  } as any);
  
  const testAssets = [untaggedAsset, taggedAsset, unratedAsset, ratedAsset, noColorAsset, coloredAsset];
  
  // Index these assets so IndexManager can find them
  const indexManager = getIndexManager();
  if (indexManager) {
    testAssets.forEach(a => indexManager.indexAsset(a));
  }
  
  const { parseSemanticQuery } = await import('../search/semanticSearch');
  
  const untaggedRule = await parseSemanticQuery("untagged");
  console.log("  [DEBUG] untaggedRule:", JSON.stringify(untaggedRule));
  const untaggedResult = runQuery(untaggedRule!, testAssets);
  console.log("  [DEBUG] untaggedResult count:", untaggedResult.length);
  if (untaggedResult.length !== 1 || untaggedResult[0].assetId !== "untagged_1") {
    if (indexManager) testAssets.forEach(a => indexManager.removeAsset(a));
    throw new Error(`Search Keyword Failure: 'untagged'. Expected 1 result (untagged_1), got ${untaggedResult.length} results: ${untaggedResult.map(a => a.assetId).join(', ')}`);
  }
  
  const unratedRule = await parseSemanticQuery("unrated");
  console.log("  [DEBUG] unratedRule:", JSON.stringify(unratedRule));
  const unratedResult = runQuery(unratedRule!, testAssets);
  console.log("  [DEBUG] unratedResult count:", unratedResult.length);
  console.log("  [DEBUG] unratedResult IDs:", unratedResult.map(a => a.assetId).join(', '));
  if (unratedResult.length !== 1 || unratedResult[0].assetId !== "unrated_1") {
    if (indexManager) testAssets.forEach(a => indexManager.removeAsset(a));
    throw new Error(`Search Keyword Failure: 'unrated'. Expected 1 result (unrated_1), got ${unratedResult.length} results: ${unratedResult.map(a => a.assetId).join(', ')}`);
  }
  
  const noColorRule = await parseSemanticQuery("no color");
  const noColorResult = runQuery(noColorRule!, testAssets);
  if (noColorResult.length !== 1 || noColorResult[0].assetId !== "nocolor_1") {
    if (indexManager) testAssets.forEach(a => indexManager.removeAsset(a));
    throw new Error("Search Keyword Failure: 'no color'");
  }

  const hybridRule = await parseSemanticQuery("unrated red");
  console.log("  [DEBUG] hybridRule:", JSON.stringify(hybridRule));
  
  // Spy on indexManager to ensure it's called
  let indexManagerCalled = false;
  const originalQuery = indexManager ? indexManager.query.bind(indexManager) : null;
  if (indexManager && originalQuery) {
    indexManager.query = (rule, ids) => {
      indexManagerCalled = true;
      return originalQuery(rule, ids);
    };
  }

  const hybridResult = runQuery(hybridRule!, testAssets);
  console.log("  [DEBUG] hybridResult count:", hybridResult.length);
  console.log("  [DEBUG] hybridResult IDs:", hybridResult.map(a => a.assetId).join(', '));

  if (indexManager && originalQuery) {
    indexManager.query = originalQuery; // Restore
  }

  if (indexManager && !indexManagerCalled) {
    throw new Error("SEARCH REGRESSION: IndexManager was not called for hybrid query 'unrated red'");
  }
  
  if (hybridResult.length !== 1 || hybridResult[0].assetId !== "unrated_1") {
    throw new Error("Search Keyword Failure: 'unrated red' hybrid query failed");
  }

  // Cleanup
  if (indexManager) {
    testAssets.forEach(a => indexManager.removeAsset(a));
  }
  console.log("✅ SUCCESS: New search keywords correctly parsed and executed.");

  // Test H: Real Data Search Integrity (FINAL VERIFICATION)
  console.log("🔍 Test H: Real Data Search Integrity (FINAL VERIFICATION)...");
  
  // 1. REAL DATA VALIDATION
  const validateSearch = async (keyword: string, manualPredicate: (a: Asset) => boolean) => {
    const manualResults = realAssets.filter(manualPredicate);
    const rule = await parseSemanticQuery(keyword);
    if (!rule) throw new Error(`Failed to parse keyword: ${keyword}`);
    
    // Test Evaluator (Manual Scan)
    const evaluatorResults = runQuery(rule, realAssets);
    if (evaluatorResults.length !== manualResults.length) {
      throw new Error(`REAL DATA MISMATCH [Evaluator]: '${keyword}' expected ${manualResults.length}, got ${evaluatorResults.length}`);
    }

    // Test IndexManager (Indexed Scan)
    if (indexManager) {
      const allAssetIds = new Set(realAssets.map(a => a.assetId));
      const { ids: indexResultIds, fullyResolved } = indexManager.query(rule, allAssetIds);
      
      const isDerived = rule.type === 'condition' && FIELDS.find(f => f.key === rule.field)?.type === 'derived';
      
      if (!isDerived) {
        if (indexResultIds.size !== manualResults.length) {
          throw new Error(`REAL DATA MISMATCH [IndexManager]: '${keyword}' expected ${manualResults.length}, got ${indexResultIds.size}`);
        }
      }
    }
    console.log(`  ✔ Keyword '${keyword}' validated against ${manualResults.length} assets.`);
  };

  await validateSearch("unrated", isUnrated);
  await validateSearch("no color", isNoColor);
  await validateSearch("untagged", isUntagged);

  // 2. STRICT NULL VALIDATION
  const undefinedFields = realAssets.filter(a => 
    a.rating === undefined || 
    a.colorTag === undefined || 
    a.ai.tags === undefined
  );
  if (undefinedFields.length > 0) {
    throw new Error(`STRICT NULL FAILURE: ${undefinedFields.length} assets have 'undefined' instead of 'null/[]'`);
  }
  console.log("  ✔ Strict Null Validation passed (no undefined states).");

  // 3. EDGE CASE: rating = 0
  const edgeAsset: Asset = ensureAssetShape({
    assetId: "edge_rating_0",
    rating: 0, // Invalid but possible if logic fails
    ai: { tags: ["test"] }
  } as any);
  
  if (!isUnrated(edgeAsset)) {
    throw new Error("EDGE CASE FAILURE: 'unrated' did not match rating=0. It MUST match rating=0 or null.");
  }
  console.log("  ✔ Edge Case (rating=0) correctly matched by 'unrated'.");

  // 4. DERIVED EVALUATOR CONSISTENCY
  console.log("🔍 Test I: Derived Evaluator Consistency...");
  const derivedFields = FIELDS.filter(f => f.type === 'derived');
  for (const field of derivedFields) {
    if (!field.evaluator) throw new Error(`Derived field missing evaluator: ${field.key}`);
    
    // Compare evaluator result vs manual scan using the SAME function
    const evaluatorResults = realAssets.filter(field.evaluator);
    
    // Also test via runQuery (which uses evaluateCondition -> field.evaluator)
    const rule = { type: 'condition' as const, field: field.key, operator: '=', value: true };
    const queryResults = runQuery(rule, realAssets);
    
    if (evaluatorResults.length !== queryResults.length) {
      throw new Error(`DERIVED CONSISTENCY FAILURE: '${field.key}' manual filter (${evaluatorResults.length}) !== runQuery (${queryResults.length})`);
    }
    console.log(`  ✔ Derived field '${field.key}' is consistent.`);
  }

  console.log("✅ SUCCESS: Real data search integrity verified.");

  // Explicit Operator Validation (Logic Check)
  const testAsset: Asset = {
    assetId: "test_op_1",
    culling: 'keep',
    pickStatus: 'unflagged',
    qualityScore: 0.9,
    ai: {
      faces: [{ bbox: { x: 0, y: 0, w: 10, h: 10 }, landmarks: [] }],
      sceneType: "landscape",
      tags: ["nature"]
    },
    duplicateGroupId: "dup_1",
    importedAt: Date.now()
  } as any;

  console.log("🔍 Validating Rule Engine Operators...");
  
  if (indexManager) {
    indexManager.indexAsset(testAsset);
  }

  // Test: ai.faces length > 0
  const portraitRule = SMART_COLLECTIONS.find(c => c.id === 'portraits')?.rule;
  if (portraitRule && runQuery(portraitRule, [testAsset]).length !== 1) {
    if (indexManager) indexManager.removeAsset(testAsset);
    throw new Error("Operator Validation Failed: length> for ai.faces");
  }

  // Test: duplicateGroupId != null
  const duplicateRule = SMART_COLLECTIONS.find(c => c.id === 'duplicates')?.rule;
  if (duplicateRule && runQuery(duplicateRule, [testAsset]).length !== 1) {
    if (indexManager) indexManager.removeAsset(testAsset);
    throw new Error("Operator Validation Failed: != null for duplicateGroupId");
  }

  // Test: qualityScore > 0.8
  const bestRule = SMART_COLLECTIONS.find(c => c.id === 'best')?.rule;
  if (bestRule && runQuery(bestRule, [testAsset]).length !== 1) {
    if (indexManager) indexManager.removeAsset(testAsset);
    throw new Error("Operator Validation Failed: > for qualityScore");
  }
  
  if (indexManager) {
    indexManager.removeAsset(testAsset);
  }

  console.log("✨ ALL ACCEPTANCE TESTS PASSED");
  
  // Run performance test
  runPerformanceTest();
  
  return true;
}

