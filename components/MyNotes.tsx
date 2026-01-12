
import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, Trash2, Tag, Plus, FileAudio, Sparkles, Loader2, 
  X, Upload, Square, CheckCircle2, Search, Volume2, Hash
} from 'lucide-react';
import { GoogleGenAI, Modality } from "@google/genai";
import { db } from '../services/db';
import { Note } from '../types';

const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};

const decodeBase64 = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const MyNotes: React.FC<{ lang?: 'ar' | 'en' }> = ({ lang = 'ar' }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [categories] = useState(['محاضرات', 'أفكار', 'مراجعة', 'أبحاث']);
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => { 
    const loadNotes = async () => {
      const n = await db.getNotes();
      setNotes(n);
    };
    loadNotes();
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch (err) { alert(lang === 'ar' ? "يرجى السماح بالوصول للميكروفون" : "Please allow mic access"); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const processAudioNote = async (cat: string) => {
    if (!audioBlob) return alert("سجل صوتاً أو ارفع ملفاً أولاً");
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const res = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: { 
            parts: [
              { inlineData: { data: base64, mimeType: 'audio/webm' } }, 
              { text: "تفريغ النص الصوتي وتلخيصه كعنوان ومحتوى تعليمي منسق باللغة العربية. أجب بتنسيق JSON: {transcription, summary, translation}" }
            ] 
          },
          config: { responseMimeType: "application/json" }
        });

        const result = JSON.parse(res.text || '{}');
        const updated = await db.saveNote({
          title: result.summary || "ملاحظة صوتية",
          text: result.transcription || "لم يتم تفريغ النص.",
          translation: result.translation || "",
          category: cat,
          date: new Date().toLocaleDateString('ar-EG')
        });
        setNotes(updated);
        setIsModalOpen(false);
        setAudioBlob(null);
      };
    } catch (e) { alert("فشل في معالجة الملاحظة. تأكد من حجم الملف."); } finally { setLoading(false); }
  };

  const speakNote = async (text: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const res = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `اقرأ الملاحظة بوضوح: ${text}` }] }],
        config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } },
      });
      const audioData = res.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audioData) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const buf = await decodeAudioData(decodeBase64(audioData), ctx, 24000, 1);
        const s = ctx.createBufferSource(); s.buffer = buf; s.connect(ctx.destination); s.start();
      }
    } catch (e) { console.error(e); }
  };

  const handleDeleteNote = async (id: number) => {
    const updated = await db.deleteNote(id);
    setNotes(updated);
  };

  const filteredNotes = notes.filter(n => (selectedCategory === 'الكل' || n.category === selectedCategory) && (n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.text.toLowerCase().includes(searchQuery.toLowerCase())));

  return (
    <div className={`h-[calc(100vh-12rem)] flex gap-10 animate-in fade-in duration-500 ${lang === 'ar' ? 'rtl' : 'ltr'}`}>
      <aside className="w-80 flex flex-col space-y-6 shrink-0">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-xl border dark:border-slate-800">
          <div className="relative mb-8">
            <Search className={`absolute ${lang === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400`} size={18} />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={lang === 'ar' ? 'بحث...' : 'Search...'} className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl py-3 pr-12 pl-4 text-xs font-bold border-none dark:text-white" />
          </div>
          <div className="space-y-2">
            <button onClick={() => setSelectedCategory('الكل')} className={`w-full px-6 py-4 rounded-2xl font-black text-sm flex justify-between items-center ${selectedCategory === 'الكل' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><span>كل الملاحظات</span><Hash size={16} /></button>
            {categories.map(cat => (<button key={cat} onClick={() => setSelectedCategory(cat)} className={`w-full px-6 py-4 rounded-2xl font-bold text-sm flex justify-between items-center ${selectedCategory === cat ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><span>{cat}</span><Tag size={16} /></button>))}
          </div>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="w-full py-10 rounded-[3rem] bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-2xl flex flex-col items-center gap-4 group transition-all hover:scale-[1.02] active:scale-95"><div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md group-hover:rotate-12 transition-transform shadow-inner"><Plus size={32} /></div><span className="text-xl font-black">{lang === 'ar' ? 'ملاحظة ذكية' : 'Smart Note'}</span></button>
      </aside>

      <main className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2">
        {filteredNotes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-800 space-y-6 bg-white dark:bg-slate-900 rounded-[4rem] border-4 border-dashed border-slate-100 dark:border-slate-800">
            <FileAudio size={64} className="opacity-20 animate-bounce" />
            <p className="text-2xl font-black opacity-30">بانتظار تسجيلك الأول!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-20">
            {filteredNotes.map(note => (
              <div key={note.id} className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] shadow-xl border border-slate-100 dark:border-slate-800 group hover:-translate-y-2 transition-all relative flex flex-col">
                <div className="flex justify-between items-start mb-6"><span className="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase">{note.category}</span><button onClick={() => speakNote(note.text)} className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center hover:scale-110 transition-all shadow-sm"><Volume2 size={24} /></button></div>
                <h4 className="text-2xl font-black dark:text-white mb-6 flex items-center gap-4"><Sparkles size={24} className="text-amber-500" />{note.title}</h4>
                <div className="bg-slate-50/50 dark:bg-slate-800/50 p-6 rounded-3xl border dark:border-slate-700 shadow-inner flex-1"><p className="text-slate-700 dark:text-slate-300 leading-relaxed font-bold text-sm">{note.text}</p></div>
                <div className="mt-8 pt-6 border-t dark:border-slate-800 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest"><span>{note.date}</span><button onClick={() => handleDeleteNote(note.id)} className="text-rose-500 hover:text-rose-600 flex items-center gap-1"><Trash2 size={14} /> حذف</button></div>
              </div>
            ))}
          </div>
        )}
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3.5rem] p-10 shadow-2xl relative animate-in zoom-in">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-8 left-8 text-slate-400 hover:text-rose-500 transition-all"><X size={24} /></button>
              <div className="text-center mb-10"><h3 className="text-3xl font-black mb-2 dark:text-white">تسجيل ملاحظة تعليمية</h3><p className="text-slate-400 font-bold text-sm">تحدث بوضوح ليقوم الذكاء الاصطناعي بالتحليل</p></div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-10 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-700 mb-8 flex flex-col items-center gap-6 relative overflow-hidden">
                {isRecording && (<div className="absolute inset-0 bg-rose-500/5 flex items-center justify-center pointer-events-none"><div className="w-40 h-40 bg-rose-500/20 rounded-full animate-ping"></div></div>)}
                <div className="text-center z-10"><div className="text-4xl font-mono font-black mb-2 dark:text-white">{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</div></div>
                <div className="flex gap-4 z-10">
                  {!isRecording ? (
                    <button onClick={startRecording} className="w-20 h-20 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center shadow-xl hover:scale-110 transition-all"><Mic size={32} /></button>
                  ) : (
                    <button onClick={stopRecording} className="w-20 h-20 bg-rose-500 text-white rounded-[2rem] flex items-center justify-center shadow-xl hover:scale-110 transition-all"><Square size={32} /></button>
                  )}
                  <label className="w-20 h-20 bg-white dark:bg-slate-700 text-slate-600 dark:text-white rounded-[2rem] flex items-center justify-center shadow-lg cursor-pointer hover:scale-105 transition-all"><Upload size={32} /><input type="file" className="hidden" accept="audio/*" onChange={e => { if(e.target.files) { setAudioBlob(e.target.files[0]); } }} /></label>
                </div>
                {audioBlob && (<div className="bg-emerald-500/10 border border-emerald-500/20 px-6 py-3 rounded-2xl flex items-center gap-3 animate-in fade-in"><CheckCircle2 className="text-emerald-500" size={20} /><span className="text-[10px] font-black text-emerald-600">جاهز للتحليل</span></div>)}
              </div>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (<button key={cat} onClick={() => processAudioNote(cat)} disabled={!audioBlob || loading} className="flex-1 py-4 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white rounded-2xl font-black text-[10px] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm">{loading ? <Loader2 className="animate-spin" size={16} /> : <Tag size={16} />}{cat}</button>))}
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
