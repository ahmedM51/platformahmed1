
import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Plus, Trash2, Book, Sparkles, ArrowLeft, Upload, 
  ExternalLink, CheckCircle, PlayCircle, Loader2, Edit3, X,
  MessageSquare, User, GraduationCap, Volume2, Download, Printer
} from 'lucide-react';
import { db } from '../services/db';
import { Subject, Lecture } from '../types';
import { GoogleGenAI, Modality } from "@google/genai";

export const Subjects: React.FC<{ lang: 'ar' | 'en' }> = ({ lang }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showAddLecture, setShowAddLecture] = useState(false);
  
  const [newSubName, setNewSubName] = useState('');
  const [lectureTitle, setLectureTitle] = useState('');
  const [lectureType, setLectureType] = useState<'file' | 'link'>('link');
  const [lectureContent, setLectureContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  const [editingLectureId, setEditingLectureId] = useState<number | null>(null);

  // Explanation States
  const [explainingLec, setExplainingLec] = useState<Lecture | null>(null);
  const [explanation, setExplanation] = useState<string>('');
  const [isExplaining, setIsExplaining] = useState(false);

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

  // Fix: Await getSubjects in useEffect
  useEffect(() => {
    const loadData = async () => {
      const data = await db.getSubjects();
      setSubjects(data);
    };
    loadData();
    // Load PDF.js for text extraction if needed
    if (!(window as any).pdfjsLib) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      };
      document.head.appendChild(script);
    }
  }, []);

  // Fix: Await saveSubject
  const handleAddSubject = async () => {
    if (!newSubName.trim()) return;
    const colors = ['bg-indigo-500', 'bg-rose-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const updated = await db.saveSubject({ name: newSubName, color: randomColor });
    setSubjects(updated);
    setNewSubName('');
    setShowAddSubject(false);
  };

  // Fix: Await deleteSubject
  const handleDeleteSubject = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (window.confirm(lang === 'ar' ? "هل أنت متأكد من حذف هذه المادة وكافة محتوياتها؟" : "Are you sure?")) {
      const updated = await db.deleteSubject(id);
      setSubjects(updated);
      if (selectedSubjectId === id) setSelectedSubjectId(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert(lang === 'ar' ? "الملف كبير جداً. الحد الأقصى 5 ميجا." : "File too large. Max 5MB.");
      return;
    }

    setIsUploading(true);
    if (!lectureTitle) setLectureTitle(file.name.split('.')[0]);

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setLectureContent(event.target.result as string);
        setLectureType('file');
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const extractTextFromLecture = async (lecture: Lecture): Promise<string> => {
    if (lecture.type === 'link') return `محتوى المحاضرة: ${lecture.title}`;
    
    if (lecture.content.startsWith('data:application/pdf')) {
      try {
        const pdfjs = (window as any).pdfjsLib;
        const base64 = lecture.content.split(',')[1];
        const binary = atob(base64);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
        
        const pdf = await pdfjs.getDocument({ data: array }).promise;
        let text = '';
        for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((it: any) => it.str).join(' ') + '\n';
        }
        return text || lecture.title;
      } catch (e) {
        return lecture.title;
      }
    } else if (lecture.content.startsWith('data:text/plain')) {
       return atob(lecture.content.split(',')[1]);
    }
    return lecture.title;
  };

  const generateExplanation = async (lecture: Lecture) => {
    setExplainingLec(lecture);
    setIsExplaining(true);
    setExplanation('');
    
    try {
      const text = await extractTextFromLecture(lecture);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `أنت خبير في تبسيط العلوم. حول المحتوى التالي إلى حوار تعليمي ممتع ومبسط جداً بين 'الدكتور' (أستاذ حكيم وودود) و'الطالب' (طالب ذكي يسأل أسئلة فضولية). 
      يجب أن يشرح الحوار كافة المفاهيم الأساسية الواردة في النص بأسلوب 'الحكواتي' السهل.
      
      المحتوى:
      ${text.substring(0, 10000)}
      
      تنسيق الرد:
      الدكتور: [كلام الدكتور]
      الطالب: [كلام الطالب]
      ... وهكذا. استخدم الرموز التعبيرية لجعل الحوار حياً.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });

      setExplanation(response.text || "عذراً، لم أستطع توليد الشرح.");
    } catch (e) {
      setExplanation("حدث خطأ أثناء محاولة شرح المحاضرة.");
    } finally {
      setIsExplaining(false);
    }
  };

  // Fix: Await editLecture and addLecture
  const handleSaveLecture = async () => {
    if (!selectedSubjectId || !lectureTitle.trim() || !lectureContent.trim()) {
      alert(lang === 'ar' ? "يرجى كتابة العنوان وإضافة الرابط أو الملف" : "Please fill all details");
      return;
    }
    
    let updated;
    if (editingLectureId) {
      updated = await db.editLecture(selectedSubjectId, editingLectureId, {
        title: lectureTitle,
        type: lectureType,
        content: lectureContent
      });
    } else {
      updated = await db.addLecture(selectedSubjectId, {
        title: lectureTitle,
        type: lectureType,
        content: lectureContent
      });
    }
    
    setSubjects(updated);
    setLectureTitle('');
    setLectureContent('');
    setEditingLectureId(null);
    setShowAddLecture(false);
  };

  // Fix: Await deleteLecture
  const handleDeleteLecture = async (lectureId: number) => {
    if (!selectedSubjectId) return;
    if (window.confirm(lang === 'ar' ? "حذف هذه المحاضرة؟" : "Delete lecture?")) {
      const updated = await db.deleteLecture(selectedSubjectId, lectureId);
      setSubjects(updated);
    }
  };

  // Fix: Await toggleLectureStatus
  const toggleLectureStatus = async (lectureId: number) => {
    if (!selectedSubjectId) return;
    const updated = await db.toggleLectureStatus(selectedSubjectId, lectureId);
    setSubjects(updated);
  };

  const openContent = (content: string) => {
    if (content.startsWith('data:')) {
      try {
        const parts = content.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
        const b64 = parts[1];
        const binary = atob(b64);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
        const blob = new Blob([array], { type: mime });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } catch (e) {
        window.open().document.write(`<iframe src="${content}" frameborder="0" style="width:100%; height:100vh;"></iframe>`);
      }
    } else {
      window.open(content.startsWith('http') ? content : `https://${content}`, '_blank');
    }
  };

  if (selectedSubject) {
    return (
      <div className="space-y-10 animate-in fade-in duration-500 pb-20 relative">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-6">
            <button onClick={() => { setSelectedSubjectId(null); setShowAddLecture(false); }} className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 hover:text-indigo-600 shadow-sm transition-all hover:scale-105 active:scale-95">
              <ArrowLeft className={lang === 'ar' ? 'rotate-0' : 'rotate-180'} size={24} />
            </button>
            <div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white">{selectedSubject.name}</h2>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">{selectedSubject.progress}% مكتمل</p>
            </div>
          </div>
          <button onClick={() => { setEditingLectureId(null); setLectureTitle(''); setLectureContent(''); setShowAddLecture(true); }} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
            <Plus size={20} /> إضافة محاضرة
          </button>
        </div>

        {showAddLecture && (
          <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border-2 border-indigo-500/30 shadow-2xl animate-in slide-in-from-top-4 relative z-50">
            <button onClick={() => setShowAddLecture(false)} className="absolute top-8 left-8 p-2 text-slate-400 hover:text-rose-500 transition-colors">
              <X size={24} />
            </button>
            <h3 className="text-xl font-black mb-8 dark:text-white flex items-center gap-3">
              <Sparkles className="text-amber-500" /> إضافة محتوى جديد للمادة
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 px-2">عنوان المحاضرة</label>
                <input value={lectureTitle} onChange={e => setLectureTitle(e.target.value)} placeholder="مثال: أساسيات المادة..." className="w-full px-7 py-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold border-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 px-2">النوع</label>
                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                  <button onClick={() => setLectureType('link')} className={`flex-1 py-4 rounded-xl font-black text-xs transition-all ${lectureType === 'link' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>رابط خارجي</button>
                  <button onClick={() => setLectureType('file')} className={`flex-1 py-4 rounded-xl font-black text-xs transition-all ${lectureType === 'file' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>ملف محلي</button>
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                {lectureType === 'link' ? (
                  <input value={lectureContent} onChange={e => setLectureContent(e.target.value)} placeholder="أدخل الرابط (http://...)" className="w-full px-7 py-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold border-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
                ) : (
                  <div className="relative group min-h-[160px]">
                    <div className={`w-full h-full px-7 py-10 bg-slate-50 dark:bg-slate-800 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-4 transition-all ${lectureContent ? 'border-emerald-500 bg-emerald-50/10' : 'border-slate-200 dark:border-slate-700 group-hover:border-indigo-500'}`}>
                      {isUploading ? <Loader2 className="animate-spin text-indigo-600" size={32} /> : lectureContent ? <CheckCircle className="text-emerald-500" size={32} /> : <Upload className="text-slate-300" size={32} />}
                      <span className="font-black text-slate-500 text-center">{isUploading ? 'جاري التحميل...' : lectureContent ? 'تم التحميل بنجاح' : 'انقر لرفع ملف (PDF/صور/نص)'}</span>
                      <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={handleSaveLecture} disabled={isUploading} className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50">حفظ المحاضرة</button>
              <button onClick={() => setShowAddLecture(false)} className="px-12 py-4 bg-slate-100 dark:bg-slate-800 dark:text-white rounded-2xl font-black hover:bg-slate-200 transition-all">إلغاء</button>
            </div>
          </div>
        )}

        {/* Explanation Modal */}
        {explainingLec && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-xl animate-in fade-in">
             <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-[3.5rem] shadow-2xl relative overflow-hidden flex flex-col border border-white/10">
                <div className="p-8 border-b dark:border-slate-800 flex justify-between items-center bg-indigo-600 text-white">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shadow-inner"><GraduationCap size={24} /></div>
                      <div>
                        <h3 className="text-xl font-black">حوار شرح المحاضرة</h3>
                        <p className="text-xs opacity-80">{explainingLec.title}</p>
                      </div>
                   </div>
                   <button onClick={() => setExplainingLec(null)} className="p-3 hover:bg-white/10 rounded-2xl transition-all"><X size={24} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar bg-slate-50 dark:bg-slate-950">
                   {isExplaining ? (
                     <div className="h-full flex flex-col items-center justify-center space-y-6">
                        <div className="w-20 h-20 border-8 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-lg font-black text-indigo-600 animate-pulse">الدكتور يقوم بتحليل المحاضرة الآن...</p>
                     </div>
                   ) : (
                     <div className="space-y-6">
                        {explanation.split('\n').map((line, idx) => {
                          const isDr = line.startsWith('الدكتور:');
                          const isStudent = line.startsWith('الطالب:');
                          if (!isDr && !isStudent) return <p key={idx} className="text-slate-500 font-bold italic text-center py-2">{line}</p>;
                          
                          return (
                            <div key={idx} className={`flex gap-4 items-start animate-in slide-in-from-bottom-2 duration-500 delay-[${idx * 100}ms] ${isDr ? 'flex-row' : 'flex-row-reverse'}`}>
                               <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shrink-0 ${isDr ? 'bg-indigo-600 text-white' : 'bg-emerald-500 text-white'}`}>
                                  {isDr ? <GraduationCap size={24} /> : <User size={24} />}
                               </div>
                               <div className={`p-6 rounded-[2rem] shadow-sm max-w-[80%] border-2 ${isDr ? 'bg-white border-indigo-100 rounded-tr-none' : 'bg-white border-emerald-100 rounded-tl-none'}`}>
                                  <p className="font-black text-xs mb-1 opacity-50">{isDr ? 'الدكتور' : 'الطالب ذكي'}</p>
                                  <p className="text-lg font-bold leading-relaxed text-slate-800 dark:text-white">{line.split(': ')[1]}</p>
                               </div>
                            </div>
                          );
                        })}
                     </div>
                   )}
                </div>

                <div className="p-8 border-t dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-center gap-4">
                   <button onClick={() => window.print()} className="px-8 py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-indigo-50 transition-all"><Printer size={18} /> طباعة الشرح</button>
                   <button onClick={() => setExplainingLec(null)} className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg">فهمت، شكراً!</button>
                </div>
             </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          {selectedSubject.lectures.map((lecture) => (
            <div key={lecture.id} className={`bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-lg border-2 transition-all flex flex-col md:flex-row items-center justify-between group ${lecture.isCompleted ? 'border-emerald-500/20 bg-emerald-50/10' : 'border-slate-100 dark:border-slate-800 hover:border-indigo-500'}`}>
              <div className="flex items-center gap-6">
                <button onClick={() => toggleLectureStatus(lecture.id)} className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${lecture.isCompleted ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                  {lecture.isCompleted ? <CheckCircle size={28} /> : <PlayCircle size={28} />}
                </button>
                <div>
                  <h4 className={`text-xl font-black ${lecture.isCompleted ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>{lecture.title}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[9px] font-black uppercase text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">{lecture.type === 'link' ? 'رابط' : 'ملف'}</span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{lecture.date}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 mt-6 md:mt-0">
                <button onClick={() => generateExplanation(lecture)} className="px-6 py-3 bg-amber-500 text-white rounded-xl font-black text-xs hover:scale-105 transition-all shadow-md flex items-center gap-2">
                  <MessageSquare size={16} /> شرح (دكتور وطالب)
                </button>
                <button onClick={() => openContent(lecture.content)} className="px-6 py-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-black text-xs hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2">
                  <ExternalLink size={16} /> عرض
                </button>
                <button onClick={() => handleDeleteLecture(lecture.id)} className="w-12 h-12 flex items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-400 hover:bg-rose-500 hover:text-white transition-all">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
          {selectedSubject.lectures.length === 0 && (
            <div className="py-32 text-center opacity-30 border-4 border-dashed rounded-[4rem] border-slate-200">
               <BookOpen size={64} className="mx-auto mb-4" />
               <p className="text-xl font-black">لا توجد محاضرات في هذا المجلد بعد</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white flex items-center gap-4">
            <BookOpen className="text-indigo-600" size={36} /> المواد الدراسية
          </h2>
          <p className="text-slate-500 mt-2 font-medium">نظم محاضراتك وملفاتك حسب المادة</p>
        </div>
        <button onClick={() => setShowAddSubject(true)} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:scale-105 transition-all flex items-center gap-3">
          <Plus size={24} /> إضافة مادة
        </button>
      </div>

      {showAddSubject && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border-2 border-indigo-500/30 shadow-2xl animate-in slide-in-from-top-4">
          <h3 className="text-xl font-black mb-6">إنشاء مادة جديدة</h3>
          <div className="flex flex-col md:flex-row gap-4">
            <input value={newSubName} onChange={e => setNewSubName(e.target.value)} placeholder="اسم المادة (مثال: فيزياء 101)..." className="flex-1 px-8 py-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold border-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
            <button onClick={handleAddSubject} className="px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black">حفظ المادة</button>
            <button onClick={() => setShowAddSubject(false)} className="px-12 py-5 bg-slate-100 dark:bg-slate-800 dark:text-white rounded-2xl font-black">إلغاء</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {subjects.map((sub) => (
          <div key={sub.id} onClick={() => setSelectedSubjectId(sub.id)} className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] shadow-xl border border-slate-100 dark:border-slate-800 group hover:-translate-y-2 transition-all relative overflow-hidden cursor-pointer">
            <div className={`absolute top-0 right-0 w-2 h-full ${sub.color} opacity-40`}></div>
            <div className="flex justify-between items-start mb-10">
              <div className={`w-16 h-16 ${sub.color} rounded-[2rem] flex items-center justify-center text-white shadow-2xl transition-transform group-hover:rotate-6`}>
                <Book size={32} />
              </div>
              <button onClick={(e) => handleDeleteSubject(e, sub.id)} className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:bg-rose-500 hover:text-white shadow-sm"><Trash2 size={18} /></button>
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{sub.name}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase mb-10">{sub.lectures.length} محاضرات مضافة</p>
            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-1">
              <div className={`h-full ${sub.color} rounded-full transition-all duration-1000 shadow-sm`} style={{ width: `${sub.progress}%` }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
