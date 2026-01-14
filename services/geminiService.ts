
import { GoogleGenAI } from "@google/genai";

export const getAIResponse = async (prompt: string, context: string = "عام"): Promise<string> => {
  // المفتاح الجديد الذي زودتنا به
  const apiKey = window.process?.env?.API_KEY || 'AIzaSyBNkAIB1P5lFmfrBKTCf9oPtSxcWvJCBpw';
  
  if (!apiKey || apiKey === 'undefined') {
    return "عذراً، مفتاح الـ AI مفقود. يرجى مراجعة إعدادات Vercel.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: `أنت "المعلم الذكي". مهمتك مساعدة الطلاب في فهم المناهج الدراسية، تبسيط المعلومات، وتنظيم الوقت. السياق: ${context}. أجب بأسلوب تعليمي مشجع بالعربية.`,
        temperature: 0.7,
        topP: 0.9,
      },
    });

    return response.text || "عذراً، لم أستطع توليد رد حالياً.";
  } catch (error: any) {
    console.error("Gemini AI Error:", error);
    
    // التعامل مع خطأ الكوتا (429)
    if (error.message?.includes("429") || error.message?.includes("Quota")) {
      return "تم الوصول للحد الأقصى للطلبات المجانية اليوم. يرجى المحاولة مرة أخرى غداً أو استخدام مفتاح API مدفوع.";
    }
    
    return "حدث خطأ في الاتصال بالمعلم الذكي. يرجى التأكد من اتصالك بالإنترنت.";
  }
};
