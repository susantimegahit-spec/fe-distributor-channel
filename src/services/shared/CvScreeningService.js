import * as mammoth from 'mammoth/mammoth.browser';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

const AI_ENDPOINT = import.meta.env.VITE_LOCAL_AI_ENDPOINT;
const AI_MODEL = import.meta.env.VITE_LOCAL_AI_MODEL || 'qwen2.5:1.5b';
const AI_PROVIDER = String(import.meta.env.VITE_LOCAL_AI_PROVIDER || 'ollama').toLowerCase();

const cleanText = (value) =>
  String(value || '')
    .replace(/\u0000/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export async function extractCvText(file) {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'pdf') {
    const document = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => item.str).join(' '));
    }
    return cleanText(pages.join('\n\n'));
  }

  if (extension === 'docx') {
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return cleanText(result.value);
  }

  if (['txt', 'md', 'rtf'].includes(extension)) return cleanText(await file.text());
  throw new Error('Format belum didukung. Gunakan PDF, DOCX, TXT, MD, atau RTF.');
}

const keywordGroups = {
  leadership: ['lead', 'manager', 'supervisor', 'coordinator', 'ketua', 'memimpin'],
  impact: ['increase', 'improve', 'reduce', 'growth', 'meningkat', 'menghemat', '%'],
  digital: ['excel', 'sql', 'python', 'tableau', 'power bi', 'sap', 'crm', 'erp'],
  communication: ['presentation', 'negotiation', 'communication', 'presentasi', 'negosiasi', 'komunikasi']
};

const includesAny = (text, values) => values.some((value) => text.includes(value));

