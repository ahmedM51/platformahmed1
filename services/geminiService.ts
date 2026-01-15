
import { GoogleGenAI } from "@google/genai";

export const getAIResponse = async (prompt: string, context: string = "عام"): Promise<string> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    return "نظام الذكاء الاصطناعي بانتظار مفتاح التشغيل. يرجى ضبط API_KEY في إعدادات البيئة.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: `أنت "المعلم الذكي" في منصة الطالب الذكي المتخصصة لطلاب الثانوية والجامعة. 
        مهمتك: تبسيط المعلومات المعقدة، شرح الدروس بأسلوب قصصي، وحل المسائل التعليمية. 
        السياق الحالي: ${context}. 
        القواعد:
        - أجب باللغة العربية بأسلوب تعليمي مشجع.
        - استخدم التنسيق الجميل (عناوين، نقاط، جداول).
        - إذا كان السؤال عن مادة اللغة الإنجليزية، أجب بالإنجليزية تماماً.`,
        temperature: 0.7,
      },
    });

    return response.text || "عذراً، لم أتمكن من استخراج رد مناسب.";
  } catch (error: any) {
    console.error("Gemini Critical Error:", error);
    return "المعلم الذكي مشغول حالياً في تصحيح الاختبارات! يرجى المحاولة بعد قليل.";
  }
};
