export class MaskResolver {
  async getMask(target: string, imageId: string): Promise<Float32Array> {
    console.log(`[MaskResolver] Resolving mask for ${target} on ${imageId}`);
    // Mock mask: 1.0 for target, 0.0 for rest
    return new Float32Array(100).fill(1.0);
  }
}

export const maskResolver = new MaskResolver();
