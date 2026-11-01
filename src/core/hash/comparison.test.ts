import { compareImages } from "./comparison";
import { ImageHashes } from "./multiHash";

describe("compareImages", () => {
  it("Test 1 — Exact duplicate", () => {
    const h1: ImageHashes = { phash: "0".repeat(64), dhash: "0".repeat(64), whash: "0".repeat(64) };
    const h2: ImageHashes = { phash: "0".repeat(64), dhash: "0".repeat(64), whash: "0".repeat(64) };
    const result = compareImages({ hashes: h1 }, { hashes: h2 });
    expect(result.isDuplicate).toBe(true);
  });

  it("Test 2 — Slight edit", () => {
    const h1: ImageHashes = { phash: "0".repeat(64), dhash: "0".repeat(64), whash: "0".repeat(64) };
    const h2: ImageHashes = { phash: "1".repeat(2) + "0".repeat(62), dhash: "1".repeat(2) + "0".repeat(62), whash: "1".repeat(2) + "0".repeat(62) };
    const result = compareImages({ hashes: h1 }, { hashes: h2 });
    expect(result.isDuplicate).toBe(true);
  });

  it("Test 3 — Different image", () => {
    const h1: ImageHashes = { phash: "0".repeat(64), dhash: "0".repeat(64), whash: "0".repeat(64) };
    const h2: ImageHashes = { phash: "1".repeat(64), dhash: "1".repeat(64), whash: "1".repeat(64) };
    const result = compareImages({ hashes: h1 }, { hashes: h2 });
    expect(result.isDuplicate).toBe(false);
  });

  it("Test 4 — Edge case (Only 1 hash matches)", () => {
    const h1: ImageHashes = { phash: "0".repeat(64), dhash: "0".repeat(64), whash: "0".repeat(64) };
    const h2: ImageHashes = { phash: "0".repeat(64), dhash: "1".repeat(64), whash: "1".repeat(64) };
    const result = compareImages({ hashes: h1 }, { hashes: h2 });
    expect(result.isDuplicate).toBe(false);
  });
});
