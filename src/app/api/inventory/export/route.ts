import { prisma } from "@/lib/prisma";
import Papa from "papaparse";

const COLUMNS = [
  "sku", "barcode", "name", "brand", "category", "condition", "status", "location",
  "purchaseDate", "purchasePrice", "listingPrice", "salePrice", "profit", "roi", "profitMargin",
  "soldDate", "createdAt",
] as const;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind") ?? "inventory";

  const items = await prisma.inventoryItem.findMany({ orderBy: { createdAt: "desc" } });

  if (kind === "sales") {
    const sold = items.filter((i) => i.status === "sold");
    const rows = sold.map((i) => ({
      sku: i.sku,
      name: i.name,
      category: i.category ?? "",
      soldDate: i.soldDate?.toISOString().slice(0, 10) ?? "",
      salePrice: i.salePrice ?? "",
      platformFees: i.platformFees ?? "",
      purchasePrice: i.purchasePrice ?? "",
      profit: i.profit ?? "",
      roi: i.roi ?? "",
      profitMargin: i.profitMargin ?? "",
    }));
    const csv = Papa.unparse(rows);
    return csvResponse(csv, "sales-report.csv");
  }

  if (kind === "tax") {
    const sold = items.filter((i) => i.status === "sold");
    const rows = sold.map((i) => ({
      sku: i.sku,
      name: i.name,
      soldDate: i.soldDate?.toISOString().slice(0, 10) ?? "",
      grossSalePrice: i.salePrice ?? "",
      costOfGoods: i.purchasePrice ?? "",
      shipping: i.shippingCostEstimate ?? "",
      packaging: i.packagingCost ?? "",
      platformFees: i.platformFees ?? "",
      netProfit: i.profit ?? "",
    }));
    const csv = Papa.unparse(rows);
    return csvResponse(csv, "tax-report.csv");
  }

  const rows = items.map((i) => {
    const row: Record<string, string | number> = {};
    for (const col of COLUMNS) {
      const value = i[col as keyof typeof i];
      if (value instanceof Date) row[col] = value.toISOString();
      else row[col] = value ?? "";
    }
    return row;
  });
  const csv = Papa.unparse(rows);
  return csvResponse(csv, "inventory.csv");
}

function csvResponse(csv: string, filename: string) {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
