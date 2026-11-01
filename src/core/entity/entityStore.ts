export interface Entity {
  id: string;
  type: 'person' | 'object' | 'location' | 'event';
  name: string;
  assetIds: string[];
  metadata: Record<string, any>;
}

export class EntityStore {
  private entities: Map<string, Entity> = new Map();

  public add(entity: Entity) {
    this.entities.set(entity.id, entity);
  }

  public get(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  public getAll(): Entity[] {
    return Array.from(this.entities.values());
  }

  public remove(id: string) {
    this.entities.delete(id);
  }

  public clear() {
    this.entities.clear();
  }
}

export const entityStore = new EntityStore();
