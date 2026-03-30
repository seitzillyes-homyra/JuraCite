import { XMLParser } from "fast-xml-parser";

export interface BookResult {
  id: string;
  title: string;
  subtitle: string | null;
  shortTitle: string;
  edition: string | null;
  editionNumber: number | null;
  year: string | null;
  publisher: string | null;
  place: string | null;
  authors: string[];
  isEditor: boolean;
  citationFormat: string;
}

// ---------------------------------------------------------------------------
// MARC21 helpers
// ---------------------------------------------------------------------------

function getDatafields(record: unknown, tag: string): unknown[] {
  const rec = record as Record<string, unknown>;
  const fields = rec?.datafield;
  if (!fields) return [];
  const arr = Array.isArray(fields) ? fields : [fields];
  return arr.filter(
    (f: unknown) => (f as Record<string, unknown>)?.["@_tag"] === tag
  );
}

function getSubfield(datafield: unknown, code: string): string | null {
  const df = datafield as Record<string, unknown>;
  const subfields = df?.subfield;
  if (!subfields) return null;
  const arr = Array.isArray(subfields) ? subfields : [subfields];
  const sf = arr.find(
    (s: unknown) => (s as Record<string, unknown>)?.["@_code"] === code
  ) as Record<string, unknown> | undefined;
  if (!sf) return null;
  const text = sf["#text"];
  return text !== undefined ? String(text).trim() : null;
}

function parseEditionNumber(edition: string | null): number | null {
  if (!edition) return null;
  const match = edition.match(/(\d+)/);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  // Reject values > 200 — these are almost certainly years (e.g. "2021. Auflage"),
  // not real edition numbers, which rarely exceed ~100 for German law books.
  return n <= 200 ? n : null;
}

function cleanString(s: string | null): string | null {
  if (!s) return null;
  // Remove trailing punctuation; MARC non-sort markers (U+0098/U+009C) are
  // kept here and decoded to German quotation marks by decodeTitle() at render time.
  return s
    .replace(/[,/;:]\s*$/, "")
    .trim();
}

function extractShortTitle(title: string): string {
  // Strip abbreviation suffixes — keep the full law name before them.
  // "Strafgesetzbuch [StGB]" → "Strafgesetzbuch"
  // "Strafgesetzbuch (StGB)" → "Strafgesetzbuch"
  const stripped = title
    .replace(/\s*\[[A-ZÄÖÜ]{2,10}\]/, "")
    .replace(/\s*\([A-ZÄÖÜ]{2,10}\)/, "");

  // Strip common prefixes and subtitles
  const cleaned = stripped
    .replace(/^Kommentar zum\s+/i, "")
    .replace(/^Kommentar zur\s+/i, "")
    .replace(/\s*:\s*.*$/, "")
    .replace(/[,/]\s*$/, "")
    .trim();

  if (cleaned.length <= 45) return cleaned;

  // Truncate at word boundary
  const words = cleaned.split(/\s+/);
  return words.slice(0, 4).join(" ");
}

function buildCitation(result: Omit<BookResult, "citationFormat">): string {
  const parts: string[] = [];

  if (result.authors.length > 0) {
    // MARC 100 $a is "Surname, Firstname" — take surname only
    const surname = result.authors[0].split(",")[0].trim();
    const suffix = result.isEditor ? " (Hrsg.)" : "";
    parts.push(`${surname}${suffix}`);
  }

  parts.push(result.shortTitle);

  if (result.editionNumber && result.editionNumber > 1) {
    parts.push(`${result.editionNumber}. Aufl.`);
  }

  if (result.place && result.year) {
    parts.push(`${result.place} ${result.year}`);
  } else if (result.year) {
    parts.push(result.year);
  }

  return parts.join(", ");
}

// ---------------------------------------------------------------------------
// Shared DNB SRU fetch + parse
// ---------------------------------------------------------------------------

