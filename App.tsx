
import React, { useState, useEffect } from 'react';
import { User, PageId, Subject, Task, Note, StudyStats } from './types';
import { Auth } from './components/Auth';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { HelpBot } from './components/HelpBot';
import { Subjects } from './components/Subjects';
import { Timer } from './components/Timer';
import { AICreator } from './components/AICreator';
import { Blackboard } from './components/Blackboard';
import { Pricing } from './components/Pricing';
import { Planner } from './components/Planner';
import { MindMap } from './components/MindMap';
import { VoiceAssistant } from './components/VoiceAssistant';
import { ImageEditor } from './components/ImageEditor';
import { AIAssistant } from './components/AIAssistant';
import { MyNotes } from './components/MyNotes';
import { Privacy } from './components/Privacy';
import { translations } from './i18n';
import { Sun, Moon, Languages, Search, User as UserIcon, Sparkles } from 'lucide-react';
import { db } from './services/db';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentXP, setCurrentXP] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const [lang, setLang] = useState<'ar' | 'en'>(() => {
    const saved = localStorage.getItem('lang');
    return (saved as 'ar' | 'en') || 'ar';
  });
  
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    const initApp = async () => {
      const timeout = setTimeout(() => {
        if (isLoading) setIsLoading(false);
      }, 5000);

      try {
        const savedUser = await db.getUser();
        if (savedUser) {
          setUser(savedUser);
          const [subs, tasks, notes, stats] = await Promise.all([
            db.getSubjects(),
            db.getTasks(),
            db.getNotes(),
            db.getStudyStats()
          ]);
          setCurrentXP(db.calculateTotalXP(subs, tasks, notes, stats));
        }
      } catch (e) {
        console.error("Initialization Error:", e);
      } finally {
        clearTimeout(timeout);
        setIsLoading(false);
      }
    };
    initApp();
  }, []);

  useEffect(() => {
    if (user && !isLoading) {
      const refreshXP = async () => {
        try {
          const [subs, tasks, notes, stats] = await Promise.all([
            db.getSubjects(),
            db.getTasks(),
            db.getNotes(),
            db.getStudyStats()
          ]);
          setCurrentXP(db.calculateTotalXP(subs, tasks, notes, stats));
        } catch (e) {}
      };
      refreshXP();
    }
  }, [currentPage, user, isLoading]);

  useEffect(() => {
    localStorage.setItem('lang', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 font-cairo">
        <div className="relative mb-8">
          <div className="w-24 h-24 border-8 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin shadow-xl"></div>
          <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600 animate-pulse" size={32} />
        </div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white animate-pulse">جاري تحضير عالمك الذكي...</h2>
      </div>
    );
  }

  if (!user) {
    return (
      <Auth 
        onLogin={(u) => {
          db.saveUser(u);
          setUser(u);
        }} 
        lang={lang} 
        setLang={setLang} 
        isDark={isDark} 
        setIsDark={setIsDark} 
      />
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard user={user} lang={lang} setPage={setCurrentPage} />;
      case 'subjects': return <Subjects lang={lang} />;
      case 'ai-assistant': return <AIAssistant lang={lang} />;
      case 'planner': return <Planner lang={lang} />;
      case 'timer': return <Timer lang={lang} />;
      case 'mindmap': return <MindMap />;
      case 'creator': return <AICreator lang={lang} />;
      case 'voice': return <VoiceAssistant lang={lang} />;
      case 'blackboard': return <Blackboard lang={lang} />;
      case 'editor': return <ImageEditor />;
      case 'mynotes': return <MyNotes lang={lang} />;
      case 'pricing': return <Pricing lang={lang} user={user} />;
      case 'privacy': return <Privacy lang={lang} />;
      default: return <Dashboard user={user} lang={lang} setPage={setCurrentPage} />;
    }
  };

  const t = translations[lang];

  return (
    <div className={`flex min-h-screen bg-slate-50 dark:bg-slate-950 font-cairo transition-colors duration-500 ${lang === 'ar' ? 'flex-row' : 'flex-row-reverse'}`}>
      <Navigation currentPage={currentPage} setPage={setCurrentPage} lang={lang} onLogout={() => setUser(null)} />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-24 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-12 z-20 transition-all">
          <div className="flex items-center gap-6 flex-1">
             <div className="relative w-full max-w-md hidden md:block">
                <Search className={`absolute ${lang === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400`} size={18} />
                <input 
                  type="text" 
                  placeholder={t.search_placeholder}
                  className={`w-full bg-slate-100 dark:bg-slate-800/50 ${lang === 'ar' ? 'pr-12 pl-6' : 'pl-12 pr-6'} py-3 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-bold`}
                />
             </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl font-black text-xs hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 transition-all border border-transparent hover:border-indigo-200"
            >
              <Languages size={18} />
              <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
            </button>

            <button 
              onClick={() => setIsDark(!isDark)}
              className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600 transition-all"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-800 py-1.5 pr-1.5 pl-4 rounded-2xl border border-transparent hover:border-indigo-200 transition-all cursor-pointer">
               <div className="text-left leading-tight hidden sm:block">
                  <p className="text-sm font-black text-slate-900 dark:text-white">{user.full_name}</p>
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={12} className="text-amber-500 animate-pulse" />
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{currentXP} XP</p>
                  </div>
               </div>
               <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                  <UserIcon size={20} />
               </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
          {renderPage()}
        </main>
      </div>

      <HelpBot lang={lang} />
    </div>
  );
};

export default App;
