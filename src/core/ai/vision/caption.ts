import { loadModel } from '../models/smolvlm';

export async function generateCaption(image: Blob, assetId?: string): Promise<string> {
  const model = await loadModel();
  return model.describe(image, assetId);
}
