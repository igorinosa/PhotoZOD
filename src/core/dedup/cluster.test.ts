import { buildClusters, Asset } from "./cluster";
import { ImageHashes } from "../hash/multiHash";

const createAsset = (id: string): Asset => ({
  assetId: id,
  hashes: { phash: id.padEnd(64, "0"), dhash: id.padEnd(64, "0"), whash: id.padEnd(64, "0") },
  image: { width: 100, height: 100 },
  metadata: { faces: [] }
});

describe("buildClusters", () => {
  it("Test 1 — Exact duplicates", () => {
    const assets = [createAsset("A"), createAsset("A"), createAsset("A")];
    const clusters = buildClusters(assets);
    expect(clusters.length).toBe(1);
    expect(clusters[0].members.length).toBe(3);
  });

  it("Test 2 — Near duplicates", () => {
    const assets = [
      createAsset("A"), 
      createAsset("A1"), // Similar to A
      createAsset("A2")  // Similar to A
    ];
    const clusters = buildClusters(assets);
    expect(clusters.length).toBe(1);
    expect(clusters[0].members.length).toBe(3);
  });

  it("Test 3 — Chain case (CRITICAL)", () => {
    // A ~ B, B ~ C, A NOT ~ C
    // To simulate this, we need hashes that are close to each other.
    // A: 000...
    // B: 000... + small change
    // C: 000... + small change from B, but large from A
    const A = { assetId: "A", hashes: { phash: "0".repeat(64), dhash: "0".repeat(64), whash: "0".repeat(64) }, image: { width: 100, height: 100 }, metadata: { faces: [] } };
    const B = { assetId: "B", hashes: { phash: "1".repeat(5) + "0".repeat(59), dhash: "1".repeat(5) + "0".repeat(59), whash: "1".repeat(5) + "0".repeat(59) }, image: { width: 100, height: 100 }, metadata: { faces: [] } };
    const C = { assetId: "C", hashes: { phash: "1".repeat(15) + "0".repeat(49), dhash: "1".repeat(15) + "0".repeat(49), whash: "1".repeat(15) + "0".repeat(49) }, image: { width: 100, height: 100 }, metadata: { faces: [] } };
    
    const assets = [A, B, C];
    const clusters = buildClusters(assets);
    
    // A and B should be a cluster. C is not similar to A, so it shouldn't be in the cluster.
    // C is alone, so it should be removed.
    expect(clusters.length).toBe(1);
    expect(clusters[0].members.map(m => m.assetId)).toContain("A");
    expect(clusters[0].members.map(m => m.assetId)).toContain("B");
    expect(clusters[0].members.map(m => m.assetId)).not.toContain("C");
  });

  it("Test 4 — Mixed dataset", () => {
    const assets = [
      createAsset("A"), createAsset("A1"),
      createAsset("B"), createAsset("B1"),
      createAsset("C"), createAsset("C1"),
      createAsset("D"), createAsset("D1"),
      createAsset("E"), createAsset("E1")
    ];
    const clusters = buildClusters(assets);
    expect(clusters.length).toBe(5);
  });
});