async function fetchDNBRecords(
  cql: string,
  maxRecords: number = 15
): Promise<BookResult[]> {
  const url =
    "https://services.dnb.de/sru/dnb" +
    "?version=1.1" +
    "&operation=searchRetrieve" +
    "&recordSchema=MARC21-xml" +
    `&maximumRecords=${maxRecords}` +
    "&query=" +
    encodeURIComponent(cql);

  console.log(`[DNB] → URL: ${url}`);

  const response = await fetch(url, {
    headers: { Accept: "application/xml" },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`DNB API error: ${response.status}`);
  }

  const xmlText = await response.text();

  const countMatch = xmlText.match(/numberOfRecords>(\d+)/);
  const count = countMatch?.[1] ?? "?";
  console.log(`[DNB] query="${cql}" → ${count} records`);

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    removeNSPrefix: true,
    isArray: (name: string) =>
      ["record", "datafield", "subfield", "controlfield"].includes(name),
    textNodeName: "#text",
  });

  const parsed = parser.parse(xmlText) as Record<string, unknown>;

  const sruResponse = parsed?.searchRetrieveResponse as Record<string, unknown>;
  const sruRecords = (
    (sruResponse?.records as Record<string, unknown>)?.record as unknown[]
  );

  if (!sruRecords || sruRecords.length === 0) return [];

  const results: BookResult[] = [];

  for (const sruRecord of sruRecords) {
    try {
      const sru = sruRecord as Record<string, unknown>;
      const recordData = sru.recordData as Record<string, unknown>;

      const marcArr = recordData?.record as unknown[];
      const marcRecord = Array.isArray(marcArr) ? marcArr[0] : marcArr;
      if (!marcRecord) continue;

      // ---- Filter: only monographs (leader pos7 = 'm' or 'i') ----
      const leaderArr = (marcRecord as Record<string, unknown>).leader as unknown[];
      const leaderRaw = Array.isArray(leaderArr) ? leaderArr[0] : leaderArr;
      const leader = leaderRaw ? String(leaderRaw) : "";
      const pos7 = leader.length > 7 ? leader[7] : "";
      if (pos7 !== "m" && pos7 !== "i") continue;

      // ---- Control number (001) ----
      const ctrlFields = (marcRecord as Record<string, unknown>)?.controlfield as unknown[];
      const ctrlArr = Array.isArray(ctrlFields) ? ctrlFields : [];
      const idField = ctrlArr.find(
        (f: unknown) => (f as Record<string, unknown>)?.["@_tag"] === "001"
      ) as Record<string, unknown> | undefined;
      const id = idField
        ? String(idField["#text"] ?? Math.random())
        : String(Math.random());

      // ---- Title 245 $a / $b ----
      const titleFields = getDatafields(marcRecord, "245");
      const titleA = cleanString(
        titleFields.length > 0 ? getSubfield(titleFields[0], "a") : null
      );
      const titleB = cleanString(
        titleFields.length > 0 ? getSubfield(titleFields[0], "b") : null
      );
      const title = titleA ?? "Unbekannter Titel";
      const subtitle = titleB;
      const shortTitle = extractShortTitle(title);

      // ---- Edition 250 $a ----
      const editionFields = getDatafields(marcRecord, "250");
      const edition = cleanString(
        editionFields.length > 0 ? getSubfield(editionFields[0], "a") : null
      );
      const editionNumber = parseEditionNumber(edition);

      // ---- Publication info: prefer 264 ind2="1", fallback 264[0], then 260 ----
      let place: string | null = null;
      let publisher: string | null = null;
      let year: string | null = null;

      const pub264 = getDatafields(marcRecord, "264");
      const pub260 = getDatafields(marcRecord, "260");

      const pubField =
        pub264.find(
          (f) => (f as Record<string, unknown>)?.["@_ind2"] === "1"
        ) ??
        pub264[0] ??
        pub260[0] ??
        null;

      if (pubField) {
        place = cleanString(getSubfield(pubField, "a"));
        publisher = cleanString(getSubfield(pubField, "b"));
        const rawYear = getSubfield(pubField, "c");
        year = rawYear ? rawYear.replace(/\D/g, "") : null;
        if (year && year.length !== 4) year = null;
        // Reject phantom future entries (e.g. "2050 · Petersberg Verlag")
        if (year && parseInt(year) > new Date().getFullYear()) {
          console.log(`[DNB] Skipping record with future year ${year} (id=${id})`);
          continue;
        }
      }

      // ---- Authors: 100 (main) + 700 (added entries) ----
      const author100 = getDatafields(marcRecord, "100");
      const author700 = getDatafields(marcRecord, "700");
      const authors: string[] = [];
      let isEditor = false;

      if (author100.length > 0) {
        const a = cleanString(getSubfield(author100[0], "a"));
        const role =
          getSubfield(author100[0], "e") ?? getSubfield(author100[0], "4");
        if (a) {
          authors.push(a);
          if (role && /hrsg|herausgeber|edt/i.test(role)) isEditor = true;
        }
      }
      for (const af of author700.slice(0, 4)) {
        const a = cleanString(getSubfield(af, "a"));
        if (a && !authors.includes(a)) authors.push(a);
      }

      const partial: Omit<BookResult, "citationFormat"> = {
        id,
        title,
        subtitle,
        shortTitle,
        edition,
        editionNumber,
        year,
        publisher,
        place,
        authors,
        isEditor,
      };

      results.push({ ...partial, citationFormat: buildCitation(partial) });
    } catch (e) {
      console.error("Error parsing MARC record:", e);
    }
  }

  // Sort: newer year first; break ties by higher edition number
  results.sort((a, b) => {
    const ay = parseInt(a.year ?? "0");
    const by = parseInt(b.year ?? "0");
    if (by !== ay) return by - ay;
    const aEd = a.editionNumber ?? 0;
    const bEd = b.editionNumber ?? 0;
    return bEd - aEd;
  });

  return results;
}

