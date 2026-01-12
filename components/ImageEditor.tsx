
import React, { useState } from 'react';
// Fix: Added missing Sparkles import from lucide-react
import { Image as ImageIcon, Wand2, Download, Upload, Trash2, Loader2, Plus, Sparkles } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

export const ImageEditor: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [editedImage, setEditedImage] = useState<string | null>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = async () => {
    if (!image || !prompt) return;
    setLoading(true);
    try {
      // Fix: Initialize GoogleGenAI with apiKey from process.env.API_KEY
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const base64 = image.split(',')[1];
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: base64, mimeType: 'image/png' } },
            { text: `Apply this edit to the image: ${prompt}` }
          ],
        },
      });

      // Fix: Safely iterate through response parts to find the image
      if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            setEditedImage(`data:image/png;base64,${part.inlineData.data}`);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black dark:text-white">محرر الصور الذكي</h2>
          <p className="text-gray-500 mt-1">عدل صورك التعليمية وأضف عناصر توضيحية بلمسة واحدة</p>
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl font-bold cursor-pointer hover:bg-gray-50 transition-all">
            <Upload size={20} /> رفع صورة
            <input type="file" className="hidden" onChange={handleUpload} accept="image/*" />
          </label>
          <button className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition-all">
            <Download size={20} /> تصدير
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-xl border dark:border-gray-700 overflow-hidden min-h-[500px] flex items-center justify-center relative bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]">
            {editedImage || image ? (
              <img src={editedImage || image!} className="max-w-full max-h-full object-contain p-8" alt="Workspace" />
            ) : (
              <div className="text-center p-20">
                <div className="w-24 h-24 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ImageIcon className="text-gray-300" size={48} />
                </div>
                <h4 className="text-xl font-bold text-gray-400">لا توجد صورة محملة حالياً</h4>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] shadow-xl border dark:border-gray-700">
            <h3 className="text-xl font-black dark:text-white mb-6 flex items-center gap-3">
              <Wand2 className="text-indigo-500" /> أوامر الذكاء الاصطناعي
            </h3>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="مثال: أضف مخططاً بيانيا للخلية، غير لون الخلفية للأبيض..."
              className="w-full p-5 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl dark:text-white focus:ring-2 focus:ring-indigo-500 min-h-[150px] mb-6"
            />
            <button 
              onClick={handleEdit}
              disabled={loading || !image}
              className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
              تطبيق التعديلات
            </button>
          </div>

          <div className="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
             <div className="relative z-10">
                <h4 className="font-black text-xl mb-2">هل تعلم؟ 💡</h4>
                <p className="text-indigo-100 text-sm leading-relaxed">يمكنك كتابة أوامر معقدة مثل "أضف تسميات توضيحية لأجزاء القلب" وسيحاول الذكاء الاصطناعي القيام بذلك بدقة.</p>
             </div>
             <Sparkles className="absolute -bottom-4 -right-4 opacity-20 rotate-12" size={100} />
          </div>
        </div>
      </div>
    </div>
  );
};
