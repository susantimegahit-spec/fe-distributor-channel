import { useState } from 'react';

import SingleCharacter from 'assets/images/single-character.png';
import GeminiServices from '../services/GeminiServices';

const faqItems = [
  {
    question: 'Bagaimana cara membuat order?',
    answer: 'Buka menu Order, pilih Add Order, lengkapi customer, item, qty, harga, lalu submit untuk proses approval.'
  },
  {
    question: 'Bagaimana cara claim reward?',
    answer: 'Buka Reward & Claim, download template, isi data sell-out sesuai format, lalu upload file Excel di menu Claim.'
  },
  {
    question: 'Kenapa menu tidak muncul?',
    answer: 'Akses menu mengikuti role dan permission akun. Hubungi administrator jika membutuhkan akses tambahan.'
  },
  {
    question: 'Apa yang harus dicek saat upload gagal?',
    answer: 'Pastikan format file XLS atau XLSX, ukuran file sesuai batas, dan kolom wajib pada template sudah terisi.'
  }
];

export default function FloatingFaq() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('faq');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [previousInteractionId, setPreviousInteractionId] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [aiError, setAiError] = useState('');

  const handleAskAi = async (event) => {
    event.preventDefault();

    const nextQuestion = question.trim();
    if (!nextQuestion || isAsking) return;

    setQuestion('');
    setAiError('');
    setIsAsking(true);
    setMessages((current) => [...current, { role: 'user', content: nextQuestion }]);

    try {
      const response = await GeminiServices.ask(nextQuestion, previousInteractionId);

      setPreviousInteractionId(response.interactionId || previousInteractionId);
      setMessages((current) => [...current, { role: 'assistant', content: response.text }]);
    } catch (error) {
      setAiError(error?.message || 'Gemini gagal menjawab.');
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className={`sm-floating-faq ${isOpen ? 'is-open' : ''}`}>
      {isOpen && (
        <section className="sm-floating-faq-panel" aria-label="FAQ bantuan">
          <div className="sm-floating-faq-header">
            <div>
              <span className="sm-floating-faq-eyebrow">FAQ</span>
              <h6>Bantuan Cepat</h6>
            </div>
            <button type="button" className="sm-floating-faq-close" onClick={() => setIsOpen(false)} aria-label="Tutup FAQ">
              <i className="ti ti-x" />
            </button>
          </div>
          {/* <div className="sm-floating-faq-tabs" role="tablist" aria-label="Pilihan bantuan">
            <button
              type="button"
              className={activeTab === 'faq' ? 'active' : ''}
              onClick={() => setActiveTab('faq')}
              role="tab"
              aria-selected={activeTab === 'faq'}
            >
              FAQ
            </button>
            <button
              type="button"
              className={activeTab === 'ai' ? 'active' : ''}
              onClick={() => setActiveTab('ai')}
              role="tab"
              aria-selected={activeTab === 'ai'}
            >
              Tanya Salti
            </button>
          </div> */}
          {activeTab === 'faq' ? (
            <div className="sm-floating-faq-list">
              {faqItems.map((item) => (
                <details key={item.question} className="sm-floating-faq-item">
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          ) : (
            <div className="sm-floating-ai">
              <div className="sm-floating-ai-messages" aria-live="polite">
                {messages.length === 0 && (
                  <div className="sm-floating-ai-empty">Tanyakan cara membuat order, claim reward, upload template, atau akses menu.</div>
                )}
                {messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`sm-floating-ai-message ${message.role}`}>
                    {message.content}
                  </div>
                ))}
                {isAsking && <div className="sm-floating-ai-message assistant">Gemini sedang menjawab...</div>}
              </div>
              {aiError && <div className="sm-floating-ai-error">{aiError}</div>}
              <form className="sm-floating-ai-form" onSubmit={handleAskAi}>
                <input
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Tulis pertanyaan..."
                  aria-label="Pertanyaan untuk AI"
                  disabled={isAsking}
                />
                <button type="submit" disabled={!question.trim() || isAsking} aria-label="Kirim pertanyaan ke AI">
                  <i className={isAsking ? 'ti ti-loader-2' : 'ti ti-send'} />
                </button>
              </form>
            </div>
          )}
        </section>
      )}

      <button
        type="button"
        className="sm-floating-faq-button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Tutup FAQ' : 'Buka FAQ'}
      >
        <img src={SingleCharacter} alt="" aria-hidden="true" />
      </button>
    </div>
  );
}
