
import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, Volume2, Sparkles, Loader2, 
  Upload, Video, Headphones, Download, FileText, 
  X, Image as ImageIcon, Waves, FileAudio,
  Radio, Monitor, Info, ShieldAlert, Cpu, Film,
  Download as DownloadIcon, Play
} from 'lucide-react';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";

// --- Helpers ---
const encode = (bytes: Uint8Array) => {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

const decode = (base64: string) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
};

const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const buffer = ctx.createBuffer(1, dataInt16.length, sampleRate);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
  return buffer;
};

export const VoiceAssistant: React.FC<{ lang?: 'ar' | 'en' }> = ({ lang = 'ar' }) => {
  const [isLive, setIsLive] = useState(false);
  const [lectureText, setLectureText] = useState('');
  const [fileType, setFileType] = useState<'text' | 'image' | 'pdf' | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoStatus, setVideoStatus] = useState('');
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (file.type === 'application/pdf') {
        const pdfjs = (window as any).pdfjsLib;
        const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
        let text = '';
        for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((it: any) => it.str).join(' ') + '\n';
        }
        setLectureText(text); setFileType('pdf'); setImageData(null);
      } else if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => { setImageData(ev.target?.result as string); setFileType('image'); };
        reader.readAsDataURL(file);
      } else {
        setLectureText(await file.text()); setFileType('text'); setImageData(null);
      }
    } catch (err) { alert("خطأ في التحميل"); }
  };

  const generateAudioLesson = async () => {
    if (!lectureText && !imageData) return alert("ارفع ملفاً أولاً");
    setIsAudioLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `شرح تعليمي صوتي مكثف وبأسلوب بودكاست ممتع للمحتوى التالي: ${lectureText.substring(0, 10000)}`;
      const res = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } }
      });
      const audioBase64 = res.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audioBase64) {
        const blob = new Blob([decode(audioBase64)], { type: 'audio/pcm' });
        setAudioUrl(URL.createObjectURL(blob));
      }
    } catch (e) { alert("فشل توليد الصوت"); } finally { setIsAudioLoading(false); }
  };

  const generateVideoLesson = async () => {
    if (!lectureText && !imageData) return alert("ارفع ملفاً أولاً");
    setIsVideoLoading(true); setVideoStatus('جاري التحليل العلمي للمحتوى...');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: `Educational scientific animation explaining: ${lectureText.substring(0, 100) || "Modern Science"}. 4k, professional lighting.`,
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
      });
      setVideoStatus('جاري رندرة الفيديو (بضع دقائق)...');
      let op = operation;
      while (!op.done) {
        await new Promise(r => setTimeout(r, 10000));
        op = await ai.operations.getVideosOperation({ operation: op });
      }
      const uri = op.response?.generatedVideos?.[0]?.video?.uri;
      if (uri) {
        const res = await fetch(`${uri}&key=${process.env.API_KEY}`);
        setVideoUrl(URL.createObjectURL(await res.blob()));
      }
    } catch (e) { alert("فشل توليد الفيديو"); } finally { setIsVideoLoading(false); }
  };

  return (
    <div className={`flex flex-col h-[calc(100vh-10rem)] gap-8 animate-in fade-in duration-700 ${lang === 'ar' ? 'rtl' : 'ltr'}`}>
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[3.5rem] shadow-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[2rem] bg-indigo-600 flex items-center justify-center text-white shadow-xl">
            {isVideoLoading ? <Loader2 className="animate-spin" /> : <Cpu size={28} />}
          </div>
          <div>
            <h2 className="text-2xl font-black">{lang === 'ar' ? 'مرسم المحاضرات الذكي' : 'Smart Lecture Lab'}</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{fileType ? `المرجع: ${fileType}` : 'ارفع ملفك لتحويله لفيديو أو بودكاست'}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <label className="p-4 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white rounded-2xl cursor-pointer transition-all border dark:border-slate-700">
             <Upload size={24} /><input type="file" className="hidden" accept=".pdf,.txt,image/*" onChange={handleFileUpload} />
          </label>
          <button onClick={generateAudioLesson} disabled={isAudioLoading} className="px-8 py-4 bg-amber-500 text-white rounded-2xl font-black flex items-center gap-3 shadow-lg hover:scale-105 transition-all">
            <Headphones size={22} /> {lang === 'ar' ? 'بودكاست الشرح' : 'Audio Podcast'}
          </button>
          <button onClick={generateVideoLesson} disabled={isVideoLoading} className="px-8 py-4 bg-purple-600 text-white rounded-2xl font-black flex items-center gap-3 shadow-lg hover:scale-105 transition-all">
            <Video size={22} /> {lang === 'ar' ? 'توليد فيديو تعليمي' : 'Generate AI Video'}
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-hidden">
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-[4rem] shadow-2xl border dark:border-slate-800 p-10 flex flex-col relative overflow-hidden">
           {videoUrl ? (
             <video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover rounded-[2.5rem] shadow-2xl" />
           ) : isVideoLoading ? (
             <div className="h-full flex flex-col items-center justify-center space-y-8">
                <div className="relative"><div className="w-24 h-24 border-8 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div><Film className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-400 animate-pulse" /></div>
                <p className="text-xl font-black animate-pulse">{videoStatus}</p>
             </div>
           ) : (
             <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-6">
                <Monitor size={100} /><h3 className="text-2xl font-black">شاشة العرض التعليمية</h3>
             </div>
           )}
        </div>

        <div className="lg:col-span-5 flex flex-col gap-6">
           <div className="flex-1 bg-slate-950 rounded-[4rem] p-10 text-white shadow-2xl border-4 border-indigo-600/20 flex flex-col justify-between">
              <div>
                <h4 className="text-xl font-black mb-2 flex items-center gap-3 text-indigo-400"><Waves /> المناقشة الحية</h4>
                <p className="text-slate-500 font-bold text-sm">تحدث مع محتوى الدرس مباشرة وسأجيبك صوتياً.</p>
              </div>
              <button onClick={() => setIsLive(!isLive)} className={`w-full py-6 rounded-3xl font-black text-xl transition-all shadow-2xl flex items-center justify-center gap-4 ${isLive ? 'bg-rose-500 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                {isLive ? <X /> : <Mic size={32} />} {isLive ? 'إنهاء الجلسة' : 'بدء الحوار الذكي'}
              </button>
           </div>
           {audioUrl && (
             <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-[2.5rem] border border-emerald-100 flex items-center justify-between animate-in slide-in-from-bottom-4">
                <div className="flex items-center gap-4"><FileAudio className="text-emerald-500" /><p className="font-black text-sm">البودكاست جاهز!</p></div>
                <a href={audioUrl} download="Smart_Lesson.mp3" className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg"><DownloadIcon /></a>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
