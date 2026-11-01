import { Face, PersonEntity } from '../../shared/types';
import { entityStore } from '../entities/entityStore';
import { assetStore } from '../dam/assetStore';
import { matchFaceToEntity, cosineSimilarity } from './faceMatcher';
import { indexAsset } from '../dam/searchIndex';
import { getSemantic } from '../pipeline/cache/semanticStore';
import { faceIndex } from './faceIndex';

export async function processFace(
  face: Face, 
  allFaces: Record<string, Face>
): Promise<string | null> {
  // Identity Stability Rule:
  // If face is already assigned to a locked entity, do not reassign.
  // Actually, if it's already assigned at all, we probably shouldn't auto-reassign unless it's a manual action.
  if (face.entityId) {
    return face.entityId;
  }

  const entities = await entityStore.getAll();
  // Filter out locked entities from matching
  const unlockedEntities = entities.filter(e => !e.isLocked);
  const matchedEntityId = matchFaceToEntity(face, unlockedEntities, allFaces);

  if (matchedEntityId) {
    const entity = await entityStore.get(matchedEntityId);
    if (entity && !entity.isLocked) {
      // Update entity
      const updatedEntity = { ...entity };
      if (!updatedEntity.faceIds.includes(face.id)) {
        updatedEntity.faceIds.push(face.id);
        // Update average embedding
        updatedEntity.embedding = updatedEntity.embedding.map((val, i) => 
          (val * (updatedEntity.faceIds.length - 1) + face.embedding[i]) / updatedEntity.faceIds.length
        );
        updatedEntity.updatedAt = Date.now();
        await entityStore.set(updatedEntity);
      }
      return matchedEntityId;
    }
  }

  // Cluster Creation Threshold logic for single faces
  // If we didn't match, we only create a new entity if confidence is very high
  if (face.confidence < 0.9) {
    return null; // Leave unassigned
  }

  // Create new entity
  const newEntity: PersonEntity = {
    id: `person_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    name: null,
    faceIds: [face.id],
    embedding: [...face.embedding],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    coverFaceId: face.id,
    isLocked: false
  };
  await entityStore.set(newEntity);
  return newEntity.id;
}

export async function mergeEntities(entityIdA: string, entityIdB: string) {
  const entityA = await entityStore.get(entityIdA);
  const entityB = await entityStore.get(entityIdB);
  if (!entityA || !entityB) return;

  // Merge B into A
  const mergedEntity: PersonEntity = {
    ...entityA,
    name: entityA.name || entityB.name,
    faceIds: Array.from(new Set([...entityA.faceIds, ...entityB.faceIds])),
    // Recompute average embedding
    embedding: entityA.embedding.map((val, i) => 
      (val * entityA.faceIds.length + entityB.embedding[i] * entityB.faceIds.length) / 
      (entityA.faceIds.length + entityB.faceIds.length)
    ),
    updatedAt: Date.now()
  };

  await entityStore.set(mergedEntity);
  await entityStore.delete(entityIdB);
  
  // Update assets and faceIndex
  const allAssets = assetStore.getAll();
  for (const asset of allAssets) {
    if (asset.entityIds?.includes(entityIdB)) {
      const updatedAsset = { ...asset };
      let changed = false;
      if (updatedAsset.ai?.faces) {
        for (const face of updatedAsset.ai.faces) {
          if (face.entityId === entityIdB) {
            face.entityId = entityIdA;
            changed = true;
          }
        }
      }
      if (changed) {
        updatedAsset.entityIds = Array.from(new Set([...updatedAsset.entityIds.filter(id => id !== entityIdB), entityIdA]));
        await assetStore.update(updatedAsset.assetId, updatedAsset);
        if (updatedAsset.ai?.faces) {
          for (const face of updatedAsset.ai.faces) {
            faceIndex.updateFace(face, updatedAsset.assetId);
          }
        }
      }
    }
  }

  return mergedEntity;
}

export async function renameEntity(entityId: string, newName: string) {
  const entity = await entityStore.get(entityId);
  if (!entity) return;

  const updatedEntity = { ...entity, name: newName, updatedAt: Date.now() };
  await entityStore.set(updatedEntity);

  // Re-index assets containing this entity
  const allAssets = assetStore.getAll();
  for (const asset of allAssets) {
    if (asset.entityIds?.includes(entityId)) {
      if (asset.ai) {
        const semanticData = await getSemantic(asset.assetId);
        if (semanticData) {
          await indexAsset(semanticData);
        } else {
          // Fallback if semantic data is not in cache
          await indexAsset({
            id: asset.assetId,
            caption: asset.description || "Photo",
            tags: asset.ai.tags || [],
            scene: asset.ai.sceneType || "",
            attributes: {},
            entityIds: asset.entityIds
          });
        }
      }
    }
  }

  return updatedEntity;
}

export async function getMergeSuggestions(entityId: string, threshold = 0.85): Promise<{ entityId: string, score: number }[]> {
  const targetEntity = await entityStore.get(entityId);
  if (!targetEntity || targetEntity.isLocked) return [];

  const allEntities = await entityStore.getAll();
  const suggestions: { entityId: string, score: number }[] = [];

  for (const entity of allEntities) {
    if (entity.id === entityId || entity.isLocked) continue;
    
    const score = cosineSimilarity(targetEntity.embedding, entity.embedding);
    if (score >= threshold) {
      suggestions.push({ entityId: entity.id, score });
    }
  }

  return suggestions.sort((a, b) => b.score - a.score);
}

export async function checkSplitNeeded(entityId: string): Promise<boolean> {
  const entity = await entityStore.get(entityId);
  if (!entity || entity.faceIds.length < 2 || entity.isLocked) return false;

  // We need the embeddings of all faces in this entity
  const allAssets = assetStore.getAll();
  const faceEmbeddings: number[][] = [];
  
  for (const asset of allAssets) {
    if (asset.ai?.faces) {
      for (const face of asset.ai.faces) {
        if (face.entityId === entityId) {
          faceEmbeddings.push(face.embedding);
        }
      }
    }
  }

  if (faceEmbeddings.length < 2) return false;

  // Calculate variance: average distance from centroid
  let totalDistance = 0;
  for (const emb of faceEmbeddings) {
    const sim = cosineSimilarity(entity.embedding, emb);
    totalDistance += (1 - sim); // distance
  }
  const avgDistance = totalDistance / faceEmbeddings.length;

  // If average distance is too high (similarity < 0.75), flag for split
  return avgDistance > 0.25;
}

export async function removeFaceFromEntity(entityId: string, faceId: string) {
  const entity = await entityStore.get(entityId);
  if (!entity) return;

  // Remove from entity
  entity.faceIds = entity.faceIds.filter(id => id !== faceId);
  if (entity.faceIds.length === 0) {
    await entityStore.delete(entityId);
  } else {
    await entityStore.set({ ...entity, updatedAt: Date.now() });
  }

  // Update asset
  const asset = assetStore.getAll().find(a => a.ai.faces.some(f => f.id === faceId));
  if (asset) {
    const updatedAsset = { ...asset };
    const face = updatedAsset.ai.faces.find(f => f.id === faceId);
    if (face) {
      face.entityId = null;
      updatedAsset.entityIds = updatedAsset.entityIds.filter(id => id !== entityId);
      await assetStore.update(updatedAsset.assetId, updatedAsset);
      faceIndex.updateFace(face, updatedAsset.assetId);
    }
  }
}

export async function moveFaceToEntity(faceId: string, fromEntityId: string, toEntityId: string) {
  const fromEntity = await entityStore.get(fromEntityId);
  const toEntity = await entityStore.get(toEntityId);
  if (!fromEntity || !toEntity) return;

  // Remove from old
  fromEntity.faceIds = fromEntity.faceIds.filter(id => id !== faceId);
  if (fromEntity.faceIds.length === 0) {
    await entityStore.delete(fromEntityId);
  } else {
    await entityStore.set({ ...fromEntity, updatedAt: Date.now() });
  }

  // Add to new
  if (!toEntity.faceIds.includes(faceId)) {
    toEntity.faceIds.push(faceId);
    toEntity.updatedAt = Date.now();
    await entityStore.set(toEntity);
  }

  // Update asset
  const asset = assetStore.getAll().find(a => a.ai.faces.some(f => f.id === faceId));
  if (asset) {
    const updatedAsset = { ...asset };
    const face = updatedAsset.ai.faces.find(f => f.id === faceId);
    if (face) {
      face.entityId = toEntityId;
      updatedAsset.entityIds = Array.from(new Set([...updatedAsset.entityIds.filter(id => id !== fromEntityId), toEntityId]));
      await assetStore.update(updatedAsset.assetId, updatedAsset);
      faceIndex.updateFace(face, updatedAsset.assetId);
    }
  }
}

function selectBestCoverFace(faceIds: string[], allFaces: { face: Face, assetId: string }[]): string {
  if (faceIds.length === 0) return '';
  let bestFaceId = faceIds[0];
  let bestScore = -1;

  for (const id of faceIds) {
    const item = allFaces.find(f => f.face.id === id);
    if (item) {
      const { face, assetId } = item;
      const asset = assetStore.get(assetId);
      const area = face.bbox.width * face.bbox.height;
      // Confidence > Size > Recency
      // Normalize recency to a small bonus (0 to 0.1)
      let recencyBonus = 0;
      if (asset && asset.createdAt) {
        // Assume max age is 10 years for normalization
        const ageMs = Date.now() - asset.createdAt;
        const maxAgeMs = 10 * 365 * 24 * 60 * 60 * 1000;
        recencyBonus = Math.max(0, 0.1 * (1 - ageMs / maxAgeMs));
      }
      
      const score = (face.confidence * 1000) + area + recencyBonus;
      if (score > bestScore) {
        bestScore = score;
        bestFaceId = face.id;
      }
    }
  }
  return bestFaceId;
}

export async function runInitialClustering() {
  const allAssets = assetStore.getAll();
  const allFaces: { face: Face, assetId: string }[] = [];
  
  console.log(`[FaceEngine] Checking ${allAssets.length} assets for unclustered faces...`);
  
  for (const asset of allAssets) {
    if (asset.ai?.faces) {
      for (const face of asset.ai.faces) {
        if (!face.entityId) {
          allFaces.push({ face, assetId: asset.assetId });
        }
      }
    }
  }

  console.log(`[FaceEngine] Found ${allFaces.length} unclustered faces.`);

  if (allFaces.length === 0) return;

  console.log(`[FaceEngine] Running initial clustering on ${allFaces.length} faces...`);

  const { thresholdValue } = (await import('./faceSettings')).useFaceSettings.getState();
  console.log(`[FaceEngine] Using clustering threshold: ${thresholdValue}`);

  // Simple greedy clustering
  const clusters: { faceIds: string[], embedding: number[] }[] = [];

  for (const { face } of allFaces) {
    let bestCluster = -1;
    let bestScore = -1;

    for (let i = 0; i < clusters.length; i++) {
      const score = cosineSimilarity(face.embedding, clusters[i].embedding);
      if (score > thresholdValue && score > bestScore) { 
        bestScore = score;
        bestCluster = i;
      }
    }

    if (bestCluster !== -1) {
      clusters[bestCluster].faceIds.push(face.id);
      // Update cluster embedding (moving average)
      const n = clusters[bestCluster].faceIds.length;
      clusters[bestCluster].embedding = clusters[bestCluster].embedding.map((v, idx) => 
        (v * (n - 1) + face.embedding[idx]) / n
      );
    } else {
      clusters.push({
        faceIds: [face.id],
        embedding: [...face.embedding]
      });
    }
  }

  console.log(`[FaceEngine] Formed ${clusters.length} clusters.`);
  console.log("Clusters created:", clusters.length);

  // Create entities and update assets
  const updates = new Map<string, any>();
  let peopleCreated = 0;

  for (const cluster of clusters) {
    // Identity Stability Rule & Cluster Creation Threshold
    // Minimum 2 similar faces OR high-confidence match (> 0.9)
    const maxConfidence = cluster.faceIds.reduce((max, id) => {
      const item = allFaces.find(f => f.face.id === id);
      return item ? Math.max(max, item.face.confidence) : max;
    }, 0);

    if (cluster.faceIds.length < 2 && maxConfidence < 0.9) {
      // Leave in Unassigned Face Pool (entityId remains null)
      continue;
    }

    const coverFaceId = selectBestCoverFace(cluster.faceIds, allFaces);
    const newEntity: PersonEntity = {
      id: `person_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: null,
      faceIds: cluster.faceIds,
      embedding: cluster.embedding,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      coverFaceId: coverFaceId,
      isLocked: false
    };
    await entityStore.set(newEntity);
    peopleCreated++;
    console.log("People created:", peopleCreated);

    // Update faces
    for (const faceId of cluster.faceIds) {
      const item = allFaces.find(f => f.face.id === faceId);
      if (item) {
        let assetUpdate = updates.get(item.assetId);
        if (!assetUpdate) {
          const asset = assetStore.get(item.assetId);
          if (asset) {
            assetUpdate = { ...asset };
            updates.set(item.assetId, assetUpdate);
          }
        }

        if (assetUpdate) {
          const faceToUpdate = assetUpdate.ai.faces.find((f: Face) => f.id === faceId);
          if (faceToUpdate) {
            faceToUpdate.entityId = newEntity.id;
            if (!assetUpdate.entityIds) {
              assetUpdate.entityIds = [];
            }
            if (!assetUpdate.entityIds.includes(newEntity.id)) {
              assetUpdate.entityIds.push(newEntity.id);
            }
          }
        }
      }
    }
  }

  console.log("People created:", peopleCreated);

  // Apply batch updates
  const batchUpdates = Array.from(updates.entries()).map(([assetId, updates]) => ({ assetId, updates }));
  if (batchUpdates.length > 0) {
    assetStore.batchUpdate(batchUpdates);
    for (const { assetId, updates: updatedAsset } of batchUpdates) {
      if (updatedAsset.ai?.faces) {
        for (const face of updatedAsset.ai.faces) {
          faceIndex.updateFace(face, assetId);
        }
      }
    }
  }
}

