import { ImportedAsset, Face } from '../../../shared/types';
import { storeSemantic } from '../../pipeline/cache/semanticStore';
import { indexAsset } from '../../dam/searchIndex';
import { autoApplyPresets } from '../../pipeline/import/autoApply';
import { renderPipeline } from '../../pipeline/render/renderPipeline';
import { previewCache } from '../../cache/previewCache';
import { fuseBatchAndEntityOps } from '../../batch/entityBatch';
import { calculateAIScore } from '../../culling/aiScoring';

import { assetStore } from '../../dam/assetStore';
import { importState } from '../../pipeline/import/importState';

import { detectFaces } from '../../face/faceDetection';
import { generateEmbedding } from '../../face/faceEmbedding';
import { processFace } from '../../face/faceEntityEngine';
import { faceIndex } from '../../face/faceIndex';

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function cropFace(image: HTMLImageElement, bbox: { x: number; y: number; width: number; height: number }): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  // Convert percentages back to pixels for cropping
  const pixelX = (bbox.x / 100) * image.width;
  const pixelY = (bbox.y / 100) * image.height;
  const pixelWidth = (bbox.width / 100) * image.width;
  const pixelHeight = (bbox.height / 100) * image.height;

  canvas.width = pixelWidth;
  canvas.height = pixelHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  ctx.drawImage(image, pixelX, pixelY, pixelWidth, pixelHeight, 0, 0, pixelWidth, pixelHeight);
  return canvas;
}

export interface SemanticData {
  id: string;
  caption: string;
  tags: string[];
  scene: string;
  attributes: any;
  entityIds?: string[];
}

export function buildSemantic(
  asset: ImportedAsset,
  caption: string,
  tags: string[],
  scene: string,
  attributes: any
): SemanticData {
  return {
    id: asset.assetId,
    caption,
    tags,
    scene,
    attributes
  };
}

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateAICaptionAndTags(asset: ImportedAsset): Promise<{ caption: string, tags: string[], scene: string }> {
  try {
    const blob = asset.previewBlob;
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(blob);
    });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: "Describe this image in one sentence. Also provide a list of 5-10 relevant tags. Finally, categorize the scene into one of: 'portrait', 'landscape', 'architecture', 'street', 'nature', 'event', 'macro', 'other'. Return as JSON: { \"caption\": \"...\", \"tags\": [\"...\"], \"scene\": \"...\" }" },
            { inlineData: { data: base64, mimeType: blob.type } }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const result = JSON.parse(response.text || '{}');
    return {
      caption: result.caption || "",
      tags: result.tags || [],
      scene: result.scene || "unknown"
    };
  } catch (err) {
    console.error('[AI Pipeline] Gemini generation failed:', err);
    return { caption: "", tags: [], scene: "unknown" };
  }
}

