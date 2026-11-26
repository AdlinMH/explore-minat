/**
 * Konfigurasi kuesioner berversi. Ubah QUESTIONNAIRE_VERSION setiap kali
 * pertanyaan, mapping kategori, atau aturan skor berubah agar respons lama
 * tetap dapat ditafsirkan dengan versi yang tersimpan.
 */
export const QUESTIONNAIRE_VERSION = "2026-11-v2";

export const SCALE = [
  { value: 1, label: "Tidak tertarik" },
  { value: 2, label: "Kurang tertarik" },
  { value: 3, label: "Cukup tertarik" },
  { value: 4, label: "Tertarik" },
  { value: 5, label: "Sangat tertarik" },
] as const;

export const SCALE_MIN = 1;
export const SCALE_MAX = 5;

export const INSTRUCTION =
  "Seberapa tertarik kamu untuk mencoba kegiatan berikut? Kamu tidak harus sudah bisa atau pernah mencobanya.";

export const RESULT_DISCLAIMER =
  "Hasil ini menggambarkan ketertarikanmu saat ini dan dapat berubah setelah mencoba.";

export type CategoryId =
  | "desain"
  | "website"
  | "mobile"
  | "game"
  | "ai_data"
  | "qa"
  | "konten"
  | "marketing";

export type QuestionId = `q${string}`;

export interface Question {
  id: QuestionId;
  number: number;
  text: string;
  category: CategoryId;
}

export interface Profession {
  id: string;
  name: string;
  description: string;
}

export interface Category {
  id: CategoryId;
  label: string;
  shortLabel: string;
  description: string;
  /** Warna konsisten untuk chart; informasi juga selalu tersedia sebagai teks. */
  color: string;
  questionNumbers: [number, number, number];
  professions: Profession[];
  tryActivity: string;
}

const QUESTION_TEXTS: string[] = [
  "Membuat poster atau logo dengan memilih warna, huruf, dan gambar yang cocok.",
  "Membuat halaman website yang bisa diklik dan digunakan orang lain.",
  "Membuat aplikasi di HP untuk membantu kegiatan sehari-hari.",
  "Menciptakan aturan, tantangan, atau cerita untuk sebuah game.",
  "Membuat grafik dari kumpulan data supaya informasinya mudah dibaca.",
  "Mencoba berbagai fitur aplikasi untuk menemukan bagian yang tidak berjalan dengan benar.",
  "Merekam video pendek, lalu memotong dan menyusunnya agar enak ditonton.",
  "Memikirkan cara agar orang tertarik pada suatu produk atau kegiatan.",
  "Merancang tampilan layar aplikasi agar tombol dan menunya mudah dipakai.",
  "Membuat sistem website untuk menyimpan dan mengelola informasi, seperti pendaftaran atau peminjaman buku.",
  "Merancang fitur aplikasi HP, seperti pengingat tugas atau pencatat pengeluaran.",
  "Membuat karakter atau lingkungan yang bisa digunakan dalam game.",
  "Mencari pola dari kumpulan informasi, misalnya hasil survei atau penjualan.",
  "Menelusuri langkah yang menyebabkan aplikasi mengalami masalah.",
  "Menambahkan musik, teks bergerak, dan efek transisi pada sebuah video.",
  "Menjelaskan manfaat suatu produk dan menjawab pertanyaan orang yang tertarik membelinya.",
  "Menggambar ilustrasi atau ikon digital dengan aplikasi desain.",
  "Mencari penyebab suatu fitur website tidak berfungsi, lalu memperbaiki kodenya.",
  "Membuat aplikasi HP yang memakai kamera, lokasi (GPS), atau notifikasi.",
  "Mengatur gerakan karakter, skor, atau respons tombol dalam sebuah game.",
  "Membuat fitur yang menggunakan AI, misalnya untuk menjawab pertanyaan atau mengenali gambar.",
  "Menyusun daftar pemeriksaan agar semua fitur aplikasi bisa diuji secara teratur.",
  "Mencari ide dan menulis naskah singkat untuk video atau konten media sosial.",
  "Mencoba berbagai cara promosi dan melihat cara mana yang paling menarik perhatian orang.",
];

