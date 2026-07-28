import { NextResponse } from "next/server";
import Papa from "papaparse";
import { prisma } from "@/lib/prisma";
import { generateSku } from "@/lib/sku";
import { isSessionUser, requireSessionUser } from "@/lib/auth";

interface ImportRow {
  name?: string;
  sku?: string;
  barcode?: string;
  brand?: string;
  category?: string;
  condition?: string;
  location?: string;
  purchasePrice?: string;
  listingPrice?: string;
  status?: string;
}

export async function POST(request: Request) {
  const session = await requireSessionUser();
  if (!isSessionUser(session)) return session;

  const { csv } = (await request.json()) as { csv?: string };
  if (!csv) return NextResponse.json({ error: "csv text is required" }, { status: 400 });

  const parsed = Papa.parse<ImportRow>(csv, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    return NextResponse.json({ error: parsed.errors[0].message }, { status: 400 });
  }

  const existingSkus = new Set(
    (await prisma.inventoryItem.findMany({ where: { userId: session.id }, select: { sku: true } })).map((i) => i.sku)
  );
  const existingBarcodes = new Set(
    (
      await prisma.inventoryItem.findMany({
        where: { userId: session.id, barcode: { not: null } },
        select: { barcode: true },
      })
    ).map((i) => i.barcode)
  );

  let created = 0;
  let skippedDuplicates = 0;
  const errors: string[] = [];

  for (const row of parsed.data) {
    if (!row.name) continue;
    if (row.barcode && existingBarcodes.has(row.barcode)) {
      skippedDuplicates++;
      continue;
    }
    const sku = row.sku && !existingSkus.has(row.sku) ? row.sku : generateSku(row.category);
    try {
      await prisma.inventoryItem.create({
        data: {
          userId: session.id,
          sku,
          barcode: row.barcode || null,
          name: row.name,
          brand: row.brand || null,
          category: row.category || null,
          condition: row.condition || null,
          location: row.location || null,
          purchasePrice: row.purchasePrice ? Number(row.purchasePrice) : null,
          listingPrice: row.listingPrice ? Number(row.listingPrice) : null,
          status: row.status || "purchased",
        },
      });
      existingSkus.add(sku);
      if (row.barcode) existingBarcodes.add(row.barcode);
      created++;
    } catch (err) {
      errors.push(`Row "${row.name}": ${(err as Error).message}`);
    }
  }

  if (created > 0) {
    await prisma.activityLog.create({
      data: { userId: session.id, message: `Imported ${created} item(s) from CSV`, type: "inventory" },
    });
  }

  return NextResponse.json({ created, skippedDuplicates, errors });
}
