
import React, { useState } from 'react';
import { User } from '../types';
import { db } from '../services/db';
import { translations } from '../i18n';
import { Sun, Moon, Languages, GraduationCap, ArrowRight, User as UserIcon, Mail, Lock, Sparkles, ShieldCheck, Loader2 } from 'lucide-react';

interface AuthProps {
  onLogin: (user: User) => void;
  lang: 'ar' | 'en';
  setLang: (l: 'ar' | 'en') => void;
  isDark: boolean;
  setIsDark: (d: boolean) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin, lang, setLang, isDark, setIsDark }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const t = translations[lang];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const userData: User = {
      id: '00000000-0000-0000-0000-000000000001',
      email,
      full_name: activeTab === 'register' ? fullName : (email.split('@')[0] || (lang === 'ar' ? 'طالب ذكي' : 'Smart Student')),
      xp: 120,
      subjects_count: 4
    };
    
    await db.saveUser(userData);
    onLogin(userData);
    setIsLoading(false);
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    const userData: User = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'user@gmail.com',
      full_name: lang === 'ar' ? 'مستخدم جوجل' : 'Google User',
      xp: 100,
      subjects_count: 0
    };
    await db.saveUser(userData);
    onLogin(userData);
    setIsGoogleLoading(false);
  };

  return (
    <div className={`min-h-screen flex flex-col relative overflow-hidden font-cairo transition-colors duration-500 ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 bg-center bg-cover scale-105 transition-transform duration-[10s] ease-linear"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2070&auto=format&fit=crop')`,
            animation: 'pan-bg 20s infinite alternate'
          }}
        ></div>
        
        <div className={`absolute inset-0 transition-all duration-700 ${isDark 
          ? 'bg-gradient-to-tr from-slate-950/95 via-slate-900/80 to-indigo-900/40' 
          : 'bg-gradient-to-tr from-white/90 via-white/50 to-indigo-100/30'}`}
        ></div>

        <div className="absolute -top-40 -left-40 w-[50rem] h-[50rem] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute -bottom-40 -right-40 w-[50rem] h-[50rem] bg-purple-600/10 rounded-full blur-[120px] animate-pulse delay-1000"></div>
      </div>

      <header className="relative z-20 w-full px-8 py-6 md:px-16 flex justify-between items-center">
        <div className="flex items-center gap-4 group">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/30">
            <GraduationCap size={28} />
          </div>
          <div className="flex flex-col">
            <span className={`text-2xl font-black tracking-tighter drop-shadow-sm transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {t.auth_title}
            </span>
            <span className={`text-[9px] font-black uppercase tracking-[0.3em] leading-none opacity-80 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>Smart Student AI Platform</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className={`flex items-center gap-2 px-5 py-2.5 backdrop-blur-md border rounded-2xl font-black text-xs transition-all ${isDark ? 'bg-white/10 border-white/10 text-white hover:bg-white/20' : 'bg-white/80 border-slate-200 text-slate-900 hover:bg-slate-100'}`}
          >
            <Languages size={18} />
            <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
          </button>

          <button 
            onClick={() => setIsDark(!isDark)}
            className={`p-3 backdrop-blur-md border rounded-2xl transition-all ${isDark ? 'bg-white/10 border-white/10 text-amber-400 hover:bg-white/20' : 'bg-white/80 border-slate-200 text-amber-600 hover:bg-slate-100'}`}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className={`backdrop-blur-3xl rounded-[3.5rem] p-10 md:p-14 w-full max-w-lg shadow-[0_50px_100px_rgba(0,0,0,0.15)] border transition-all animate-in fade-in zoom-in duration-700 ${isDark ? 'bg-slate-900/70 border-white/10' : 'bg-white/80 border-white/40'}`}>
          
          <div className="text-center mb-10">
            <div className={`inline-flex p-4 rounded-3xl mb-6 transition-all ${isDark ? 'bg-indigo-400/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
              <Sparkles size={44} className="animate-pulse" />
            </div>
            <h2 className={`text-4xl font-black mb-3 tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {activeTab === 'login' ? (lang === 'ar' ? 'مرحباً بعودتك' : 'Welcome Back') : (lang === 'ar' ? 'انضم إلينا اليوم' : 'Join Us Today')}
            </h2>
            <p className={`text-sm font-bold uppercase tracking-[0.2em] opacity-70 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {t.auth_subtitle}
            </p>
          </div>

          <div className={`flex p-1.5 rounded-3xl mb-10 border transition-all ${isDark ? 'bg-slate-800/50 border-white/5' : 'bg-slate-100/50 border-slate-200'}`}>
            <button 
              type="button"
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all ${activeTab === 'login' ? (isDark ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20' : 'bg-white text-indigo-600 shadow-md') : 'text-slate-500 hover:opacity-80'}`}
            >
              {t.auth_login_tab}
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('register')}
              className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all ${activeTab === 'register' ? (isDark ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20' : 'bg-white text-indigo-600 shadow-md') : 'text-slate-500 hover:opacity-80'}`}
            >
              {t.auth_register_tab}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTab === 'register' && (
              <div className="relative group">
                <input 
                  type="text" required value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder={t.auth_name_placeholder}
                  className={`w-full px-7 py-5 pr-14 border rounded-[2rem] transition-all outline-none font-bold text-lg placeholder:text-slate-400 ${isDark ? 'bg-slate-800/50 border-slate-700 text-white focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-600'}`}
                />
                <div className={`absolute ${lang === 'ar' ? 'right-6' : 'left-6'} top-1/2 -translate-y-1/2 transition-colors ${isDark ? 'text-slate-500 group-focus-within:text-indigo-400' : 'text-slate-400 group-focus-within:text-indigo-600'}`}>
                  <UserIcon size={22} />
                </div>
              </div>
            )}
            
            <div className="relative group">
              <input 
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder={t.auth_email_placeholder}
                className={`w-full px-7 py-5 pr-14 border rounded-[2rem] transition-all outline-none font-bold text-lg placeholder:text-slate-400 ${isDark ? 'bg-slate-800/50 border-slate-700 text-white focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-600'}`}
              />
              <div className={`absolute ${lang === 'ar' ? 'right-6' : 'left-6'} top-1/2 -translate-y-1/2 transition-colors ${isDark ? 'text-slate-500 group-focus-within:text-indigo-400' : 'text-slate-400 group-focus-within:text-indigo-600'}`}>
                <Mail size={22} />
              </div>
            </div>

            <div className="relative group">
              <input 
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                placeholder={t.auth_password_placeholder}
                className={`w-full px-7 py-5 pr-14 border rounded-[2rem] transition-all outline-none font-bold text-lg placeholder:text-slate-400 ${isDark ? 'bg-slate-800/50 border-slate-700 text-white focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-600'}`}
              />
              <div className={`absolute ${lang === 'ar' ? 'right-6' : 'left-6'} top-1/2 -translate-y-1/2 transition-colors ${isDark ? 'text-slate-500 group-focus-within:text-indigo-400' : 'text-slate-400 group-focus-within:text-indigo-600'}`}>
                <Lock size={22} />
              </div>
            </div>
            
            <button 
              type="submit" disabled={isLoading || isGoogleLoading}
              className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-indigo-500/30 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 mt-8 flex items-center justify-center gap-4"
            >
              {isLoading ? (
                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>{activeTab === 'login' ? t.auth_submit_login : t.auth_submit_register}</span>
                  <ArrowRight size={26} className={lang === 'ar' ? 'rotate-180' : ''} />
                </>
              )}
            </button>
          </form>

          <div className="mt-10">
            <div className="flex items-center gap-6 mb-8">
              <div className={`flex-1 h-px ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">{t.auth_or}</span>
              <div className={`flex-1 h-px ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
            </div>
            
            <button 
              onClick={handleGoogleLogin}
              disabled={isLoading || isGoogleLoading}
              className={`w-full py-5 border rounded-[2rem] font-black flex items-center justify-center gap-4 transition-all active:scale-95 group disabled:opacity-50 ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-200 hover:bg-slate-800' : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-50'}`}
            >
              {isGoogleLoading ? (
                <Loader2 className="animate-spin text-indigo-600" size={24} />
              ) : (
                <svg viewBox="0 0 24 24" className="w-7 h-7 group-hover:scale-110 transition-transform">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              <span>{t.auth_google_login}</span>
            </button>
          </div>

          <div className={`mt-10 flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-[0.2em] opacity-80 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
            <ShieldCheck size={16} />
            <span>نظام تعليمي آمن وذكي بالكامل</span>
          </div>
        </div>
      </main>

      <footer className="relative z-10 p-10 text-center">
        <p className={`font-black text-[10px] uppercase tracking-[0.5em] transition-colors ${isDark ? 'text-white opacity-40' : 'text-slate-900 opacity-20'}`}>
          &copy; 2025 {t.auth_title} • Leading Educational Innovation
        </p>
      </footer>

      <style>{`
        @keyframes pan-bg {
          from { transform: scale(1.05) translate(0, 0); }
          to { transform: scale(1.1) translate(-1%, -1%); }
        }
      `}</style>
    </div>
  );
};
