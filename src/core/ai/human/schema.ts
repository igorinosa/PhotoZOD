export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FaceData {
  bbox: BBox;
  confidence: number;
}

export interface Landmarks {
  eyes: { x: number; y: number }[];
  leftEye?: { x: number; y: number }[]; // 6 points for EAR
  rightEye?: { x: number; y: number }[]; // 6 points for EAR
  nose: { x: number; y: number }[];
  mouth: { x: number; y: number }[];
  jaw: { x: number; y: number }[];
  faceRegion: BBox;
}

export interface PoseKeypoints {
  head: { x: number; y: number };
  shoulders: { left: { x: number; y: number }, right: { x: number; y: number } };
  elbows: { left: { x: number; y: number }, right: { x: number; y: number } };
  knees: { left: { x: number; y: number }, right: { x: number; y: number } };
}

export interface PoseData {
  keypoints: PoseKeypoints;
}

export interface BodyData {
  vertices: number[];
  joints: number[];
  orientation: number[];
}

export interface HumanData {
  id: string;
  face: FaceData;
  landmarks: Landmarks;
  embedding: Float32Array;
  pose: PoseData;
  body: BodyData;
  blink?: {
    leftEAR: number;
    rightEAR: number;
    isBlinking: boolean;
  };
}

export interface ImageHumanStructure {
  assetId: string;
  humans: HumanData[];
  entityIds?: string[];
}
