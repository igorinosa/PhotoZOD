export async function detectFaces(image: any): Promise<Array<{ bbox: any; landmarks: number[] }>> {
  // In a real implementation, this would call MediaPipe
  // For now, we return an empty array to be safe and deterministic.
  return [];
}
