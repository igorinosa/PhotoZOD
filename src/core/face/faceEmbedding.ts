import * as faceapi from '@vladmandic/face-api';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';

let modelsLoaded = false;

export async function initFaceEmbedder() {
  if (!modelsLoaded) {
    console.log('[Face Embedding] Loading face-api.js models...');
    // Set backend
    try {
      await tf.setBackend('webgl');
    } catch (e) {
      console.warn('[Face Embedding] WebGL backend failed, falling back to CPU', e);
      await tf.setBackend('cpu');
    }
    
    const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
    await Promise.all([
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL)
    ]);
    modelsLoaded = true;
    console.log('[Face Embedding] face-api.js models loaded.');
  }
}

export async function generateEmbedding(faceImage: HTMLCanvasElement): Promise<number[]> {
  console.log('[Face Embedding] Generating embedding for face image...');
  await initFaceEmbedder();
  
  // Compute descriptor for the cropped face
  // We use a small trick: we need to pass the image to computeFaceDescriptor
  // Since it's already cropped, we can just use it as input
  const descriptor = await faceapi.computeFaceDescriptor(faceImage);
  
  if (!descriptor) {
    console.warn('[Face Embedding] Could not generate descriptor for face.');
    return new Array(128).fill(0); // face-api descriptors are 128-d
  }

  // descriptor can be Float32Array or Float32Array[]
  const embedding = Array.isArray(descriptor) 
    ? Array.from(descriptor[0] as any) as number[]
    : Array.from(descriptor as any) as number[];
    
  console.log(`[Face Embedding] Generated embedding of length ${embedding.length}`);
  console.log("Embeddings created: 1");
  return embedding;
}
