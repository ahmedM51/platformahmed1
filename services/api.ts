
export const fetchAIResponse = async (message: string, context?: string) => {
  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, context }),
    });
    const data = await response.json();
    return data.text || "لا يوجد رد.";
  } catch (error) {
    console.error("API Error:", error);
    return "خطأ في الاتصال بالخادم.";
  }
};
