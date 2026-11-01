/**
 * STAGE 0D - DETERMINISTIC SEED ASSIGNMENT
 * 
 * Generates a deterministic seed from a string (e.g., groupId or assetId).
 * This ensures that the same image always gets the same "random" treatment.
 */
export async function hashString(str: string): Promise<number> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  
  // Use first 4 bytes as a 32-bit integer
  const view = new DataView(new Uint8Array(hashArray.slice(0, 4)).buffer);
  return view.getUint32(0);
}
