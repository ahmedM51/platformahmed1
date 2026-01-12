
import { GoogleGenAI } from "@google/genai";

export const getAIResponse = async (prompt: string, context: string = "عام"): Promise<string> => {
  // جلب المفتاح بأمان من عدة مصادر محتملة
  const apiKey = (process.env && process.env.API_KEY) || (window as any).process?.env?.API_KEY;
  
  if (!apiKey) {
    console.warn("Gemini API Key is missing in this environment.");
    return "عذراً، نظام الذكاء الاصطناعي غير مفعل حالياً. يرجى مراجعة الإعدادات.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "أنت مساعد ذكي لمنصة الطالب الذكي. السياق الحالي: " + context,
        temperature: 0.7,
      },
    });
    return response.text || "لم أستطع معالجة طلبك حالياً.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "حدث خطأ في الاتصال بالمساعد الذكي. يرجى المحاولة لاحقاً.";
  }
};
