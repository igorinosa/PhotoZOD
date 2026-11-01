export type { ImageHashes, NormalizedImage } from "../../shared/types";
import { computePHash } from "./phash";
import { computeDHash } from "./dhash";
import { computeWHash } from "./whash";
import { ImageHashes, NormalizedImage } from "../../shared/types";

export async function computeMultiHash(
  image: NormalizedImage
): Promise<ImageHashes> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', image.data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const sha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const phash = computePHash(image);
  const dhash = computeDHash(image);
  const whash = computeWHash(image);

  const hashes = { phash, dhash, whash, sha256 };
  console.log(`[MultiHash] Computed hashes:`, hashes);
  return hashes;
}
