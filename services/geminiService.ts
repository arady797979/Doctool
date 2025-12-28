
import { GoogleGenAI, Type, GenerateContentParameters, Part, Modality } from "@google/genai";
import { PersonaMode, ExpertResponse, SupportResponse, Attachment } from "../types";

const EXPERT_SYSTEM_INSTRUCTION = `
You are the Scholar Vault Clinical Intelligence Engine.
Role: Analyze complex clinical markers in mental health and addiction (e.g., opioid dependency, co-occurring disorders, neuro-psychiatric indicators).
Tasks:
1. Provide Differential Insights focused on diagnostic precision.
2. Generate an Evidence Table with peer-reviewed data.
3. Perform NLP Deep Analysis on the user's input (tone, keywords, lexical markers).
4. Suggest a Growth Path for clinicians.
Format: Strict JSON response.
Tone: High-level, strategic, academic.
`;

const SUPPORT_SYSTEM_INSTRUCTION = `
You are the Privacy Vault Patient Recovery Suite.
Role: Support patients navigating mental health crises or addiction recovery.
Tasks:
1. Provide a warm, empathetic opening.
2. Give a clear grounding exercise (Box breathing, 4-7-8, or sensory grounding).
3. Detect if the user needs a live professional (crisisEscalation) or should book a consultation (appointmentSuggested).
4. Focus on safety and zero-retention.
Format: Strict JSON response.
Tone: Empathic, steady, non-judgmental. Use pink and rose colors in your "spirit".
`;

// Helper to generate text/JSON responses using the generative models
export const generateTheraSyntResponse = async (
  mode: PersonaMode,
  userInput: string,
  attachment?: Attachment
): Promise<ExpertResponse | SupportResponse> => {
  // Always initialize GoogleGenAI inside functions to use up-to-date API key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = mode === PersonaMode.EXPERT ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
  
  const responseSchema = mode === PersonaMode.EXPERT ? {
    type: Type.OBJECT,
    properties: {
      differentialInsight: { type: Type.STRING },
      evidenceTable: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            treatment: { type: Type.STRING },
            successRate: { type: Type.STRING },
            citation: { type: Type.STRING }
          },
          required: ['treatment', 'successRate', 'citation']
        }
      },
      growthPath: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            title: { type: Type.STRING },
            link: { type: Type.STRING }
          },
          required: ['type', 'title', 'link']
        }
      },
      nlpAnalysis: {
        type: Type.OBJECT,
        properties: {
          tone: { type: Type.STRING },
          sentimentScore: { type: Type.NUMBER },
          clinicalKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          lexicalMarkers: { type: Type.ARRAY, items: { type: Type.STRING } },
          transcriptionSummary: { type: Type.STRING }
        }
      }
    },
    required: ['differentialInsight', 'evidenceTable', 'growthPath']
  } : {
    type: Type.OBJECT,
    properties: {
      message: { type: Type.STRING },
      exercise: { type: Type.STRING },
      crisisEscalation: { type: Type.BOOLEAN },
      appointmentSuggested: { type: Type.BOOLEAN },
      resourceLinks: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            url: { type: Type.STRING }
          }
        }
      }
    },
    required: ['message', 'exercise', 'crisisEscalation', 'appointmentSuggested']
  };

  const parts: Part[] = [{ text: `${mode}: ${userInput}` }];
  if (attachment) {
    parts.push({
      inlineData: {
        data: attachment.data,
        mimeType: attachment.mimeType
      }
    });
  }

  const parameters: GenerateContentParameters = {
    model: modelName,
    contents: [{ parts }],
    config: {
      systemInstruction: mode === PersonaMode.EXPERT ? EXPERT_SYSTEM_INSTRUCTION : SUPPORT_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      temperature: mode === PersonaMode.EXPERT ? 0.3 : 0.7,
    }
  };

  try {
    const response = await ai.models.generateContent(parameters);
    // Use .text property as per guidelines
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

// Helper to establish a Live API connection for low-latency voice interaction
export const getLiveConnection = (mode: PersonaMode, callbacks: any) => {
  // Always initialize GoogleGenAI inside functions to use up-to-date API key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const systemInstruction = mode === PersonaMode.EXPERT 
    ? "Expert Mode: Clinical NLP Analysis active. Monitor vocal tone for clinician fatigue and analyze patient metrics provided via voice." 
    : "Privacy Mode: Mental Health & Addiction support. Use deep calming vocal techniques. If the user indicates self-harm or severe addiction withdrawal, gently suggest using the Appointment button.";
    
  return ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    callbacks,
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { 
          prebuiltVoiceConfig: { voiceName: mode === PersonaMode.EXPERT ? 'Kore' : 'Zephyr' } 
        },
      },
      systemInstruction: systemInstruction,
    },
  });
};
