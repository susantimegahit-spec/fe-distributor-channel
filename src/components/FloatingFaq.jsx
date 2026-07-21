import { useEffect, useRef, useState } from 'react';

import SaltyImage from 'assets/images/salty2.png';
import LocalAIService from '../services/shared/LocalAIService';

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

const FAQ_POSITION_KEY = 'sm-floating-faq-position';
const VIEWPORT_GAP = 16;
const DRAG_THRESHOLD = 5;

const clampPosition = (position, element) => ({
  x: Math.min(Math.max(position.x, VIEWPORT_GAP), Math.max(VIEWPORT_GAP, window.innerWidth - element.offsetWidth - VIEWPORT_GAP)),
  y: Math.min(Math.max(position.y, VIEWPORT_GAP), Math.max(VIEWPORT_GAP, window.innerHeight - element.offsetHeight - VIEWPORT_GAP))
});

export default function FloatingFaq() {
  const wrapperRef = useRef(null);
  const dragRef = useRef(null);
  const draggedRef = useRef(false);
  const positionRef = useRef(null);
  const throwFrameRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('faq');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [isAsking, setIsAsking] = useState(false);
  const [aiError, setAiError] = useState('');
  const [position, setPosition] = useState(null);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return undefined;

    let savedPosition;
    try {
      savedPosition = JSON.parse(localStorage.getItem(FAQ_POSITION_KEY));
    } catch {
      savedPosition = null;
    }

    const initialPosition =
      savedPosition && Number.isFinite(savedPosition.x) && Number.isFinite(savedPosition.y)
        ? savedPosition
        : {
            x: window.innerWidth - element.offsetWidth - 24,
            y: window.innerHeight - element.offsetHeight - 24
          };

    const nextPosition = clampPosition(initialPosition, element);
    positionRef.current = nextPosition;
    setPosition(nextPosition);

    const handleResize = () => {
      setPosition((current) => {
        const resizedPosition = current ? clampPosition(current, element) : current;
        positionRef.current = resizedPosition;
        return resizedPosition;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (throwFrameRef.current) cancelAnimationFrame(throwFrameRef.current);
    };
  }, []);

  const savePosition = (nextPosition) => {
    if (!nextPosition) return;
    try {
      localStorage.setItem(FAQ_POSITION_KEY, JSON.stringify(nextPosition));
    } catch {
      // Interaksi tetap berfungsi saat penyimpanan browser tidak tersedia.
    }
  };

  const throwIcon = (velocityX, velocityY) => {
    const element = wrapperRef.current;
    if (!element || !positionRef.current) return;

    let lastTime = performance.now();
    let vx = velocityX;
    let vy = velocityY;

    const animate = (currentTime) => {
      const delta = Math.min(currentTime - lastTime, 32);
      lastTime = currentTime;

      const minX = VIEWPORT_GAP;
      const minY = VIEWPORT_GAP;
      const maxX = Math.max(minX, window.innerWidth - element.offsetWidth - VIEWPORT_GAP);
      const maxY = Math.max(minY, window.innerHeight - element.offsetHeight - VIEWPORT_GAP);
      let x = positionRef.current.x + vx * delta;
      let y = positionRef.current.y + vy * delta;

      if (x <= minX || x >= maxX) {
        x = Math.min(Math.max(x, minX), maxX);
        vx *= -0.65;
      }
      if (y <= minY || y >= maxY) {
        y = Math.min(Math.max(y, minY), maxY);
        vy *= -0.65;
      }

      const friction = Math.pow(0.94, delta / 16);
      vx *= friction;
      vy *= friction;

      const nextPosition = { x, y };
      positionRef.current = nextPosition;
      setPosition(nextPosition);

      if (Math.hypot(vx, vy) > 0.025) {
        throwFrameRef.current = requestAnimationFrame(animate);
      } else {
        throwFrameRef.current = null;
        savePosition(nextPosition);
      }
    };

    throwFrameRef.current = requestAnimationFrame(animate);
  };

  const handlePointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return;

    const element = wrapperRef.current;
    if (!element) return;

    if (throwFrameRef.current) {
      cancelAnimationFrame(throwFrameRef.current);
      throwFrameRef.current = null;
    }

    const rect = element.getBoundingClientRect();
    draggedRef.current = false;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      lastX: event.clientX,
      lastY: event.clientY,
      lastTime: performance.now(),
      velocityX: 0,
      velocityY: 0
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    const element = wrapperRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !element) return;

    if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) >= DRAG_THRESHOLD) {
      draggedRef.current = true;
    }

    if (!draggedRef.current) return;
    const currentTime = performance.now();
    const delta = Math.max(currentTime - drag.lastTime, 1);
    drag.velocityX = (event.clientX - drag.lastX) / delta;
    drag.velocityY = (event.clientY - drag.lastY) / delta;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    drag.lastTime = currentTime;

    const nextPosition = clampPosition(
      {
        x: event.clientX - drag.offsetX,
        y: event.clientY - drag.offsetY
      },
      element
    );
    positionRef.current = nextPosition;
    setPosition(nextPosition);
  };

  const handlePointerUp = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (draggedRef.current && Math.hypot(drag.velocityX, drag.velocityY) > 0.08) {
      throwIcon(drag.velocityX, drag.velocityY);
    } else {
      savePosition(positionRef.current);
    }
  };

  const handleToggle = () => {
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    setIsOpen((current) => !current);
  };

  const handleAskAi = async (event) => {
    event.preventDefault();

    const nextQuestion = question.trim();
    if (!nextQuestion || isAsking) return;

    setQuestion('');
    setAiError('');
    setIsAsking(true);
    setMessages((current) => [...current, { role: 'user', content: nextQuestion }]);

    try {
      const response = await LocalAIService.ask(nextQuestion, messages);

      setMessages((current) => [...current, { role: 'assistant', content: response.text }]);
    } catch (error) {
      setAiError(error?.message || 'AI lokal gagal menjawab.');
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={`sm-floating-faq ${isOpen ? 'is-open' : ''} ${position && position.x < 380 ? 'open-right' : ''} ${
        position && position.y < 430 ? 'open-bottom' : ''
      }`}
      style={position ? { left: `${position.x}px`, top: `${position.y}px` } : undefined}
    >
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
                {isAsking && <div className="sm-floating-ai-message assistant">Salti sedang menjawab...</div>}
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
        onClick={handleToggle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Tutup FAQ' : 'Buka FAQ'}
      >
        <img src={SaltyImage} alt="" aria-hidden="true" draggable="false" onDragStart={(event) => event.preventDefault()} />
      </button>
    </div>
  );
}
