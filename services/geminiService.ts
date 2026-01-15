import { GoogleGenAI } from "@google/genai";
import { CONFIG } from "./config";

export const getAIResponse = async (prompt: string, context: string = "عام"): Promise<string> => {
  const apiKey = CONFIG.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("VITE_GEMINI_API_KEY is missing.");
    return "نظام الذكاء الاصطناعي بانتظار إعداد مفتاح التشغيل داخل الاستضافة.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: `أنت "المعلم الذكي" في منصة الطالب الذكي.
السياق الحالي: ${context}.`,
        temperature: 0.7,
      },
    });

    return response.text || "عذراً لم أتمكن من الحصول على رد مفيد حالياً.";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    if (error.message?.includes("API key not valid")) {
      return "خطأ مفتاح API غير صالح. راجع قيمة VITE_GEMINI_API_KEY على Vercel.";
    }
    return "المعلم الذكي مشغول حالياً. حاول لاحقاً.";
  }
};
