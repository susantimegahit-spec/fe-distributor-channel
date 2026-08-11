import { useCallback, useMemo, useRef, useState } from 'react';
import { extractCvText, screenCv } from 'services/shared/CvScreeningService';
import './cv-screening.scss';

const DEFAULT_JOB = `Sales Supervisor

Kami mencari kandidat dengan pengalaman minimal 3 tahun di bidang sales atau distribusi FMCG. Mampu memimpin tim, menyusun target, menganalisis penjualan, serta menguasai Microsoft Excel. Memiliki kemampuan komunikasi dan negosiasi yang baik.`;

const steps = ['Upload CV', 'Kriteria posisi', 'Hasil screening'];

export default function CvScreening() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [cvText, setCvText] = useState('');
  const [jobDescription, setJobDescription] = useState(DEFAULT_JOB);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [dragging, setDragging] = useState(false);

  const currentStep = result ? 2 : file ? 1 : 0;
  const scoreTone = useMemo(() => (result?.score >= 78 ? 'good' : result?.score >= 62 ? 'medium' : 'low'), [result]);

  const readFile = useCallback(async (selectedFile) => {
    if (!selectedFile) return;
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('Ukuran CV maksimal 10 MB.');
      return;
    }
    setError('');
    setResult(null);
    setFile(selectedFile);
    setStatus('reading');
    try {
      const text = await extractCvText(selectedFile);
      if (text.length < 40) throw new Error('Teks CV terlalu sedikit atau PDF berupa hasil scan. Gunakan CV berbasis teks.');
      setCvText(text);
      setStatus('ready');
    } catch (readError) {
      setCvText('');
      setStatus('idle');
      setError(readError.message);
    }
  }, []);

  const analyze = async () => {
    if (!cvText || !jobDescription.trim()) return;
    setError('');
    setStatus('analyzing');
    try {
      setResult(await screenCv(cvText, jobDescription));
      setStatus('done');
    } catch (analysisError) {
      setStatus('ready');
      setError(`${analysisError.message} Periksa konfigurasi endpoint AI atau kosongkan VITE_LOCAL_AI_ENDPOINT untuk mode demo.`);
    }
  };

  const reset = () => {
    setFile(null);
    setCvText('');
    setResult(null);
    setError('');
    setStatus('idle');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <main className="cv-screening-page">
      <section className="cv-hero">
        <div>
          <span className="cv-eyebrow">
            <i className="ti ti-sparkles" /> AI Recruitment Assistant
          </span>
          <h1>
            Temukan kandidat terbaik,
            <br />
            <span>lebih cepat.</span>
          </h1>
          <p>Upload CV, tentukan kriteria posisi, dan dapatkan analisis kandidat berbasis AI dalam hitungan detik.</p>
        </div>
        <div className="cv-privacy">
          <i className="ti ti-shield-lock" />
          <div>
            <strong>Privasi terjaga</strong>
            <span>Dokumen diproses langsung dari browser</span>
          </div>
        </div>
      </section>

      <nav className="cv-steps" aria-label="Tahapan screening">
        {steps.map((step, index) => (
          <div key={step} className={index <= currentStep ? 'active' : ''}>
            <span>{index < currentStep ? <i className="ti ti-check" /> : index + 1}</span>
            <p>{step}</p>
          </div>
        ))}
      </nav>

      {!result ? (
        <section className="cv-workspace">
          <article className="cv-card upload-card">
            <header>
              <span className="card-icon purple">
                <i className="ti ti-file-cv" />
              </span>
              <div>
                <h2>Upload CV kandidat</h2>
                <p>Dokumen akan dibaca secara otomatis</p>
              </div>
            </header>
            {!file ? (
              <button
                type="button"
                className={`dropzone ${dragging ? 'dragging' : ''}`}
                onClick={() => inputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  readFile(event.dataTransfer.files[0]);
                }}
              >
                <i className="ti ti-cloud-upload" />
                <strong>Tarik & lepas CV di sini</strong>
                <span>atau klik untuk memilih dokumen</span>
                <small>PDF, DOCX, TXT, RTF · Maks. 10 MB</small>
              </button>
            ) : (
              <div className="uploaded-file">
                <span className="file-type">{file.name.split('.').pop()?.toUpperCase()}</span>
                <div>
                  <strong>{file.name}</strong>
                  <span>
                    {(file.size / 1024).toFixed(0)} KB ·{' '}
                    {status === 'reading' ? 'Membaca dokumen…' : `${cvText.split(/\s+/).length} kata terbaca`}
                  </span>
                </div>
                <button type="button" onClick={reset} aria-label="Hapus CV">
                  <i className="ti ti-x" />
                </button>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              hidden
              accept=".pdf,.docx,.txt,.md,.rtf"
              onChange={(event) => readFile(event.target.files[0])}
            />
            {cvText && (
              <details className="text-preview">
                <summary>Lihat teks yang terbaca</summary>
                <p>
                  {cvText.slice(0, 1200)}
                  {cvText.length > 1200 && '…'}
                </p>
              </details>
            )}
          </article>

          <article className="cv-card criteria-card">
            <header>
              <span className="card-icon blue">
                <i className="ti ti-target-arrow" />
              </span>
              <div>
                <h2>Kriteria posisi</h2>
                <p>Berikan konteks agar hasil lebih akurat</p>
              </div>
            </header>
            <label htmlFor="job-description">
              Deskripsi pekerjaan <span>Wajib</span>
            </label>
            <textarea
              id="job-description"
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Tempel deskripsi pekerjaan dan persyaratan kandidat…"
            />
            <div className="criteria-meta">
              <span>{jobDescription.length} karakter</span>
              <button type="button" onClick={() => setJobDescription(DEFAULT_JOB)}>
                Gunakan contoh
              </button>
            </div>
          </article>

          {error && (
            <div className="cv-alert">
              <i className="ti ti-alert-circle" />
              {error}
            </div>
          )}
          <button
            className="analyze-button"
            type="button"
            disabled={!cvText || !jobDescription.trim() || status === 'reading' || status === 'analyzing'}
            onClick={analyze}
          >
            {status === 'analyzing' ? (
              <>
                <span className="spinner" /> AI sedang menganalisis CV…
              </>
            ) : (
              <>
                <i className="ti ti-sparkles" /> Mulai screening CV <i className="ti ti-arrow-right" />
              </>
            )}
          </button>
          <p className="cv-disclaimer">
            <i className="ti ti-info-circle" /> Skor adalah alat bantu. Keputusan akhir tetap memerlukan penilaian recruiter.
          </p>
        </section>
      ) : (
        <ResultView result={result} scoreTone={scoreTone} onReset={reset} cvText={cvText} />
      )}
    </main>
  );
}

