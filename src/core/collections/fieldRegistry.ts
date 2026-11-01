import { isNoColor, isUnrated, isUntagged, isNoPeople, isEdited, isBatch } from '../search/derivedEvaluators';

export type FieldDefinition = {
  key: string;
  label: string;
  type: "string" | "number" | "date" | "enum" | "array" | "derived";
  options?: string[]; // For enum types
  evaluator?: (asset: any) => boolean;
};

export const FIELDS: FieldDefinition[] = [
  { key: "culling", label: "Culling Status", type: "enum", options: ["keep", "maybe", "trash", "unrated"] },
  { key: "pickStatus", label: "Pick Flag", type: "enum", options: ["picked", "rejected", "unflagged"] },
  { key: "ai.tags", label: "Tags", type: "array" },
  { key: "colorTag", label: "Color Tag", type: "enum", options: ["red", "green", "blue", "none"] },
  { key: "rating", label: "Star Rating", type: "number" },
  { key: "importedAt", label: "Import Date", type: "date" },
  { key: "qualityScore", label: "Quality Score", type: "number" },
  { key: "fileName", label: "File Name", type: "string" },
  { key: "ai.faces", label: "Faces Detected", type: "array" },
  { key: "duplicateGroupId", label: "Duplicate Group", type: "string" },
  { key: "formatGroup", label: "File Format", type: "enum", options: ["raw", "jpeg", "png", "heic", "other"] },
  { key: "entityIds", label: "Person ID", type: "array" },
  {
    key: "unrated",
    label: "Unrated",
    type: "derived",
    evaluator: isUnrated
  },
  {
    key: "no color",
    label: "No Color",
    type: "derived",
    // CRITICAL RULE:
    // Derived fields MUST use source-of-truth fields only.
    // NEVER use normalized or derived fields (like asset.color).
    evaluator: isNoColor
  },
  {
    key: "no-tags",
    label: "No Tags",
    type: "derived",
    evaluator: isUntagged
  },
  {
    key: "no-people",
    label: "No People",
    type: "derived",
    evaluator: isNoPeople
  },
  {
    key: "edited",
    label: "Edited",
    type: "derived",
    evaluator: isEdited
  },
  {
    key: "batch",
    label: "Batch",
    type: "derived",
    evaluator: isBatch
  }
];
