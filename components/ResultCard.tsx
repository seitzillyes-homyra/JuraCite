"use client";

import { useState } from "react";
import type { BookResult } from "@/lib/dnb";
import { decodeTitle } from "@/lib/utils";

interface Props {
  book: BookResult;
  index?: number;
}

export default function ResultCard({ book, index = 0 }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(decodeTitle(book.citationFormat));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard errors
    }
  }

  return (
    <article
      className="bg-parchment-50 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 animate-fade-up border border-parchment-200"
      style={{ animationDelay: `${index * 65}ms` }}
    >
      {/* Gold top accent */}
      <div
        className="h-[3px]"
        style={{
          background: "linear-gradient(90deg, #9E6E1A 0%, #D4A83C 60%, #FAF6EE 100%)",
        }}
      />

      {/* Book info */}
      <div className="px-6 pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-[22px] font-semibold text-ink-900 leading-snug">
              {decodeTitle(book.title)}
            </h2>
            {book.subtitle && (
              <p className="font-sans text-sm text-ink-500 mt-0.5 leading-snug">
                {decodeTitle(book.subtitle)}
              </p>
            )}
          </div>
          {book.year && (
            <span className="flex-shrink-0 font-sans text-[11px] font-semibold px-2.5 py-1 rounded bg-hunter-100 text-hunter-700 border border-hunter-200 tracking-wide">
              {book.year}
            </span>
          )}
        </div>

        {/* Metadata */}
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-sm font-sans">
          {book.edition && (
            <div className="flex items-center gap-1.5">
              <span className="text-ink-400">Auflage</span>
              <span className="font-medium text-ink-700">{book.edition}</span>
            </div>
          )}
          {book.year && (
            <div className="flex items-center gap-1.5">
              <span className="text-ink-400">Jahr</span>
              <span className="font-medium text-ink-700">{book.year}</span>
            </div>
          )}
          {book.publisher && (
            <div className="flex items-center gap-1.5">
              <span className="text-ink-400">Verlag</span>
              <span className="font-medium text-ink-700">{book.publisher}</span>
            </div>
          )}
          {book.place && (
            <div className="flex items-center gap-1.5">
              <span className="text-ink-400">Ort</span>
              <span className="font-medium text-ink-700">{book.place}</span>
            </div>
          )}
          {book.authors.length > 0 && (
            <div className="w-full flex items-baseline gap-1.5">
              <span className="text-ink-400 flex-shrink-0">
                {book.isEditor ? "Hrsg." : "Autor"}
              </span>
              <span className="font-medium text-ink-700">
                {book.authors.slice(0, 4).join(" · ")}
                {book.authors.length > 4 && "\u00a0u.\u202fa."}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Citation */}
      <div className="citation-box mx-4 mb-4 rounded px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-sans text-[10px] font-semibold text-gold-500 uppercase tracking-[0.18em] mb-1.5">
              Zitierformat
            </p>
            <p className="font-mono text-[13px] text-ink-800 break-words leading-relaxed">
              {decodeTitle(book.citationFormat)}
            </p>
          </div>
          <button
            onClick={handleCopy}
            title="In Zwischenablage kopieren"
            className={`mt-6 flex-shrink-0 flex items-center gap-1.5 text-xs font-sans font-medium px-2.5 py-1.5 rounded transition-all duration-200 ${
              copied
                ? "bg-hunter-100 text-hunter-700 border border-hunter-200"
                : "bg-parchment-50 hover:bg-white text-ink-500 hover:text-gold-600 border border-parchment-300 hover:border-gold-300"
            }`}
          >
            {copied ? (
              <>
                <svg
                  className="w-3.5 h-3.5"
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
                Kopiert
              </>
            ) : (
              <>
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
                    d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                  />
                </svg>
                Kopieren
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
