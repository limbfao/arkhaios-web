"use client"
import { useEffect, useRef, useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import SearchModal from "./searchModal";

export default function Search() {
  const dialog = useRef(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => {
    setIsModalOpen(true);
    dialog.current?.showModal();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    dialog.current?.close();
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
      const shortcut = (event.key === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !typing);

      if (shortcut && !isModalOpen) {
        event.preventDefault();
        openModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen]);

  return (
    <>
      <button
        onClick={openModal}
        className="flex h-10 w-full max-w-md items-center gap-2.5 rounded-btn border border-line bg-stone px-3 text-sm text-muted transition-colors hover:border-muted/50"
      >
        <MagnifyingGlassIcon className="h-4 w-4" />
        <span className="flex-1 text-left">Search stocks, crypto and funds</span>
        <kbd className="rounded border border-line px-1.5 text-xs">/</kbd>
      </button>

      <dialog ref={dialog} className="modal items-start pt-[12vh]" onClose={() => setIsModalOpen(false)}>
        <div className="modal-box max-w-xl border border-line bg-stone p-0">
          {isModalOpen ? <SearchModal onClose={closeModal} /> : null}
        </div>
        <form method="dialog" className="modal-backdrop bg-black/60">
          <button type="button" onClick={closeModal}>Close</button>
        </form>
      </dialog>
    </>
  );
}
