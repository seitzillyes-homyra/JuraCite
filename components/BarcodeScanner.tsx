"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface Props {
  onClose: () => void;
  onResult: (isbn: string) => void;
}

type CameraStatus = "checking" | "active" | "denied" | "unavailable";

function isValidISBN(text: string): boolean {
  const digits = text.replace(/[^0-9X]/gi, "");
  if (digits.length === 13) {
    return digits.startsWith("978") || digits.startsWith("979");
  }
  return digits.length === 10;
}

function normalizeISBN(text: string): string {
  return text.replace(/[^0-9X]/gi, "").toUpperCase();
}

export default function BarcodeScanner({ onClose, onResult }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("checking");
  const [isbnInput, setIsbnInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const resultFiredRef = useRef(false);

  const handleValidISBN = useCallback(
    (isbn: string) => {
      if (resultFiredRef.current) return;
      resultFiredRef.current = true;
      onResult(isbn);
    },
    [onResult]
  );

  useEffect(() => {
    if (!videoRef.current) return;
    if (typeof window === "undefined") return;

    let controls: { stop: () => void } | null = null;
    let active = true;

    async function startScanner() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraStatus("unavailable");
        return;
      }

      try {
        // Dynamic import — keeps zxing out of the SSR bundle
        const { BrowserMultiFormatReader } = await import("@zxing/browser");

        if (!active || !videoRef.current) return;

        // Prefer rear camera on mobile
        let preferredDeviceId: string | undefined = undefined;
        try {
          const devices = await BrowserMultiFormatReader.listVideoInputDevices();
          if (devices.length > 1) {
            const back = devices.find((d) =>
              /back|rear|environment|0/i.test(d.label)
            );
            preferredDeviceId = (back ?? devices[devices.length - 1]).deviceId;
          }
        } catch {
          // Fall back to default device
        }

        setCameraStatus("active");

        controls = await (new BrowserMultiFormatReader()).decodeFromVideoDevice(
          preferredDeviceId,
          videoRef.current,
          (result, _err) => {
            if (!active || !result) return;
            const text = result.getText();
            if (isValidISBN(text)) {
              controls?.stop();
              handleValidISBN(normalizeISBN(text));
            }
          }
        );
      } catch (err) {
        if (!active) return;
        const msg = err instanceof Error ? err.message : "";
        if (
          msg.includes("Permission") ||
          msg.includes("NotAllowed") ||
          msg.includes("denied")
        ) {
          setCameraStatus("denied");
        } else {
          setCameraStatus("unavailable");
        }
      }
    }

    startScanner();

    return () => {
      active = false;
      controls?.stop();
    };
  }, [handleValidISBN]);

  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = isbnInput.replace(/[^0-9X]/gi, "");
    if (!isValidISBN(clean)) {
      setInputError(
        "Bitte eine gültige ISBN-13 (z.B. 9783406…) oder ISBN-10 eingeben."
      );
      return;
    }
    setInputError(null);
    handleValidISBN(normalizeISBN(clean));
  }

  const showCamera =
    cameraStatus === "checking" || cameraStatus === "active";

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(6, 15, 10, 0.85)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Modal card */}
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "#0C1E14", border: "1px solid #265639" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid #1C432B" }}
        >
          <div className="flex items-center gap-2.5">
            <svg
              className="w-4 h-4"
              style={{ color: "#D4A83C" }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z"
              />
            </svg>
            <span
              className="font-display text-lg font-semibold"
              style={{ color: "#F2EDE0" }}
            >
              Barcode scannen
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full transition-colors duration-150"
            style={{ color: "#74A882" }}
            aria-label="Schließen"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Camera viewfinder */}
        {showCamera && (
          <div className="relative" style={{ height: 240, background: "#060F0A" }}>
            {/* Video stream */}
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />

            {/* Corner markers */}
            {cameraStatus === "active" && (
              <>
                <div
                  className="absolute top-4 left-4 w-6 h-6"
                  style={{ borderTop: "2px solid #D4A83C", borderLeft: "2px solid #D4A83C" }}
                />
                <div
                  className="absolute top-4 right-4 w-6 h-6"
                  style={{ borderTop: "2px solid #D4A83C", borderRight: "2px solid #D4A83C" }}
                />
                <div
                  className="absolute bottom-4 left-4 w-6 h-6"
                  style={{ borderBottom: "2px solid #D4A83C", borderLeft: "2px solid #D4A83C" }}
                />
                <div
                  className="absolute bottom-4 right-4 w-6 h-6"
                  style={{ borderBottom: "2px solid #D4A83C", borderRight: "2px solid #D4A83C" }}
                />
                {/* Scanning line */}
                <div className="scan-line absolute left-6 right-6" />
              </>
            )}

            {/* Checking overlay */}
            {cameraStatus === "checking" && (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ background: "#060F0A" }}
              >
                <svg
                  className="animate-spin w-6 h-6"
                  style={{ color: "#D4A83C" }}
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              </div>
            )}
          </div>
        )}

        {/* Status text */}
        <div className="px-5 pt-4 pb-1">
          {cameraStatus === "active" && (
            <p className="font-sans text-xs text-center" style={{ color: "#74A882" }}>
              Halten Sie den Barcode des Buches vor die Kamera
            </p>
          )}
          {cameraStatus === "checking" && (
            <p className="font-sans text-xs text-center" style={{ color: "#74A882" }}>
              Kamera wird gestartet…
            </p>
          )}
          {cameraStatus === "denied" && (
            <div
              className="flex items-start gap-2 p-3 rounded-lg text-xs font-sans"
              style={{ background: "#1C1915", color: "#C49030", border: "1px solid #3E382E" }}
            >
              <svg
                className="w-4 h-4 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
              <span>
                Kamerazugriff verweigert. Bitte erlauben Sie den Kamerazugriff in den
                Browsereinstellungen oder geben Sie die ISBN manuell ein.
              </span>
            </div>
          )}
          {cameraStatus === "unavailable" && (
            <div
              className="flex items-start gap-2 p-3 rounded-lg text-xs font-sans"
              style={{ background: "#1C1915", color: "#74A882", border: "1px solid #1C432B" }}
            >
              <svg
                className="w-4 h-4 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
              <span>
                Keine Kamera verfügbar. Bitte geben Sie die ISBN manuell ein.
              </span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 px-5 py-3">
          <div className="flex-1 h-px" style={{ background: "#1C432B" }} />
          <span className="font-sans text-[11px] uppercase tracking-wider" style={{ color: "#4D8A64" }}>
            oder ISBN manuell eingeben
          </span>
          <div className="flex-1 h-px" style={{ background: "#1C432B" }} />
        </div>

        {/* Manual ISBN input */}
        <div className="px-5 pb-5">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={isbnInput}
              onChange={(e) => {
                setIsbnInput(e.target.value);
                setInputError(null);
              }}
              placeholder="978-3-406-…"
              className="flex-1 px-3 py-2.5 text-sm font-sans rounded-lg outline-none min-w-0 transition-colors"
              style={{
                background: "#14301F",
                color: "#F2EDE0",
                border: "1px solid #265639",
                caretColor: "#D4A83C",
              }}
              inputMode="numeric"
              autoComplete="off"
            />
            <button
              type="submit"
              className="flex-shrink-0 px-4 py-2.5 rounded-lg font-sans font-semibold text-sm transition-colors duration-150"
              style={{ background: "#9E6E1A", color: "#FAF6EE" }}
            >
              Suchen
            </button>
          </form>
          {inputError && (
            <p className="mt-2 text-[11px] font-sans" style={{ color: "#D4A83C" }}>
              {inputError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
