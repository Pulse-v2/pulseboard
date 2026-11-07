import { CircleAlert } from "lucide-react";

export function DataLoadError({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800" role="alert">
      <CircleAlert aria-hidden="true" className="mr-2 inline size-4" />
      {message}
    </div>
  );
}
