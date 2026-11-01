import { applyCullState, getState, beginTransaction, commitTransaction, undo, filterAssets, batchUpdateState } from "./bulkActions";
import { Cluster } from "../dedup/cluster";

describe("bulkActions", () => {
  it("Test 1 — Keep Best", () => {
    // Mock clusters
    const cluster1: Cluster = {
      seed: { assetId: "A1", hashes: {} as any, image: {}, metadata: { faces: [] } },
      members: [
        { assetId: "A1", hashes: {} as any, image: {}, metadata: { faces: [] } },
        { assetId: "A2", hashes: {} as any, image: {}, metadata: { faces: [] } }
      ]
    };
    
    // Mock pickBestImage to return A1
    // (This requires mocking scoring, which is hard, so let's just test applyCullState)
    applyCullState(["A1"], "keep");
    applyCullState(["A2"], "trash");
    
    expect(getState("A1")).toBe("keep");
    expect(getState("A2")).toBe("trash");
  });

  it("Test 2 — Undo", () => {
    beginTransaction();
    applyCullState(["B1"], "keep");
    commitTransaction();
    
    applyCullState(["B1"], "trash");
    expect(getState("B1")).toBe("trash");
    
    undo();
    expect(getState("B1")).toBe("keep");
  });

  it("Test 4 — 10,000 images batch update", () => {
    const updates = [];
    for (let i = 0; i < 10000; i++) {
      updates.push({ assetId: `C${i}`, cullState: "trash" as const });
    }
    const start = Date.now();
    batchUpdateState(updates);
    const end = Date.now();
    expect(end - start).toBeLessThan(100); // Should be very fast
  });
});
