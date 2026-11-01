import { GoogleGenAI } from '@google/genai';
import { ImageMetadata } from '../engines/metadata/exif';
import { FEATURE_REGISTRY, TARGET_REGISTRY } from '../system/featureRegistry';

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export class ZodDirector {
  async analyzeAndGenerate(
    prompt: string,
    imageBlob: Blob,
    metadata: ImageMetadata,
    currentCode: string
  ): Promise<string> {
    // Convert blob to base64
    const base64Data = await this.blobToBase64(imageBlob);
    const mimeType = imageBlob.type || 'image/jpeg';

    // Dynamically build operations list from registry
    const operationsList = Object.entries(FEATURE_REGISTRY)
      .map(([key, def]) => {
        const paramsStr = Object.entries(def.params)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
        return `- ${key}: <value> (category: ${def.category}, params: ${paramsStr})`;
      })
      .join('\n');

    const targetsList = TARGET_REGISTRY.map(t => `- ${t}:`).join('\n');

    const systemInstruction = `You are ZOD (Zero-Overhead Director), an expert AI photo editor.
Your task is to generate PhotoCode based on the user's request and the provided image.
PhotoCode is a simple, declarative language for photo editing.

Available operations from Registry:
${operationsList}

Available targets (masks/categories):
${targetsList}

Example PhotoCode:
Exposure: 0.5
Contrast: 10
Subject:
  Skin Smooth: 30
Background:
  Exposure: -0.5
Metadata:
  Date:
    shift: "+1h"

Current PhotoCode:
${currentCode || '(empty)'}

Image Metadata:
Camera: ${metadata.camera}
Lens: ${metadata.lens}
ISO: ${metadata.iso}
Aperture: f/${metadata.aperture}
Shutter: ${metadata.shutterSpeed}

Respond ONLY with the generated PhotoCode. Do not include markdown formatting like \`\`\`photocode. Just the raw code.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });

    let generatedCode = response.text || '';
    // Clean up markdown if the model accidentally includes it
    generatedCode = generatedCode.replace(/^```[a-z]*\n/i, '').replace(/\n```$/i, '').trim();
    
    return generatedCode;
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

export const zodDirector = new ZodDirector();
