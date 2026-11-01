import { generateFingerprint } from '../../pipeline/identity/fingerprint';

export async function verifyFile(file: File, expectedChecksum: string): Promise<boolean> {
  try {
    const actualChecksum = await generateFingerprint(file);
    return actualChecksum === expectedChecksum;
  } catch (error) {
    console.error('Error verifying file integrity:', error);
    return false;
  }
}
