import { Entity, EntityType } from './schema';
import { entityCache } from '../cache/entityCache';
import { entityEventBus } from '../events/entityEvents';
import { matchEntity } from './matcher';
import { assetStore } from '../dam/assetStore';
import { autoSaveManager } from '../storage/autoSave';
import { systemDB } from '../storage/db';

class EntityManager {
  async get(id: string): Promise<Entity | undefined> {
    return await entityCache.get(id);
  }

  async getByName(name: string): Promise<Entity | undefined> {
    return await entityCache.getByName(name);
  }

  async getAssetsForEntity(entityId: string): Promise<string[]> {
    return await entityCache.getAssetsForEntity(entityId);
  }

  async getEntitiesForAsset(assetId: string): Promise<string[]> {
    return await entityCache.getEntitiesForAsset(assetId);
  }

  async getAll(): Promise<Entity[]> {
    return await entityCache.getAll();
  }

  /**
   * STAGE 0H.7 — ENTITY CREATION FLOW
   * The only way to link a face to an identity.
   */
  async matchAndLink(embedding: Float32Array, assetId: string, type: EntityType = 'person'): Promise<Entity> {
    const allEntities = await this.getAll();
    const existingEntity = await matchEntity(embedding, allEntities);

    const asset = assetStore.get(assetId);
    const groupId = asset?.groupId;

    if (existingEntity) {
      console.log(`[EntityManager] Match found: ${existingEntity.id} for asset ${assetId}`);
      
      // Update existing entity with new assetId and groupId
      const updatedEntity = { ...existingEntity };
      const assetIds = updatedEntity.assetIds || [];
      if (!assetIds.includes(assetId)) {
        updatedEntity.assetIds = [...assetIds, assetId];
      }
      const groupIds = updatedEntity.groupIds || [];
      if (groupId && !groupIds.includes(groupId)) {
        updatedEntity.groupIds = [...groupIds, groupId];
      }
      
      // Optionally add embedding to entity DNA if it's slightly different but still a match
      // updatedEntity.embeddings.push(embedding); 

      return await this.update(updatedEntity);
    } else {
      console.log(`[EntityManager] No match. Creating new entity for asset ${assetId}`);
      
      // Create new entity
      const newEntity: Entity = {
        id: `entity_${assetId.substring(0, 8)}`,
        type,
        embeddings: [embedding],
        thumbnails: [], // To be populated by thumbnail service
        appearances: [], // To be populated by pipeline if needed, or just initialize empty
        assetIds: [assetId],
        groupIds: groupId ? [groupId] : [],
        metadata: {
          name: `Person ${allEntities.length + 1}`,
          tags: []
        }
      };

      return await this.create(newEntity);
    }
  }

  async create(data: Entity): Promise<Entity> {
    await entityCache.set(data);
    autoSaveManager.queueEntityUpdate(data);
    entityEventBus.emit('ENTITY_CREATED', data);
    return data;
  }

  async update(entity: Entity): Promise<Entity> {
    await entityCache.set(entity);
    autoSaveManager.queueEntityUpdate(entity);
    entityEventBus.emit('ENTITY_UPDATED', entity);
    return entity;
  }

  async delete(id: string): Promise<void> {
    const entity = await this.get(id);
    if (entity) {
      await entityCache.delete(id);
      autoSaveManager.removePendingEntity(id);
      await systemDB.deleteEntity(id);
      entityEventBus.emit('ENTITY_DELETED', { id });
    }
  }
}

export const entityManager = new EntityManager();
