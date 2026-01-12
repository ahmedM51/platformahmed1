
import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, FileText, ClipboardCheck, Brain, Sparkles, Loader2, GraduationCap,
  RefreshCcw, MessageSquare, Upload, Database, X, CheckCircle2, 
  Trophy, ChevronRight, ChevronLeft, FileDown, Printer, BookOpen,
  ArrowRight, Eye, Download, FileBox, Undo2, Home, AlertCircle, List
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { db } from '../services/db';
import { Subject } from '../types';
import { translations } from '../i18n';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const AIAssistant: React.FC<{ lang?: 'ar' | 'en' }> = ({ lang = 'ar' }) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'quiz'>('chat');
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileProcessing, setFileProcessing] = useState(false);
  const t = translations[lang];

  // Context Management
  const [activeContext, setActiveContext] = useState<{ title: string; data: string; type: string } | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Quiz State
  const [quizSettings, setQuizSettings] = useState({ count: 5, type: 'mixed' as 'multiple' | 'boolean' | 'mixed' });
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [isQuizCompleted, setIsQuizCompleted] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);

  useEffect(() => {
    // إصلاح: استخدام دالة async لجلب المواد بشكل صحيح
    const loadSubjects = async () => {
      const data = await db.getSubjects();
      setSubjects(data);
    };
    loadSubjects();

    if (!(window as any).pdfjsLib) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      };
      document.head.appendChild(script);
    }
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileProcessing(true);
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
        setActiveContext({ title: file.name, data: fullText, type: 'text/plain' });
      } else if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setActiveContext({ title: file.name, data: event.target?.result as string, type: file.type });
        };
        reader.readAsDataURL(file);
      } else {
        const text = await file.text();
        setActiveContext({ title: file.name, data: text, type: file.type });
      }
      setMessages(prev => [...prev, { role: 'ai', text: `تم تحميل ملف "${file.name}" بنجاح. أنا جاهز لمناقشة المحتوى أو إنشاء اختبار تفاعلي.` }]);
    } catch (error) { 
      alert("فشل في معالجة الملف"); 
    } finally { 
      setFileProcessing(false); 
    }
  };

  const startQuiz = async () => {
    if (!activeContext) return alert("يرجى رفع ملف أولاً لإنشاء الاختبار منه.");
    setQuizLoading(true);
    setIsQuizCompleted(false);
    setQuizAnswers({});
    setCurrentQuestionIdx(0);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `أنت خبير في التقييم التربوي. بناءً على النص التالي:
      ${activeContext.data.substring(0, 15000)}
      
      المطلوب: توليد مصفوفة JSON تحتوي على ${quizSettings.count} سؤال من نوع "${quizSettings.type}".
      كل سؤال يجب أن يحتوي على: (question, options, correctIndex, explanation).
      أجب باللغة العربية حصراً وبتنسيق JSON فقط.`;

      const res = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctIndex: { type: Type.NUMBER },
                explanation: { type: Type.STRING }
              },
              required: ["question", "options", "correctIndex", "explanation"]
            }
          }
        }
      });

      const questions = JSON.parse(res.text || '[]');
      setQuizQuestions(questions.map((q: any, idx: number) => ({ ...q, id: idx })));
      setActiveTab('quiz');
    } catch (e) {
      alert("فشل في توليد الاختبار. يرجى المحاولة مرة أخرى.");
    } finally {
      setQuizLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    const userText = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let parts: any[] = [];
      if (activeContext) {
        if (activeContext.data.startsWith('data:image')) {
          parts.push({ inlineData: { data: activeContext.data.split(',')[1], mimeType: activeContext.type } });
          parts.push({ text: `السياق: صورة بعنوان ${activeContext.title}.` });
        } else {
          parts.push({ text: `المحتوى المرجعي:\n${activeContext.data.substring(0, 12000)}` });
        }
      }
      parts.push({ text: userText });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts },
        config: { systemInstruction: "أنت معلم خصوصي خبير. التزم بالملف المرفق كمصدر وحيد للمعلومات." }
      });
      setMessages(prev => [...prev, { role: 'ai', text: response.text }]);
    } catch (e) { 
      setMessages(prev => [...prev, { role: 'ai', text: "عذراً، حدث خطأ." }]); 
    } finally { 
      setLoading(false); 
    }
  };

  const exportQuizToPDF = (mode: 'blank' | 'review') => {
    if (!quizQuestions.length) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert("يرجى تفعيل النوافذ المنبثقة.");

    const contentHtml = quizQuestions.map((q, i) => `
      <div style="margin-bottom: 25px; border-bottom: 1px solid #f1f5f9; padding-bottom: 15px; page-break-inside: avoid;">
        <h3 style="font-size: 13pt; margin-bottom: 10px; color: #1e293b; line-height: 1.4; font-weight: 900;">${i + 1}. ${q.question}</h3>
        <div style="margin-right: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          ${q.options.map((opt, oi) => {
            let bg = '#ffffff';
            let border = '#e2e8f0';
            let extra = '';
            if (mode === 'review') {
              if (oi === q.correctIndex) { bg = '#f0fdf4'; border = '#22c55e'; extra = ' (صحيحة ✓)'; }
              else if (quizAnswers[i] === oi) { bg = '#fef2f2'; border = '#ef4444'; extra = ' (اختيارك ✗)'; }
            }
            return `
              <div style="padding: 8px 12px; border: 1.5px solid ${border}; border-radius: 8px; font-size: 10pt; background: ${bg}; font-family: 'Cairo', sans-serif;">
                <b>${String.fromCharCode(65 + oi)})</b> ${opt}${extra}
              </div>
            `;
          }).join('')}
        </div>
        ${mode === 'review' ? `
          <div style="margin-top: 10px; padding: 12px; background: #f8fafc; border-radius: 10px; border-right: 4px solid #6366f1; font-size: 9pt; color: #475569; font-family: 'Cairo', sans-serif;">
            <b style="color: #6366f1;">التفسير التعليمي:</b> ${q.explanation}
          </div>
        ` : `<div style="margin-top: 10px; border-bottom: 1px dashed #ccc; width: 200px; padding-bottom: 5px; font-size: 10pt; color: #999;">الإجابة: .....................</div>`}
      </div>
    `).join('');

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>${mode === 'blank' ? 'اختبار ورقي' : 'تقرير المراجعة'}</title>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
          <style>
            @page { margin: 15mm; size: A4; }
            body { font-family: 'Cairo', sans-serif; padding: 20px; line-height: 1.5; color: #333; background: white; }
            .header { text-align: center; border-bottom: 4px solid #6366f1; margin-bottom: 30px; padding-bottom: 15px; }
            h1 { font-size: 20pt; margin: 0; color: #6366f1; font-weight: 900; }
            .meta { display: flex; justify-content: space-between; font-size: 10pt; margin-top: 10px; color: #666; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>منصة الطالب الذكي</h1>
            <p style="font-weight: 900; color: #1e293b;">${mode === 'blank' ? 'اختبار تقييمي - نسخة الطباعة' : 'تقرير مراجعة الأداء والحلول النموذجية'}</p>
            <div class="meta">
              <span>المادة: ${activeContext?.title || 'عام'}</span>
              <span>عدد الأسئلة: ${quizQuestions.length}</span>
              <span>التاريخ: ${new Date().toLocaleDateString('ar-EG')}</span>
            </div>
          </div>
          ${contentHtml}
          <script>window.onload = () => { setTimeout(() => { window.print(); }, 1200); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const calculateScore = () => {
    let score = 0;
    quizQuestions.forEach((q, idx) => { if (quizAnswers[idx] === q.correctIndex) score++; });
    return score;
  };

  const resetQuiz = () => {
    setQuizQuestions([]);
    setQuizAnswers({});
    setIsQuizCompleted(false);
    setCurrentQuestionIdx(0);
  };

  const exportChatToPDF = () => {
    if (!messages.length) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const chatHtml = messages.map(m => `
      <div style="margin-bottom: 20px; padding: 15px; border-radius: 12px; background: ${m.role === 'user' ? '#f8fafc' : '#eff6ff'}; border: 1px solid #e2e8f0; font-size: 12pt;">
        <b style="color: ${m.role === 'user' ? '#475569' : '#1d4ed8'};">${m.role === 'user' ? 'الطالب' : 'المعلم'}:</b><br/>${m.text}
      </div>
    `).join('');
    printWindow.document.write(`<html dir="rtl"><head><title>سجل الشرح</title><link href="https://fonts.googleapis.com/css2?family=Cairo&display=swap" rel="stylesheet"><style>body{font-family:'Cairo',sans-serif;padding:30px;}</style></head><body><h1>سجل الشرح والتلخيص</h1>${chatHtml}<script>window.onload=()=>window.print();</script></body></html>`);
    printWindow.document.close();
  };

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-10rem)] ${lang === 'ar' ? 'rtl' : 'ltr'} font-cairo`}>
      
      {/* Sidebar Navigation */}
      <div className="lg:col-span-3 space-y-4 flex flex-col overflow-y-auto no-scrollbar">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800">
           <div className="flex flex-col gap-2">
              <button onClick={() => setActiveTab('chat')} className={`w-full flex items-center gap-3 p-4 rounded-3xl font-black transition-all ${activeTab === 'chat' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-50'}`}>
                 <MessageSquare size={18} /> الدردشة والتلخيص
              </button>
              <button onClick={() => setActiveTab('quiz')} className={`w-full flex items-center gap-3 p-4 rounded-3xl font-black transition-all ${activeTab === 'quiz' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-50'}`}>
                 <ClipboardCheck size={18} /> الاختبار التفاعلي
              </button>
           </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2.5rem] border-2 border-dashed border-indigo-200 dark:border-slate-800 space-y-4">
           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">المصدر النشط</h4>
           {activeContext ? (
             <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-indigo-100 shadow-sm flex items-center justify-between group">
                <div className="flex items-center gap-2 truncate">
                   <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                      <FileText size={16} />
                   </div>
                   <span className="text-[11px] font-black truncate">{activeContext.title}</span>
                </div>
                <button onClick={() => setActiveContext(null)} className="text-rose-500 opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-50 rounded-lg transition-all"><X size={14} /></button>
             </div>
           ) : (
             <div className="text-center py-6 space-y-4">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300 mx-auto">
                   <FileBox size={24} />
                </div>
                <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black cursor-pointer hover:bg-indigo-700 transition-all shadow-md active:scale-95">
                   <Upload size={14} /> ارفع مادة دراسية
                   <input type="file" className="hidden" accept=".pdf,.txt,image/*" onChange={handleFileUpload} />
                </label>
             </div>
           )}
           <button onClick={() => setShowLibrary(true)} className="w-full flex items-center justify-center gap-2 p-3.5 bg-white dark:bg-slate-800 rounded-2xl border hover:border-indigo-500 transition-all text-[10px] font-black shadow-sm">
              <Database size={16} className="text-emerald-500" /> الاستيراد من المكتبة
           </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="lg:col-span-9 bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl flex flex-col border border-slate-100 dark:border-slate-800 overflow-hidden relative">
        
        {/* Library Modal Overlay */}
        {showLibrary && (
          <div className="absolute inset-0 z-50 bg-white/98 dark:bg-slate-900/98 backdrop-blur-md p-10 overflow-y-auto animate-in fade-in flex flex-col">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-3xl font-black">مكتبة محاضراتي</h3>
                <button onClick={() => setShowLibrary(false)} className="w-12 h-12 flex items-center justify-center hover:bg-slate-100 rounded-2xl transition-all"><X size={24} /></button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1 overflow-y-auto pb-10 custom-scrollbar">
                {subjects.flatMap(s => (s.lectures || []).map(l => (
                  <button 
                    key={l.id} 
                    onClick={() => { setActiveContext({ title: l.title, data: l.content, type: 'text/plain' }); setShowLibrary(false); }} 
                    className="p-6 bg-slate-50 dark:bg-slate-800 rounded-[2rem] border-2 border-transparent hover:border-indigo-500 hover:bg-white transition-all text-right group shadow-sm flex flex-col justify-between"
                  >
                    <div>
                       <div className="flex justify-between items-center mb-4">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black text-white ${s.color}`}>{s.name}</span>
                          <BookOpen size={18} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                       </div>
                       <h5 className="font-black text-sm leading-tight group-hover:text-indigo-600">{l.title}</h5>
                    </div>
                    <div className="mt-4 text-[10px] font-black text-slate-400 group-hover:text-indigo-400">اختر هذه المحاضرة</div>
                  </button>
                )))}
             </div>
          </div>
        )}

        {activeTab === 'chat' ? (
          <>
            <div className="bg-slate-50/50 dark:bg-slate-800/50 px-10 py-5 border-b flex justify-between items-center">
               <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-3">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div> المساعد التعليمي AI
               </h4>
               <button onClick={exportChatToPDF} disabled={!messages.length} className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-slate-700 rounded-2xl text-[10px] font-black shadow-sm disabled:opacity-50 hover:bg-indigo-50 border border-slate-100 transition-all">
                  <FileDown size={16} className="text-indigo-600" /> تصدير الشرح (PDF)
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-12 space-y-8 custom-scrollbar">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-20 text-center">
                  <GraduationCap size={100} className="text-indigo-400 mb-8" />
                  <h3 className="text-4xl font-black mb-4">أهلاً بك في جلسة المراجعة</h3>
                  <p className="max-w-md text-xl font-bold leading-relaxed">ارفع محاضرة وسأقوم بشرح محتوياتها لك بشكل مبسط ودقيق، أو اسألني أي سؤال حول المنهج.</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                   <div className={`max-w-[85%] p-8 rounded-[3rem] text-lg font-bold leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-100 dark:bg-slate-800 dark:text-white rounded-bl-none border border-indigo-50/50'}`}>
                     {m.text}
                   </div>
                </div>
              ))}
              {loading && <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-[2.5rem] w-fit animate-pulse"><Loader2 className="animate-spin text-indigo-600" size={24} /> <span className="text-lg font-black text-slate-400 italic">المعلم يقوم بالتحليل الآن...</span></div>}
            </div>
            
            <div className="p-10 border-t dark:border-slate-800 bg-white dark:bg-slate-900">
               <div className="flex gap-4 bg-slate-50 dark:bg-slate-950 p-2 rounded-[2.5rem] border-2 shadow-inner transition-all focus-within:ring-4 focus-within:ring-indigo-100 focus-within:border-indigo-500">
                  <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} className="flex-1 px-8 py-4 bg-transparent outline-none font-black text-lg placeholder:text-slate-400" placeholder="اكتب سؤالك هنا حول المحتوى المرفوع..." />
                  <button onClick={handleSendMessage} disabled={loading || !input.trim()} className="w-16 h-16 bg-indigo-600 text-white rounded-3xl flex items-center justify-center shadow-2xl transition-all active:scale-90 disabled:opacity-50"><Send size={28} /></button>
               </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/20">
            {(!quizQuestions.length || isQuizCompleted) ? (
              <div className="flex-1 p-10 overflow-y-auto custom-scrollbar flex flex-col items-center">
                 {isQuizCompleted ? (
                   <div className="space-y-12 animate-in zoom-in w-full max-w-5xl py-12">
                      <div className="text-center space-y-4">
                        <div className="w-32 h-32 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl border-4 border-white">
                          <Trophy size={64} className="text-indigo-600" />
                        </div>
                        <h2 className="text-5xl font-black">تقرير المراجعة النهائي 🎉</h2>
                        <p className="text-slate-500 font-bold text-xl">إليك تفاصيل أدائك والحلول النموذجية لكافة الأسئلة</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl mx-auto">
                        <div className="bg-white dark:bg-slate-800 p-10 rounded-[3.5rem] shadow-xl border-2 border-indigo-100 flex flex-col items-center">
                          <p className="text-7xl font-black text-indigo-600">{calculateScore()}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-6">الإجابات الصحيحة</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-10 rounded-[3.5rem] shadow-xl border-2 border-slate-100 flex flex-col items-center">
                          <p className="text-7xl font-black text-slate-900 dark:text-white">{quizQuestions.length}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-6">إجمالي الأسئلة</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-4 justify-center mt-12">
                         <button onClick={() => exportQuizToPDF('review')} className="px-10 py-5 bg-emerald-600 text-white rounded-[2rem] font-black flex items-center gap-3 shadow-xl hover:scale-105 transition-all"><Printer size={22} /> تحميل المراجعة الشاملة (PDF)</button>
                         <button onClick={resetQuiz} className="px-10 py-5 bg-indigo-600 text-white rounded-[2rem] font-black shadow-xl hover:scale-105 transition-all flex items-center gap-3"><RefreshCcw size={22} /> بدء اختبار جديد</button>
                      </div>

                      {/* Full Scrollable Review Section */}
                      <div className="space-y-10 text-right mt-24 pb-20 border-t pt-16">
                        <div className="flex items-center justify-between mb-8">
                           <h4 className="font-black text-3xl text-slate-800 flex items-center gap-4">
                              <Eye size={36} className="text-indigo-600" /> تحليل الأسئلة من الأول إلى الأخير
                           </h4>
                           <div className="px-5 py-2 bg-indigo-50 text-indigo-600 rounded-full font-black text-[10px] border border-indigo-100">
                             مراجعة كاملة لـ {quizQuestions.length} سؤال
                           </div>
                        </div>
                        
                        <div className="grid gap-8">
                          {quizQuestions.map((q, i) => (
                            <div key={i} className={`p-10 rounded-[3.5rem] bg-white border-2 transition-all shadow-lg ${quizAnswers[i] === q.correctIndex ? 'border-emerald-200 bg-emerald-50/5' : 'border-rose-200 bg-rose-50/5'}`}>
                              <div className="flex justify-between items-start mb-6">
                                <span className={`px-6 py-2 rounded-full text-[9px] font-black text-white ${quizAnswers[i] === q.correctIndex ? 'bg-emerald-500 shadow-lg shadow-emerald-100' : 'bg-rose-500 shadow-lg shadow-rose-100'}`}>
                                  {quizAnswers[i] === q.correctIndex ? 'إجابة صحيحة ✓' : 'تحتاج مراجعة ✗'}
                                </span>
                                <h3 className="text-xl font-black text-slate-800">السؤال {i + 1}</h3>
                              </div>
                              <p className="text-lg font-black mb-8 leading-relaxed text-slate-700">{q.question}</p>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                {q.options.map((opt, oi) => (
                                  <div key={oi} className={`p-6 rounded-2xl border-2 font-black text-sm flex items-center justify-between transition-all ${oi === q.correctIndex ? 'border-emerald-500 bg-emerald-100/50 text-emerald-900' : (quizAnswers[i] === oi ? 'border-rose-500 bg-rose-50 text-rose-900 shadow-sm' : 'border-slate-100 text-slate-500 bg-slate-50/50')}`}>
                                    <div className="flex items-center gap-3">
                                      <span className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center text-xs shadow-sm font-black text-slate-600">{String.fromCharCode(65 + oi)}</span>
                                      <span>{opt}</span>
                                    </div>
                                    {oi === q.correctIndex && <CheckCircle2 size={24} className="text-emerald-500" />}
                                    {quizAnswers[i] === oi && oi !== q.correctIndex && <X size={24} className="text-rose-500" />}
                                  </div>
                                ))}
                              </div>

                              <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2.5rem] border-r-8 border-indigo-600 shadow-inner">
                                <p className="text-indigo-600 font-black text-[9px] uppercase tracking-widest mb-3 flex items-center gap-2"><Sparkles size={16} /> التفسير العلمي المعتمد:</p>
                                <p className="text-slate-700 dark:text-slate-200 font-bold leading-loose text-base italic">"{q.explanation}"</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="flex justify-center pt-16 pb-10">
                           <button onClick={resetQuiz} className="px-16 py-7 bg-slate-900 text-white rounded-[2.5rem] font-black text-2xl shadow-2xl flex items-center gap-4 hover:scale-105 transition-all"><Undo2 size={28} /> العودة لصفحة الإعدادات</button>
                        </div>
                      </div>
                   </div>
                 ) : (
                   <div className="max-w-2xl space-y-12 animate-in fade-in py-10 w-full">
                      <div className="w-28 h-28 bg-indigo-600 text-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-2xl animate-bounce">
                        <ClipboardCheck size={56} />
                      </div>
                      <div className="text-center space-y-4">
                        <h3 className="text-5xl font-black text-slate-900">منشئ الاختبارات الذكي</h3>
                        <p className="text-slate-500 font-bold text-2xl leading-relaxed">حوّل أي ملف تعليمي إلى تجربة اختبار تفاعلية تقيس مستوى فهمك بدقة متناهية.</p>
                      </div>
                      
                      <div className="bg-white dark:bg-slate-800 p-12 rounded-[4rem] shadow-2xl border-2 border-indigo-50 space-y-10">
                        <div className="grid grid-cols-2 gap-8 text-right">
                          <div className="space-y-4">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mr-4">عدد الأسئلة</label>
                            <input type="number" min="1" max="50" value={quizSettings.count} onChange={e => setQuizSettings({...quizSettings, count: Math.max(1, parseInt(e.target.value) || 5)})} className="w-full p-6 bg-slate-50 dark:bg-slate-700 rounded-[2rem] border-none focus:ring-4 focus:ring-indigo-100 font-black text-center text-4xl transition-all" />
                          </div>
                          <div className="space-y-4">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mr-4">نوع الأسئلة</label>
                            <select value={quizSettings.type} onChange={e => setQuizSettings({...quizSettings, type: e.target.value as any})} className="w-full p-6 bg-slate-50 dark:bg-slate-700 rounded-[2rem] border-none focus:ring-4 focus:ring-indigo-100 font-black text-xl transition-all appearance-none pr-14">
                              <option value="multiple">اختيار من متعدد</option>
                              <option value="boolean">صح وخطأ</option>
                              <option value="mixed">مختلط</option>
                            </select>
                          </div>
                        </div>
                        {!activeContext && (
                          <div className="p-8 bg-amber-50 rounded-[2.5rem] border-2 border-amber-200 flex gap-6 items-center">
                             <AlertCircle className="text-amber-600 shrink-0" size={32} />
                             <p className="text-amber-900 font-black text-lg">يرجى رفع ملف أو اختيار محاضرة أولاً لتمكين إنشاء الاختبار.</p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-6 pt-6">
                         <button onClick={startQuiz} disabled={quizLoading || !activeContext} className="w-full py-9 bg-indigo-600 text-white rounded-[3.5rem] font-black text-3xl shadow-2xl flex items-center justify-center gap-6 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
                           {quizLoading ? <Loader2 className="animate-spin" size={36} /> : <Sparkles size={36} />}
                           ابدأ التحدي التفاعلي الآن
                         </button>
                         <button onClick={() => exportQuizToPDF('blank')} disabled={quizLoading || !activeContext} className="w-full py-6 bg-white text-slate-700 rounded-[2.5rem] font-black text-lg flex items-center justify-center gap-4 border-2 border-slate-100 hover:bg-slate-50 transition-all shadow-md">
                            <Download size={24} className="text-indigo-600" /> تصدير نسخة ورقية للتحميل والطباعة (PDF)
                         </button>
                      </div>
                   </div>
                 )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col h-full overflow-hidden animate-in slide-in-from-left-6 bg-white">
                {/* Active Quiz Header HUD */}
                <div className="px-10 py-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center z-10 shadow-sm">
                  <div className="flex items-center gap-8">
                    <div className="w-20 h-20 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center font-black text-3xl shadow-2xl animate-pulse">
                      {currentQuestionIdx + 1}
                    </div>
                    <div>
                      <h4 className="font-black text-2xl text-slate-800 leading-none">السؤال الحالي</h4>
                      <div className="flex items-center gap-6 mt-3">
                         <div className="w-80 h-4 bg-white rounded-full overflow-hidden shadow-inner border border-slate-200 p-1">
                           <div className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-700 shadow-md" style={{ width: `${((currentQuestionIdx + 1) / quizQuestions.length) * 100}%` }}></div>
                         </div>
                         <span className="text-xs font-black text-indigo-500 uppercase tracking-widest">{currentQuestionIdx + 1} / {quizQuestions.length}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                     <button onClick={() => exportQuizToPDF('blank')} className="px-8 py-3.5 bg-white text-slate-600 rounded-2xl text-xs font-black border border-slate-200 hover:bg-indigo-50 transition-all flex items-center gap-3 shadow-sm"><Printer size={20} /> حفظ الورقة</button>
                     <button onClick={() => { if(confirm('هل تريد إنهاء الاختبار وحساب النتيجة؟')) setIsQuizCompleted(true) }} className="px-8 py-3.5 bg-rose-50 text-rose-600 rounded-2xl text-xs font-black border border-rose-100 hover:bg-rose-500 hover:text-white transition-all shadow-sm">إنهاء وتسليم</button>
                  </div>
                </div>

                {/* Main Active Question Area - Scrollable */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-12 py-12 bg-slate-50/10">
                   <div className="max-w-4xl mx-auto w-full pb-32">
                      <div className="mb-14">
                         <p className="text-indigo-500 font-black text-xs uppercase tracking-[0.4em] mb-6 border-r-4 border-indigo-600 pr-4">تحدي التركيز والاستيعاب</p>
                         <h2 className="text-4xl font-black text-slate-900 leading-snug text-right">{quizQuestions[currentQuestionIdx].question}</h2>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {quizQuestions[currentQuestionIdx].options.map((opt, i) => (
                           <button 
                             key={i} 
                             onClick={() => setQuizAnswers({ ...quizAnswers, [currentQuestionIdx]: i })}
                             className={`p-10 rounded-[3rem] text-right font-black text-2xl transition-all border-4 flex items-center justify-between group min-h-[140px] shadow-lg ${quizAnswers[currentQuestionIdx] === i ? 'border-indigo-600 bg-indigo-50 text-indigo-800 shadow-2xl scale-[1.02]' : 'border-white bg-white hover:border-indigo-100 hover:bg-slate-50 text-slate-600'}`}
                           >
                             <div className={`w-14 h-14 rounded-2xl border-4 flex items-center justify-center shrink-0 transition-all ${quizAnswers[currentQuestionIdx] === i ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl' : 'border-slate-100 text-slate-200'}`}>
                               {quizAnswers[currentQuestionIdx] === i ? <CheckCircle2 size={32} /> : <span className="text-lg font-bold">{String.fromCharCode(65 + i)}</span>}
                             </div>
                             <span className="flex-1 mr-8 leading-tight text-right">{opt}</span>
                           </button>
                         ))}
                      </div>
                   </div>
                </div>

                {/* Active Test Navigation Bar */}
                <div className="bg-white border-t border-slate-200 px-12 py-8 flex justify-between items-center z-10 shadow-[0_-15px_40px_rgba(0,0,0,0.06)]">
                  <button 
                    onClick={() => setCurrentQuestionIdx(i => Math.max(0, i - 1))} 
                    disabled={currentQuestionIdx === 0}
                    className="px-14 py-6 bg-slate-100 text-slate-400 rounded-[2.5rem] font-black text-xl flex items-center gap-6 disabled:opacity-20 hover:bg-slate-200 transition-all border border-slate-200 shadow-sm"
                  >
                    <ChevronRight size={32} /> السابق
                  </button>
                  
                  <div className="px-12 py-4 bg-indigo-50 text-indigo-600 rounded-full font-black text-2xl border border-indigo-100 shadow-inner">
                    {currentQuestionIdx + 1} / {quizQuestions.length}
                  </div>

                  {currentQuestionIdx === quizQuestions.length - 1 ? (
                    <button 
                      onClick={() => setIsQuizCompleted(true)}
                      className="px-24 py-6 bg-emerald-600 text-white rounded-[2.5rem] font-black text-3xl shadow-2xl hover:scale-105 hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-6"
                    >
                      تسليم الاختبار 🏁
                    </button>
                  ) : (
                    <button 
                      onClick={() => setCurrentQuestionIdx(i => Math.min(quizQuestions.length - 1, i + 1))}
                      className="px-16 py-6 bg-indigo-600 text-white rounded-[2.5rem] font-black text-2xl shadow-2xl flex items-center gap-6 hover:scale-105 hover:bg-indigo-700 transition-all active:scale-95"
                    >
                      التالي <ChevronLeft size={32} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
