import { Operation } from '../photocode/compiler';

export interface Snapshot {
  imageHash: string;
  ops: string;
  time: number;
}

export function createSnapshot(imageId: string, ops: Operation[]): Snapshot {
  return {
    imageHash: imageId,
    ops: JSON.stringify(ops),
    time: Date.now()
  };
}
