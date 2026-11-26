import type { CategoryId } from "@/config/questionnaire";

/**
 * Kamus kata kunci untuk isian "minat lainnya". Disusun dari isian uji coba
 * XII RPL 2 (Nov 2026). Kata kunci ditulis huruf kecil; kata ≥4 huruf juga cocok
 * dengan imbuhan umum (mendesain, desainer, pelukis, kewirausahaan). Frasa yang
 * lebih panjang dicocokkan lebih dulu, jadi "mobile legend" tidak terbaca
 * sebagai aplikasi mobile dan "media sosial" tidak terbaca sebagai bidang sosial.
 */
export interface InterestGroup {
  id: string;
  label: string;
  keywords: string[];
  /** Bidang kuis yang terkait. Kosong untuk minat di luar 8 bidang. */
  categories: CategoryId[];
  /** Catatan untuk siswa (wajib untuk minat di luar 8 bidang). */
  note?: string;
}

export const INTEREST_GROUPS: InterestGroup[] = [
  // --- Bidang kuis ---------------------------------------------------------
  { id: "desain", label: "Desain", categories: ["desain"],
    keywords: ["desain", "design", "designer", "grafis", "graphic", "poster", "logo", "ilustrasi", "ilustrator", "gambar", "ui ux", "ui", "ux", "figma", "canva"] },
  { id: "website", label: "Website", categories: ["website"],
    keywords: ["website", "web", "situs", "html", "css", "frontend", "front end", "backend", "back end", "fullstack", "full stack", "javascript", "laravel", "php"] },
  { id: "mobile", label: "Aplikasi mobile", categories: ["mobile"],
    keywords: ["aplikasi hp", "aplikasi android", "android", "ios", "flutter", "kotlin", "apk", "mobile developer", "mobile app"] },
  { id: "game", label: "Game", categories: ["game"],
    keywords: ["game developer", "developer game", "game", "gim", "unity", "roblox", "minecraft"] },
  { id: "ai_data", label: "AI dan data", categories: ["ai_data"],
    keywords: ["artificial intelligence", "kecerdasan buatan", "machine learning", "ai", "data", "analis", "analyst", "statistik", "python"] },
  { id: "qa", label: "Pengujian aplikasi", categories: ["qa"],
    keywords: ["tester", "testing", "qa", "q a", "quality assurance", "bug"] },
  { id: "konten", label: "Video dan konten", categories: ["konten"],
    keywords: ["content creator", "konten kreator", "video editor", "editor video", "edit video", "video", "editing", "editor", "konten", "content", "youtube", "youtuber", "tiktok", "clipper", "clip", "film", "sinematografi", "fotografi", "fotografer", "foto", "kamera", "animasi", "animator", "motion", "vlog", "podcast", "streamer", "media sosial", "sosmed"] },
  { id: "marketing", label: "Marketing", categories: ["marketing"],
    keywords: ["digital marketing", "marketing", "pemasaran", "promosi", "iklan", "sales", "jualan online", "toko online", "affiliate"] },
  { id: "pemrograman", label: "Pemrograman", categories: ["website", "mobile", "game"],
    keywords: ["programmer", "programming", "pemrograman", "program", "coding", "ngoding", "koding", "software", "developer", "it"],
    note: "Pemrograman dipakai di banyak bidang, misalnya Website, Aplikasi Mobile, dan Game. Lihat skor ketiganya di bawah." },

  // --- IT di luar 8 bidang kuis -------------------------------------------
  { id: "robotik", label: "Robotik dan IoT", categories: [],
    keywords: ["robotik", "robot", "robotic", "iot", "arduino", "elektronika"],
    note: "Robotik memakai pemrograman untuk menggerakkan alat. Kamu bisa mulai dari Arduino atau ekstrakurikuler robotik." },
  { id: "jaringan", label: "Jaringan dan keamanan siber", categories: [],
    keywords: ["keamanan siber", "cyber security", "cybersecurity", "hacker", "hacking", "jaringan", "network", "server", "it support", "teknisi komputer"],
    note: "Bidang ini mengurus jaringan, server, dan keamanan sistem. Tanyakan ke guru tentang sertifikasi jaringan dasar." },
  { id: "esport", label: "Esport", categories: [],
    keywords: ["mobile legend", "mobile legends", "mlbb", "pro player", "esport", "e sport", "gamer"],
    note: "Selain menjadi pemain, dunia esport butuh caster, editor video, admin media sosial, dan pembuat game." },

  // --- Di luar IT -------------------------------------------------------------
  { id: "kuliner", label: "Kuliner", categories: [],
    keywords: ["pastry", "kue", "roti", "masak", "memasak", "chef", "koki", "kuliner", "barista", "kopi", "cafe", "kafe", "restoran"],
    note: "Minat kuliner bisa digabung dengan keahlian RPL, misalnya membuat toko online, aplikasi pemesanan, atau konten resep." },
  { id: "wirausaha", label: "Wirausaha", categories: [],
    keywords: ["wirausaha", "kewirausahaan", "pengusaha", "buka usaha", "buka toko", "bisnis", "owner", "dagang", "jualan"],
    note: "Banyak usaha sekarang butuh website, aplikasi kasir, dan promosi online. Keahlian RPL bisa jadi modal usahamu sendiri." },
  { id: "keuangan", label: "Keuangan dan trading", categories: [],
    keywords: ["trader", "trading", "saham", "investasi", "crypto", "kripto", "forex", "akuntan", "keuangan"],
    note: "Dunia keuangan banyak memakai data dan aplikasi. Bidang AI dan Data bisa jadi jembatannya." },
  { id: "teknik", label: "Teknik dan industri", categories: [],
    keywords: ["tambang", "pertambangan", "otomotif", "mesin", "montir", "bengkel", "listrik", "k3", "inspektor", "pabrik", "industri"],
    note: "Industri seperti tambang dan otomotif juga memakai aplikasi untuk data, laporan, dan keselamatan kerja (K3)." },
  { id: "pertanian", label: "Pertanian dan peternakan", categories: [],
    keywords: ["ternak", "peternakan", "berternak", "beternak", "tani", "pertanian", "petani", "kebun"],
    note: "Pertanian dan peternakan modern memakai aplikasi pencatatan, sensor, dan penjualan online." },
  { id: "kesehatan", label: "Kesehatan", categories: [],
    keywords: ["dokter", "perawat", "bidan", "apoteker", "farmasi", "kesehatan", "rumah sakit"],
    note: "Bidang kesehatan biasanya butuh kuliah khusus. Diskusikan jalurnya dengan guru BK." },
  { id: "hukum", label: "Hukum dan forensik", categories: [],
    keywords: ["forensik", "polisi", "tentara", "tni", "polri", "hukum", "pengacara", "jaksa", "detektif"],
    note: "Ada juga forensik digital, yaitu menyelidiki bukti di komputer dan HP. Bidang ini dekat dengan keamanan siber." },
  { id: "bahasa", label: "Bahasa dan sosial", categories: [],
    keywords: ["bahasa", "inggris", "jepang", "korea", "sosial", "psikologi", "komunikasi", "penerjemah"],
    note: "Kemampuan bahasa dan komunikasi berguna di IT, misalnya menulis dokumentasi, mengajar, atau bekerja dengan klien luar negeri." },
  { id: "luar_negeri", label: "Kerja di luar negeri", categories: [],
    keywords: ["luar negeri", "luar negara", "diluar negeri", "diluar negara", "abroad", "remote"],
    note: "Banyak pekerjaan IT bisa dikerjakan untuk perusahaan luar negeri. Bahasa Inggris sangat membantu." },
  { id: "seni", label: "Seni dan musik", categories: [],
    keywords: ["lukis", "melukis", "pelukis", "seni", "seniman", "musik", "penyanyi", "band", "gitar", "menari", "tari"],
    note: "Seni bisa dekat dengan bidang Desain serta Video dan Konten, misalnya ilustrasi digital atau musik untuk video." },
  { id: "pendidikan", label: "Pendidikan", categories: [],
    keywords: ["guru", "dosen", "mengajar", "pengajar", "tutor"],
    note: "Kamu bisa menjadi guru atau instruktur IT, atau membuat konten belajar." },
  { id: "olahraga", label: "Olahraga", categories: [],
    keywords: ["sepak bola", "futsal", "atlet", "olahraga", "badminton", "voli", "basket"],
    note: "Dunia olahraga juga butuh aplikasi, data pertandingan, dan konten video." },
  { id: "fashion", label: "Fashion dan kecantikan", categories: [],
    keywords: ["fashion", "makeup", "make up", "mua", "salon", "jahit", "busana"],
    note: "Fashion dan kecantikan sangat bergantung pada foto, video, dan toko online." },
];
