import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6" aria-busy="true" aria-label="Memuat kuis">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="mt-8 h-9 w-2/3" />
      <Skeleton className="mt-6 h-14 w-full" />
      <Skeleton className="mt-4 h-14 w-full" />
    </div>
  );
}
