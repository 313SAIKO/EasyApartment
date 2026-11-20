"use client";
export default function PageState({
  message,
  error = false,
  retry,
}: {
  message: string;
  error?: boolean;
  retry?: () => void;
}) {
  return (
    <div
      role={error ? "alert" : "status"}
      className={`my-4 rounded-xl border p-5 text-center ${error ? "border-red-200 bg-red-50 text-red-800" : "border-slate-200 bg-white text-slate-600"}`}
    >
      <p>{message}</p>
      {error && (
        <button
          type="button"
          onClick={retry ?? (() => window.location.reload())}
          className="mt-3 rounded-lg border border-current px-4 py-2"
        >
          ลองใหม่
        </button>
      )}
    </div>
  );
}
