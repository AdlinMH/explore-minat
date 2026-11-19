import { CATEGORY_BY_ID, QUESTIONS, type CategoryId } from "@/config/questionnaire";
import type { ExplanationContext } from "@/lib/explanation/payload";
import type { ExplanationContent } from "@/lib/explanation/types";

function topActivities(category: CategoryId, answers: Record<string, number>) {
  const qs = QUESTIONS.filter((q) => q.category === category);
  const max = Math.max(...qs.map((q) => answers[q.id]));
  return qs.filter((q) => answers[q.id] === max).map((q) => ({ text: q.text, score: max }));
}

function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1).replace(/\.$/, "");
}

/** Penjelasan deterministik; selalu tersedia tanpa layanan AI. */
export function templateExplanation(ctx: ExplanationContext): ExplanationContent {
  if (ctx.pattern === "all_min") {
    return {
      ringkasan:
        "Saat ini belum ada kegiatan dalam daftar yang menarik minatmu, dan itu wajar. Minat sering muncul setelah mencoba langsung. Coba satu atau dua kegiatan kecil dari bidang yang berbeda, lalu isi lagi kuis ini nanti.",
      alasan: [],
      profesi: [],
      aktivitas_coba: "Pilih dua kegiatan dari daftar pertanyaan, coba masing-masing selama 30 menit, lalu catat mana yang lebih menyenangkan.",
    };
  }
  if (ctx.pattern === "all_max") {
    return {
      ringkasan:
        "Kamu tertarik pada hampir semua kegiatan. Artinya ketertarikanmu tersebar luas dan belum mengarah ke satu bidang. Itu modal yang bagus untuk mencoba banyak hal, lalu melihat mana yang paling kamu nikmati.",
      alasan: [],
      profesi: [],
      aktivitas_coba: "Coba satu kegiatan kecil dari tiga bidang berbeda minggu ini, lalu bandingkan mana yang paling membuatmu ingin lanjut.",
    };
  }
  if (ctx.pattern === "all_equal" || ctx.topGroup.length === 0) {
    return {
      ringkasan:
        "Skor minatmu sama di semua bidang, jadi hasil ini belum membedakan bidang tertentu. Mencoba beberapa kegiatan secara langsung bisa membantumu menemukan yang paling menarik.",
      alasan: [],
      profesi: [],
      aktivitas_coba: "Pilih satu kegiatan dari bidang yang paling membuatmu penasaran, lalu coba selama 30 menit.",
    };
  }

  const labels = ctx.topGroup.map((id) => CATEGORY_BY_ID[id].label);
  const joined = labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(", ")} dan ${labels[labels.length - 1]}`;
  const alasan = ctx.topGroup.map((id) => {
    const acts = topActivities(id, ctx.answers).slice(0, 2);
    const list = acts.map((a) => `“${lowerFirst(a.text)}”`).join(" dan ");
    return { category_id: id, teks: `Kamu memberi skor ${acts[0].score} untuk ${list}.` };
  });
  const profesi = ctx.topGroup.map((id) => {
    const p = CATEGORY_BY_ID[id].professions[0];
    return { category_id: id, profession_id: p.id, alasan: p.description };
  });
  return {
    ringkasan: `Saat ini kamu paling tertarik pada ${joined}. Ini menggambarkan kegiatan yang ingin kamu coba, bukan ukuran kemampuan. Minatmu bisa berubah setelah mencoba langsung.`,
    alasan,
    profesi,
    aktivitas_coba: CATEGORY_BY_ID[ctx.topGroup[0]].tryActivity,
  };
}
