
import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Presentation, FileText, Monitor, 
  Layout, Save, Play, Download, Wand2, Loader2,
  Upload, X, CheckCircle2, FileUp, ImageIcon,
  ArrowRight, ArrowLeft, Image as LucideImage,
  Palette, Type, Maximize2, MonitorPlay, FileDown,
  FileBox, Layers, AlertCircle
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import PptxGenJS from 'https://esm.sh/pptxgenjs@3.12.0';

interface Slide {
  title: string;
  content: string[];
  imagePrompt: string;
  imageUrl?: string;
  layout: 'split' | 'overlay' | 'grid';
}

export const AICreator: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [slideCount, setSlideCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [generationStep, setGenerationStep] = useState<'idle' | 'text' | 'images' | 'completed'>('idle');
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [project, setProject] = useState<{ title: string; slides: Slide[] } | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'pdf' | 'image' | 'text' | null>(null);
  const [fileName, setFileName] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  useEffect(() => {
    if (!(window as any).pdfjsLib) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.async = true;
      script.onload = () => {
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      };
      document.head.appendChild(script);
    }
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setFileName(file.name);
    try {
      if (file.type === 'application/pdf') {
        const pdfjs = (window as any).pdfjsLib;
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          fullText += content.items.map((it: any) => it.str).join(' ') + '\n';
        }
        setFileContent(fullText);
        setFileType('pdf');
      } else if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setFileContent(event.target?.result as string);
          setFileType('image');
        };
        reader.readAsDataURL(file);
      } else {
        const text = await file.text();
        setFileContent(text);
        setFileType('text');
      }
    } catch (err) {
      alert("فشل في معالجة الملف المرفوع.");
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim() && !fileContent) return alert("يرجى إدخال موضوع أو رفع ملف أولاً");
    if (slideCount < 5 || slideCount > 25) return alert("يرجى اختيار عدد شرائح بين 5 و 25 لضمان جودة العرض.");
    
    setLoading(true);
    setGenerationStep('text');
    setCurrentImgIndex(0);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    try {
      const contextStr = fileContent ? `محتوى الملف المرفق كمرجع أساسي:\n${fileContent.substring(0, 20000)}` : "";
      const prompt = `أنت مصمم عروض تقديمية تعليمي فائق الذكاء. قم بإنشاء مخطط كامل لعرض تقديمي باللغة العربية مكون من (${slideCount} شريحة) حول موضوع: "${topic || 'تحليل المحتوى المرفق'}". 
      
      ${contextStr}
      
      يجب أن يكون العرض غنياً بالمعلومات ومنظماً تربوياً.
      المطلوب لكل شريحة من الـ ${slideCount}:
      1. title: عنوان مركز دقيق.
      2. content: مصفوفة من 3 إلى 5 نقاط شرح وافية.
      3. imagePrompt: وصف دقيق جداً بالانجليزية لصورة فوتوغرافية أو 3D تعليمية تناسب محتوى الشريحة "بدون أي نصوص داخل الصورة".
      4. layout: ['split', 'overlay', 'grid'].
      
      أجب بتنسيق JSON حصراً: { "slides": [...] } - تأكد من توليد ${slideCount} شريحة.`;

      const textRes = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const data = JSON.parse(textRes.text || '{}');
      let slides: Slide[] = data.slides || [];

      setGenerationStep('images');
      
      const finalSlides: Slide[] = [];
      for (let i = 0; i < slides.length; i++) {
        setCurrentImgIndex(i + 1);
        const slide = slides[i];
        try {
          // تعديل الـ prompt لمنع النصوص داخل الصورة تماماً
          const cleanImagePrompt = `High quality professional educational background illustration, clean composition, 4k resolution, cinematic lighting, STRICTLY NO TEXT, NO WORDS, NO LETTERS, NO TYPOGRAPHY: ${slide.imagePrompt}`;
          
          const imgRes = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: cleanImagePrompt }] },
            config: { imageConfig: { aspectRatio: "16:9" } }
          });
          
          let b64 = "";
          for (const part of imgRes.candidates[0].content.parts) {
            if (part.inlineData) b64 = `data:image/png;base64,${part.inlineData.data}`;
          }
          finalSlides.push({ ...slide, imageUrl: b64 });
        } catch (e) {
          console.error(`Failed to generate image for slide ${i+1}`, e);
          finalSlides.push(slide);
        }
      }

      setProject({
        title: topic || fileName || "عرض تقديمي ذكي",
        slides: finalSlides
      });
      setGenerationStep('completed');
      setActiveSlide(0);
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء التوليد. حاول مجدداً.");
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = () => {
    if (!project) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert("يرجى السماح بالنوافذ المنبثقة.");

    const slidesHtml = project.slides.map((slide, index) => `
      <div class="slide" style="page-break-after: always; width: 100%; height: 100vh; position: relative; background: #020617; color: white; font-family: 'Cairo', sans-serif; display: flex; overflow: hidden; box-sizing: border-box;">
        <div style="flex: 1.2; display: flex; flex-direction: column; justify-content: center; z-index: 10; padding: 60px; background: rgba(2, 6, 23, 0.85); backdrop-blur: 20px;">
          <h1 style="font-size: 32pt; font-weight: 900; margin-bottom: 30px; line-height: 1.3; color: #ffffff; border-right: 8px solid #6366f1; padding-right: 20px;">${slide.title}</h1>
          <ul style="list-style: none; padding: 0;">
            ${slide.content.map(p => `
              <li style="font-size: 16pt; margin-bottom: 20px; display: flex; align-items: start; gap: 15px; color: #e2e8f0; font-weight: 700;">
                <span style="width: 14px; height: 14px; background: #6366f1; border-radius: 4px; margin-top: 10px; flex-shrink: 0; box-shadow: 0 0 15px rgba(99, 102, 241, 0.6);"></span>
                ${p}
              </li>`).join('')}
          </ul>
        </div>
        <div style="flex: 1; position: relative; height: 100%;">
          ${slide.imageUrl ? `<img src="${slide.imageUrl}" style="width: 100%; height: 100%; object-fit: cover;" />` : '<div style="width:100%; height:100%; background: #1e293b;"></div>'}
          <div style="position: absolute; inset: 0; background: linear-gradient(to left, transparent, #020617);"></div>
        </div>
        <div style="position: absolute; bottom: 30px; left: 60px; font-size: 10pt; font-weight: 900; opacity: 0.4; letter-spacing: 5px;">SMART STUDENT AI</div>
        <div style="position: absolute; bottom: 30px; right: 60px; font-size: 14pt; font-weight: 900; color: #6366f1; background: rgba(255,255,255,0.1); padding: 5px 15px; border-radius: 10px;">${index + 1} / ${project.slides.length}</div>
      </div>
    `).join('');

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>${project.title}</title>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
          <style>body { margin: 0; padding: 0; background: #020617; } @page { size: A4 landscape; margin: 0; } * { -webkit-print-color-adjust: exact; box-sizing: border-box; }</style>
        </head>
        <body>
          ${slidesHtml}
          <script>window.onload = function() { setTimeout(function() { window.print(); }, 1500); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const exportPPTX = async () => {
    if (!project) return;
    setLoading(true);
    try {
      const pptx = new (PptxGenJS as any)();
      pptx.layout = 'LAYOUT_16x9';
      pptx.rtlMode = true;

      project.slides.forEach((slide, idx) => {
        let pptSlide = pptx.addSlide();
        pptSlide.background = { color: '020617' };

        if (slide.imageUrl) {
          pptSlide.addImage({
            data: slide.imageUrl,
            x: 0, y: 0, w: '100%', h: '100%',
            sizing: { type: 'cover' }
          });
          // إضافة طبقة تظليل في البوربوينت لسهولة القراءة
          pptSlide.addShape(pptx.ShapeType.rect, { 
            x: 0, y: 0, w: '50%', h: '100%', 
            fill: { color: '020617', transparency: 15 } 
          });
        }

        pptSlide.addText(slide.title, {
          x: 0.4, y: 0.8, w: '45%', h: 1.2,
          fontSize: 32, color: 'FFFFFF', bold: true,
          fontFace: 'Arial', align: 'right'
        });

        const pointsText = slide.content.map(p => ({ 
          text: p, 
          options: { bullet: true, color: 'E2E8F0', fontSize: 18, margin: 10 } 
        }));
        
        pptSlide.addText(pointsText, {
          x: 0.4, y: 2.5, w: '45%', h: 3,
          align: 'right'
        });

        pptSlide.addText(`${idx + 1}`, { x: '90%', y: '90%', fontSize: 12, color: '6366f1' });
      });

      await pptx.writeFile({ fileName: `${project.title}.pptx` });
    } catch (e) {
      alert("فشل تصدير PowerPoint.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-12 animate-in fade-in duration-700 font-cairo pb-32">
      {/* Configuration Box */}
      <div className="bg-white dark:bg-slate-900 p-10 rounded-[4rem] shadow-2xl border border-slate-100 dark:border-slate-800 space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="text-center space-y-3 relative z-10">
          <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl mx-auto mb-6 transform hover:rotate-12 transition-transform">
             <Presentation size={48} />
          </div>
          <h2 className="text-4xl font-black dark:text-white leading-tight">منشئ العروض الاحترافي المطور</h2>
          <p className="text-slate-500 font-bold text-lg">نصوص عربية وإنجليزية مضبوطة 100% مع صور ذكية</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end relative z-10">
          <div className="lg:col-span-7 space-y-3">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 flex items-center gap-2"><Sparkles size={14} className="text-indigo-500" /> موضوع العرض أو الملف</label>
             <input 
              value={topic} onChange={e => setTopic(e.target.value)}
              placeholder="اكتب فكرة العرض (مثال: الجهاز الهضمي، الحرب العالمية...)"
              className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 rounded-3xl text-lg font-black focus:ring-4 focus:ring-indigo-100 border-none dark:text-white shadow-inner transition-all"
             />
          </div>
          <div className="lg:col-span-2 space-y-3">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 flex items-center gap-2"><Layers size={14} className="text-indigo-500" /> عدد الشرائح</label>
             <input 
              type="number" min="5" max="25"
              value={slideCount} onChange={e => setSlideCount(Math.max(1, parseInt(e.target.value) || 10))}
              className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-800 rounded-3xl text-center text-2xl font-black focus:ring-4 focus:ring-indigo-100 border-none dark:text-white shadow-inner transition-all"
             />
          </div>
          <div className="lg:col-span-3">
            <button 
              onClick={handleGenerate}
              disabled={loading || isProcessingFile}
              className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl font-black text-xl shadow-xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 h-[68px]"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Wand2 />}
              صناعة العرض
            </button>
          </div>
        </div>

        {!fileContent ? (
          <label className={`w-full py-12 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] border-4 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-indigo-500 transition-all group ${isProcessingFile ? 'opacity-50' : ''}`}>
            {isProcessingFile ? <Loader2 className="animate-spin text-indigo-500" size={32} /> : <FileUp className="text-slate-300 group-hover:text-indigo-500 transition-colors" size={40} />}
            <div className="text-center">
              <p className="text-base font-black text-slate-500 uppercase tracking-widest">اختياري: ارفع ملف مرجعي (PDF / صور)</p>
              <input type="file" className="hidden" accept=".pdf,.txt,image/*" onChange={handleFileUpload} />
            </div>
          </label>
        ) : (
          <div className="flex items-center justify-between p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-3xl border-2 border-emerald-200 shadow-sm animate-in zoom-in">
             <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg"><CheckCircle2 size={32} /></div>
                <div>
                  <p className="font-black text-lg dark:text-white truncate max-w-xs">{fileName}</p>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">تم تحليل الملف لإنتاج نصوص دقيقة لـ {slideCount} شريحة</p>
                </div>
             </div>
             <button onClick={() => {setFileContent(null); setFileName('');}} className="p-4 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"><X size={28} /></button>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-10 animate-in fade-in">
           <div className="relative">
              <div className="w-40 h-40 border-[12px] border-indigo-600/10 border-t-indigo-600 rounded-full animate-spin shadow-2xl"></div>
              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600 animate-pulse" size={48} />
           </div>
           <div className="text-center space-y-4">
              <h3 className="text-3xl font-black dark:text-white">
                {generationStep === 'text' ? 'جاري استخراج النصوص الدقيقة بالعربية...' : `جاري رسم الخلفية الذكية للشريحة ${currentImgIndex}...`}
              </h3>
              <p className="text-slate-500 font-bold text-xl">نقوم بضبط الخطوط والصور لضمان تجربة تعليمية احترافية</p>
              
              {generationStep === 'images' && (
                <div className="w-full max-w-md bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden mx-auto mt-6">
                  <div 
                    className="h-full bg-indigo-600 transition-all duration-500" 
                    style={{ width: `${(currentImgIndex / slideCount) * 100}%` }}
                  ></div>
                </div>
              )}
           </div>
        </div>
      )}

      {/* Presentation Result */}
      {project && !loading && (
        <div className="space-y-8 animate-in zoom-in duration-700">
          <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 gap-6 shadow-2xl">
             <div className="flex gap-4 flex-wrap justify-center">
                <button 
                  onClick={exportPPTX} 
                  className="px-10 py-5 bg-amber-600 hover:bg-amber-700 text-white rounded-[2rem] font-black text-lg flex items-center gap-3 shadow-xl hover:scale-105 transition-all"
                >
                  <FileBox size={24} /> PowerPoint
                </button>
                <button 
                  onClick={exportPDF} 
                  className="px-10 py-5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-[2rem] font-black text-lg flex items-center gap-3 shadow-md hover:bg-slate-200 transition-all"
                >
                  <FileDown size={24} /> PDF
                </button>
             </div>
             <div className="text-indigo-600 font-black text-sm uppercase tracking-[0.2em] bg-indigo-50 dark:bg-indigo-900/30 px-8 py-4 rounded-full border border-indigo-100">
                الشريحة {activeSlide + 1} من {project.slides.length}
             </div>
          </div>

          <div className="bg-slate-950 rounded-[5rem] aspect-video relative overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.5)] border-[12px] border-white/5 flex flex-col md:flex-row group">
             {project.slides.map((slide, i) => (
               <div key={i} className={`absolute inset-0 transition-all duration-1000 ease-in-out flex flex-col md:flex-row ${activeSlide === i ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-40 scale-95 pointer-events-none'}`}>
                  {/* Text Container: Overlaying with high accuracy */}
                  <div className="flex-1 p-12 md:p-24 flex flex-col justify-center bg-slate-900/90 backdrop-blur-2xl z-10 order-2 md:order-1 relative border-l border-white/5">
                     <div className="absolute top-12 right-12 text-[100px] font-black text-white/5 pointer-events-none select-none">{i < 9 ? `0${i+1}` : i+1}</div>
                     <h3 className="text-3xl md:text-5xl font-black text-white mb-8 md:mb-14 leading-tight border-r-8 border-indigo-600 pr-6 drop-shadow-xl">{slide.title}</h3>
                     <ul className="space-y-8">
                        {slide.content.map((p, pi) => (
                          <li key={pi} className="text-lg md:text-2xl text-slate-300 font-bold flex items-start gap-6 animate-in slide-in-from-right-8" style={{ animationDelay: `${pi * 200}ms` }}>
                             <div className="w-5 h-5 bg-indigo-500 rounded-lg mt-2 shadow-[0_0_20px_#6366f1] shrink-0 transform rotate-45"></div>
                             <span className="leading-relaxed">{p}</span>
                          </li>
                        ))}
                     </ul>
                  </div>
                  {/* Image Container: Pure Illustration, No AI-generated text */}
                  <div className="flex-1 relative order-1 md:order-2 h-64 md:h-full overflow-hidden">
                    {slide.imageUrl ? (
                      <img src={slide.imageUrl} className="w-full h-full object-cover transition-transform duration-[20s] hover:scale-125" alt="Clean Visual Illustration" />
                    ) : (
                      <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center gap-4">
                        <AlertCircle className="text-slate-600" size={64} />
                        <span className="text-slate-500 font-black">جاري تحضير الرسم...</span>
                      </div>
                    )}
                    {/* Dark gradient for text readability if the layout changes to full overlay */}
                    <div className="absolute inset-0 bg-gradient-to-l from-transparent via-black/20 to-slate-900"></div>
                  </div>
               </div>
             ))}

             {/* Slide Navigation Overlay */}
             <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-8 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <button onClick={() => setActiveSlide(s => Math.max(0, s - 1))} className="w-20 h-20 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-2xl transition-all border border-white/10 flex items-center justify-center shadow-2xl active:scale-90"><ArrowRight className="rotate-180" size={32} /></button>
                <div className="flex gap-3 items-center px-10 bg-black/60 backdrop-blur-2xl rounded-full border border-white/10 max-w-[400px] overflow-x-auto no-scrollbar py-2">
                  {project.slides.map((_, idx) => (
                    <div key={idx} onClick={() => setActiveSlide(idx)} className={`w-3 h-3 rounded-full cursor-pointer transition-all shrink-0 ${activeSlide === idx ? 'bg-indigo-500 w-12' : 'bg-white/20 hover:bg-white/50'}`}></div>
                  ))}
                </div>
                <button onClick={() => setActiveSlide(s => Math.min(project.slides.length - 1, s + 1))} className="w-20 h-20 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 transition-all shadow-[0_0_40px_rgba(79,70,229,0.5)] flex items-center justify-center active:scale-90"><ArrowRight size={32} /></button>
             </div>
          </div>
        </div>
      )}
      
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};
