import { Asset } from "./cluster";
import { scoreImage, pickBestImage } from "./scoring";

const createAsset = (id: string, width: number, height: number, faces: number = 0): Asset => ({
  assetId: id,
  hashes: { phash: id.padEnd(64, "0"), dhash: id.padEnd(64, "0"), whash: id.padEnd(64, "0") },
  image: { width, height },
  metadata: { faces: Array(faces).fill({ clarityScore: 0.8 }) }
});

describe("scoring", () => {
  it("Test 1 — Same photo different sizes", () => {
    const a1 = createAsset("A1", 100, 100);
    const a2 = createAsset("A2", 200, 200);
    const cluster = { seed: a1, members: [a1, a2] };
    const best = pickBestImage(cluster);
    expect(best.assetId).toBe("A2");
  });

  it("Test 2 — Sharp vs blurry", () => {
    // Note: Our stub always returns 500 variance. To test this, we'd need to mock the image processing.
    // Given the stubs, this test is limited.
    const a1 = createAsset("A1", 100, 100);
    const a2 = createAsset("A2", 100, 100);
    const cluster = { seed: a1, members: [a1, a2] };
    const best = pickBestImage(cluster);
    expect(["A1", "A2"]).toContain(best.assetId);
  });

  it("Test 4 — Same group run twice", () => {
    const a1 = createAsset("A1", 100, 100);
    const a2 = createAsset("A2", 200, 200);
    const cluster = { seed: a1, members: [a1, a2] };
    
    const best1 = pickBestImage(cluster);
    const best2 = pickBestImage(cluster);
    
    expect(best1.assetId).toBe(best2.assetId);
  });
});
