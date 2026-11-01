export type CullingStatus = "keep" | "maybe" | "trash" | "unrated";
export type ImportStatus = "valid" | "processing" | "failed";
export type FormatGroup = "raw" | "jpeg" | "png" | "heic" | "other";

export type PipelineState = {
  identity: 'done' | 'pending' | 'failed';
  normalized: 'done' | 'pending' | 'failed';
  hashed: 'done' | 'pending' | 'failed';
  grouped: 'done' | 'pending' | 'failed';
  seeded: 'done' | 'pending' | 'failed';
  validated: 'done' | 'pending' | 'failed';
  deduped: 'done' | 'pending' | 'failed';
  entityLinked: 'done' | 'pending' | 'failed';
};

export type ImageHashes = {
  phash: string
  dhash: string
  whash: string
  sha256?: string
}

export type NormalizedImage = {
  data: Uint8ClampedArray
  width: number
  height: number
}

export type Face = {
  id: string;
  bbox: { x: number; y: number; width: number; height: number };
  landmarks: number[][];
  embedding: number[];
  confidence: number;
  entityId: string | null;
  isIgnored?: boolean;
};

export type PersonEntity = {
  id: string;
  name: string | null;
  faceIds: string[];
  embedding: number[];
  createdAt: number;
  updatedAt: number;
  coverFaceId?: string;
  isLocked?: boolean;
};

export type Rect = { x: number; y: number; width: number; height: number };

export type EditOperation =
  | { type: 'exposure'; value: number }
  | { type: 'contrast'; value: number }
  | { type: 'crop'; rect: Rect }
  | { type: 'rotate'; angle: number }
  | { type: 'filter'; id: string };

export type Version = {
  id: string;
  assetId: string;
  parentVersionId: string | null;
  delta: EditOperation[];
  createdAt: number;
  name?: string;
  isSnapshot: boolean;
  isCheckpoint?: boolean;
  checkpointStack?: EditOperation[];
};

export type BatchEdit = {
  id: string;
  name?: string;
  operations: EditOperation[];
  createdAt: number;
  updatedAt: number;
  assetIds: string[];
};

export type Asset = {
  assetId: string; // The fingerprint (SHA-256) (Stage 0A)
  path: string; // Primary file path
  duplicatePaths: string[]; // Other paths where this same file was found
  
  // VERSIONING (Stage 7Q)
  baseVersionId?: string;
  activeVersionId?: string;
  batchIds?: string[];          // NEW (Stage 7Q.1)
  localDeltas?: EditOperation[]; // NEW (Stage 7Q.1)

  // FILE INFO
  fileName: string;
  format: string; // original extension (cr2, jpg, png, heic…)
  formatGroup: FormatGroup;
  size: number;
  fileSize: number; // bytes (Stage 7O)
  width?: number;
  height?: number;

  // BACKUP (Stage 7O)
  backupStatus: {
    local: boolean;
    external: boolean;
    cloud: boolean;
  };
  lastBackupAt?: number;

  // METADATA
  createdAt: number;
  updatedAt: number;
  importedAt: number;

  exif: {
    iso?: number;
    shutter?: number | string;
    aperture?: number;
    camera?: string;
    lens?: string;
    orientation?: number;
    captureTime?: number;
    originalCaptureTime?: number;
    
    Artist?: string;
    Copyright?: string;
    Byline?: string;
    CopyrightNotice?: string;
    "dc:creator"?: string;
    "dc:rights"?: string;
    "dc:creatorContactInfo"?: {
      email?: string;
      url?: string;
    };
  };

  // STAGE 5 OUTPUT
  description?: string;

  // STAGE 6 OUTPUT
  entityIds: string[];

  // CULLING
  culling: "keep" | "maybe" | "trash" | "unrated";
  rating: 1 | 2 | 3 | 4 | 5 | null;
  colorTag: string | null;
  pickStatus: "picked" | "rejected" | "unflagged";
  photocode?: string;
  isTrashed?: boolean;
  trashedAt?: number | null;

  // AI SIGNALS
  sharpnessScore?: number;
  aestheticScore?: number;
  aiScore?: number;
  brightnessScore?: number;
  qualityScore: number;
  closedEyesScore?: number;
  blurScore?: number;
  poorLightScore?: number;

  ai: {
    faces: Face[];
    sceneType: string;
    tags: string[];
  };

  // RELATIONSHIPS
  burstId?: string;
  stackId?: string;

  // STAGE 0B - VISUAL IDENTITY
  visualHash?: string;
  hashes?: ImageHashes;
  groupId?: string;
  duplicateGroupId: string | null;

  // STAGE 0C - NORMALIZATION
  normalizedBuffer?: Float32Array;

  // STAGE 0D - SEED
  seed?: string;

  // STAGE 0E - IMPORT CONTRACT
  importStatus: ImportStatus;
  importError?: string;

  // STAGE 0I - PIPELINE ORCHESTRATOR
  pipelineState: PipelineState;
  pipelineVersion: string;
};

export interface ImportedAsset extends Asset {
  file: File;
  metadata: any; // ImageMetadata
  thumbnailUrl: string;
  previewUrl: string;
  previewBlob: Blob;
}

export interface ImportProgress {
  fileName: string;
  status: string;
  progress: number; // 0 to 100
}

export interface ProcessOptions {
  store?: any; // AssetStore
  skipAI?: boolean;
  skipPersistence?: boolean;
}

export type PhotoGroup = {
  groupId: string;
  assetIds: string[];
  representativeAssetId: string;
};
