const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-3.5-flash';
const GEMINI_PROXY_ENDPOINT = import.meta.env.VITE_GEMINI_PROXY_ENDPOINT;

const systemInstruction = `You are the SM-CONNECT assistant for PT. Susanti Megah distributor channel users.
Answer in Indonesian, keep responses concise, and focus on app workflows such as order creation, approval,
reward claim, template upload, menu access, notifications, and dashboard usage. If the question needs private
account data or approval authority, tell the user to contact their administrator or related internal team.`;

const getOutputText = (data) => {
  if (data?.output_text) return data.output_text;

  const steps = Array.isArray(data?.steps) ? data.steps : [];
  const texts = steps.flatMap((step) => {
    const content = Array.isArray(step?.content) ? step.content : [];
    return content.map((item) => item?.text).filter(Boolean);
  });

  return texts.join('\n').trim();
};

class GeminiServices {
  async ask(question, previousInteractionId) {
    const trimmedQuestion = String(question || '').trim();

    if (!trimmedQuestion) {
      throw new Error('Pertanyaan tidak boleh kosong.');
    }

    if (GEMINI_PROXY_ENDPOINT) {
      const response = await fetch(GEMINI_PROXY_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question: trimmedQuestion,
          previous_interaction_id: previousInteractionId
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || 'Gemini proxy gagal menjawab.');
      }

      return {
        text: data?.answer || data?.output_text || getOutputText(data) || 'Gemini tidak mengembalikan jawaban.',
        interactionId: data?.id || data?.interaction_id || previousInteractionId
      };
    }

    if (!GEMINI_API_KEY) {
      throw new Error('Gemini belum dikonfigurasi. Tambahkan VITE_GEMINI_API_KEY atau VITE_GEMINI_PROXY_ENDPOINT.');
    }

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        input: trimmedQuestion,
        system_instruction: systemInstruction,
        previous_interaction_id: previousInteractionId || undefined,
        generation_config: {
          temperature: 0.4,
          thinking_level: 'low'
        }
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error?.message || 'Gemini gagal menjawab.');
    }

    return {
      text: getOutputText(data) || 'Gemini tidak mengembalikan jawaban.',
      interactionId: data?.id || previousInteractionId
    };
  }
}

export default new GeminiServices();
