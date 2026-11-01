type EntityEventType = 'ENTITY_UPDATED' | 'ENTITY_CREATED' | 'ENTITY_DELETED' | 'ENTITY_PROPAGATED';

type EntityEventListener = (event: EntityEventType, payload: any) => void;

class EntityEventBus {
  private listeners: Map<EntityEventType, Set<EntityEventListener>> = new Map();

  subscribe(event: EntityEventType, listener: EntityEventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }

  emit(event: EntityEventType, payload: any): void {
    if (this.listeners.has(event)) {
      for (const listener of this.listeners.get(event)!) {
        try {
          listener(event, payload);
        } catch (e) {
          console.error(`[EntityEventBus] Error in listener for ${event}:`, e);
        }
      }
    }
  }
}

export const entityEventBus = new EntityEventBus();