export async function runAI(asset: ImportedAsset): Promise<SemanticData> {
  console.log(`[AI Pipeline] Starting for ${asset.assetId}...`);
  
  // Ensure we have the preview blob and URL
  if (!asset.previewBlob || !asset.previewUrl) {
    console.log(`[AI Pipeline] Missing preview for ${asset.assetId}, fetching from cache...`);
    const cached = await previewCache.get(asset.assetId);
    if (cached && cached.mediumPreview) {
      asset.previewBlob = cached.mediumPreview;
      asset.previewUrl = URL.createObjectURL(cached.mediumPreview);
      asset.thumbnailUrl = asset.previewUrl;
    } else {
      console.error(`[AI Pipeline] Could not find preview for ${asset.assetId} in cache. Skipping AI processing.`);
      return buildSemantic(asset, "", [], "unknown", {});
    }
  }
  
  // Real AI extraction (Stage 5)
  const { caption, tags, scene } = await generateAICaptionAndTags(asset);
  
  const attributes = {
    brightness: 0.5,
    contrast: 0.5,
    saturation: 0.5,
    sharpness: 0.5
  };
  
  const semantic = buildSemantic(asset, caption, tags, scene, attributes);
  
  // Store and Index
  await storeSemantic(semantic.id, semantic);
  await indexAsset(semantic);
  
  const humanStructure = {
    assetId: asset.assetId,
    humans: [],
    entityIds: []
  };
  
  let closedEyesScore = 0;

  // 1. Face Detection & Grouping
  let detectedFaces: Face[] = [];
  let entityIds: string[] = [];
  
  try {
    const img = await loadImage(asset.previewUrl);
    let rawFaces = await detectFaces(img);
    console.log(`[AI Pipeline] ${asset.assetId}: Detected ${rawFaces.length} faces.`);
    
    // Processing Limits: Max 10 faces per image, sorted by confidence
    if (rawFaces.length > 10) {
      rawFaces.sort((a, b) => b.confidence - a.confidence);
      rawFaces = rawFaces.slice(0, 10);
      console.log(`[AI Pipeline] ${asset.assetId}: Limited to top 10 faces by confidence.`);
    }
    
    const existingAsset = assetStore.get(asset.assetId);
    const existingFaces = existingAsset?.ai?.faces || [];
    
    let faceRecordsCreated = 0;
    for (const rawFace of rawFaces) {
      try {
        // Check if this face already exists (IoU > 0.5)
        let matchedExistingFace: Face | undefined;
        for (const ef of existingFaces) {
          const xOverlap = Math.max(0, Math.min(rawFace.bbox.x + rawFace.bbox.width, ef.bbox.x + ef.bbox.width) - Math.max(rawFace.bbox.x, ef.bbox.x));
          const yOverlap = Math.max(0, Math.min(rawFace.bbox.y + rawFace.bbox.height, ef.bbox.y + ef.bbox.height) - Math.max(rawFace.bbox.y, ef.bbox.y));
          const intersection = xOverlap * yOverlap;
          const union = (rawFace.bbox.width * rawFace.bbox.height) + (ef.bbox.width * ef.bbox.height) - intersection;
          const iou = intersection / union;
          if (iou > 0.5) {
            matchedExistingFace = ef;
            break;
          }
        }

        if (matchedExistingFace) {
          // Keep existing face, just update bbox/landmarks if needed
          const face = { ...matchedExistingFace, bbox: rawFace.bbox, landmarks: rawFace.landmarks };
          detectedFaces.push(face);
          if (face.entityId && !entityIds.includes(face.entityId)) {
            entityIds.push(face.entityId);
          }
          continue;
        }

        const cropped = await cropFace(img, rawFace.bbox);
        const embedding = await generateEmbedding(cropped);
        console.log(`[AI Pipeline] ${asset.assetId}: Generated embedding for face.`);
        
        const face: Face = {
          id: `face_${asset.assetId}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          bbox: rawFace.bbox,
          landmarks: rawFace.landmarks,
          embedding: embedding,
          confidence: rawFace.confidence || 0.9,
          entityId: null
        };
        
        // We need all faces for matching, but for now let's just pass empty and it will match against entities
        const entityId = await processFace(face, {}); 
        face.entityId = entityId;
        console.log(`[AI Pipeline] ${asset.assetId}: Processed face, entityId: ${entityId}`);
        
        detectedFaces.push(face);
        faceRecordsCreated++;
        if (entityId && !entityIds.includes(entityId)) {
          entityIds.push(entityId);
        }
      } catch (err) {
        console.error(`[AI Pipeline] Failed to process face for ${asset.assetId}:`, err);
      }
    }
    
    // Also keep any existing faces that weren't detected this time (user might have manually added them, though we don't support that yet, it's safer)
    for (const ef of existingFaces) {
      if (!detectedFaces.some(df => df.id === ef.id)) {
        detectedFaces.push(ef);
        if (ef.entityId && !entityIds.includes(ef.entityId)) {
          entityIds.push(ef.entityId);
        }
      }
    }
    
    console.log("Face records created:", faceRecordsCreated);
  } catch (err) {
    console.error(`[AI Pipeline] Face detection failed for ${asset.assetId}:`, err);
  }

  // Update DAM Asset with AI state
  const damAsset = assetStore.get(asset.assetId);
  if (damAsset) {
    const existingTags = damAsset.ai?.tags || [];
    
    const updatedAsset = {
      ...damAsset,
      description: caption,
      entityIds: entityIds,
      closedEyesScore,
      ai: {
        faces: detectedFaces,
        sceneType: scene,
        tags: existingTags.length > 0 ? existingTags : tags
      }
    };
    
    assetStore.update(asset.assetId, updatedAsset);
    
    // Granular index update
    faceIndex.removeAsset(asset.assetId);
    if (updatedAsset.ai?.faces) {
      for (const face of updatedAsset.ai.faces) {
        faceIndex.addFace(face, asset.assetId);
      }
    }
    
    const aiResult = calculateAIScore(updatedAsset);
    
    assetStore.update(asset.assetId, {
      ...updatedAsset,
      sharpnessScore: aiResult.sharpnessScore,
      aestheticScore: aiResult.aestheticScore,
      aiScore: aiResult.aiScore,
      culling: aiResult.suggestion as any
    });
  }
  
  // 9. Auto-Apply Presets
  const photocodes = await autoApplyPresets(asset.assetId);
  if (photocodes.length > 0) {
    console.log(`[AI Pipeline] Auto-applying ${photocodes.length} presets for ${asset.assetId}...`);
    const finalCode = fuseBatchAndEntityOps('', photocodes);
    try {
      const newPreview = await renderPipeline.render(finalCode, asset.previewBlob, asset.metadata, asset.assetId);
      // Update cache with new preview
      await previewCache.set(asset.assetId, {
        thumbnail: newPreview,
        mediumPreview: newPreview,
        metadata: asset.metadata
      });
      
      // Update asset object
      asset.previewBlob = newPreview;
      asset.previewUrl = URL.createObjectURL(newPreview);
      asset.thumbnailUrl = asset.previewUrl;
      
      // Notify UI
      importState.notifyAssetUpdate(asset);
      
      console.log(`[AI Pipeline] Successfully applied presets to ${asset.assetId}`);
    } catch (err) {
      console.error(`[AI Pipeline] Failed to apply presets to ${asset.assetId}:`, err);
    }
  }
  
  console.log(`[AI Pipeline] Finished for ${asset.assetId}:`, semantic);
  
  return semantic;
}