export async function cleanupOrphanedFaces(deletedAssetIds: string[]) {
  // When assets are deleted, remove their faces from PersonEntities
  const allEntities = await entityStore.getAll();
  
  for (const entity of allEntities) {
    let changed = false;
    // We need to find which faces belonged to the deleted assets.
    // Since the assets are already deleted from assetStore, we can't look them up.
    // We have to check if the faceId exists in ANY remaining asset.
    // This is slow, so instead we rely on the fact that faceIds are unique.
    // Actually, faceIndex has assetId.
    const remainingFaceIds = entity.faceIds.filter(faceId => {
      const assetId = faceIndex.getAssetForFace(faceId);
      if (assetId && deletedAssetIds.includes(assetId)) {
        changed = true;
        return false;
      }
      return true;
    });

    if (changed) {
      if (remainingFaceIds.length === 0) {
        await entityStore.delete(entity.id);
      } else {
        await entityStore.set({
          ...entity,
          faceIds: remainingFaceIds,
          updatedAt: Date.now()
        });
      }
    }
  }
}

export async function togglePersonLock(entityId: string, isLocked: boolean) {
  const entity = await entityStore.get(entityId);
  if (!entity) return;
  await entityStore.set({ ...entity, isLocked, updatedAt: Date.now() });
}

