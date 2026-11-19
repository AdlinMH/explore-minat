import { CATEGORY_BY_ID, EXPLORATION_LABEL, QUESTIONS, type CategoryId, type ExplorationStatusId } from "@/config/questionnaire";
import { roundOne, type ResultPattern } from "@/lib/scoring";

export interface ExplanationContext {
  questionnaireVersion: string;
  answers: Record<string, number>;
  scores: Record<string, number>;
  topGroup: CategoryId[];
  pattern: ResultPattern;
  explorationStatus: ExplorationStatusId;
}

/**
 * Payload minimal untuk OpenAI: hanya ID pertanyaan, teks aktivitas dari
 * konfigurasi, skor, peringkat server, status eksplorasi, dan katalog terkurasi.
 * Tidak berisi nama, kelas, ID respons, atau teks bebas siswa.
 */
export function buildAiPayload(ctx: ExplanationContext) {
  return {
    questionnaire_version: ctx.questionnaireVersion,
    skala: "1 = Tidak tertarik … 5 = Sangat tertarik (minat, bukan kemampuan)",
    pola_hasil: ctx.pattern,
    kategori_rekomendasi: ctx.topGroup,
    status_eksplorasi: EXPLORATION_LABEL[ctx.explorationStatus],
    skor_kategori: Object.entries(ctx.scores).map(([id, raw]) => ({
      category_id: id,
      skor_mentah: raw,
      skor_minat_0_100: roundOne(((raw - 3) / 12) * 100),
    })),
    jawaban: QUESTIONS.map((q) => ({
      question_id: q.id,
      category_id: q.category,
      aktivitas: q.text,
      skor: ctx.answers[q.id],
    })),
    katalog: ctx.topGroup.map((id) => {
      const c = CATEGORY_BY_ID[id];
      return {
        category_id: c.id,
        label: c.label,
        penjelasan: c.description,
        profesi: c.professions.map((p) => ({ profession_id: p.id, nama: p.name })),
      };
    }),
  };
}

export const SYSTEM_INSTRUCTIONS = `Kamu menulis penjelasan hasil kuis eksplorasi minat karier untuk siswa SMK di Indonesia.
Aturan wajib:
- Bahasa Indonesia sederhana, hangat, kalimat pendek, sapaan "kamu". Jangan memakai nama siswa.
- Ini kuesioner minat yang belum tervalidasi. Jangan menyebut bakat, kemampuan, kepribadian, tipe MBTI, atau akurasi. Jangan menyatakan profesi "pasti cocok" atau menjamin apa pun.
- Skor, peringkat, dan kategori rekomendasi sudah ditetapkan server. Jangan mengubah, menambah, atau mengurutkan ulang kategori. Hanya jelaskan kategori di "kategori_rekomendasi".
- "alasan": satu item per kategori rekomendasi, sebut 1–2 aktivitas dari "jawaban" kategori itu yang diberi skor tertinggi.
- "profesi": pilih 1–2 profession_id dari "katalog" untuk setiap kategori rekomendasi, dengan alasan satu kalimat yang mengaitkan aktivitas yang diminati.
- "aktivitas_coba": satu kegiatan kecil dan murah yang bisa dicoba minggu ini.
- Jika "pola_hasil" bukan "normal" atau "kategori_rekomendasi" kosong: "alasan" dan "profesi" harus array kosong. Untuk "all_min" jangan menyebut bidang favorit; ajak mencoba beberapa kegiatan dulu. Untuk "all_max" jelaskan ketertarikan tersebar luas. Untuk "all_equal" jelaskan minat belum membedakan bidang.
- Akhiri ringkasan dengan pengingat bahwa minat bisa berubah setelah mencoba.
- Keluarkan teks biasa saja, tanpa HTML atau Markdown.`;
