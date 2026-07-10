const LOCAL_AI_ENDPOINT = import.meta.env.VITE_LOCAL_AI_ENDPOINT;
const LOCAL_AI_MODEL = import.meta.env.VITE_LOCAL_AI_MODEL || 'llama3.1';
const LOCAL_AI_PROVIDER = import.meta.env.VITE_LOCAL_AI_PROVIDER || 'ollama';

const instructions = `You are Salti, the SM-CONNECT assistant for PT. Susanti Megah distributor channel users.
Answer in Indonesian, keep responses concise, and focus on app workflows such as order creation, approval,
reward claim, template upload, menu access, notifications, and dashboard usage. If the question needs private
account data or approval authority, tell the user to contact their administrator or related internal team.`;

const buildMessages = (messages, question) => {
  const history = Array.isArray(messages) ? messages.slice(-8) : [];

  return [
    {
      role: 'system',
      content: instructions
    },
    ...history.map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content
    })),
    {
      role: 'user',
      content: question
    }
  ];
};

const getResponseText = (data) => {
  if (data?.answer) return data.answer;
  if (data?.text) return data.text;
  if (data?.message?.content) return data.message.content;
  if (data?.response) return data.response;
  if (data?.choices?.[0]?.message?.content) return data.choices[0].message.content;

  return '';
};

class LocalAIService {
  async ask(question, messages = []) {
    const trimmedQuestion = String(question || '').trim();

    if (!trimmedQuestion) {
      throw new Error('Pertanyaan tidak boleh kosong.');
    }

    if (!LOCAL_AI_ENDPOINT) {
      throw new Error('AI lokal belum dikonfigurasi. Tambahkan VITE_LOCAL_AI_ENDPOINT di file env.');
    }

    const chatMessages = buildMessages(messages, trimmedQuestion);
    const provider = String(LOCAL_AI_PROVIDER).toLowerCase();
    const requestBody =
      provider === 'openai-compatible'
        ? {
            model: LOCAL_AI_MODEL,
            messages: chatMessages,
            temperature: 0.4,
            stream: false
          }
        : provider === 'proxy'
          ? {
              question: trimmedQuestion,
              messages,
              model: LOCAL_AI_MODEL
            }
          : {
              model: LOCAL_AI_MODEL,
              messages: chatMessages,
              stream: false,
              options: {
                temperature: 0.4
              }
            };

    const response = await fetch(LOCAL_AI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.message || data?.error?.message || 'AI lokal gagal menjawab.');
    }

    return {
      text: getResponseText(data) || 'AI lokal tidak mengembalikan jawaban.'
    };
  }
}

export default new LocalAIService();