// ---------------------------------------------------------------------------
// DNB SRU query — free-text search
// ---------------------------------------------------------------------------

function buildCQL(query: string): string {
  const words = query
    .trim()
    .split(/\s+/)
    .filter((w) => w.length >= 2);

  if (words.length === 0) return `any=${query}`;
  return words.map((w) => `any=${w}`).join(" AND ");
}

export async function searchDNB(query: string): Promise<BookResult[]> {
  return fetchDNBRecords(buildCQL(query));
}

// Title + author search used for edition comparison (more precise than free-text)
export async function searchDNBByTitleAndAuthor(
  title: string,
  authorSurname: string
): Promise<BookResult[]> {
  const titleWords = title
    .trim()
    .split(/\s+/)
    .filter((w) => w.length >= 2);
  const titleCQL = titleWords.map((w) => `tit=${w}`).join(" AND ");
  const cql = authorSurname ? `${titleCQL} AND any=${authorSurname}` : titleCQL;
  console.log(`[DNB title+author] CQL: ${cql}`);
  return fetchDNBRecords(cql, 15);
}

// ---------------------------------------------------------------------------
// Google Books API — title lookup by ISBN (used as last-resort fallback)
// ---------------------------------------------------------------------------

async function lookupTitleViaGoogleBooks(isbn: string): Promise<string | null> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}`;
  console.log(`[GoogleBooks] → URL: ${url}`);

  try {
    const response = await fetch(url, { next: { revalidate: 3600 } });
    if (!response.ok) {
      console.log(`[GoogleBooks] HTTP ${response.status}`);
      return null;
    }
    const data = (await response.json()) as Record<string, unknown>;
    const items = data?.items as unknown[] | undefined;
    if (!items || items.length === 0) {
      console.log(`[GoogleBooks] No items found for ISBN ${isbn}`);
      return null;
    }
    const volumeInfo = (
      (items[0] as Record<string, unknown>)?.volumeInfo as Record<string, unknown>
    ) ?? {};
    const title = volumeInfo?.title ? String(volumeInfo.title) : null;
    console.log(`[GoogleBooks] Title for ${isbn}: ${title}`);
    return title;
  } catch (e) {
    console.error("[GoogleBooks] Fetch failed:", e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// DNB SRU query — ISBN lookup (with fallback chain)
// ---------------------------------------------------------------------------

export async function searchDNBByISBN(isbn: string): Promise<BookResult[]> {
  // Strip everything except digits and X
  const clean = isbn.replace(/[^0-9X]/gi, "");

  const queries = [
    `num=${clean}`,
    `isbn=${clean}`,
    `idn=${clean}`,
  ];

  for (const cql of queries) {
    console.log(`[DNB ISBN] Trying query: ${cql}`);
    const results = await fetchDNBRecords(cql, 5);
    if (results.length > 0) {
      console.log(`[DNB ISBN] Found ${results.length} result(s) with query: ${cql}`);
      return results;
    }
    console.log(`[DNB ISBN] No results for query: ${cql} — trying next fallback`);
  }

  // Last resort: look up the title via Google Books and search DNB by title
  console.log(`[DNB ISBN] All DNB queries failed — trying Google Books title lookup`);
  const title = await lookupTitleViaGoogleBooks(clean);
  if (title) {
    console.log(`[DNB ISBN] Searching DNB by title: "${title}"`);
    const results = await fetchDNBRecords(buildCQL(title), 10);
    if (results.length > 0) {
      console.log(`[DNB ISBN] Found ${results.length} result(s) via Google Books title fallback`);
    } else {
      console.log(`[DNB ISBN] No DNB results for title "${title}"`);
    }
    return results;
  }

  return [];
}
