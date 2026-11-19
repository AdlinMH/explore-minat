import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand";
import { LoginForm } from "@/components/admin/login-form";
import { getAdminSession } from "@/server/admin-auth";

export const metadata: Metadata = { title: "Login pemateri" };

export default async function LoginPage() {
  if (await getAdminSession()) redirect("/admin");
  return (
    <main id="konten" className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <BrandMark className="size-10" />
        <h1 className="mt-4 text-2xl font-bold">Masuk sebagai pemateri</h1>
        <p className="mt-1 text-sm text-muted-foreground">Masukkan PIN 6 digit.</p>
        <LoginForm />
      </div>
    </main>
  );
}
