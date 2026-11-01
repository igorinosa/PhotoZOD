import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface SmolVLM {
  describe(image: Blob, seed?: string): Promise<string>;
}

let model: SmolVLM | null = null;

async function initSmolVLM(): Promise<SmolVLM> {
  return {
    async describe(image: Blob, seed?: string): Promise<string> {
      try {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(image);
        });

        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [
            {
              parts: [
                { text: "Describe this image in detail." },
                { inlineData: { data: base64, mimeType: image.type } }
              ]
            }
          ]
        });

        return response.text || "";
      } catch (err) {
        console.error('[SmolVLM] Gemini description failed:', err);
        return "";
      }
    }
  };
}

export async function loadModel(): Promise<SmolVLM> {
  if (!model) {
    console.log('[SmolVLM] Loading model...');
    model = await initSmolVLM();
    console.log('[SmolVLM] Model loaded');
  }
  return model;
}
