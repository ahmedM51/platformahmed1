
import React, { useState } from 'react';
import { Image as ImageIcon, Wand2, Download, Upload, Trash2, Loader2, Plus, Sparkles, AlertCircle } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

export const ImageEditor: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setErrorMsg(null);
      const reader = new FileReader();
      reader.onload = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = async () => {
    if (!image || !prompt) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey || apiKey === 'undefined') {
        throw new Error("API_KEY_MISSING");
      }

      const ai = new GoogleGenAI({ apiKey });
      const base64 = image.split(',')[1];
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: base64, mimeType: 'image/png' } },
            { text: `Apply this edit to the image: ${prompt}. Return the resulting image.` }
          ],
        },
      });

      if (response.candidates && response.candidates[0].content.parts) {
        let found = false;
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            setEditedImage(`data:image/png;base64,${part.inlineData.data}`);
            found = true;
          }
        }
        if (!found) {
           setErrorMsg("لم يقم الذكاء الاصطناعي بإرجاع صورة معدلة، يرجى تجربة وصف آخر.");
        }
      }
    } catch (e: any) {
      console.error("Image Editor Error:", e);
      if (e.message?.includes("429") || e.message?.toLowerCase().includes("quota")) {
        setErrorMsg("عذراً، تم تجاوز حد الاستخدام المجاني للذكاء الاصطناعي حالياً (Quota Exceeded). يرجى المحاولة بعد قليل أو في وقت لاحق.");
      } else if (e.message?.includes("401")) {
        setErrorMsg("خطأ في المصادقة: مفتاح الـ API غير صالح.");
      } else if (e.message === "API_KEY_MISSING") {
        setErrorMsg("مفتاح الـ API الخاص بـ Gemini مفقود في إعدادات النظام.");
      } else {
        setErrorMsg("حدث خطأ تقني أثناء محاولة تعديل الصورة. يرجى التأكد من اتصالك بالإنترنت.");
      }
    }
    setLoading(false);
  };

  const clearWorkspace = () => {
    setImage(null);
    setEditedImage(null);
    setPrompt('');
    setErrorMsg(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 font-cairo">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black dark:text-white flex items-center gap-3">
            <ImageIcon className="text-indigo-600" /> محرر الصور الذكي
          </h2>
          <p className="text-slate-500 mt-1 font-bold">عدل صورك التعليمية وأضف عناصر توضيحية بلمسة واحدة</p>
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 px-8 py-4 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-2xl font-black cursor-pointer hover:bg-slate-50 transition-all shadow-sm">
            <Upload size={20} /> رفع صورة
            <input type="file" className="hidden" onChange={handleUpload} accept="image/*" />
          </label>
          {(image || editedImage) && (
            <button onClick={clearWorkspace} className="p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm">
              <Trash2 size={24} />
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border-2 border-rose-200 p-6 rounded-[2rem] flex items-center gap-4 text-rose-800 animate-in slide-in-from-top-4">
          <AlertCircle className="shrink-0" size={32} />
          <p className="font-black text-lg">{errorMsg}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[4rem] shadow-2xl border dark:border-slate-800 overflow-hidden min-h-[550px] flex items-center justify-center relative bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]">
            {editedImage || image ? (
              <img src={editedImage || image!} className="max-w-full max-h-full object-contain p-10 animate-in zoom-in" alt="Workspace" />
            ) : (
              <div className="text-center p-20 opacity-20">
                <div className="w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ImageIcon size={64} />
                </div>
                <h4 className="text-2xl font-black">ارفع صورة لبدء التعديل</h4>
              </div>
            )}
            
            {loading && (
              <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                <div className="w-20 h-20 border-8 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6"></div>
                <p className="text-xl font-black text-indigo-600 animate-pulse">جاري معالجة طلبك بذكاء...</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] shadow-2xl border dark:border-slate-800">
            <h3 className="text-xl font-black dark:text-white mb-8 flex items-center gap-3">
              <Wand2 className="text-indigo-500" /> أوامر المساعد الذكي
            </h3>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="مثال: أضف مخططاً بيانياً للخلية، غير لون الخلفية، أضف أسهم توضيحية..."
              className="w-full p-6 bg-slate-50 dark:bg-slate-800 border-none rounded-3xl dark:text-white focus:ring-4 focus:ring-indigo-100 min-h-[180px] mb-8 font-bold text-lg shadow-inner"
            />
            <button 
              onClick={handleEdit}
              disabled={loading || !image}
              className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-xl shadow-2xl hover:scale-[1.02] hover:bg-indigo-700 transition-all flex items-center justify-center gap-4 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={24} />}
              تنفيذ التعديل الذكي
            </button>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-10 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden">
             <div className="relative z-10">
                <h4 className="font-black text-2xl mb-3">هل تعلم؟ 💡</h4>
                <p className="text-indigo-100 text-base leading-relaxed font-bold">يمكنك كتابة أوامر دقيقة مثل "حوّل الرسم لصورة كرتونية تعليمية" أو "أبرز الأجزاء المهمة في هذه الصورة باللون الأحمر".</p>
             </div>
             <Sparkles className="absolute -bottom-6 -right-6 opacity-20 rotate-12" size={140} />
          </div>
        </div>
      </div>
    </div>
  );
};
