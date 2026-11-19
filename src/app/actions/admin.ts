"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { pinSchema, classLabelSchema } from "@/lib/validation";
import { assertSameOrigin, clientKey } from "@/lib/security/request";
import { attemptLogin, clearAdminCookie, getAdminSession, setAdminCookie } from "@/server/admin-auth";
import { addClass, deleteClassIfEmpty, renameClass, setClassActive } from "@/server/admin-data";

export type FormState = { ok: boolean; message: string } | null;

const GENERIC_FAIL = "PIN tidak dapat diterima. Periksa lalu coba lagi.";

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await assertSameOrigin();
  } catch {
    return { ok: false, message: "Permintaan ditolak." };
  }
  const pin = String(formData.get("pin") ?? "");
  if (!pinSchema.safeParse(pin).success) return { ok: false, message: "PIN harus tepat 6 digit angka." };
  const result = await attemptLogin(pin, await clientKey());
  if (!result.ok) {
    if (result.reason === "limited") return { ok: false, message: "Terlalu banyak percobaan. Coba lagi dalam 15 menit." };
    if (result.reason === "unconfigured") return { ok: false, message: "Login admin belum dikonfigurasi di server." };
    return { ok: false, message: GENERIC_FAIL };
  }
  await setAdminCookie(result.token, result.expiresAt);
  redirect("/admin");
}

export async function logoutAction() {
  await assertSameOrigin();
  await clearAdminCookie();
  redirect("/admin/login");
}

async function guard() {
  await assertSameOrigin();
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
}

const idSchema = z.uuid();

export async function addClassAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await guard();
  const label = classLabelSchema.safeParse(String(formData.get("label") ?? ""));
  if (!label.success) return { ok: false, message: label.error.issues[0].message };
  const ok = await addClass(label.data);
  revalidatePath("/admin/kelas");
  return ok ? { ok: true, message: `Kelas “${label.data}” ditambahkan.` } : { ok: false, message: "Nama kelas sudah ada." };
}

export async function renameClassAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await guard();
  const id = idSchema.safeParse(formData.get("id"));
  const label = classLabelSchema.safeParse(String(formData.get("label") ?? ""));
  if (!id.success) return { ok: false, message: "Kelas tidak ditemukan." };
  if (!label.success) return { ok: false, message: label.error.issues[0].message };
  const ok = await renameClass(id.data, label.data);
  revalidatePath("/admin/kelas");
  return ok ? { ok: true, message: "Nama kelas diperbarui." } : { ok: false, message: "Nama kelas sudah dipakai." };
}

export async function toggleClassAction(formData: FormData) {
  await guard();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;
  await setClassActive(id.data, formData.get("active") === "1");
  revalidatePath("/admin/kelas");
}

export async function deleteClassAction(formData: FormData) {
  await guard();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;
  await deleteClassIfEmpty(id.data);
  revalidatePath("/admin/kelas");
}
