
import React, { useState } from 'react';
import { Sparkles, FileText, Download, Send, Loader2 } from 'lucide-react';
import { getAIResponse } from '../services/geminiService';

export const Creator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    const fullPrompt = `قم بإنشاء ملخص تعليمي شامل ومنظم عن: ${prompt}. استخدم العناوين، النقاط، وأمثلة توضيحية.`;
    const res = await getAIResponse(fullPrompt);
    setResult(res);
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-black dark:text-white flex items-center justify-center gap-4">
          <Sparkles className="text-yellow-500 animate-pulse" /> منشئ المحتوى الذكي
        </h2>
        <p className="text-gray-500 text-lg">حول أي فكرة أو موضوع إلى ملخص تعليمي متكامل في ثوانٍ</p>
      </div>

      <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] shadow-xl border dark:border-gray-700">
        <div className="flex gap-4">
          <input 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="مثال: قوانين نيوتن للحركة، تاريخ الدولة الأموية..."
            className="flex-1 px-8 py-5 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl dark:text-white focus:ring-2 focus:ring-indigo-500 text-lg"
          />
          <button 
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-3 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Send size={24} />}
            توليد
          </button>
        </div>
      </div>

      {result && (
        <div className="bg-white dark:bg-gray-800 p-12 rounded-[3rem] shadow-xl border dark:border-gray-700 animate-in slide-in-from-bottom-10">
          <div className="flex justify-between items-center mb-10 pb-6 border-b dark:border-gray-700">
            <h3 className="text-2xl font-black dark:text-white flex items-center gap-3">
              <FileText className="text-indigo-600" /> المحتوى المولد
            </h3>
            <button className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all group">
              <Download className="text-gray-500 group-hover:text-indigo-600" />
            </button>
          </div>
          <div className="prose prose-indigo dark:prose-invert max-w-none whitespace-pre-wrap dark:text-gray-300 leading-loose text-lg font-medium">
            {result}
          </div>
        </div>
      )}
    </div>
  );
};
