
import React from 'react';
import { Check, Zap, Shield, Star } from 'lucide-react';

export const Pricing: React.FC = () => {
  const plans = [
    {
      name: 'الخطة المجانية',
      price: '0',
      desc: 'للبداية في تنظيم دراستك',
      features: ['5 مواد دراسية', 'المساعد الذكي (محدود)', 'السبورة الأساسية', 'مؤقت بومودورو'],
      color: 'bg-gray-500',
      popular: false
    },
    {
      name: 'الخطة الاحترافية',
      price: '19',
      desc: 'لتحقيق أقصى استفادة تعليمية',
      features: ['مواد غير محدودة', 'ذكاء اصطناعي متقدم', 'منشئ عروض احترافي', 'مزامنة سحابية', 'دعم فني سريع'],
      color: 'bg-indigo-600',
      popular: true
    },
    {
      name: 'خطة النخبة',
      price: '49',
      desc: 'للمجموعات والطلاب المتميزين',
      features: ['كل ميزات البرو', 'دروس خصوصية AI', 'مساحة تخزين 100GB', 'شهادات إكمال', 'بدون إعلانات نهائياً'],
      color: 'bg-purple-700',
      popular: false
    }
  ];

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <h2 className="text-4xl font-black dark:text-white">اختر خطة النجاح المناسبة لك</h2>
        <p className="text-gray-500 text-lg">استثمر في مستقبلك مع أدواتنا التعليمية المتطورة المدعومة بالذكاء الاصطناعي</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div key={plan.name} className={`relative bg-white dark:bg-gray-800 p-10 rounded-[4rem] shadow-2xl border-2 transition-all hover:scale-105 ${plan.popular ? 'border-indigo-600' : 'border-transparent dark:border-gray-700'}`}>
            {plan.popular && (
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-6 py-2 rounded-full font-bold text-sm flex items-center gap-2">
                <Star size={14} fill="white" /> الأكثر اختياراً
              </div>
            )}
            
            <div className="text-center mb-8">
              <h3 className="text-2xl font-black dark:text-white mb-2">{plan.name}</h3>
              <p className="text-gray-500 text-sm font-medium">{plan.desc}</p>
              <div className="mt-6 flex justify-center items-baseline gap-1">
                <span className="text-5xl font-black dark:text-white">${plan.price}</span>
                <span className="text-gray-400 font-bold">/شهرياً</span>
              </div>
            </div>

            <div className="space-y-4 mb-10">
              {plan.features.map(f => (
                <div key={f} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white ${plan.color}`}>
                    <Check size={14} />
                  </div>
                  <span className="text-gray-600 dark:text-gray-300 font-bold text-sm">{f}</span>
                </div>
              ))}
            </div>

            <button className={`w-full py-5 rounded-3xl font-black text-lg transition-all shadow-xl ${plan.popular ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-200'}`}>
              اشترك الآن
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
