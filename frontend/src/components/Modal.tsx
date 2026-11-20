"use client";
import { ReactNode, useEffect, useRef } from "react";
export default function Modal({
  isOpen,
  onClose,
  children,
  panelClassName = "max-w-lg p-6",
}: {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  panelClassName?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (isOpen && !dialog.current?.open) dialog.current?.showModal();
    if (!isOpen) dialog.current?.close();
  }, [isOpen]);
  return (
    <dialog
      ref={dialog}
      aria-label="รายละเอียด"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className={`m-auto w-[calc(100%_-_2rem)] max-h-[90dvh] overflow-y-auto rounded-xl bg-white shadow-lg backdrop:bg-black/40 ${panelClassName}`}
    >
      <button
        aria-label="ปิดรายละเอียด"
        onClick={onClose}
        className="absolute z-10 top-2 right-3 rounded bg-white/90 p-2 text-gray-500 hover:text-black"
      >
        ✕
      </button>
      {children}
    </dialog>
  );
}
