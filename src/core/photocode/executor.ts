import { Operation } from './compiler';
import { route } from './router';
import { maskResolver } from './maskResolver';
import { ConditionEngine } from './conditionRunner';
import { generateSeed } from './seed';
import { ImageMetadata } from '../engines/metadata/exif';
import { guardOperation } from './opGuard';
import { applySeed } from './seedController';

// Simple deterministic random number generator based on a string seed
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}

// Mock engines for now
const ImageEngine = {
  adjustExposure: async (buffer: Float32Array, params: any, seed: string, metadata: ImageMetadata) => {
    if (!seed) throw new Error("[ImageEngine] Missing seed for adjustExposure");
    console.log(`[ImageEngine] adjustExposure by ${params.value} (seed: ${seed})`);
    const amount = parseFloat(params.value);
    const factor = Math.pow(2, amount);
    for (let i = 0; i < buffer.length; i += 4) {
      buffer[i] *= factor;
      buffer[i+1] *= factor;
      buffer[i+2] *= factor;
    }
    return buffer;
  },
  adjustContrast: async (buffer: Float32Array, params: any, seed: string, metadata: ImageMetadata) => {
    if (!seed) throw new Error("[ImageEngine] Missing seed for adjustContrast");
    console.log(`[ImageEngine] adjustContrast by ${params.value} (seed: ${seed})`);
    const amount = parseFloat(params.value);
    const factor = (259 * (amount * 255 + 255)) / (255 * (259 - amount * 255));
    for (let i = 0; i < buffer.length; i += 4) {
      buffer[i] = factor * (buffer[i] - 0.5) + 0.5;
      buffer[i+1] = factor * (buffer[i+1] - 0.5) + 0.5;
      buffer[i+2] = factor * (buffer[i+2] - 0.5) + 0.5;
    }
    return buffer;
  },
  adjustSaturation: async (buffer: Float32Array, params: any, seed: string, metadata: ImageMetadata) => {
    if (!seed) throw new Error("[ImageEngine] Missing seed for adjustSaturation");
    console.log(`[ImageEngine] adjustSaturation by ${params.value} (seed: ${seed})`);
    const amount = parseFloat(params.value);
    for (let i = 0; i < buffer.length; i += 4) {
      const r = buffer[i];
      const g = buffer[i+1];
      const b = buffer[i+2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      buffer[i] = lum + (r - lum) * (1 + amount);
      buffer[i+1] = lum + (g - lum) * (1 + amount);
      buffer[i+2] = lum + (b - lum) * (1 + amount);
    }
    return buffer;
  },
  adjustTemperature: async (buffer: Float32Array, params: any, seed: string, metadata: ImageMetadata) => {
    if (!seed) throw new Error("[ImageEngine] Missing seed for adjustTemperature");
    console.log(`[ImageEngine] adjustTemperature by ${params.value} (seed: ${seed})`);
    const amount = parseFloat(params.value);
    for (let i = 0; i < buffer.length; i += 4) {
      buffer[i] += amount * 0.1;
      buffer[i+2] -= amount * 0.1;
    }
    return buffer;
  },
  adjustTint: async (buffer: Float32Array, params: any, seed: string, metadata: ImageMetadata) => {
    if (!seed) throw new Error("[ImageEngine] Missing seed for adjustTint");
    console.log(`[ImageEngine] adjustTint by ${params.value} (seed: ${seed})`);
    const amount = parseFloat(params.value);
    for (let i = 0; i < buffer.length; i += 4) {
      buffer[i+1] += amount * 0.1;
    }
    return buffer;
  }
};

const RetouchEngine = {
  skinSmooth: async (buffer: Float32Array, mask: Float32Array, params: any, seed: string, metadata: ImageMetadata) => {
    if (!seed) throw new Error("[RetouchEngine] Missing seed for skinSmooth");
    // Simulate deterministic randomness: slight variation based on seed
    const variation = seededRandom(seed) * 0.01;
    console.log(`[RetouchEngine] skinSmooth by ${params.value} (variation: ${variation.toFixed(4)}) with mask (seed: ${seed})`);
    return buffer;
  },
  noiseReduction: async (buffer: Float32Array, params: any, seed: string, metadata: ImageMetadata) => {
    if (!seed) throw new Error("[RetouchEngine] Missing seed for noiseReduction");
    const variation = seededRandom(seed) * 0.01;
    console.log(`[RetouchEngine] noiseReduction by ${params.value} (variation: ${variation.toFixed(4)}) (seed: ${seed})`);
    return buffer;
  }
};

import { applyDateShift, setAbsoluteDate } from '../metadata/dateEngine';
import { injectCopyright, injectCopyrightField } from '../metadata/copyrightEngine';
import { scrubMetadata } from '../metadata/scrubEngine';
import { parseTimeShift } from '../metadata/timeParser';

// ... (keep seededRandom)

const DateEngine = {
  applyDateShift: async (buffer: Float32Array, params: any, seed: string, metadata: ImageMetadata) => {
    console.log(`[DateEngine] applyDateShift by ${params.value}`);
    const shiftMs = parseTimeShift(params.value.toString());
    const updated = applyDateShift(metadata, shiftMs);
    // Update the metadata object in place (or the caller should handle it)
    Object.assign(metadata, updated);
    return buffer; // Pixel buffer unchanged
  },
  setAbsoluteDate: async (buffer: Float32Array, params: any, seed: string, metadata: ImageMetadata) => {
    console.log(`[DateEngine] setAbsoluteDate to ${params.value}`);
    const updated = setAbsoluteDate(metadata, params.value);
    Object.assign(metadata, updated);
    return buffer;
  }
};

const MetadataEngine = {
  injectCopyright: async (buffer: Float32Array, params: any, seed: string, metadata: ImageMetadata) => {
    console.log(`[MetadataEngine] injectCopyright with ${JSON.stringify(params)}`);
    const updated = injectCopyright(metadata, params);
    Object.assign(metadata, updated);
    return buffer;
  },
  injectCopyrightAuthor: async (buffer: Float32Array, params: any, seed: string, metadata: ImageMetadata) => {
    const updated = injectCopyrightField(metadata, 'author', params.value);
    Object.assign(metadata, updated);
    return buffer;
  },
  injectCopyrightNotice: async (buffer: Float32Array, params: any, seed: string, metadata: ImageMetadata) => {
    const updated = injectCopyrightField(metadata, 'notice', params.value);
    Object.assign(metadata, updated);
    return buffer;
  },
  injectCopyrightEmail: async (buffer: Float32Array, params: any, seed: string, metadata: ImageMetadata) => {
    const updated = injectCopyrightField(metadata, 'email', params.value);
    Object.assign(metadata, updated);
    return buffer;
  },
  injectCopyrightWebsite: async (buffer: Float32Array, params: any, seed: string, metadata: ImageMetadata) => {
    const updated = injectCopyrightField(metadata, 'website', params.value);
    Object.assign(metadata, updated);
    return buffer;
  },
  scrub: async (buffer: Float32Array, params: any, seed: string, metadata: ImageMetadata) => {
    console.log(`[MetadataEngine] scrub with mode ${params.mode}`);
    const updated = scrubMetadata(metadata, params);
    // Clear existing keys that were removed
    for (const key in metadata) {
      if (!(key in updated)) {
        delete (metadata as any)[key];
      }
    }
    Object.assign(metadata, updated);
    return buffer;
  }
};

const ENGINES: Record<string, any> = {
  ImageEngine,
  RetouchEngine,
  DateEngine,
  MetadataEngine
};

export class Executor {
  async executeMetadata(
    operations: Operation[],
    metadata: ImageMetadata,
    imageId: string
  ): Promise<ImageMetadata> {
    const updatedMetadata = { ...metadata };
    
    // Filter operations applicable to this image
    const applicableOps = operations.filter(op => {
      if (op.assetId && op.assetId !== imageId) return false;
      // Note: We don't evaluate conditions here yet, or maybe we should?
      // For metadata fix, usually we want to apply to all selected.
      return true;
    });

    // Deduplicate
    const dedupedOps = new Map<string, Operation>();
    for (const op of applicableOps) {
      const key = `${op.scope}_${op.type}_${op.target || 'global'}`;
      dedupedOps.set(key, op);
    }

    const sortedOps = Array.from(dedupedOps.values()).sort((a, b) => a.priority - b.priority);

    for (let rawOp of sortedOps) {
      const op = guardOperation(rawOp);
      const { engine, method } = route(op);
      const engineInstance = ENGINES[engine];

      if (engineInstance && engineInstance[method]) {
        // We pass a dummy buffer because metadata engines don't use it
        await engineInstance[method](new Float32Array(0), op.params, "metadata-only", updatedMetadata);
      }
    }

    return updatedMetadata;
  }

  async execute(
    operations: Operation[], 
    buffer: Float32Array, 
    metadata: ImageMetadata, 
    imageId: string
  ): Promise<Float32Array> {
    let currentBuffer = new Float32Array(buffer); // Copy buffer

    // Filter operations applicable to this image and whose conditions are met
    const applicableOps = operations.filter(op => {
      if (op.assetId && op.assetId !== imageId) return false;
      if (op.condition && !ConditionEngine.evaluate(op.condition, metadata)) {
        console.log(`[Executor] Skipping op ${op.id} due to condition`);
        return false;
      }
      return true;
    });

    // Deduplicate: Last write wins within same scope and type (and target if applicable)
    const dedupedOps = new Map<string, Operation>();
    for (const op of applicableOps) {
      const key = `${op.scope}_${op.type}_${op.target || 'global'}`;
      dedupedOps.set(key, op);
    }

    // Sort by priority ascending
    const sortedOps = Array.from(dedupedOps.values()).sort((a, b) => a.priority - b.priority);

    for (let rawOp of sortedOps) {
      // 0. Guard and seed
      const op = applySeed(guardOperation(rawOp), imageId);

      // 2. Resolve seed (using the one from applySeed)
      const seed = generateSeed(imageId, op.id, op.seed);
      console.log(`[Executor] Running op ${op.id} with seed ${seed}`);

      // 3. Resolve route
      const { engine, method } = route(op);
      const engineInstance = ENGINES[engine];

      if (!engineInstance || !engineInstance[method]) {
        throw new Error(`Engine method ${engine}.${method} not found`);
      }

      // 4. Resolve mask
      let mask: Float32Array | undefined;
      if (op.target) {
        mask = await maskResolver.getMask(op.target, imageId);
      }

      // 5. Execute
      if (mask) {
        currentBuffer = await engineInstance[method](currentBuffer, mask, op.params, seed, metadata);
      } else {
        currentBuffer = await engineInstance[method](currentBuffer, op.params, seed, metadata);
      }
    }

    return currentBuffer;
  }
}

export const executor = new Executor();