export async function setCoverFace(entityId: string, faceId: string) {
  const entity = await entityStore.get(entityId);
  if (!entity) return;
  await entityStore.set({ ...entity, coverFaceId: faceId, updatedAt: Date.now() });
}

export async function ignoreFace(faceId: string) {
  const asset = assetStore.getAll().find(a => a.ai.faces.some(f => f.id === faceId));
  if (asset) {
    const updatedAsset = { ...asset };
    const face = updatedAsset.ai.faces.find(f => f.id === faceId);
    if (face) {
      const oldEntityId = face.entityId;
      face.isIgnored = true;
      face.entityId = null;
      
      if (oldEntityId) {
        const entity = await entityStore.get(oldEntityId);
        if (entity) {
          entity.faceIds = entity.faceIds.filter(id => id !== faceId);
          if (entity.faceIds.length === 0) {
            await entityStore.delete(oldEntityId);
          } else {
            await entityStore.set({ ...entity, updatedAt: Date.now() });
          }
        }
        updatedAsset.entityIds = updatedAsset.entityIds.filter(id => id !== oldEntityId);
      }
      
      await assetStore.update(updatedAsset.assetId, updatedAsset);
      faceIndex.updateFace(face, updatedAsset.assetId);
    }
  }
}

export async function assignFaceToEntity(faceId: string, entityId: string) {
  const entity = await entityStore.get(entityId);
  if (!entity) return;

  const asset = assetStore.getAll().find(a => a.ai.faces.some(f => f.id === faceId));
  if (!asset) return;

  const face = asset.ai.faces.find(f => f.id === faceId);
  if (!face) return;

  const oldEntityId = face.entityId;

  // Add to new entity
  if (!entity.faceIds.includes(faceId)) {
    entity.faceIds.push(faceId);
    entity.updatedAt = Date.now();
    await entityStore.set(entity);
  }

  // Remove from old entity if exists
  if (oldEntityId && oldEntityId !== entityId) {
    const oldEntity = await entityStore.get(oldEntityId);
    if (oldEntity) {
      oldEntity.faceIds = oldEntity.faceIds.filter(id => id !== faceId);
      if (oldEntity.faceIds.length === 0) {
        await entityStore.delete(oldEntityId);
      } else {
        await entityStore.set({ ...oldEntity, updatedAt: Date.now() });
      }
    }
  }

  // Update asset
  const updatedAsset = { ...asset };
  const updatedFace = updatedAsset.ai.faces.find(f => f.id === faceId);
  if (updatedFace) {
    updatedFace.entityId = entityId;
    updatedFace.isIgnored = false;
    updatedAsset.entityIds = Array.from(new Set([...(updatedAsset.entityIds || []).filter(id => id !== oldEntityId), entityId]));
    await assetStore.update(updatedAsset.assetId, updatedAsset);
    faceIndex.updateFace(updatedFace, updatedAsset.assetId);
  }
}

