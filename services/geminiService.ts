
import { GoogleGenAI } from "@google/genai";

// Fix: Always use process.env.API_KEY directly for initialization
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAIResponse = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "أنت مساعد ذكي لمنصة الطالب الذكي. هدفك هو مساعدة الطلاب في المذاكرة، تنظيم الوقت، والإجابة على أسئلتهم التعليمية بأسلوب ودود وداعم باللغة العربية.",
        temperature: 0.7,
      },
    });
    // Fix: Access response.text as a property, not a method
    return response.text || "عذراً، لم أستطع توليد رد حالياً.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "حدث خطأ في الاتصال بالمساعد الذكي. يرجى المحاولة لاحقاً.";
  }
};
