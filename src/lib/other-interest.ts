import { INTEREST_GROUPS, type InterestGroup } from "@/config/other-interest";
import type { CategoryId } from "@/config/questionnaire";

export interface OtherInterestMatch {
  /** Kelompok minat yang dikenali, urut sesuai urutan kemunculan dalam teks. */
  groups: InterestGroup[];
  /** Bidang kuis yang disebut (tanpa duplikat), urut sesuai kemunculan. */
  categories: CategoryId[];
}

const PREFIXES = "(?:me|men|mem|meng|meny|pe|pen|pem|peng|ber|be|ke|di|ter)?";
const SUFFIXES = "(?:s|er|ers|an|kan|nya|i|wan|ing|base)?";

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface Entry {
  group: InterestGroup;
  re: RegExp;
  words: number;
  length: number;
}

const ENTRIES: Entry[] = INTEREST_GROUPS.flatMap((group) =>
  group.keywords.map((kw) => {
    const body = escape(kw);
    // Kata pendek (ui, ai, it, k3…) harus utuh supaya tidak cocok di dalam kata lain.
    const pattern = kw.length >= 4 ? `${PREFIXES}${body}${SUFFIXES}` : body;
    return { group, re: new RegExp(`(?<=^| )${pattern}(?= |$)`, "g"), words: kw.split(" ").length, length: kw.length };
  }),
).sort((a, b) => b.words - a.words || b.length - a.length);

export function normalizeInterest(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Mengenali kelompok minat dari isian bebas dengan kata kunci (tanpa AI).
 * Frasa terpanjang dicocokkan lebih dulu dan "memakan" teksnya, sehingga
 * "mobile legend" tidak lagi dibaca sebagai "mobile".
 */
export function matchOtherInterest(text: string | null | undefined): OtherInterestMatch {
  if (!text) return { groups: [], categories: [] };
  let rest = ` ${normalizeInterest(text)} `;
  const hits: { group: InterestGroup; index: number }[] = [];
  for (const e of ENTRIES) {
    rest = rest.replace(e.re, (m, offset: number) => {
      hits.push({ group: e.group, index: offset });
      return " ".repeat(m.length);
    });
  }
  hits.sort((a, b) => a.index - b.index);
  const groups: InterestGroup[] = [];
  for (const h of hits) if (!groups.includes(h.group)) groups.push(h.group);
  const categories: CategoryId[] = [];
  for (const g of groups) for (const c of g.categories) if (!categories.includes(c)) categories.push(c);
  return { groups, categories };
}

/**
 * Bidang yang disebut secara spesifik (mis. "video editor" → konten), untuk
 * pemecah seri. Kata umum seperti "programmer" (terkait beberapa bidang) tidak dipakai.
 */
export function mentionedCategories(text: string | null | undefined): CategoryId[] {
  return matchOtherInterest(text).groups.filter((g) => g.categories.length === 1).map((g) => g.categories[0]);
}
