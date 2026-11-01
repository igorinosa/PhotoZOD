export type EntityType = 'person' | 'object';

export interface Appearance {
  assetId: string;
  groupId?: string;
  faceBox: { x: number; y: number; w: number; h: number };
}

export interface Entity {
  id: string; // entityId
  type: EntityType;
  embeddings: Float32Array[]; // Identity DNA
  thumbnails: string[];
  appearances: Appearance[]; // Detection events
  assetIds: string[]; // Direct links to assets
  groupIds: string[]; // Links to groups (Stage 0B)
  metadata: {
    name?: string;
    tags?: string[];
    [key: string]: any;
  };
  confidence?: number;
}
