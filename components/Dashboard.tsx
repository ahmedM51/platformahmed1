
import React, { useState, useEffect } from 'react';
import { User, PageId, Subject, Task } from '../types';
import { translations } from '../i18n';
import { 
  ChartLine, Calendar as CalendarIcon, Clock,
  Sparkles, ArrowUpRight, Zap, ListChecks,
  Target, GraduationCap, PlayCircle, Facebook, MessageCircle, Phone
} from 'lucide-react';
import { db } from '../services/db';

interface DashboardProps {
  user: User;
  lang: 'ar' | 'en';
  setPage: (p: PageId) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, lang, setPage }) => {
  const t = translations[lang];
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);

  // Fix: Correctly await asynchronous database calls to handle promises
  useEffect(() => {
    const loadInitialData = async () => {
      const loadedTasks = await db.getTasks();
      setTasks(loadedTasks);
      const loadedSubs = await db.getSubjects();
      setSubjects(loadedSubs);
      if (loadedSubs.length > 0) {
        const avg = loadedSubs.reduce((acc, curr) => acc + curr.progress, 0) / loadedSubs.length;
        setOverallProgress(Math.round(avg));
      }
    };
    loadInitialData();
  }, []);

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      {/* Hero Video Section */}
      <section className="relative overflow-hidden bg-slate-900 rounded-[3.5rem] p-8 md:p-12 text-white shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
          <div className="space-y-6">
            <h2 className="text-4xl md:text-5xl font-black leading-tight">
              {t.home_welcome}، <br/> <span className="text-indigo-400">{user.full_name}</span>
            </h2>
            <p className="text-slate-400 text-lg font-medium">
              {lang === 'ar' ? 'مرحباً بك في منصة الطالب الذكي - مستقبلك التعليمي يبدأ بذكاء هنا.' : 'Welcome to Smart Student Platform - Your educational future starts here intelligently.'}
            </p>
            <div className="flex gap-4">
              <button onClick={() => setPage('planner')} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black flex items-center gap-2 hover:bg-indigo-700 transition-all">
                {lang === 'ar' ? 'استكمل خطتك' : 'Resume Plan'} <ArrowUpRight size={20} />
              </button>
              <button onClick={() => setPage('voice')} className="px-8 py-4 bg-white/10 text-white rounded-2xl font-black border border-white/10 hover:bg-white/20 transition-all">
                {lang === 'ar' ? 'تحدث مع دكتورك الذكي' : 'Talk to AI Doctor'}
              </button>
            </div>
          </div>
          <div className="relative group">
            <div className="aspect-video bg-slate-800 rounded-3xl overflow-hidden shadow-2xl border border-white/10">
              <img src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070&auto=format&fit=crop" className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" alt="Intro" />
              <div className="absolute inset-0 flex items-center justify-center">
                <button className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-all">
                  <PlayCircle size={40} fill="white" />
                </button>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 bg-amber-400 text-slate-900 p-4 rounded-2xl font-black shadow-xl animate-bounce">
              {lang === 'ar' ? 'شاهد الفيديو التعريفي 🎥' : 'Watch Intro Video 🎥'}
            </div>
          </div>
        </div>
      </section>

      {/* Advanced Stats */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: t.home_stats_tasks, val: tasks.length, color: 'text-indigo-600', icon: Zap },
          { label: lang === 'ar' ? 'المحاضرات المنجزة' : 'Completed Lectures', val: subjects.reduce((a, s) => a + s.lectures.filter(l => l.isCompleted).length, 0), color: 'text-emerald-600', icon: ListChecks },
          { label: lang === 'ar' ? 'متوسط التقدم' : 'Average Progress', val: `${overallProgress}%`, color: 'text-amber-600', icon: ChartLine },
          { label: lang === 'ar' ? 'ساعات الدراسة' : 'Study Hours', val: '14.2h', color: 'text-rose-600', icon: Clock },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-lg border border-slate-100 dark:border-slate-800 flex items-center gap-5">
            <div className={`w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center ${stat.color}`}>
              <stat.icon size={28} />
            </div>
            <div>
              <p className="text-3xl font-black dark:text-white">{stat.val}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Footer & Social */}
      <footer className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className={`${lang === 'ar' ? 'text-right' : 'text-left'}`}>
          <h3 className="text-xl font-black dark:text-white mb-2">{lang === 'ar' ? 'تواصل معنا مباشرة' : 'Contact Us Directly'}</h3>
          <p className="text-slate-500 font-medium flex items-center gap-2">
            {lang === 'ar' ? 'فريق الدعم متاح عبر الوتس:' : 'Support Team via WhatsApp:'} <span className="text-emerald-600 font-black" dir="ltr">01025612869</span>
          </p>
        </div>
        <div className="flex gap-4">
          <a href="https://www.facebook.com/share/1AtY6UZJQF/" target="_blank" rel="noopener noreferrer" className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center hover:scale-110 transition-all shadow-md" title={t.contact_facebook}>
            <Facebook size={24} />
          </a>
          <a href="https://wa.me/201025612869" target="_blank" rel="noopener noreferrer" className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl flex items-center justify-center hover:scale-110 transition-all shadow-md" title={t.contact_whatsapp}>
            <MessageCircle size={24} />
          </a>
          <a href="tel:01025612869" className="w-14 h-14 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-2xl flex items-center justify-center hover:scale-110 transition-all shadow-md" title={t.contact_phone}>
            <Phone size={24} />
          </a>
        </div>
      </footer>
    </div>
  );
};
