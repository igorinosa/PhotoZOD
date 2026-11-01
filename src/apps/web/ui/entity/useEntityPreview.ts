import { useState, useCallback } from 'react';
import { entityManager } from '../../../../core/entities/entityManager';
import { Compiler } from '../../../../core/photocode/compiler';
import { Parser } from '../../../../core/photocode/parser';
import { tokenize } from '../../../../core/photocode/tokenizer';

export interface PreviewResult {
  assetId: string;
  previewUrl: string; // In a real app, this would be the processed image URL/Blob
  operations: any[];
}

export function useEntityPreview() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [previews, setPreviews] = useState<PreviewResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const generatePreview = useCallback(async (entityId: string, photoCode: string) => {
    setIsGenerating(true);
    setError(null);
    
    try {
      // 1. Get sample assets (up to 5)
      const allAssets = await entityManager.getAssetsForEntity(entityId);
      const sampleAssets = allAssets.slice(0, 5);

      if (sampleAssets.length === 0) {
        setPreviews([]);
        return;
      }

      // 2. Parse and Compile PhotoCode
      const tokens = tokenize(photoCode);
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const compiler = new Compiler();
      
      // We compile for the first asset just to see the operations
      // In a real scenario, we'd run the actual image processing pipeline here
      const operations = await compiler.compile(ast, sampleAssets[0]);

      // 3. Generate mock previews
      // Since we don't have the actual WebGL/WASM image processing pipeline wired to the UI yet,
      // we simulate the preview generation.
      const generatedPreviews: PreviewResult[] = sampleAssets.map(assetId => ({
        assetId,
        previewUrl: `preview_${assetId}_${Date.now()}`, // Mock URL
        operations
      }));

      // Simulate processing delay (<300ms)
      await new Promise(resolve => setTimeout(resolve, 250));

      setPreviews(generatedPreviews);
    } catch (err: any) {
      console.error('[useEntityPreview] Failed to generate preview:', err);
      setError(err.message || 'Failed to generate preview');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const clearPreviews = useCallback(() => {
    setPreviews([]);
    setError(null);
  }, []);

  return {
    generatePreview,
    clearPreviews,
    previews,
    isGenerating,
    error
  };
}
