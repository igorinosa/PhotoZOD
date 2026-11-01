import { RuleNode } from './types';

export interface SmartCollection {
  id: string;
  name: string;
  rule: RuleNode;
  readonly: true;
}

function nowMinusDays(days: number) {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

export const SMART_COLLECTIONS: SmartCollection[] = [
  {
    id: "trash",
    name: "Trash",
    readonly: true,
    rule: {
      type: "condition",
      field: "isTrashed",
      operator: "=",
      value: true
    }
  },
  {
    id: "picked",
    name: "Picked Photos",
    readonly: true,
    rule: {
      type: "condition",
      field: "pickStatus",
      operator: "=",
      value: "picked"
    }
  },
  {
    id: "rejected",
    name: "Rejected Photos",
    readonly: true,
    rule: {
      type: "condition",
      field: "pickStatus",
      operator: "=",
      value: "rejected"
    }
  },
  {
    id: "unflagged",
    name: "Unflagged Photos",
    readonly: true,
    rule: {
      type: "condition",
      field: "pickStatus",
      operator: "=",
      value: "unflagged"
    }
  },
  {
    id: "keep",
    name: "Kept Photos",
    readonly: true,
    rule: {
      type: "condition",
      field: "culling",
      operator: "=",
      value: "keep"
    }
  },
  {
    id: "maybe",
    name: "Maybe",
    readonly: true,
    rule: {
      type: "condition",
      field: "culling",
      operator: "=",
      value: "maybe"
    }
  },
  {
    id: "culling_trash",
    name: "Culling: Trash",
    readonly: true,
    rule: {
      type: "condition",
      field: "culling",
      operator: "=",
      value: "trash"
    }
  },
  {
    id: "untagged",
    name: "Untagged",
    readonly: true,
    rule: {
      type: "condition",
      field: "ai.tags",
      operator: "length=",
      value: 0
    }
  },
  {
    id: "top-rated",
    name: "Top Rated",
    readonly: true,
    rule: {
      type: "condition",
      field: "rating",
      operator: ">=",
      value: 4
    }
  },
  {
    id: "red-tagged",
    name: "Red Tagged",
    readonly: true,
    rule: {
      type: "condition",
      field: "colorTag",
      operator: "=",
      value: "red"
    }
  },
  {
    id: "green-tagged",
    name: "Green Tagged",
    readonly: true,
    rule: {
      type: "condition",
      field: "colorTag",
      operator: "=",
      value: "green"
    }
  },
  {
    id: "blue-tagged",
    name: "Blue Tagged",
    readonly: true,
    rule: {
      type: "condition",
      field: "colorTag",
      operator: "=",
      value: "blue"
    }
  },
  {
    id: "duplicates",
    name: "Duplicates",
    readonly: true,
    rule: {
      type: "condition",
      field: "duplicateGroupId",
      operator: "!=",
      value: null
    }
  },
  {
    id: "recent",
    name: "Recently Imported",
    readonly: true,
    rule: {
      type: "condition",
      field: "importedAt",
      operator: ">",
      value: nowMinusDays(7)
    }
  }
];
