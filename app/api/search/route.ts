import { NextRequest, NextResponse } from "next/server";
import { searchDNB } from "@/lib/dnb";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json(
      { error: "Bitte mindestens 2 Zeichen eingeben." },
      { status: 400 }
    );
  }

  try {
    const results = await searchDNB(q);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("DNB search failed:", error);
    return NextResponse.json(
      { error: "Die Suche konnte nicht durchgeführt werden. Bitte versuchen Sie es erneut." },
      { status: 500 }
    );
  }
}
