
import { GoogleGenAI } from "@google/genai";

export const geminiService = {
  /**
   * Generates an image or edits an image using Gemini.
   * Now supports both Main Image (structure) and Reference Image (style/background) simultaneously.
   */
  generateImage: async (
    prompt: string,
    mainImageBase64?: string,
    mainMimeType?: string,
    refImageBase64?: string,
    refMimeType?: string
  ): Promise<string> => {
    // Initialize with environment variable
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Switch to 'gemini-3-pro-image-preview' to support specific imageSize (2K) and better instruction following for blending
    const model = 'gemini-3-pro-image-preview';

    const parts: any[] = [];
    
    // Construct strict instruction
    let finalPrompt = prompt;
    if (mainImageBase64 && refImageBase64) {
      finalPrompt = `
      TASK: Generate a high-resolution 2K architectural image.
      
      INPUTS:
      1. [First Image provided]: STRUCTURE REFERENCE.
      2. [Second Image provided]: STYLE/ENVIRONMENT REFERENCE.
      3. User Instruction: "${prompt}"

      STRICT CONSTRAINTS:
      - STRUCTURE: You MUST preserve the architectural form, perspective, geometry, and main subject of the First Image. Do not hallucinate a different building shape.
      - STYLE: You MUST apply the lighting, color palette, sky, mood, and surrounding landscape style of the Second Image to the First Image.
      - OUTPUT: A seamless blend where the building from Image 1 sits naturally in the world of Image 2.
      `;
    }

    // 1. Prompt (Text First is often better for instruction following in multimodal)
    parts.push({ text: finalPrompt });

    // 2. Main Image (Structure/Subject)
    if (mainImageBase64 && mainMimeType) {
      parts.push({
        inlineData: {
          data: mainImageBase64,
          mimeType: mainMimeType
        }
      });
    }

    // 3. Reference Image (Style/Background)
    if (refImageBase64 && refMimeType) {
      parts.push({
        inlineData: {
          data: refImageBase64,
          mimeType: refMimeType
        }
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: { parts },
        config: {
          // Explicitly request 2K resolution as requested
          // @ts-ignore: imageConfig not yet in strict types
          imageConfig: {
            imageSize: "2K"
          }
        }
      });

      // Extract image from response
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            return part.inlineData.data;
          }
        }
      }
      
      throw new Error("No image generated.");
    } catch (error) {
      console.error("Gemini Image Gen Error:", error);
      throw error;
    }
  },

  /**
   * Upscales an image to 4K using the Pro model.
   */
  upscaleImage4K: async (imageBase64: string, mimeType: string): Promise<string> => {
    // Initialize with environment variable
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // High-Quality Image Generation/Editing Tasks -> 'gemini-3-pro-image-preview'
    const model = 'gemini-3-pro-image-preview';

    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: {
          parts: [
            {
              inlineData: {
                data: imageBase64,
                mimeType: mimeType
              }
            },
            {
              text: "Upscale this image to 4K resolution, enhancing details while preserving the original composition and style."
            }
          ]
        },
        config: {
            // @ts-ignore: imageConfig not yet in strict types
            imageConfig: {
                imageSize: "4K" // Explicitly requesting 4K
            }
        }
      });

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            return part.inlineData.data;
          }
        }
      }
      
      throw new Error("Failed to upscale image.");
    } catch (error) {
      console.error("Upscale Error:", error);
      throw error;
    }
  }
};
