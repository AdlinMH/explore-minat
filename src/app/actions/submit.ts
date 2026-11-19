"use server";

import { submissionSchema } from "@/lib/validation";
import { AnswerValidationError } from "@/lib/scoring";
import { assertSameOrigin, clientKey, ForbiddenOriginError } from "@/lib/security/request";
import { saveResponse } from "@/server/responses";
import { setOwnerCookie } from "@/server/owner-cookie";

export type SubmitState =
  | { ok: true; responseId: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

export async function submitResponse(input: unknown): Promise<SubmitState> {
  try {
    await assertSameOrigin();
    const parsed = submissionSchema.safeParse(input);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        fieldErrors[key] ??= issue.message;
      }
      return { ok: false, message: "Periksa kembali isian yang ditandai.", fieldErrors };
    }
    const result = await saveResponse(parsed.data, await clientKey());
    if (!result.ok) {
      return {
        ok: false,
        message:
          result.reason === "limited"
            ? "Terlalu banyak pengiriman dalam waktu singkat. Tunggu sebentar lalu coba lagi."
            : "Kelas yang dipilih sudah tidak aktif. Pilih kelas lain.",
        fieldErrors: result.reason === "class_inactive" ? { classId: "Kelas tidak aktif." } : undefined,
      };
    }
    await setOwnerCookie(parsed.data.submissionKey);
    return { ok: true, responseId: result.responseId };
  } catch (err) {
    if (err instanceof AnswerValidationError) return { ok: false, message: err.message, fieldErrors: { answers: err.message } };
    if (err instanceof ForbiddenOriginError) return { ok: false, message: "Permintaan ditolak. Muat ulang halaman lalu coba lagi." };
    console.error("[submit] gagal menyimpan respons");
    return { ok: false, message: "Jawaban belum tersimpan karena gangguan server. Jawabanmu masih ada; coba kirim lagi." };
  }
}
