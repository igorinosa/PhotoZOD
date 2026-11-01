import { getSemantic } from '../pipeline/cache/semanticStore';
import { SemanticData } from '../ai/vision/semanticBuilder';

export async function getZodContext(assetId: string): Promise<SemanticData | undefined> {
  return await getSemantic(assetId);
}
