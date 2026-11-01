import { Face } from '../../shared/types';
import { assetStore } from '../dam/assetStore';
import { faceIndex } from './faceIndex';

export class FaceStore {
  getFacesByPerson(personId: string): Face[] {
    const assetIds = faceIndex.getAssetsForPerson(personId);
    const faces: Face[] = [];
    for (const assetId of assetIds) {
      const asset = assetStore.get(assetId);
      if (asset?.ai?.faces) {
        for (const face of asset.ai.faces) {
          if (face.entityId === personId) {
            faces.push(face);
          }
        }
      }
    }
    return faces;
  }
}

export const faceStore = new FaceStore();
