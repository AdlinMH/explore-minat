import type { Metadata } from "next";
import { requireAdmin } from "@/server/admin-auth";
import { listAllClasses } from "@/server/admin-data";
import { AddClassForm, RenameClassForm } from "@/components/admin/class-forms";
import { deleteClassAction, toggleClassAction } from "@/app/actions/admin";

export const metadata: Metadata = { title: "Kelola kelas" };

export default async function KelasPage() {
  await requireAdmin();
  const classes = await listAllClasses();
  return (
    <div className="grid max-w-3xl gap-6">
      <div>
        <h1 className="text-2xl font-bold">Kelola kelas</h1>
        <p className="text-sm text-muted-foreground">Hanya kelas aktif yang muncul di pilihan siswa. Kelas yang sudah memiliki respons tidak bisa dihapus; nonaktifkan agar histori tetap ada.</p>
      </div>
      <AddClassForm />
      {classes.length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-card p-5 text-muted-foreground">Belum ada kelas. Tambahkan kelas di atas.</p>
      ) : (
        <ul className="grid gap-3">
          {classes.map((c) => (
            <li key={c.id} className="rounded-2xl border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  {c.label}{" "}
                  <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${c.is_active ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {c.is_active ? "Aktif" : "Nonaktif"}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">{c.response_count} respons</p>
              </div>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <RenameClassForm id={c.id} label={c.label} />
                <form action={toggleClassAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="active" value={c.is_active ? "0" : "1"} />
                  <button type="submit" className="inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-semibold hover:bg-muted">
                    {c.is_active ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                </form>
                {c.response_count === 0 && (
                  <form action={deleteClassAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" className="inline-flex min-h-11 items-center rounded-lg border border-destructive/40 px-3 text-sm font-semibold text-destructive hover:bg-destructive/5">
                      Hapus
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
