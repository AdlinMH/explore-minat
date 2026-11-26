import { z } from "zod";
import {
  CATEGORY_IDS,
  EXPLORATION_STATUS_IDS,
  NAME_MAX,
  NAME_MIN,
  OTHER_INTEREST_MAX,
  REFLECTION_MAX,
  type CategoryId,
} from "@/config/questionnaire";

/** Menghapus karakter kontrol dan merapikan spasi. */
export function cleanText(s: string): string {
  return s
    .normalize("NFC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g, "")
    .replace(/\r\n?/g, "\n")
    .trim();
}

// Huruf (termasuk beraksen), tanda gabung, spasi, titik, koma, apostrof, dan tanda hubung.
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} .,'’\-]*$/u;

export const nameSchema = z
  .string({ error: "Nama wajib diisi." })
  .transform((s) => cleanText(s).replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(NAME_MIN, `Nama minimal ${NAME_MIN} karakter.`)
      .max(NAME_MAX, `Nama maksimal ${NAME_MAX} karakter.`)
      .regex(NAME_PATTERN, "Nama hanya boleh berisi huruf, spasi, titik, koma, apostrof, atau tanda hubung."),
  );

const optionalText = (max: number, label: string) =>
  z
    .string()
    .optional()
    .nullable()
    .transform((s) => (s ? cleanText(s) : ""))
    .pipe(z.string().max(max, `${label} maksimal ${max} karakter.`))
    .transform((s) => (s.length === 0 ? null : s));

export const submissionSchema = z.object({
  submissionKey: z.uuid({ error: "Kunci pengiriman tidak valid." }),
  name: nameSchema,
  classId: z.uuid({ error: "Pilih kelas." }),
  consent: z.literal(true, { error: "Centang persetujuan sebelum mengirim." }),
  answers: z.record(z.string(), z.unknown()),
  explorationStatus: z.enum(EXPLORATION_STATUS_IDS, { error: "Pilih status eksplorasi." }),
  otherInterest: optionalText(OTHER_INTEREST_MAX, "Bidang lainnya"),
  reflection: optionalText(REFLECTION_MAX, "Aktivitas dan alasan"),
  tieBreak: z.enum(CATEGORY_IDS as [CategoryId, ...CategoryId[]]).nullish(),
});

export type SubmissionInput = z.input<typeof submissionSchema>;
export type Submission = z.output<typeof submissionSchema>;

export const pinSchema = z.string().regex(/^\d{6}$/, "PIN harus tepat 6 digit.");

export const classLabelSchema = z
  .string()
  .transform((s) => cleanText(s).replace(/\s+/g, " "))
  .pipe(z.string().min(2, "Nama kelas minimal 2 karakter.").max(60, "Nama kelas maksimal 60 karakter."));

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)));

export const filterSchema = z.object({
  kelas: z.uuid().optional().catch(undefined),
  dari: dateStr.optional().catch(undefined),
  sampai: dateStr.optional().catch(undefined),
  cari: z
    .string()
    .optional()
    .catch(undefined)
    .transform((s) => (s ? cleanText(s).slice(0, 100) : undefined) || undefined),
  hal: z.coerce.number().int().min(1).max(10000).optional().catch(undefined),
});

export type Filters = Partial<z.output<typeof filterSchema>>;

export function parseFilters(sp: Record<string, string | string[] | undefined>): Filters {
  const flat: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(sp)) flat[k] = Array.isArray(v) ? v[0] : v;
  return filterSchema.parse(flat);
}
