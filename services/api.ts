export const fetchAIResponse = async (message: string, context?: string) => {
  const r = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: message, context: context || "عام" }),
  });

  const data = await r.json();

  if (!r.ok) {
    return data?.error || "حصل خطأ في خدمة الذكاء الاصطناعي.";
  }

  return data?.text || "مفيش رد واضح.";
};
