import { generateFingerprint } from './fingerprint';

/**
 * Verification test for generateFingerprint.
 * Ensures that same content produces same fingerprint.
 */
export async function verifyFingerprint(): Promise<boolean> {
  const content = new Blob(['PhotoZOD-Test-Content'], { type: 'text/plain' });
  const contentCopy = new Blob(['PhotoZOD-Test-Content'], { type: 'text/plain' });
  const differentContent = new Blob(['PhotoZOD-Different-Content'], { type: 'text/plain' });

  const hash1 = await generateFingerprint(content);
  const hash2 = await generateFingerprint(contentCopy);
  const hash3 = await generateFingerprint(differentContent);

  const sameContentMatch = hash1 === hash2;
  const differentContentDiffer = hash1 !== hash3;

  console.log(`[Identity Test] Same content match: ${sameContentMatch}`);
  console.log(`[Identity Test] Different content differ: ${differentContentDiffer}`);

  return sameContentMatch && differentContentDiffer;
}
