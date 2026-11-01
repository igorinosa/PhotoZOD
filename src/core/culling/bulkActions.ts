import { CullState } from "./types";
import { Cluster } from "../dedup/cluster";
import { pickBestImage } from "../dedup/scoring";
import { assetStore } from "../dam/assetStore";

export type AssetState = {
  assetId: string
  cullState: CullState
}

// Placeholder for state store
const stateStore = new Map<string, CullState>();
const historyStack: Map<string, CullState>[] = [];
let isTransaction = false;
let transactionState: Map<string, CullState> | null = null;

export function updateState(assetId: string, state: CullState) {
  stateStore.set(assetId, state);
  assetStore.update(assetId, { culling: state });
}

export function getState(assetId: string): CullState | undefined {
  return stateStore.get(assetId);
}

export function beginTransaction() {
  isTransaction = true;
  transactionState = new Map(stateStore);
}

export function commitTransaction() {
  historyStack.push(new Map(transactionState!));
  isTransaction = false;
  transactionState = null;
}

export function undo() {
  const prev = historyStack.pop();
  if (prev) {
    stateStore.clear();
    for (const [key, value] of prev) {
      stateStore.set(key, value);
      assetStore.update(key, { culling: value });
    }
  }
}

export function applyCullState(
  assetIds: string[],
  state: CullState
) {
  for (const id of assetIds) {
    updateState(id, state)
  }
}

export function keepBestPerCluster(clusters: Cluster[]) {
  for (const cluster of clusters) {
    const best = pickBestImage(cluster)

    const keepIds = [best.assetId]

    const trashIds = cluster.members
      .filter(a => a.assetId !== best.assetId)
      .map(a => a.assetId)

    applyCullState(keepIds, "keep")
    applyCullState(trashIds, "trash")
  }
}

export function keepAll(clusters: Cluster[]) {
  for (const cluster of clusters) {
    const ids = cluster.members.map(a => a.assetId)
    applyCullState(ids, "keep")
  }
}

export function sendClusterToMaybe(cluster: Cluster) {
  const ids = cluster.members.map(a => a.assetId)
  applyCullState(ids, "maybe")
}

export function trashAllDuplicates(clusters: Cluster[]) {
  for (const cluster of clusters) {
    const ids = cluster.members.map(a => a.assetId)
    applyCullState(ids, "trash")
  }
}

export function batchUpdateState(updates: AssetState[]) {
  for (const update of updates) {
    updateState(update.assetId, update.cullState);
  }
}

export function filterAssets(state: CullState): string[] {
  const result: string[] = [];
  for (const [id, s] of stateStore) {
    if (s === state) {
      result.push(id);
    }
  }
  return result;
}

export function finalizeCulling() {
  // Logic to archive or delete trash
  for (const [id, state] of stateStore) {
    if (state === "trash") {
      console.log(`[Culling] Finalizing: Deleting asset ${id}`);
      stateStore.delete(id);
      assetStore.remove(id);
    }
  }
}
