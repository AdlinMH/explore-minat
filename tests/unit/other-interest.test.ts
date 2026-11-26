import { describe, expect, it } from "vitest";
import { matchOtherInterest, mentionedCategories } from "@/lib/other-interest";

const ids = (t: string) => matchOtherInterest(t).groups.map((g) => g.id);

describe("membaca minat lainnya", () => {
  it.each([
    ["Saya mau jadi video editor", ["konten"]],
    ["mendesain gambar", ["desain"]],
    ["Graphic desainer", ["desain"]],
    ["UI/UX designer", ["desain"]],
    ["Q&A Tester", ["qa"]],
    ["backend engginer", ["website"]],
    ["Developer Game atau Ingin coba Robotik", ["game", "robotik"]],
    ["clipper tiktok dan pro player mobile legend", ["konten", "esport"]],
    ["membuat pastry dan kue", ["kuliner"]],
    ["kewirausahaan", ["wirausaha"]],
    ["mas mas enginer tambang", ["teknik"]],
    ["Berternak dan otomotif", ["pertanian", "teknik"]],
    ["Dokter Forensik", ["kesehatan", "hukum"]],
    ["pekerja diluar negara", ["luar_negeri"]],
    ["melukis/ menjadi pelukis", ["seni"]],
    ["bahasa dan sosial", ["bahasa"]],
    ["admin media sosial", ["konten"]],
  ])("%s → %j", (text, expected) => {
    expect(ids(text)).toEqual(expected);
  });

  it("tidak salah tangkap kata umum", () => {
    expect(ids("saya berusaha datang tepat waktu")).toEqual([]);
    expect(ids("ada")).toEqual([]);
    expect(ids("")).toEqual([]);
    expect(matchOtherInterest(null)).toEqual({ groups: [], categories: [] });
  });

  it("kata umum pemrograman terkait beberapa bidang, tapi tidak dipakai pemecah seri", () => {
    const m = matchOtherInterest("saya suka programming");
    expect(m.categories).toEqual(["website", "mobile", "game"]);
    expect(mentionedCategories("saya suka programming")).toEqual([]);
  });

  it("bidang spesifik dipakai pemecah seri sesuai urutan disebut", () => {
    expect(mentionedCategories("programmer dan content creator, suka website")).toEqual(["konten", "website"]);
  });
});
