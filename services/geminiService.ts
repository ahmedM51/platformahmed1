
import { GoogleGenAI } from "@google/genai";

export const getAIResponse = async (prompt: string, context: string = "عام"): Promise<string> => {
  // استخدام المفتاح الجديد المحقون
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    return "عذراً، مفتاح الـ AI غير مكوّن بشكل صحيح.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: `أنت "المعلم الذكي" في منصة الطالب الذكي. مهمتك مساعدة الطلاب في فهم المناهج الدراسية، تبسيط المعلومات، وتنظيم الوقت. السياق الحالي: ${context}. يرجى الإجابة بأسلوب تعليمي، مشجع، وباللغة العربية الفصحى البسيطة.`,
        temperature: 0.8,
        topP: 0.95,
      },
    });

    return response.text || "عذراً، لم أستطع معالجة هذا الطلب حالياً.";
  } catch (error: any) {
    console.error("Gemini AI Error:", error);
    if (error.message?.includes("Quota exceeded") || error.message?.includes("429")) {
      return "عذراً، تم الوصول للحد الأقصى لطلبات الذكاء الاصطناعي حالياً. يرجى المحاولة بعد قليل.";
    }
    return "حدث خطأ تقني في الاتصال بالذكاء الاصطناعي. يرجى المحاولة مرة أخرى لاحقاً.";
  }
};
