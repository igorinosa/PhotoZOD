import { RuleNode } from '../collections/types';

export type FilterPreset = {
  id: string;
  name: string;
  searchQuery: string | null;
  rule: RuleNode | null;
  collectionId: string | null;
  formatFilter: string[] | null;
  createdAt: number;
  updatedAt: number;
};
