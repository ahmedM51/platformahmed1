
import { GoogleGenAI } from "@google/genai";

export const getAIResponse = async (prompt: string, context: string = "عام"): Promise<string> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    console.error("Gemini API Key is missing.");
    return "عذراً، يجب ضبط مفتاح API_KEY في إعدادات Vercel لتفعيل الذكاء الاصطناعي.";
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
    return response.text || "لم أستطع الحصول على رد من المعلم الذكي.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي. تأكد من صحة مفتاح الـ API.";
  }
};
