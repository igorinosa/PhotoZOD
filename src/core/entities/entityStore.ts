import { openDB, IDBPDatabase } from 'idb';
import { PersonEntity } from '../../shared/types';

const DB_NAME = 'dam-entities';
const STORE_NAME = 'person-entities';

class EntityStore {
  private db: Promise<IDBPDatabase>;

  constructor() {
    this.db = openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      },
    });
  }

  async getAll(): Promise<PersonEntity[]> {
    const db = await this.db;
    return db.getAll(STORE_NAME);
  }

  async get(id: string): Promise<PersonEntity | undefined> {
    const db = await this.db;
    return db.get(STORE_NAME, id);
  }

  async set(entity: PersonEntity): Promise<void> {
    const db = await this.db;
    await db.put(STORE_NAME, entity);
  }

  async delete(id: string): Promise<void> {
    const db = await this.db;
    await db.delete(STORE_NAME, id);
  }

  async clear(): Promise<void> {
    const db = await this.db;
    await db.clear(STORE_NAME);
  }
}

export const entityStore = new EntityStore();
