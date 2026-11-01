import { Operation } from './compiler';
import { getFeature } from '../system/featureGuard';

export function route(op: Operation): { engine: string, method: string } {
  const type = op.type; // e.g., "Metadata.Date.shift"
  
  try {
    const feature = getFeature(type);
    return { engine: feature.engine.name, method: feature.engine.method };
  } catch (err) {
    throw new Error(`Unknown operation type: ${op.type}`);
  }
}
