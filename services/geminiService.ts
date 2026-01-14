
import { GoogleGenAI } from "@google/genai";

export const getAIResponse = async (prompt: string, context: string = "عام"): Promise<string> => {
  // استخدام API_KEY من البيئة حصراً لضمان عدم التسريب
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    return "نظام الذكاء الاصطناعي قيد التحديث. يرجى التأكد من ضبط مفتاح الـ API في إعدادات المنصة.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: `أنت "المعلم الذكي" في منصة الطالب الذكي. مهمتك هي المساعدة التعليمية الاحترافية في سياق: ${context}. أجب باللغة العربية بأسلوب تعليمي مشجع ومبسط.`,
        temperature: 0.7,
        topP: 0.9,
      },
    });

    return response.text || "لم أستطع معالجة هذا الطلب حالياً، جرب صياغة أخرى.";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    
    if (error.message?.includes("leaked")) {
      return "تم إيقاف مفتاح الـ API الحالي لدواعي أمنية. يرجى تحديث المفتاح في إعدادات Vercel.";
    }
    
    if (error.message?.includes("429") || error.message?.includes("Quota")) {
      return "تم الوصول للحد الأقصى للطلبات المجانية. يرجى المحاولة بعد قليل.";
    }
    
    return "عذراً، المعلم الذكي مشغول حالياً. يرجى المحاولة مرة أخرى.";
  }
};
