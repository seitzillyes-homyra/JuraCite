import { NextRequest, NextResponse } from "next/server";
import { searchDNBByISBN, searchDNBByTitleAndAuthor } from "@/lib/dnb";
import type { BookResult } from "@/lib/dnb";

export interface IsbnLookupResult {
  scannedBook: BookResult;
  latestEdition: BookResult | null;
  isLatest: boolean;
}

function determineIfLatest(
  scanned: BookResult,
  latest: BookResult | null
): boolean {
  if (!latest || latest.id === scanned.id) return true;

  // Compare by edition number when both are known
  if (scanned.editionNumber !== null && latest.editionNumber !== null) {
    return scanned.editionNumber >= latest.editionNumber;
  }

  // Fall back to year
  const scannedYear = parseInt(scanned.year ?? "0");
  const latestYear = parseInt(latest.year ?? "0");
  if (latestYear > 0 && scannedYear > 0) {
    return scannedYear >= latestYear;
  }

  return true; // Can't determine → assume latest to avoid false alarms
}

export async function GET(request: NextRequest) {
  const isbn = request.nextUrl.searchParams.get("q")?.trim();

  if (!isbn) {
    return NextResponse.json({ error: "ISBN fehlt." }, { status: 400 });
  }

  const clean = isbn.replace(/[^0-9X]/gi, "");
  if (clean.length !== 13 && clean.length !== 10) {
    return NextResponse.json(
      { error: "Ungültige ISBN. Bitte eine 10- oder 13-stellige ISBN eingeben." },
      { status: 400 }
    );
  }

  try {
    // Step 1: Find the exact edition by ISBN
    const isbnResults = await searchDNBByISBN(clean);

    if (!isbnResults.length) {
      return NextResponse.json(
        { error: "Kein Buch mit dieser ISBN in der DNB gefunden." },
        { status: 404 }
      );
    }

    const scannedBook = isbnResults[0];

    // Step 2: Search by title + author to find all editions and determine the latest
    const authorSurname = scannedBook.authors[0]?.split(",")[0].trim() ?? "";
    console.log(`[ISBN route] Comparison search: title="${scannedBook.shortTitle}" author="${authorSurname}"`);
    const titleResults = await searchDNBByTitleAndAuthor(scannedBook.shortTitle, authorSurname);
    console.log(`[ISBN route] Title+author search returned ${titleResults.length} result(s):`);
    titleResults.forEach((r, i) => {
      console.log(`  [${i}] title="${r.title}" | year=${r.year} | publisher="${r.publisher}" | edition="${r.edition}" | editionNumber=${r.editionNumber}`);
    });
    const latestEdition = titleResults[0] ?? null;

    const isLatest = determineIfLatest(scannedBook, latestEdition);

    const result: IsbnLookupResult = {
      scannedBook,
      latestEdition: isLatest ? null : latestEdition,
      isLatest,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("ISBN lookup failed:", error);
    return NextResponse.json(
      { error: "Die ISBN-Suche konnte nicht durchgeführt werden. Bitte versuchen Sie es erneut." },
      { status: 500 }
    );
  }
}
