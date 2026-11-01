import { Entity } from './schema';
import { entityManager } from './entityManager';
import { recomputeEntityGraph } from './recompute';

export interface EntityVersion {
  entityId: string;
  version: number;
  timestamp: number;
  action: string;
  snapshot: Entity;
}

class VersioningSystem {
  private versions: Map<string, EntityVersion[]> = new Map();

  async trackVersion(entity: Entity, action: string): Promise<void> {
    const currentVersions = this.versions.get(entity.id) || [];
    const nextVersion = currentVersions.length + 1;
    
    const versionRecord: EntityVersion = {
      entityId: entity.id,
      version: nextVersion,
      timestamp: Date.now(),
      action,
      snapshot: JSON.parse(JSON.stringify(entity)) // deep copy
    };

    currentVersions.push(versionRecord);
    this.versions.set(entity.id, currentVersions);
  }

  async getVersions(entityId: string): Promise<EntityVersion[]> {
    return this.versions.get(entityId) || [];
  }

  async getVersion(entityId: string, version: number): Promise<EntityVersion | undefined> {
    const versions = this.versions.get(entityId);
    if (!versions) return undefined;
    return versions.find(v => v.version === version);
  }
}

export const versioningSystem = new VersioningSystem();

export async function trackVersion(entity: Entity, action: string): Promise<void> {
  await versioningSystem.trackVersion(entity, action);
}

export async function revertEntity(entityId: string, version: number): Promise<Entity | undefined> {
  const v = await versioningSystem.getVersion(entityId, version);
  if (!v) return undefined;

  // Restore snapshot
  await entityManager.update(v.snapshot);

  // Track the revert action
  await trackVersion(v.snapshot, `revert_to_${version}`);

  // Recompute
  await recomputeEntityGraph(entityId);

  return await entityManager.get(entityId);
}
