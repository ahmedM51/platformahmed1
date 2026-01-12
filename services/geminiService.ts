
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAIResponse = async (prompt: string, context: string = "عام"): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "أنت مساعد ذكي لمنصة الطالب الذكي. هدفك هو مساعدة الطلاب في المذاكرة، تنظيم الوقت، والإجابة على أسئلتهم التعليمية بأسلوب ودود وداعم باللغة العربية. السياق الحالي: " + context,
        temperature: 0.7,
      },
    });
    return response.text || "عذراً، لم أستطع توليد رد حالياً.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "حدث خطأ في الاتصال بالمساعد الذكي. يرجى المحاولة لاحقاً.";
  }
};
