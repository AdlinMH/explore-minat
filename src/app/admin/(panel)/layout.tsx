import Link from "next/link";
import { LogOut } from "lucide-react";
import { BrandMark } from "@/components/brand";
import { requireAdmin } from "@/server/admin-auth";
import { logoutAction } from "@/app/actions/admin";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6">
          <div className="flex items-center gap-2 font-semibold">
            <BrandMark className="size-7" /> Jelajah Minat · Pemateri
          </div>
          <nav aria-label="Menu admin" className="flex items-center gap-1 text-sm font-medium">
            <Link href="/admin" className="inline-flex min-h-11 items-center rounded-lg px-3 hover:bg-muted">Dashboard</Link>
            <Link href="/admin/kelas" className="inline-flex min-h-11 items-center rounded-lg px-3 hover:bg-muted">Kelas</Link>
            <form action={logoutAction}>
              <button type="submit" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 hover:bg-muted">
                <LogOut className="size-4" aria-hidden="true" /> Keluar
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main id="konten" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
