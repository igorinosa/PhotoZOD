// Entity Contract
// Version: 1.0.0
export interface EntityInput {
  assetId: string;
  detectionData: any; // Define detection data structure (face, body, etc.)
}

export interface EntityOutput {
  entityId: string;
}

// Rules:
// 1. same assetId -> same entity reference
// 2. entity must NOT be created from file path
// 3. entity must persist across sessions
