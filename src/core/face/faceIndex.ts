import { ImportedAsset } from '../../shared/types';

class FaceIndexManager {
  // personId -> Set of assetIds
  private personToAssets = new Map<string, Set<string>>();
  // faceId -> assetId
  private faceToAsset = new Map<string, string>();
  // faceId -> personId
  private faceToPerson = new Map<string, string>();
  // assetId -> Set of faceIds
  private assetToFaces = new Map<string, Set<string>>();

  public addFace(face: { id: string, entityId?: string | null }, assetId: string) {
    this.faceToAsset.set(face.id, assetId);
    if (!this.assetToFaces.has(assetId)) {
      this.assetToFaces.set(assetId, new Set());
    }
    this.assetToFaces.get(assetId)!.add(face.id);

    if (face.entityId) {
      this.faceToPerson.set(face.id, face.entityId);
      if (!this.personToAssets.has(face.entityId)) {
        this.personToAssets.set(face.entityId, new Set());
      }
      this.personToAssets.get(face.entityId)!.add(assetId);
    }
  }

  public removeFace(faceId: string) {
    const assetId = this.faceToAsset.get(faceId);
    const personId = this.faceToPerson.get(faceId);

    if (assetId) {
      this.assetToFaces.get(assetId)?.delete(faceId);
      if (this.assetToFaces.get(assetId)?.size === 0) {
        this.assetToFaces.delete(assetId);
      }
    }

    if (personId && assetId) {
      // Check if any other face in this asset belongs to this person
      const otherFacesInAsset = this.assetToFaces.get(assetId);
      let stillHasPerson = false;
      if (otherFacesInAsset) {
        for (const fid of otherFacesInAsset) {
          if (fid !== faceId && this.faceToPerson.get(fid) === personId) {
            stillHasPerson = true;
            break;
          }
        }
      }
      if (!stillHasPerson) {
        this.personToAssets.get(personId)?.delete(assetId);
      }
    }

    this.faceToAsset.delete(faceId);
    this.faceToPerson.delete(faceId);
  }

  public updateFace(face: { id: string, entityId?: string | null }, assetId: string) {
    const oldPersonId = this.faceToPerson.get(face.id);
    const newPersonId = face.entityId;

    if (oldPersonId !== newPersonId) {
      // Remove old mapping
      if (oldPersonId) {
        const otherFacesInAsset = this.assetToFaces.get(assetId);
        let stillHasPerson = false;
        if (otherFacesInAsset) {
          for (const fid of otherFacesInAsset) {
            if (fid !== face.id && this.faceToPerson.get(fid) === oldPersonId) {
              stillHasPerson = true;
              break;
            }
          }
        }
        if (!stillHasPerson) {
          this.personToAssets.get(oldPersonId)?.delete(assetId);
        }
      }

      // Add new mapping
      if (newPersonId) {
        this.faceToPerson.set(face.id, newPersonId);
        if (!this.personToAssets.has(newPersonId)) {
          this.personToAssets.set(newPersonId, new Set());
        }
        this.personToAssets.get(newPersonId)!.add(assetId);
      } else {
        this.faceToPerson.delete(face.id);
      }
    }
  }

  public indexAsset(asset: ImportedAsset) {
    if (!asset.ai?.faces) return;
    this.removeAsset(asset.assetId);
    for (const face of asset.ai.faces) {
      this.addFace(face, asset.assetId);
    }
  }

  public removeAsset(assetId: string) {
    const faces = this.assetToFaces.get(assetId);
    if (faces) {
      const faceIds = Array.from(faces);
      for (const fid of faceIds) {
        this.removeFace(fid);
      }
    }
  }

  public getAssetsForPerson(personId: string): string[] {
    return Array.from(this.personToAssets.get(personId) || []);
  }

  public getAssetForFace(faceId: string): string | undefined {
    return this.faceToAsset.get(faceId);
  }

  public clear() {
    this.personToAssets.clear();
    this.faceToAsset.clear();
    this.faceToPerson.clear();
    this.assetToFaces.clear();
  }
}

export const faceIndex = new FaceIndexManager();
