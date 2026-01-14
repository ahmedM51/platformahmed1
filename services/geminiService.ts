
import { GoogleGenAI } from "@google/genai";
import { CONFIG } from "./config";

export const getAIResponse = async (prompt: string, context: string = "عام"): Promise<string> => {
  const apiKey = CONFIG.GEMINI_API_KEY;
  
  if (!apiKey) {
    return "عذراً، نظام الذكاء الاصطناعي غير جاهز حالياً.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // استخدام موديل Gemini 3 Flash لضمان أسرع استجابة وأقل استهلاك للكوتا
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: `أنت "المعلم الذكي" في منصة الطالب الذكي. مهمتك هي المساعدة التعليمية الاحترافية في سياق: ${context}. أجب باللغة العربية بأسلوب تعليمي مشجع ومبسط.`,
        temperature: 0.75,
        topP: 0.9,
      },
    });

    return response.text || "عذراً، لم أستطع صياغة رد مناسب حالياً.";
  } catch (error: any) {
    console.error("Gemini Critical Error:", error);
    
    if (error.message?.includes("429") || error.message?.includes("Quota")) {
      return "عذراً، لقد تم استهلاك الحصة المجانية للذكاء الاصطناعي لهذا اليوم. يرجى المحاولة مرة أخرى غداً.";
    }
    
    return "حدث خطأ أثناء الاتصال بالمعلم الذكي. يرجى التأكد من استقرار الإنترنت لديك.";
  }
};