export const CATEGORIES: Category[] = [
  {
    id: "desain",
    label: "Desain",
    shortLabel: "Desain",
    description:
      "Membuat gambar, poster, ikon, dan tampilan aplikasi untuk menyampaikan ide atau memudahkan orang memakai suatu produk.",
    color: "#c026d3",
    questionNumbers: [1, 9, 17],
    professions: [
      { id: "desainer_grafis", name: "Desainer grafis", description: "Membuat poster, logo, dan materi visual untuk menyampaikan pesan." },
      { id: "ui_ux_designer", name: "UI/UX designer", description: "Merancang tampilan dan alur aplikasi agar mudah dan nyaman dipakai." },
      { id: "ilustrator", name: "Ilustrator digital", description: "Menggambar ilustrasi dan ikon untuk buku, aplikasi, atau media sosial." },
    ],
    tryActivity: "Buat ulang tampilan satu halaman aplikasi favoritmu di kertas atau Figma, lalu minta teman mencobanya.",
  },
  {
    id: "website",
    label: "Pengembangan Website",
    shortLabel: "Website",
    description:
      "Membuat halaman dan sistem yang digunakan melalui browser, seperti website sekolah atau toko online.",
    color: "#2563eb",
    questionNumbers: [2, 10, 18],
    professions: [
      { id: "frontend_developer", name: "Frontend developer", description: "Membuat bagian website yang dilihat dan diklik pengguna." },
      { id: "backend_developer", name: "Backend developer", description: "Membuat sistem di balik layar yang menyimpan dan mengolah data website." },
      { id: "fullstack_developer", name: "Full-stack developer", description: "Mengerjakan tampilan sekaligus sistem di balik layar sebuah website." },
    ],
    tryActivity: "Buat satu halaman profil sederhana dengan HTML, lalu tambahkan satu tombol yang bisa diklik.",
  },
  {
    id: "mobile",
    label: "Pengembangan Aplikasi Mobile",
    shortLabel: "Aplikasi Mobile",
    description: "Membuat aplikasi yang digunakan di HP atau tablet.",
    color: "#0d9488",
    questionNumbers: [3, 11, 19],
    professions: [
      { id: "android_developer", name: "Android developer", description: "Membuat aplikasi untuk HP Android." },
      { id: "ios_developer", name: "iOS developer", description: "Membuat aplikasi untuk iPhone dan iPad." },
      { id: "cross_platform_developer", name: "Cross-platform developer", description: "Membuat satu aplikasi yang bisa berjalan di Android dan iOS." },
    ],
    tryActivity: "Tulis ide satu aplikasi HP yang membantu kegiatanmu, lalu gambar tiga layar utamanya.",
  },
  {
    id: "game",
    label: "Pengembangan Game",
    shortLabel: "Game",
    description:
      "Membuat permainan digital, mulai dari aturan, tampilan, hingga cara permainan berjalan.",
    color: "#7c3aed",
    questionNumbers: [4, 12, 20],
    professions: [
      { id: "game_programmer", name: "Game programmer", description: "Menulis kode agar aturan dan gerakan dalam game berjalan." },
      { id: "game_designer", name: "Game designer", description: "Merancang aturan, tantangan, dan alur permainan." },
      { id: "game_artist", name: "Game artist", description: "Membuat karakter, latar, dan aset visual untuk game." },
      { id: "artist_3d", name: "3D artist", description: "Membuat objek, karakter, atau ruang dalam bentuk tiga dimensi." },
    ],
    tryActivity: "Rancang aturan game sederhana di kertas, lalu mainkan bersama teman untuk melihat bagian yang seru.",
  },
  {
    id: "ai_data",
    label: "AI dan Data",
    shortLabel: "AI & Data",
    description:
      "Mengolah informasi untuk menemukan pola atau membuat fitur yang menggunakan kecerdasan buatan.",
    color: "#ea580c",
    questionNumbers: [5, 13, 21],
    professions: [
      { id: "ai_engineer", name: "AI engineer", description: "Membangun fitur aplikasi yang memakai kecerdasan buatan." },
      { id: "data_analyst", name: "Data analyst", description: "Membaca kumpulan data untuk menemukan pola dan informasi penting." },
      { id: "data_scientist", name: "Data scientist", description: "Membuat model dari data untuk memperkirakan atau mengelompokkan sesuatu." },
    ],
    tryActivity: "Buat survei singkat untuk teman sekelas, lalu cari satu pola dari jawabannya dengan spreadsheet.",
  },
  {
    id: "qa",
    label: "Pengujian Aplikasi / QA",
    shortLabel: "QA",
    description:
      "Memeriksa apakah aplikasi berjalan sesuai kebutuhan dan menemukan masalah agar dapat diperbaiki.",
    color: "#65a30d",
    questionNumbers: [6, 14, 22],
    professions: [
      { id: "qa_tester", name: "QA tester", description: "Mencoba aplikasi secara teliti untuk menemukan bagian yang bermasalah." },
      { id: "qa_automation_engineer", name: "QA automation engineer", description: "Menulis program yang menguji aplikasi secara otomatis." },
    ],
    tryActivity: "Pilih satu aplikasi yang sering kamu pakai, lalu tulis lima langkah untuk menguji satu fiturnya.",
  },
  {
    id: "konten",
    label: "Video dan Konten Kreatif",
    shortLabel: "Video & Konten",
    description:
      "Merekam, menyunting, dan menyusun video atau konten media sosial untuk memberi informasi, menghibur, atau berbagi cerita.",
    color: "#e11d48",
    questionNumbers: [7, 15, 23],
    professions: [
      { id: "video_editor", name: "Video editor", description: "Memotong dan menyusun rekaman menjadi video yang enak ditonton." },
      { id: "motion_graphic_designer", name: "Motion graphic designer", description: "Membuat teks, logo, dan gambar bergerak untuk video." },
      { id: "content_creator", name: "Content creator", description: "Merencanakan, membuat, dan membagikan konten untuk penonton." },
      { id: "scriptwriter", name: "Penulis naskah konten", description: "Menulis ide cerita dan naskah untuk video atau media sosial." },
    ],
    tryActivity: "Buat satu video pendek 30 detik tentang hal yang kamu sukai, lalu minta pendapat satu teman.",
  },
  {
    id: "marketing",
    label: "Marketing dan Sales",
    shortLabel: "Marketing",
    description:
      "Mengenalkan produk atau jasa, menarik minat orang, dan membantu calon pelanggan memilih serta membeli.",
    color: "#ca8a04",
    questionNumbers: [8, 16, 24],
    professions: [
      { id: "digital_marketer", name: "Digital marketer", description: "Mempromosikan produk lewat internet dan mengukur hasilnya." },
      { id: "social_media_specialist", name: "Social media specialist", description: "Mengelola akun media sosial agar menarik dan aktif." },
      { id: "sales_representative", name: "Sales representative", description: "Menjelaskan produk dan membantu calon pelanggan memutuskan membeli." },
    ],
    tryActivity: "Tulis dua versi kalimat promosi untuk acara kelas, lalu tanyakan teman mana yang lebih menarik dan kenapa.",
  },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as CategoryId[];

export const CATEGORY_BY_ID: Record<CategoryId, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, Category>;

const numberToCategory = new Map<number, CategoryId>();
for (const c of CATEGORIES) for (const n of c.questionNumbers) numberToCategory.set(n, c.id);

export const QUESTIONS: Question[] = QUESTION_TEXTS.map((text, i) => {
  const number = i + 1;
  const category = numberToCategory.get(number);
  if (!category) throw new Error(`Pertanyaan ${number} tidak memiliki kategori`);
  return { id: questionId(number), number, text, category };
});

export function questionId(number: number): QuestionId {
  return `q${String(number).padStart(2, "0")}`;
}

export const QUESTION_IDS = QUESTIONS.map((q) => q.id);

export const QUESTION_BY_ID: Record<string, Question> = Object.fromEntries(
  QUESTIONS.map((q) => [q.id, q]),
);

/** 4 langkah × 6 pertanyaan. */
export const STEPS: Question[][] = [0, 1, 2, 3].map((s) => QUESTIONS.slice(s * 6, s * 6 + 6));

export const EXPLORATION_STATUSES = [
  { id: "belum_tahu", label: "Masih belum tahu" },
  { id: "mulai_gambaran", label: "Mulai punya gambaran" },
  { id: "beberapa_bidang", label: "Sudah punya beberapa bidang yang ingin dicoba" },
] as const;

export type ExplorationStatusId = (typeof EXPLORATION_STATUSES)[number]["id"];

export const EXPLORATION_STATUS_IDS = EXPLORATION_STATUSES.map((s) => s.id) as [
  ExplorationStatusId,
  ...ExplorationStatusId[],
];

export const EXPLORATION_LABEL: Record<ExplorationStatusId, string> = Object.fromEntries(
  EXPLORATION_STATUSES.map((s) => [s.id, s.label]),
) as Record<ExplorationStatusId, string>;

export const OTHER_INTEREST_MAX = 300;
export const REFLECTION_MAX = 500;
export const NAME_MIN = 2;
export const NAME_MAX = 100;
