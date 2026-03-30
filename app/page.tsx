"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import ResultCard from "@/components/ResultCard";
import type { BookResult } from "@/lib/dnb";
import type { IsbnLookupResult } from "@/app/api/isbn/route";

// Load scanner only on client — it uses browser APIs
const BarcodeScanner = dynamic(() => import("@/components/BarcodeScanner"), {
  ssr: false,
});

const EXAMPLE_QUERIES = [
  "Palandt BGB",
  "Schönke Schröder StGB",
  "Zöller ZPO",
  "Münchener Kommentar",
  "Tipke Lang Steuerrecht",
];

// ---------------------------------------------------------------------------
// Edition status banner
// ---------------------------------------------------------------------------

function EditionBanner({ result }: { result: IsbnLookupResult }) {
  if (result.isLatest) {
    return (
      <div
        className="rounded-lg p-4 mb-6 flex items-start gap-3 animate-fade-up"
        style={{
          background: "#0E2318",
          border: "1px solid #265639",
          borderLeft: "4px solid #4D8A64",
        }}
      >
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5"
          style={{ background: "#14301F" }}
        >
          <svg
            className="w-4 h-4"
            style={{ color: "#4D8A64" }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </div>
        <div>
          <p
            className="font-display text-xl font-semibold leading-tight"
            style={{ color: "#A6CBB3" }}
          >
            Neueste Auflage
          </p>
          <p className="font-sans text-sm mt-0.5" style={{ color: "#4D8A64" }}>
            {result.scannedBook.edition
              ? `${result.scannedBook.edition} (${result.scannedBook.year ?? "?"}) `
              : ""}
            ist die aktuellste verfügbare Ausgabe in der DNB.
          </p>
        </div>
      </div>
    );
  }

  const latest = result.latestEdition;
  const latestLabel = [
    latest?.edition,
    latest?.year,
    latest?.publisher,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className="rounded-lg p-4 mb-6 flex items-start gap-3 animate-fade-up"
      style={{
        background: "#1C0A0A",
        border: "1px solid #7F1D1D",
        borderLeft: "4px solid #DC2626",
      }}
    >
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5"
        style={{ background: "#2C1010" }}
      >
        <svg
          className="w-4 h-4"
          style={{ color: "#EF4444" }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z"
          />
        </svg>
      </div>
      <div>
        <p
          className="font-display text-xl font-semibold leading-tight"
          style={{ color: "#FCA5A5" }}
        >
          Veraltete Auflage
        </p>
        {latest ? (
          <p className="font-sans text-sm mt-0.5" style={{ color: "#F87171" }}>
            Aktuelle Ausgabe:{" "}
            <span className="font-semibold">{latestLabel}</span>
          </p>
        ) : (
          <p className="font-sans text-sm mt-0.5" style={{ color: "#F87171" }}>
            Eine neuere Ausgabe ist verfügbar.
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  // Scanner state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [isbnLoading, setIsbnLoading] = useState(false);
  const [isbnError, setIsbnError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<IsbnLookupResult | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSearch(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;

    setScanResult(null);
    setIsbnError(null);
    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(trimmed)}`
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Unbekannter Fehler");
        setResults(null);
      } else {
        setResults(data.results);
      }
    } catch {
      setError("Verbindungsfehler. Bitte überprüfen Sie Ihre Internetverbindung.");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleISBN(isbn: string) {
    setScannerOpen(false);
    setIsbnLoading(true);
    setIsbnError(null);
    setScanResult(null);
    setResults(null);
    setSearched(false);
    setError(null);

    try {
      const res = await fetch(`/api/isbn?q=${encodeURIComponent(isbn)}`);
      const data = await res.json();

      if (!res.ok) {
        setIsbnError(data.error ?? "ISBN nicht gefunden.");
      } else {
        setScanResult(data as IsbnLookupResult);
      }
    } catch {
      setIsbnError("Verbindungsfehler. Bitte versuchen Sie es erneut.");
    } finally {
      setIsbnLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSearch(query);
  }

  function handleExample(example: string) {
    setQuery(example);
    handleSearch(example);
    inputRef.current?.focus();
  }

  const isLoading = loading || isbnLoading;

  return (
    <div className="min-h-screen flex flex-col bg-parchment">
      {/* Header */}
      <header className="bg-hunter-900 border-b border-hunter-800/80">
        <div className="max-w-5xl mx-auto px-6 sm:px-8 py-4 flex items-center justify-between">
          <span className="font-display text-[22px] font-medium tracking-tight text-white leading-none">
            §&thinsp;JuraCite
          </span>
          <span className="text-hunter-300 text-xs font-sans hidden sm:block tracking-wide">
            Aktuelle Auflagen · Fertige Zitate
          </span>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-hunter-900 pt-14 pb-16">
        <div className="max-w-2xl mx-auto px-6 sm:px-8 text-center">
          {/* Decorative label */}
          <div
            className="flex items-center justify-center gap-5 mb-9 animate-fade-up"
            style={{ animationDelay: "0ms" }}
          >
            <div className="hero-rule w-16" />
            <span className="font-sans text-[10px] text-gold-300 uppercase tracking-[0.22em]">
              Rechtsbibliothek
            </span>
            <div className="hero-rule w-16" />
          </div>

          <h1
            className="font-display text-[52px] sm:text-[64px] font-semibold text-white leading-[1.1] tracking-tight mb-5 animate-fade-up"
            style={{ animationDelay: "60ms" }}
          >
            Welche Auflage
            <br />
            ist aktuell?
          </h1>

          <p
            className="font-sans text-hunter-300 text-base sm:text-[17px] leading-relaxed mb-10 animate-fade-up"
            style={{ animationDelay: "120ms" }}
          >
            Geben Sie einen Kommentar oder ein Lehrbuch ein — JuraCite
            liefert die aktuelle Auflage und das fertige Zitierformat.
          </p>

          {/* Search form */}
          <form
            onSubmit={handleSubmit}
            className="animate-fade-up"
            style={{ animationDelay: "180ms" }}
          >
            <div className="flex bg-parchment-50 rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/10">
              <div className="flex items-center pl-4 text-ink-400 flex-shrink-0">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
              </div>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='z.B. „Palandt BGB" oder „Schönke Schröder StGB"'
                className="flex-1 px-3 py-[15px] text-ink-900 text-[15px] font-sans bg-transparent placeholder-ink-300 outline-none min-w-0"
                autoFocus
              />
              <button
                type="submit"
                disabled={isLoading || !query.trim()}
                className="flex-shrink-0 bg-gold-500 hover:bg-gold-400 disabled:bg-parchment-300 disabled:text-ink-400 disabled:cursor-not-allowed text-parchment-50 font-sans font-semibold text-sm px-6 py-[15px] transition-colors duration-150 whitespace-nowrap flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
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
                    Suche…
                  </>
                ) : (
                  "Suchen"
                )}
              </button>
            </div>
          </form>

          {/* Scan button + example pills row */}
          <div
            className="mt-5 flex flex-wrap items-center justify-center gap-2 animate-fade-up"
            style={{ animationDelay: "240ms" }}
          >
            {/* Barcode scan button */}
            <button
              onClick={() => setScannerOpen(true)}
              disabled={isLoading}
              className="flex items-center gap-1.5 font-sans text-xs font-medium border px-3 py-1.5 rounded transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                borderColor: "#D4A83C",
                color: "#D4A83C",
                background: "rgba(212,168,60,0.08)",
              }}
            >
              {isbnLoading ? (
                <svg
                  className="animate-spin w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
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
              ) : (
                <svg
                  className="w-3.5 h-3.5"
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
              )}
              {isbnLoading ? "ISBN wird gesucht…" : "Barcode scannen"}
            </button>

            {/* Divider */}
            <span className="font-sans text-[10px] text-hunter-500 px-1">·</span>

            {/* Example queries */}
            <span className="font-sans text-[10px] text-hunter-400 uppercase tracking-[0.18em]">
              Beispiele
            </span>
            {EXAMPLE_QUERIES.map((ex) => (
              <button
                key={ex}
                onClick={() => handleExample(ex)}
                className="font-sans text-xs border border-hunter-700 hover:border-gold-400/60 text-hunter-300 hover:text-gold-300 px-3 py-1.5 rounded transition-colors duration-150"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Results */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-6 sm:px-8 py-10">
        {/* ISBN / scan errors */}
        {isbnError && (
          <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
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
            <p className="font-sans text-sm">{isbnError}</p>
          </div>
        )}

        {/* Regular search errors */}
        {error && (
          <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
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
            <p className="font-sans text-sm">{error}</p>
          </div>
        )}

        {/* ISBN scan result */}
        {scanResult && (
          <div className="animate-fade-up">
            <p className="font-sans text-[11px] text-ink-400 mb-4 uppercase tracking-wider">
              Ergebnis für ISBN{" "}
              <span className="font-mono font-medium text-ink-600">
                {scanResult.scannedBook.id}
              </span>
            </p>

            <EditionBanner result={scanResult} />

            {/* Scanned book */}
            <div className="mb-3">
              <p className="font-sans text-[10px] text-ink-400 uppercase tracking-wider mb-2">
                Gescanntes Buch
              </p>
              <ResultCard book={scanResult.scannedBook} index={0} />
            </div>

            {/* Latest edition (if different) */}
            {!scanResult.isLatest && scanResult.latestEdition && (
              <div className="mt-5">
                <p className="font-sans text-[10px] text-ink-400 uppercase tracking-wider mb-2">
                  Aktuelle Auflage
                </p>
                <ResultCard book={scanResult.latestEdition} index={1} />
              </div>
            )}

            {/* Clear scan */}
            <button
              onClick={() => setScanResult(null)}
              className="mt-5 font-sans text-xs text-ink-400 hover:text-ink-600 underline underline-offset-2 transition-colors"
            >
              Ergebnis verwerfen
            </button>
          </div>
        )}

        {/* Regular search results */}
        {!scanResult && (
          <>
            {!loading && searched && results?.length === 0 && (
              <div className="text-center py-20">
                <p className="font-display text-3xl text-ink-400 mb-2">
                  Keine Ergebnisse
                </p>
                <p className="font-sans text-sm text-ink-400">
                  Versuchen Sie es mit einem anderen Suchbegriff.
                </p>
              </div>
            )}

            {results && results.length > 0 && (
              <>
                <p className="font-sans text-[11px] text-ink-400 mb-6 uppercase tracking-wider">
                  {results.length} Ergebnis{results.length !== 1 ? "se" : ""} für{" "}
                  <span className="font-semibold text-ink-600">„{query}"</span>
                  {" · "}Deutsche Nationalbibliothek
                </p>
                <div className="space-y-4">
                  {results.map((book, i) => (
                    <ResultCard key={book.id} book={book} index={i} />
                  ))}
                </div>
              </>
            )}

            {!searched && !isbnLoading && !isbnError && (
              <div className="text-center py-16">
                <p className="font-display text-2xl text-ink-300">
                  Geben Sie einen Suchbegriff ein.
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-parchment-200 bg-parchment-50">
        <div className="max-w-5xl mx-auto px-6 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-display text-sm text-ink-500">
            © {new Date().getFullYear()} JuraCite
          </span>
          <span className="font-sans text-xs text-ink-400">
            Daten:{" "}
            <a
              href="https://www.dnb.de"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-500 hover:text-gold-400 hover:underline transition-colors"
            >
              Deutsche Nationalbibliothek (DNB)
            </a>
            {" · "}Kein Anspruch auf Vollständigkeit
          </span>
        </div>
      </footer>

      {/* Barcode scanner modal */}
      {scannerOpen && (
        <BarcodeScanner
          onClose={() => setScannerOpen(false)}
          onResult={handleISBN}
        />
      )}
    </div>
  );
}
