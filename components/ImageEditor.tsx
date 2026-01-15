
import React, { useState } from 'react';
import { Image as ImageIcon, Wand2, Download, Upload, Trash2, Loader2, Sparkles, AlertCircle, Printer, FileDown } from 'lucide-react';
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
      reader.onload = () => {
        setImage(reader.result as string);
        setEditedImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = async () => {
    if (!image || !prompt) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const apiKey = process.env.API_KEY;
      const ai = new GoogleGenAI({ apiKey });
      const base64 = image.split(',')[1];
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: base64, mimeType: 'image/png' } },
            { text: `Apply this edit to the image: ${prompt}. Return the resulting image only.` }
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
        if (!found) setErrorMsg("لم يقم الذكاء الاصطناعي بإرجاع صورة معدلة.");
      }
    } catch (e: any) {
      setErrorMsg("حدث خطأ أثناء محاولة تعديل الصورة.");
    }
    setLoading(false);
  };

  const downloadImage = () => {
    const link = document.createElement('a');
    link.href = editedImage || image || '';
    link.download = `SmartStudent_Image_${Date.now()}.png`;
    link.click();
  };

  const exportToPDF = () => {
    const imgUrl = editedImage || image;
    if (!imgUrl) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Smart Student - Image Export</title>
          <style>
            body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: #fff; }
            img { max-width: 100%; max-height: 100%; object-contain: fit; }
            @media print { body { background: white; } }
          </style>
        </head>
        <body>
          <img src="${imgUrl}">
          <script>window.onload=()=> { setTimeout(() => { window.print(); window.close(); }, 500); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 font-cairo pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black dark:text-white flex items-center gap-3">
            <ImageIcon className="text-indigo-600" /> محرر الصور الذكي
          </h2>
          <p className="text-slate-500 mt-1 font-bold">تعديل الصور التعليمية وإضافة العناصر بذكاء</p>
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 px-8 py-4 bg-white dark:bg-slate-800 border rounded-2xl font-black cursor-pointer hover:bg-slate-50 transition-all shadow-sm">
            <Upload size={20} /> رفع صورة
            <input type="file" className="hidden" onChange={handleUpload} accept="image/*" />
          </label>
          {(image || editedImage) && (
            <div className="flex gap-2">
              <button onClick={downloadImage} className="px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg hover:scale-105 transition-all flex items-center gap-2">
                <Download size={20} /> صورة (PNG)
              </button>
              <button onClick={exportToPDF} className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:scale-105 transition-all flex items-center gap-2">
                <Printer size={20} /> تصدير (PDF)
              </button>
              <button onClick={() => {setImage(null); setEditedImage(null);}} className="p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all">
                <Trash2 size={24} />
              </button>
            </div>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border-2 border-rose-200 p-6 rounded-3xl flex items-center gap-4 text-rose-800">
          <AlertCircle size={32} />
          <p className="font-black">{errorMsg}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border dark:border-slate-800 min-h-[500px] flex items-center justify-center relative overflow-hidden">
            {editedImage || image ? (
              <img src={editedImage || image!} className="max-w-full max-h-full object-contain p-10" alt="Workspace" />
            ) : (
              <div className="text-center opacity-20">
                <ImageIcon size={80} className="mx-auto mb-4" />
                <h4 className="text-2xl font-black">ارفع صورة لبدء التعديل</h4>
              </div>
            )}
            {loading && (
              <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
                <p className="font-black text-indigo-600">جاري التعديل...</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-xl border dark:border-slate-800">
            <h3 className="text-xl font-black mb-6 flex items-center gap-3">
              <Wand2 className="text-indigo-500" /> أوامر الذكاء الاصطناعي
            </h3>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="مثال: اجعل الصورة تبدو كرسم يدوي، أضف أسهم توضيحية..."
              className="w-full p-6 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl dark:text-white focus:ring-4 focus:ring-indigo-100 min-h-[150px] mb-6 font-bold"
            />
            <button 
              onClick={handleEdit}
              disabled={loading || !image}
              className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
              تعديل الصورة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