function demoAnalysis(cvText, jobDescription) {
  const lower = cvText.toLowerCase();
  const jobWords = (jobDescription.toLowerCase().match(/[a-zA-ZÀ-ÿ0-9+#.-]{3,}/g) || []).filter(
    (word) => !['yang', 'dan', 'dengan', 'untuk', 'the', 'and', 'with'].includes(word)
  );
  const uniqueJobWords = [...new Set(jobWords)];
  const matched = uniqueJobWords.filter((word) => lower.includes(word));
  const matchRatio = uniqueJobWords.length ? matched.length / uniqueJobWords.length : 0.55;
  const hasEmail = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(cvText);
  const hasPhone = /(\+?62|0)[\d\s-]{8,}/.test(cvText);
  const hasExperience = /(experience|pengalaman|employment|riwayat kerja)/i.test(cvText);
  const hasEducation = /(education|pendidikan|universit|sarjana|diploma)/i.test(cvText);
  const evidence = Object.entries(keywordGroups)
    .filter(([, terms]) => includesAny(lower, terms))
    .map(([key]) => key);
  const completeness = [hasEmail, hasPhone, hasExperience, hasEducation].filter(Boolean).length;
  const hasImpact = includesAny(lower, keywordGroups.impact);
  const hasCommunication = includesAny(lower, keywordGroups.communication);
  const scoreBreakdown = [
    {
      key: 'skills',
      label: 'Kecocokan kompetensi',
      score: Math.round(matchRatio * 35),
      maxScore: 35,
      evidence: matched.length ? `${matched.length} kata kunci posisi ditemukan.` : 'Belum ada kompetensi posisi yang terdeteksi.'
    },
    {
      key: 'experience',
      label: 'Pengalaman relevan',
      score: hasExperience ? 20 : 7,
      maxScore: 25,
      evidence: hasExperience ? 'Riwayat pengalaman kerja teridentifikasi.' : 'Bagian pengalaman belum teridentifikasi dengan jelas.'
    },
    {
      key: 'impact',
      label: 'Pencapaian & dampak',
      score: hasImpact ? 12 : 4,
      maxScore: 15,
      evidence: hasImpact ? 'Terdapat indikator hasil atau pencapaian terukur.' : 'Belum ditemukan pencapaian berbasis angka.'
    },
    {
      key: 'education',
      label: 'Pendidikan',
      score: hasEducation ? 8 : 2,
      maxScore: 10,
      evidence: hasEducation ? 'Informasi pendidikan tersedia.' : 'Informasi pendidikan belum terdeteksi.'
    },
    {
      key: 'communication',
      label: 'Komunikasi & leadership',
      score: hasCommunication || evidence.includes('leadership') ? 8 : 3,
      maxScore: 10,
      evidence:
        hasCommunication || evidence.includes('leadership')
          ? 'Ada bukti komunikasi atau kepemimpinan.'
          : 'Bukti komunikasi atau kepemimpinan masih terbatas.'
    },
    {
      key: 'completeness',
      label: 'Kelengkapan CV',
      score: Math.round((completeness / 4) * 5),
      maxScore: 5,
      evidence: `${completeness} dari 4 elemen utama terdeteksi.`
    }
  ];
  const score = scoreBreakdown.reduce((total, category) => total + category.score, 0);
  const skills = [...new Set([...matched.slice(0, 6), ...evidence])].slice(0, 8);

  return {
    score,
    recommendation: score >= 78 ? 'Lanjut wawancara' : score >= 62 ? 'Pertimbangkan' : 'Belum sesuai',
    summary: `Profil menunjukkan kecocokan ${score >= 78 ? 'kuat' : score >= 62 ? 'cukup' : 'terbatas'} terhadap kebutuhan posisi. Penilaian mempertimbangkan relevansi kata kunci, kelengkapan CV, dan bukti kompetensi.`,
    candidate: {
      name: cvText.match(/^[^\n]{3,60}/)?.[0]?.trim() || 'Kandidat',
      email: cvText.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0] || 'Tidak ditemukan',
      phone: cvText.match(/(?:\+?62|0)[\d\s-]{8,}/)?.[0]?.trim() || 'Tidak ditemukan'
    },
    skills: skills.length ? skills : ['Komunikasi', 'Kolaborasi'],
    scoreBreakdown,
    strengths: [
      hasExperience ? 'Riwayat pengalaman kerja tercantum dengan jelas.' : 'Profil profesional dapat diidentifikasi dari isi CV.',
      matched.length ? `Memiliki kecocokan pada kebutuhan: ${matched.slice(0, 4).join(', ')}.` : 'Struktur CV cukup mudah dipindai.',
      evidence.length ? 'Menunjukkan bukti kompetensi lintas area.' : 'Informasi inti kandidat tersedia.'
    ],
    gaps: [
      !hasExperience ? 'Pengalaman kerja belum dijelaskan secara eksplisit.' : 'Dampak pekerjaan sebaiknya diperkuat dengan angka.',
      uniqueJobWords.length && matchRatio < 0.45
        ? 'Kecocokan kata kunci dengan deskripsi posisi masih rendah.'
        : 'Perlu validasi kedalaman kompetensi saat wawancara.',
      !hasEducation ? 'Informasi pendidikan belum terdeteksi.' : 'Relevansi pendidikan perlu dikonfirmasi.'
    ],
    questions: [
      {
        question: 'Ceritakan pencapaian paling relevan untuk posisi ini.',
        purpose: 'Memvalidasi relevansi pengalaman dan kontribusi personal kandidat.',
        strongAnswer: 'Jawaban menggunakan konteks yang jelas, tindakan spesifik, serta hasil terukur yang relevan dengan posisi.'
      },
      {
        question: 'Bagaimana Anda mengukur keberhasilan pekerjaan sebelumnya?',
        purpose: 'Menilai orientasi kandidat terhadap target dan data.',
        strongAnswer: 'Kandidat menyebut KPI, baseline, target, periode pengukuran, dan hasil yang benar-benar menjadi tanggung jawabnya.'
      },
      {
        question: 'Apa tantangan terbesar yang pernah Anda selesaikan?',
        purpose: 'Menggali kemampuan pemecahan masalah dan ketahanan kerja.',
        strongAnswer: 'Jawaban menjelaskan masalah, pertimbangan keputusan, kolaborasi, hasil, dan pelajaran yang diperoleh.'
      }
    ],
    mode: 'demo'
  };
}

const SCORE_CATEGORIES = [
  {
    key: 'skills',
    label: 'Kecocokan kompetensi',
    criteria: [
      ['required-skills', 'Kompetensi wajib posisi', 20],
      ['technical-skills', 'Kompetensi teknis', 10],
      ['supporting-skills', 'Kompetensi pendukung', 5]
    ]
  },
  {
    key: 'experience',
    label: 'Pengalaman relevan',
    criteria: [
      ['duration', 'Durasi pengalaman', 10],
      ['role-relevance', 'Relevansi jabatan/industri', 10],
      ['responsibility-scope', 'Cakupan tanggung jawab', 5]
    ]
  },
  {
    key: 'impact',
    label: 'Pencapaian & dampak',
    criteria: [
      ['measurable-result', 'Hasil terukur', 8],
      ['business-impact', 'Dampak bisnis', 4],
      ['ownership', 'Kontribusi personal', 3]
    ]
  },
  {
    key: 'education',
    label: 'Pendidikan',
    criteria: [
      ['qualification', 'Jenjang/kualifikasi', 6],
      ['education-relevance', 'Relevansi pendidikan', 4]
    ]
  },
  {
    key: 'communication',
    label: 'Komunikasi & leadership',
    criteria: [
      ['communication-proof', 'Bukti komunikasi', 5],
      ['leadership-proof', 'Bukti kepemimpinan', 5]
    ]
  },
  {
    key: 'completeness',
    label: 'Kelengkapan CV',
    criteria: [
      ['contact', 'Kontak kandidat', 2],
      ['structure', 'Struktur informasi', 2],
      ['clarity', 'Kejelasan isi', 1]
    ]
  }
];

function normalizeAiAnalysis(analysis) {
  const supplied = Array.isArray(analysis.scoreBreakdown) ? analysis.scoreBreakdown : [];
  const scoreBreakdown = SCORE_CATEGORIES.map(({ key, label, criteria }) => {
    const item = supplied.find((category) => category.key === key || category.label === label) || {};
    const suppliedDetails = Array.isArray(item.details) ? item.details : [];
    const categoryMax = criteria.reduce((total, [, , criterionMax]) => total + criterionMax, 0);
    const legacyTarget = Math.max(0, Math.min(categoryMax, Math.round(Number(item.score) || 0)));
    let allocated = 0;
    const details = criteria.map(([criterionKey, criterionLabel, criterionMax], index) => {
      const detail = suppliedDetails.find(
        (entry) => entry.key === criterionKey || String(entry.criterion || entry.label).toLowerCase() === criterionLabel.toLowerCase()
      );
      const fallbackScore =
        index === criteria.length - 1
          ? legacyTarget - allocated
          : Math.min(criterionMax, Math.round((legacyTarget * criterionMax) / categoryMax));
      allocated += fallbackScore;
      return {
        key: criterionKey,
        criterion: criterionLabel,
        maxScore: criterionMax,
        score: detail
          ? Math.max(0, Math.min(criterionMax, Math.round(Number(detail.score) || 0)))
          : Math.max(0, Math.min(criterionMax, fallbackScore)),
        evidence: String(detail?.evidence || item.evidence || 'Bukti spesifik tidak ditemukan dalam CV.'),
        source: String(detail?.source || (suppliedDetails.length ? 'Tidak teridentifikasi' : 'Ringkasan kategori'))
      };
    });
    const maxScore = details.reduce((total, detail) => total + detail.maxScore, 0);
    const score = suppliedDetails.length
      ? details.reduce((total, detail) => total + detail.score, 0)
      : Math.max(0, Math.min(maxScore, Math.round(Number(item.score) || 0)));
    return {
      key,
      label,
      maxScore,
      score,
      evidence: String(item.evidence || 'Rincian dihitung dari sub-kriteria di bawah.'),
      details
    };
  });
  const score = scoreBreakdown.reduce((total, category) => total + category.score, 0);

  return {
    ...analysis,
    score,
    recommendation: score >= 78 ? 'Lanjut wawancara' : score >= 62 ? 'Pertimbangkan' : 'Belum sesuai',
    scoreBreakdown,
    questions: (Array.isArray(analysis.questions) ? analysis.questions : []).map((item) =>
      typeof item === 'string'
        ? {
            question: item,
            purpose: 'Memvalidasi informasi dalam CV.',
            strongAnswer: 'Jawaban spesifik, relevan, dan didukung contoh nyata.'
          }
        : {
            question: String(item.question || ''),
            purpose: String(item.purpose || 'Memvalidasi informasi dalam CV.'),
            strongAnswer: String(item.strongAnswer || 'Jawaban spesifik, relevan, dan didukung contoh nyata.')
          }
    )
  };
}

function parseAiJson(text) {
  const json = text.match(/\{[\s\S]*\}/)?.[0];
  if (!json) throw new Error('AI tidak mengembalikan hasil yang dapat dibaca.');
  return JSON.parse(json);
}

export async function screenCv(cvText, jobDescription) {
  if (!AI_ENDPOINT) return { ...normalizeAiAnalysis(demoAnalysis(cvText, jobDescription)), mode: 'demo' };

  const prompt = `Nilai CV berikut terhadap deskripsi pekerjaan. Bersikap objektif, jangan menebak data yang tidak ada, abaikan atribut sensitif, dan gunakan bukti yang benar-benar tertulis di CV.

Berikan skor pada setiap sub-kriteria berikut. Jangan beri poin jika tidak ada bukti eksplisit. Evidence harus berupa kutipan pendek atau parafrasa sangat dekat dari CV; source adalah nama bagian/posisi/perusahaan tempat bukti ditemukan.
- skills (35): required-skills 20, technical-skills 10, supporting-skills 5
- experience (25): duration 10, role-relevance 10, responsibility-scope 5
- impact (15): measurable-result 8, business-impact 4, ownership 3
- education (10): qualification 6, education-relevance 4
- communication (10): communication-proof 5, leadership-proof 5
- completeness (5): contact 2, structure 2, clarity 1

Kembalikan HANYA JSON valid. Gunakan struktur ringkas: {"summary":"...","candidate":{"name":"...","email":"...","phone":"..."},"skills":["..."],"scoreBreakdown":[{"key":"skills","evidence":"ringkasan kategori","details":[{"key":"required-skills","score":0,"evidence":"bukti dari CV","source":"bagian CV"}]}],"strengths":["..."],"gaps":["..."],"questions":[{"question":"...","purpose":"...","strongAnswer":"..."}]}. Sertakan keenam kategori dan seluruh sub-kriteria menggunakan key persis seperti daftar di atas. Buat 3 sampai 5 pertanyaan. Total dihitung aplikasi dari sub-kriteria.

DESKRIPSI PEKERJAAN:\n${jobDescription}\n\nCV:\n${cvText.slice(0, 30000)}`;
  const messages = [
    { role: 'system', content: 'Anda adalah asisten screening rekrutmen yang adil, ringkas, dan berbasis bukti.' },
    { role: 'user', content: prompt }
  ];
  const body =
    AI_PROVIDER === 'openai-compatible'
      ? { model: AI_MODEL, messages, temperature: 0.2, response_format: { type: 'json_object' } }
      : { model: AI_MODEL, messages, stream: false, format: 'json', options: { temperature: 0.2 } };
  const response = await fetch(AI_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || data?.message || 'Koneksi ke AI gagal.');
  const content = data?.choices?.[0]?.message?.content || data?.message?.content || data?.response;
  return { ...normalizeAiAnalysis(parseAiJson(content)), mode: 'ai' };
}
