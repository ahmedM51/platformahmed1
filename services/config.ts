
export const CONFIG = {
  // قراءة مفتاح Gemini من البيئة
  GEMINI_API_KEY: process.env.API_KEY || '',
  // بيانات Supabase للتزامن
  SUPABASE_URL: 'https://cmaxutqmblvvghftouqx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4bWh3d292eHJuZWZpcnl5d3ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MzgzNjQsImV4cCI6MjA3MjAxNDM2NH0.FqzkWel93icaJ781ZCPhvzfVJu4iwqCa3hxV3AKuRlA',
  IS_PROD: true
};
