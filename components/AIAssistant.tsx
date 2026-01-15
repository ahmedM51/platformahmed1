
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
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
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
      setMessages(prev => [...prev, { role: 'ai', text: lang === 'ar' ? `تم تحميل ملف "${file.name}" بنجاح. أنا جاهز لمناقشة المحتوى أو إنشاء اختبار تفاعلي.` : `File "${file.name}" loaded successfully.` }]);
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
    setShowReview(false);
    setQuizAnswers({});
    setCurrentQuestionIdx(0);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `You are an educational evaluation expert. Based on this text:
      ${activeContext.data.substring(0, 15000)}
      
      Requirement: Generate a JSON array of ${quizSettings.count} questions of type "${quizSettings.type}".
      
      DETECTION RULE: 
      - If the content is about "English Language" or primarily written in English, generate the ENTIRE JSON content (question, options, explanation) in ENGLISH.
      - Otherwise, generate it in Arabic.
      
      Output format must be valid JSON array of objects with keys: (question, options, correctIndex, explanation).`;

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
      
      const systemInstruction = `أنت معلم خصوصي خبير. 
      قاعدة اللغة: إذا كان الملف المرفوع يخص مادة "اللغة الإنجليزية" أو كان مكتوباً بالإنجليزية، قم بالرد والشرح باللغة الإنجليزية تماماً. 
      غير ذلك، التزم باللغة العربية. استخدم الملف المرفق كمصدر وحيد للمعلومات.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts },
        config: { systemInstruction }
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

    const isEnglishContent = /^[A-Za-z0-9\s.,?!'"]+$/.test(quizQuestions[0].question.substring(0, 20));
    const dir = isEnglishContent ? 'ltr' : 'rtl';

    const contentHtml = quizQuestions.map((q, i) => `
      <div style="margin-bottom: 20px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; page-break-inside: avoid;">
        <h3 style="font-size: 11pt; margin-bottom: 8px; color: #1e293b; line-height: 1.4; font-weight: 900;">${i + 1}. ${q.question}</h3>
        <div style="margin-right: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
          ${q.options.map((opt, oi) => {
            let bg = '#ffffff';
            let border = '#e2e8f0';
            let extra = '';
            if (mode === 'review') {
              if (oi === q.correctIndex) { bg = '#f0fdf4'; border = '#22c55e'; extra = isEnglishContent ? ' (Correct ✓)' : ' (صحيحة ✓)'; }
              else if (quizAnswers[i] === oi) { bg = '#fef2f2'; border = '#ef4444'; extra = isEnglishContent ? ' (Your Choice ✗)' : ' (اختيارك ✗)'; }
            }
            return `
              <div style="padding: 6px 10px; border: 1.2px solid ${border}; border-radius: 6px; font-size: 9pt; background: ${bg}; font-family: 'Cairo', sans-serif;">
                <b>${String.fromCharCode(65 + oi)})</b> ${opt}${extra}
              </div>
            `;
          }).join('')}
        </div>
        ${mode === 'review' ? `
          <div style="margin-top: 8px; padding: 10px; background: #f8fafc; border-radius: 8px; border-right: 3px solid #6366f1; font-size: 8.5pt; color: #475569; font-family: 'Cairo', sans-serif;">
            <b style="color: #6366f1;">${isEnglishContent ? 'Tutor Explanation:' : 'التفسير التعليمي:'}</b> ${q.explanation}
          </div>
        ` : `<div style="margin-top: 8px; border-bottom: 1px dashed #ccc; width: 150px; padding-bottom: 3px; font-size: 9pt; color: #999;">${isEnglishContent ? 'Answer:' : 'الإجابة:'} .............</div>`}
      </div>
    `).join('');

    printWindow.document.write(`
      <html dir="${dir}">
        <head>
          <title>${mode === 'blank' ? 'اختبار ورقي' : 'تقرير المراجعة'}</title>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
          <style>
            @page { margin: 12mm; size: A4; }
            body { font-family: 'Cairo', sans-serif; padding: 15px; line-height: 1.4; color: #333; background: white; }
            .header { text-align: center; border-bottom: 3px solid #6366f1; margin-bottom: 20px; padding-bottom: 10px; }
            h1 { font-size: 18pt; margin: 0; color: #6366f1; font-weight: 900; }
            .meta { display: flex; justify-content: space-between; font-size: 9pt; margin-top: 8px; color: #666; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>منصة الطالب الذكي</h1>
            <p style="font-weight: 900; color: #1e293b; font-size: 11pt;">${mode === 'blank' ? (isEnglishContent ? 'Assessment Test - Print Version' : 'اختبار تقييمي - نسخة الطباعة') : (isEnglishContent ? 'Performance Review & Model Answers' : 'تقرير مراجعة الأداء والحلول النموذجية')}</p>
            <div class="meta">
              <span>${isEnglishContent ? 'Subject:' : 'المادة:'} ${activeContext?.title || 'عام'}</span>
              <span>${isEnglishContent ? 'Questions:' : 'عدد الأسئلة:'} ${quizQuestions.length}</span>
              <span>${isEnglishContent ? 'Date:' : 'التاريخ:'} ${new Date().toLocaleDateString(isEnglishContent ? 'en-US' : 'ar-EG')}</span>
            </div>
          </div>
          ${contentHtml}
          <script>window.onload = () => { setTimeout(() => { window.print(); }, 1000); };</script>
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
    setShowReview(false);
    setCurrentQuestionIdx(0);
  };

  const exportChatToPDF = () => {
    if (!messages.length) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const chatHtml = messages.map(m => `
      <div style="margin-bottom: 15px; padding: 12px; border-radius: 10px; background: ${m.role === 'user' ? '#f8fafc' : '#eff6ff'}; border: 1px solid #e2e8f0; font-size: 11pt;">
        <b style="color: ${m.role === 'user' ? '#475569' : '#1d4ed8'};">${m.role === 'user' ? 'الطالب' : 'المعلم'}:</b><br/>${m.text}
      </div>
    `).join('');
    printWindow.document.write(`<html dir="rtl"><head><title>سجل الشرح</title><link href="https://fonts.googleapis.com/css2?family=Cairo&display=swap" rel="stylesheet"><style>body{font-family:'Cairo',sans-serif;padding:25px;}</style></head><body><h1 style="font-size: 18pt;">سجل الشرح والتلخيص</h1>${chatHtml}<script>window.onload=()=>window.print();</script></body></html>`);
    printWindow.document.close();
  };

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-10rem)] ${lang === 'ar' ? 'rtl' : 'ltr'} font-cairo`}>
      <div className="lg:col-span-3 space-y-4 flex flex-col overflow-y-auto no-scrollbar">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-800">
           <div className="flex flex-col gap-2">
              <button onClick={() => setActiveTab('chat')} className={`w-full flex items-center gap-3 p-3 rounded-2xl font-black transition-all ${activeTab === 'chat' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
                 <MessageSquare size={16} /> {t.ai_tab_chat}
              </button>
              <button onClick={() => setActiveTab('quiz')} className={`w-full flex items-center gap-3 p-3 rounded-2xl font-black transition-all ${activeTab === 'quiz' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
                 <ClipboardCheck size={16} /> {t.ai_tab_quiz}
              </button>
           </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem] border-2 border-dashed border-indigo-200 dark:border-slate-800 space-y-4">
           <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">{t.ai_source_active}</h4>
           {activeContext ? (
             <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-indigo-100 shadow-sm flex items-center justify-between group">
                <div className="flex items-center gap-2 truncate">
                   <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                      <FileText size={14} />
                   </div>
                   <span className="text-[10px] font-black truncate">{activeContext.title}</span>
                </div>
                <button onClick={() => setActiveContext(null)} className="text-rose-500 opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-50 rounded-lg transition-all"><X size={12} /></button>
             </div>
           ) : (
             <div className="text-center py-4 space-y-3">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-300 mx-auto">
                   <FileBox size={20} />
                </div>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black cursor-pointer hover:bg-indigo-700 transition-all shadow-md active:scale-95">
                   <Upload size={12} /> {t.ai_upload_btn}
                   <input type="file" className="hidden" accept=".pdf,.txt,image/*" onChange={handleFileUpload} />
                </label>
             </div>
           )}
           <button onClick={() => setShowLibrary(true)} className="w-full flex items-center justify-center gap-2 p-3 bg-white dark:bg-slate-800 rounded-xl border hover:border-indigo-500 transition-all text-[9px] font-black shadow-sm">
              <Database size={14} className="text-emerald-500" /> {t.ai_import_lib}
           </button>
        </div>
      </div>

      <div className="lg:col-span-9 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl flex flex-col border border-slate-100 dark:border-slate-800 overflow-hidden relative">
        {activeTab === 'chat' ? (
          <>
            <div className="bg-slate-50/50 dark:bg-slate-800/50 px-8 py-4 border-b flex justify-between items-center">
               <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div> المساعد التعليمي AI
               </h4>
               <button onClick={exportChatToPDF} disabled={!messages.length} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 rounded-xl text-[9px] font-black shadow-sm disabled:opacity-50 hover:bg-indigo-50 border border-slate-100 transition-all">
                  <FileDown size={14} className="text-indigo-600" /> {t.ai_export_pdf}
               </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-20 text-center">
                  <GraduationCap size={70} className="text-indigo-400 mb-6" />
                  <h3 className="text-2xl font-black mb-2">{t.ai_welcome_title}</h3>
                  <p className="max-w-md text-sm font-bold leading-relaxed">{t.ai_welcome_desc}</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                   <div className={`max-w-[85%] p-6 rounded-[2rem] text-sm font-bold leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-100 dark:bg-slate-800 dark:text-white rounded-bl-none border border-indigo-50/50'}`}>
                     {m.text}
                   </div>
                </div>
              ))}
              {loading && <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl w-fit animate-pulse"><Loader2 className="animate-spin text-indigo-600" size={20} /> <span className="text-xs font-black text-slate-400 italic">المعلم يحلل الآن...</span></div>}
            </div>
            <div className="p-6 border-t dark:border-slate-800 bg-white dark:bg-slate-900">
               <div className="flex gap-3 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-[2rem] border-2 shadow-inner transition-all focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-500">
                  <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} className="flex-1 px-6 py-3 bg-transparent outline-none font-black text-sm placeholder:text-slate-400" placeholder={t.ai_input_placeholder} />
                  <button onClick={handleSendMessage} disabled={loading || !input.trim()} className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-90 disabled:opacity-50"><Send size={22} /></button>
               </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/20">
            {(!quizQuestions.length || isQuizCompleted) ? (
              <div className="flex-1 p-8 overflow-y-auto custom-scrollbar flex flex-col items-center">
                 {isQuizCompleted ? (
                   <div className="space-y-10 animate-in zoom-in w-full max-w-4xl py-10">
                      <div className="text-center space-y-3">
                        <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg border-4 border-white">
                          <Trophy size={48} className="text-indigo-600" />
                        </div>
                        <h2 className="text-3xl font-black">تقرير المراجعة النهائي 🎉</h2>
                        <p className="text-slate-500 font-bold text-lg">إليك تفاصيل أدائك والحلول النموذجية</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl mx-auto">
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-lg border-2 border-indigo-100 flex flex-col items-center">
                          <p className="text-5xl font-black text-indigo-600">{calculateScore()}</p>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-4">{t.ai_quiz_score_label}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-lg border-2 border-slate-100 flex flex-col items-center">
                          <p className="text-5xl font-black text-slate-900 dark:text-white">{quizQuestions.length}</p>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-4">{t.ai_quiz_total_label}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-4 justify-center mt-8">
                         <button onClick={() => setShowReview(true)} className="px-8 py-4 bg-white border-2 border-indigo-600 text-indigo-600 rounded-[1.5rem] font-black flex items-center gap-2 shadow-sm hover:bg-indigo-50 transition-all text-sm"><BookOpen size={18} /> مراجعة الإجابات</button>
                         <button onClick={() => exportQuizToPDF('review')} className="px-8 py-4 bg-emerald-600 text-white rounded-[1.5rem] font-black flex items-center gap-2 shadow-lg hover:scale-105 transition-all text-sm"><Printer size={18} /> تصدير PDF</button>
                         <button onClick={resetQuiz} className="px-8 py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-lg hover:scale-105 transition-all flex items-center gap-2 text-sm"><RefreshCcw size={18} /> {t.ai_quiz_retry}</button>
                      </div>

                      {showReview && (
                        <div className="space-y-8 text-right mt-16 pb-16 border-t pt-10 animate-in slide-in-from-top-4">
                          <h4 className="font-black text-2xl text-slate-800 flex items-center gap-3">
                             <Eye size={28} className="text-indigo-600" /> تحليل الأسئلة بالتفصيل
                          </h4>
                          
                          <div className="grid gap-6">
                            {quizQuestions.map((q, i) => (
                              <div key={i} className={`p-8 rounded-[2.5rem] bg-white border-2 transition-all shadow-md ${quizAnswers[i] === q.correctIndex ? 'border-emerald-200 bg-emerald-50/5' : 'border-rose-200 bg-rose-50/5'}`}>
                                <div className="flex justify-between items-start mb-4">
                                  <span className={`px-4 py-1.5 rounded-full text-[8px] font-black text-white ${quizAnswers[i] === q.correctIndex ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                                    {quizAnswers[i] === q.correctIndex ? 'إجابة صحيحة ✓' : 'تحتاج مراجعة ✗'}
                                  </span>
                                  <h3 className="text-lg font-black text-slate-800">السؤال {i + 1}</h3>
                                </div>
                                <p className="text-base font-black mb-6 leading-relaxed text-slate-700">{q.question}</p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                                  {q.options.map((opt, oi) => (
                                    <div key={oi} className={`p-4 rounded-xl border-2 font-black text-xs flex items-center justify-between transition-all ${oi === q.correctIndex ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : (quizAnswers[i] === oi ? 'border-rose-500 bg-rose-50 text-rose-900' : 'border-slate-50 text-slate-500 bg-slate-50/50')}`}>
                                      <div className="flex items-center gap-2">
                                        <span className="w-7 h-7 rounded-lg bg-white border flex items-center justify-center text-[10px] font-black text-slate-600">{String.fromCharCode(65 + oi)}</span>
                                        <span>{opt}</span>
                                      </div>
                                      {oi === q.correctIndex && <CheckCircle2 size={20} className="text-emerald-500" />}
                                    </div>
                                  ))}
                                </div>

                                <div className="bg-indigo-50 dark:bg-slate-900/50 p-6 rounded-[1.5rem] border-r-4 border-indigo-600 shadow-inner">
                                  <p className="text-indigo-600 font-black text-[8px] uppercase tracking-widest mb-2 flex items-center gap-2"><Sparkles size={14} /> شرح المعلم:</p>
                                  <p className="text-slate-700 dark:text-slate-200 font-bold leading-loose text-sm italic">"{q.explanation}"</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                   </div>
                 ) : (
                   <div className="max-w-xl space-y-8 animate-in fade-in py-10 w-full">
                      <div className="w-20 h-20 bg-indigo-600 text-white rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 shadow-xl animate-bounce">
                        <ClipboardCheck size={40} />
                      </div>
                      <div className="text-center space-y-2">
                        <h3 className="text-3xl font-black text-slate-900">{t.ai_quiz_title}</h3>
                        <p className="text-slate-500 font-bold text-lg">{t.ai_quiz_desc}</p>
                      </div>
                      
                      <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-xl border-2 border-indigo-50 space-y-8">
                        <div className="grid grid-cols-2 gap-6 text-right">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">{t.ai_quiz_count}</label>
                            <input type="number" value={quizSettings.count} onChange={e => setQuizSettings({...quizSettings, count: Math.max(1, parseInt(e.target.value) || 5)})} className="w-full p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border-none focus:ring-2 focus:ring-indigo-100 font-black text-center text-2xl transition-all" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">{t.ai_quiz_type}</label>
                            <select value={quizSettings.type} onChange={e => setQuizSettings({...quizSettings, type: e.target.value as any})} className="w-full p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border-none focus:ring-2 focus:ring-indigo-100 font-black text-sm transition-all appearance-none pr-10">
                              <option value="multiple">اختيار من متعدد</option>
                              <option value="boolean">صح وخطأ</option>
                              <option value="mixed">مختلط</option>
                            </select>
                          </div>
                        </div>
                        {!activeContext && (
                          <div className="p-6 bg-amber-50 rounded-[1.5rem] border-2 border-amber-200 flex gap-4 items-center">
                             <AlertCircle className="text-amber-600 shrink-0" size={24} />
                             <p className="text-amber-900 font-black text-sm">يرجى رفع ملف أو اختيار محاضرة أولاً لتمكين إنشاء الاختبار.</p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-4 pt-4">
                         <button onClick={startQuiz} disabled={quizLoading || !activeContext} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-2xl shadow-xl flex items-center justify-center gap-4 hover:scale-[1.02] transition-all disabled:opacity-50">
                           {quizLoading ? <Loader2 className="animate-spin" size={28} /> : <Sparkles size={28} />}
                           {t.ai_quiz_start}
                         </button>
                         <button onClick={() => exportQuizToPDF('blank')} disabled={quizLoading || !activeContext} className="w-full py-4 bg-white text-slate-700 rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-3 border-2 border-slate-100 hover:bg-slate-50 transition-all shadow-sm">
                            <Download size={18} className="text-indigo-600" /> {t.ai_quiz_print}
                         </button>
                      </div>
                   </div>
                 )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col h-full overflow-hidden animate-in slide-in-from-left-6 bg-white">
                {/* Active Quiz Header HUD */}
                <div className="px-8 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center z-10 shadow-sm">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg animate-pulse">
                      {currentQuestionIdx + 1}
                    </div>
                    <div>
                      <h4 className="font-black text-lg text-slate-800 leading-none">السؤال الحالي</h4>
                      <div className="flex items-center gap-4 mt-2">
                         <div className="w-48 h-2.5 bg-white rounded-full overflow-hidden shadow-inner border border-slate-200 p-0.5">
                           <div className="h-full bg-indigo-600 rounded-full transition-all duration-700 shadow-md" style={{ width: `${((currentQuestionIdx + 1) / quizQuestions.length) * 100}%` }}></div>
                         </div>
                         <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{currentQuestionIdx + 1} / {quizQuestions.length}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                     <button onClick={() => exportQuizToPDF('blank')} className="px-6 py-2.5 bg-white text-slate-600 rounded-xl text-[9px] font-black border border-slate-200 hover:bg-indigo-50 transition-all flex items-center gap-2 shadow-sm"><Printer size={16} /> حفظ الورقة</button>
                     <button onClick={() => { if(confirm('هل تريد إنهاء الاختبار وحساب النتيجة؟')) setIsQuizCompleted(true) }} className="px-6 py-2.5 bg-rose-50 text-rose-600 rounded-xl text-[9px] font-black border border-rose-100 hover:bg-rose-500 hover:text-white transition-all shadow-sm">إنهاء وتسليم</button>
                  </div>
                </div>

                {/* Main Active Question Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-10 py-10 bg-slate-50/10">
                   <div className="max-w-3xl mx-auto w-full pb-20">
                      <div className="mb-10 text-center">
                         <p className="text-indigo-500 font-black text-[10px] uppercase tracking-[0.3em] mb-4">تحدي التركيز والاستيعاب</p>
                         <h2 className="text-xl font-black text-slate-900 leading-snug">{quizQuestions[currentQuestionIdx].question}</h2>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {quizQuestions[currentQuestionIdx].options.map((opt, i) => (
                           <button 
                             key={i} 
                             onClick={() => setQuizAnswers({ ...quizAnswers, [currentQuestionIdx]: i })}
                             className={`p-6 rounded-[2rem] text-right font-black text-base transition-all border-4 flex items-center justify-between group shadow-md ${quizAnswers[currentQuestionIdx] === i ? 'border-indigo-600 bg-indigo-50 text-indigo-800 shadow-xl scale-[1.02]' : 'border-white bg-white hover:border-indigo-100 hover:bg-slate-50 text-slate-600'}`}
                           >
                             <div className={`w-10 h-10 rounded-xl border-4 flex items-center justify-center shrink-0 transition-all ${quizAnswers[currentQuestionIdx] === i ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'border-slate-100 text-slate-200'}`}>
                               {quizAnswers[currentQuestionIdx] === i ? <CheckCircle2 size={24} /> : <span className="text-sm font-bold">{String.fromCharCode(65 + i)}</span>}
                             </div>
                             <span className="flex-1 mr-4 leading-tight text-right">{opt}</span>
                           </button>
                         ))}
                      </div>
                   </div>
                </div>

                {/* Active Test Navigation Bar */}
                <div className="bg-white border-t border-slate-200 px-10 py-6 flex justify-between items-center z-10 shadow-lg">
                  <button 
                    onClick={() => setCurrentQuestionIdx(i => Math.max(0, i - 1))} 
                    disabled={currentQuestionIdx === 0}
                    className="px-10 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-lg flex items-center gap-4 disabled:opacity-20 hover:bg-slate-200 transition-all border border-slate-200 shadow-sm"
                  >
                    <ChevronRight size={24} /> {t.ai_quiz_prev}
                  </button>
                  
                  <div className="px-8 py-3 bg-indigo-50 text-indigo-600 rounded-full font-black text-lg border border-indigo-100 shadow-inner">
                    {currentQuestionIdx + 1} / {quizQuestions.length}
                  </div>

                  {currentQuestionIdx === quizQuestions.length - 1 ? (
                    <button 
                      onClick={() => setIsQuizCompleted(true)}
                      className="px-14 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xl shadow-xl hover:scale-105 hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-4"
                    >
                      {t.ai_quiz_submit}
                    </button>
                  ) : (
                    <button 
                      onClick={() => setCurrentQuestionIdx(i => Math.min(quizQuestions.length - 1, i + 1))}
                      className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl flex items-center gap-4 hover:scale-105 hover:bg-indigo-700 transition-all active:scale-95"
                    >
                      {t.ai_quiz_next} <ChevronLeft size={24} />
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