function ResultView({ result, scoreTone, onReset, cvText }) {
  return (
    <section className="result-shell">
      <div className="result-topbar">
        <button type="button" onClick={onReset}>
          <i className="ti ti-arrow-left" /> Screening CV lain
        </button>
        <span className={`mode-badge ${result.mode}`}>{result.mode === 'ai' ? 'AI aktif' : 'Mode demo lokal'}</span>
      </div>
      <div className="result-grid">
        <article className="score-card">
          <div className={`score-ring ${scoreTone}`} style={{ '--score': result.score }}>
            <div>
              <strong>{result.score}</strong>
              <span>/100</span>
            </div>
          </div>
          <span className={`recommendation ${scoreTone}`}>{result.recommendation}</span>
          <h2>{result.candidate?.name || 'Kandidat'}</h2>
          <p>
            {result.candidate?.email} · {result.candidate?.phone}
          </p>
          <div className="score-scale">
            <span>Kecocokan posisi</span>
            <div>
              <i style={{ width: `${result.score}%` }} />
            </div>
          </div>
        </article>
        <article className="cv-card summary-card">
          <span className="section-label">Ringkasan AI</span>
          <h2>Profil kandidat</h2>
          <p>{result.summary}</p>
          <div className="skill-list">
            {result.skills?.map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
        </article>
        <article className="cv-card breakdown-card">
          <div className="breakdown-heading">
            <div>
              <span className="section-label">Transparansi penilaian</span>
              <h2>Rincian skor</h2>
            </div>
            <strong>
              {result.score}
              <span>/100</span>
            </strong>
          </div>
          <p className="breakdown-note">Skor akhir adalah jumlah seluruh kategori di bawah ini.</p>
          <div className="breakdown-list">
            {result.scoreBreakdown?.map((category) => (
              <div className="breakdown-item" key={category.key}>
                <div className="breakdown-label">
                  <strong>{category.label}</strong>
                  <span>
                    {category.score}/{category.maxScore}
                  </span>
                </div>
                <div className="breakdown-track">
                  <i style={{ width: `${(category.score / category.maxScore) * 100}%` }} />
                </div>
                <p>{category.evidence}</p>
                <div className="score-details">
                  {category.details?.map((detail) => (
                    <div className="score-detail" key={detail.key}>
                      <div>
                        <strong>{detail.criterion}</strong>
                        <span>
                          {detail.score}/{detail.maxScore} poin
                        </span>
                      </div>
                      <blockquote>“{detail.evidence}”</blockquote>
                      <small>
                        <i className="ti ti-map-pin" /> Sumber: {detail.source}
                      </small>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </article>
        <article className="cv-card insight-card strengths">
          <header>
            <span className="card-icon green">
              <i className="ti ti-circle-check" />
            </span>
            <h2>Kekuatan utama</h2>
          </header>
          <ul>
            {result.strengths?.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="cv-card insight-card gaps">
          <header>
            <span className="card-icon orange">
              <i className="ti ti-alert-triangle" />
            </span>
            <h2>Area untuk divalidasi</h2>
          </header>
          <ul>
            {result.gaps?.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="cv-card questions-card">
          <span className="section-label">Panduan wawancara</span>
          <h2>Pertanyaan yang disarankan</h2>
          {result.questions?.map((item, index) => (
            <div className="question-item" key={item.question || item}>
              <span className="question-number">{index + 1}</span>
              <div className="question-content">
                <h3>{item.question || item}</h3>
                {item.purpose && (
                  <p className="question-purpose">
                    <strong>Tujuan:</strong> {item.purpose}
                  </p>
                )}
                {item.strongAnswer && (
                  <div className="answer-guide">
                    <i className="ti ti-bulb" />
                    <p>
                      <strong>Indikator jawaban kuat</strong>
                      {item.strongAnswer}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </article>
        <details className="cv-card raw-card">
          <summary>CV yang dianalisis</summary>
          <p>{cvText}</p>
        </details>
      </div>
    </section>
  );
}