export async function createNewPersonFromFace(faceId: string, currentEntityId: string | null) {
  const currentEntity = currentEntityId ? await entityStore.get(currentEntityId) : null;

  // Find face in assets
  const asset = assetStore.getAll().find(a => a.ai.faces.some(f => f.id === faceId));
  if (!asset) return;

  const face = asset.ai.faces.find(f => f.id === faceId);
  if (!face) return;

  // Create new entity
  const newEntity: PersonEntity = {
    id: `person_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    name: null,
    faceIds: [faceId],
    embedding: [...face.embedding],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    coverFaceId: faceId,
    isLocked: false
  };

  await entityStore.set(newEntity);

  // Remove from old entity
  if (currentEntity) {
    currentEntity.faceIds = currentEntity.faceIds.filter(id => id !== faceId);
    if (currentEntity.faceIds.length === 0) {
      await entityStore.delete(currentEntityId!);
    } else {
      await entityStore.set({ ...currentEntity, updatedAt: Date.now() });
    }
  }

  // Update asset
  const updatedAsset = { ...asset };
  const updatedFace = updatedAsset.ai.faces.find(f => f.id === faceId);
  if (updatedFace) {
    updatedFace.entityId = newEntity.id;
    updatedFace.isIgnored = false;
    const filteredIds = (updatedAsset.entityIds || []).filter(id => id !== currentEntityId);
    updatedAsset.entityIds = Array.from(new Set([...filteredIds, newEntity.id]));
    await assetStore.update(updatedAsset.assetId, updatedAsset);
    faceIndex.updateFace(updatedFace, updatedAsset.assetId);
  }

  return newEntity.id;
}
