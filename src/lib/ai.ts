import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.AI_MODEL || "claude-sonnet-5";

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export function aiIsConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export interface ItemAnalysis {
  name: string;
  brand: string | null;
  model: string | null;
  category: string | null;
  color: string | null;
  size: string | null;
  material: string | null;
  year: string | null;
  rarity: string | null;
  condition: string;
  conditionScore: number;
  conditionReason: string;
  aiConfidence: number;
  authenticityRisk: "low" | "medium" | "high";
  authenticityNotes: string;
  msrp: number;
  currentRetail: number;
  avgSoldPrice: number;
  lowestActive: number;
  highestSoldPrice: number;
  keywords: string[];
  mocked: boolean;
}

const analysisTool: Anthropic.Tool = {
  name: "record_item_analysis",
  description:
    "Record structured product identification, condition grading, and pricing research for a resale item photographed by the user.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Full product name, e.g. 'Apple MacBook Pro 14-inch M3 Pro'" },
      brand: { type: "string" },
      model: { type: "string" },
      category: {
        type: "string",
        description:
          "One of: Electronics, Clothing, Collectibles, Home, Luxury, Automotive, Other",
      },
      color: { type: "string" },
      size: { type: "string" },
      material: { type: "string" },
      year: { type: "string" },
      rarity: { type: "string", description: "common, uncommon, rare, limited edition, or vintage" },
      condition: {
        type: "string",
        description: "One of: New, Like New, Excellent, Good, Fair, Parts/Repair",
      },
      conditionScore: { type: "integer", description: "0-100 condition score" },
      conditionReason: { type: "string", description: "One sentence explaining the condition score" },
      aiConfidence: { type: "integer", description: "0-100 confidence in this identification" },
      authenticityRisk: {
        type: "string",
        description:
          "Counterfeit risk assessment from visible details (logos, stitching, materials, packaging): low, medium, or high. Use 'low' when there's nothing suspicious.",
      },
      authenticityNotes: {
        type: "string",
        description: "One sentence explaining the authenticity risk rating, or 'No concerns noted.' if low.",
      },
      msrp: { type: "number" },
      currentRetail: { type: "number" },
      avgSoldPrice: { type: "number" },
      lowestActive: { type: "number" },
      highestSoldPrice: { type: "number" },
      keywords: { type: "array", items: { type: "string" }, description: "5-10 search keywords" },
    },
    required: [
      "name",
      "category",
      "condition",
      "conditionScore",
      "conditionReason",
      "aiConfidence",
      "authenticityRisk",
      "authenticityNotes",
      "msrp",
      "currentRetail",
      "avgSoldPrice",
      "lowestActive",
      "highestSoldPrice",
      "keywords",
    ],
  },
};

export async function identifyProduct(
  images: string[],
  hint?: { barcode?: string; note?: string }
): Promise<ItemAnalysis> {
  const client = getClient();
  if (!client) return mockAnalysis(images, hint);

  const imageBlocks: Anthropic.ImageBlockParam[] = images.slice(0, 5).map((dataUrl) => {
    const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl);
    if (!match) throw new Error("Expected a base64 data URL image");
    return {
      type: "image",
      source: { type: "base64", media_type: match[1] as Anthropic.Base64ImageSource["media_type"], data: match[2] },
    };
  });

  const textParts = [
    "Identify this resale item from the photo(s) and research realistic current market pricing from your knowledge. Call record_item_analysis with your best estimate.",
  ];
  if (hint?.barcode) textParts.push(`Barcode scanned: ${hint.barcode}`);
  if (hint?.note) textParts.push(`User note: ${hint.note}`);

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    tools: [analysisTool],
    tool_choice: { type: "tool", name: "record_item_analysis" },
    messages: [
      {
        role: "user",
        content: [...imageBlocks, { type: "text", text: textParts.join("\n") }],
      },
    ],
  });

  const toolUse = message.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!toolUse) return mockAnalysis(images, hint);

  const input = toolUse.input as Record<string, unknown>;
  return {
    name: String(input.name ?? "Unidentified Item"),
    brand: (input.brand as string) ?? null,
    model: (input.model as string) ?? null,
    category: (input.category as string) ?? null,
    color: (input.color as string) ?? null,
    size: (input.size as string) ?? null,
    material: (input.material as string) ?? null,
    year: (input.year as string) ?? null,
    rarity: (input.rarity as string) ?? null,
    condition: String(input.condition ?? "Good"),
    conditionScore: Number(input.conditionScore ?? 70),
    conditionReason: String(input.conditionReason ?? ""),
    aiConfidence: Number(input.aiConfidence ?? 60),
    authenticityRisk: (input.authenticityRisk as ItemAnalysis["authenticityRisk"]) ?? "low",
    authenticityNotes: String(input.authenticityNotes ?? "No concerns noted."),
    msrp: Number(input.msrp ?? 0),
    currentRetail: Number(input.currentRetail ?? 0),
    avgSoldPrice: Number(input.avgSoldPrice ?? 0),
    lowestActive: Number(input.lowestActive ?? 0),
    highestSoldPrice: Number(input.highestSoldPrice ?? 0),
    keywords: Array.isArray(input.keywords) ? (input.keywords as string[]) : [],
    mocked: false,
  };
}

export interface GeneratedListing {
  title: string;
  description: string;
  keywords: string[];
  itemSpecifics: Record<string, string>;
  mocked: boolean;
}

export async function generateListing(item: {
  name: string;
  brand?: string | null;
  model?: string | null;
  category?: string | null;
  color?: string | null;
  size?: string | null;
  material?: string | null;
  year?: string | null;
  condition: string;
  conditionReason?: string | null;
  price: number;
}): Promise<GeneratedListing> {
  const client = getClient();
  if (!client) return mockListing(item);

  const listingTool: Anthropic.Tool = {
    name: "record_listing",
    description: "Record an SEO-optimized marketplace listing for a resale item.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "SEO-optimized title, under 80 characters" },
        description: {
          type: "string",
          description:
            "Buyer-friendly description with overview, features, condition, what's included, and shipping info",
        },
        keywords: { type: "array", items: { type: "string" } },
        itemSpecifics: {
          type: "object",
          description: "Key-value pairs like Brand, Model, Color, Size, Material, Category, Year",
          additionalProperties: { type: "string" },
        },
      },
      required: ["title", "description", "keywords", "itemSpecifics"],
    },
  };

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    tools: [listingTool],
    tool_choice: { type: "tool", name: "record_listing" },
    messages: [
      {
        role: "user",
        content: `Write a marketplace listing for this item and call record_listing.\n${JSON.stringify(item, null, 2)}`,
      },
    ],
  });

  const toolUse = message.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!toolUse) return mockListing(item);

  const input = toolUse.input as Record<string, unknown>;
  return {
    title: String(input.title ?? item.name),
    description: String(input.description ?? ""),
    keywords: Array.isArray(input.keywords) ? (input.keywords as string[]) : [],
    itemSpecifics: (input.itemSpecifics as Record<string, string>) ?? {},
    mocked: false,
  };
}

export async function draftBuyerReply(params: {
  itemName: string;
  listingPrice: number;
  buyerName: string;
  buyerMessage: string;
  kind: string;
  offerAmount?: number | null;
}): Promise<string> {
  const client = getClient();
  if (!client) return mockBuyerReply(params);

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    system:
      "You are a professional, friendly reseller replying to a marketplace buyer message. Be concise (2-4 sentences), " +
      "protect the seller's margin on offers, and never promise anything outside the platform's normal terms.",
    messages: [
      {
        role: "user",
        content: `Item: ${params.itemName} (listed at $${params.listingPrice.toFixed(2)})\nBuyer ${params.buyerName} sent a ${params.kind}${
          params.offerAmount != null ? ` of $${params.offerAmount.toFixed(2)}` : ""
        }:\n"${params.buyerMessage}"\n\nDraft a reply.`,
      },
    ],
  });

  const text = message.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  return text?.text ?? mockBuyerReply(params);
}

const receiptTool: Anthropic.Tool = {
  name: "record_receipt_items",
  description: "Record line items extracted from a photographed purchase receipt.",
  input_schema: {
    type: "object",
    properties: {
      storeName: { type: "string" },
      purchaseDate: { type: "string", description: "YYYY-MM-DD if visible, else empty string" },
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            price: { type: "number" },
            quantity: { type: "integer" },
          },
          required: ["name", "price"],
        },
      },
    },
    required: ["items"],
  },
};

export interface ReceiptExtraction {
  storeName: string | null;
  purchaseDate: string | null;
  items: { name: string; price: number; quantity: number }[];
  mocked: boolean;
}

export async function extractReceiptItems(images: string[]): Promise<ReceiptExtraction> {
  const client = getClient();
  if (!client) return mockReceipt();

  const imageBlocks: Anthropic.ImageBlockParam[] = images.slice(0, 3).map((dataUrl) => {
    const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl);
    if (!match) throw new Error("Expected a base64 data URL image");
    return {
      type: "image",
      source: { type: "base64", media_type: match[1] as Anthropic.Base64ImageSource["media_type"], data: match[2] },
    };
  });

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    tools: [receiptTool],
    tool_choice: { type: "tool", name: "record_receipt_items" },
    messages: [
      {
        role: "user",
        content: [
          ...imageBlocks,
          { type: "text", text: "Extract every purchased line item and its price from this receipt photo, then call record_receipt_items." },
        ],
      },
    ],
  });

  const toolUse = message.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!toolUse) return mockReceipt();

  const input = toolUse.input as Record<string, unknown>;
  const items = Array.isArray(input.items) ? (input.items as Record<string, unknown>[]) : [];
  return {
    storeName: (input.storeName as string) || null,
    purchaseDate: (input.purchaseDate as string) || null,
    items: items.map((it) => ({
      name: String(it.name ?? "Item"),
      price: Number(it.price ?? 0),
      quantity: Number(it.quantity ?? 1) || 1,
    })),
    mocked: false,
  };
}

export async function generateTaxSummary(params: {
  year: number;
  grossSales: number;
  costOfGoods: number;
  fees: number;
  shippingPackaging: number;
  netProfit: number;
  itemCount: number;
}): Promise<string> {
  const client = getClient();
  if (!client) return mockTaxSummary(params);

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 500,
    system:
      "You are a tax-prep assistant for a small resale business, not a licensed accountant. Summarize the year's " +
      "figures clearly, note this is an estimate to bring to a real tax preparer, and mention Schedule C-style categories in plain language.",
    messages: [
      {
        role: "user",
        content: `Summarize ${params.year} for this resale business:\n${JSON.stringify(params, null, 2)}`,
      },
    ],
  });

  const text = message.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  return text?.text ?? mockTaxSummary(params);
}

export async function askAssistant(question: string, context: string): Promise<string> {
  const client = getClient();
  if (!client) return mockAssistantReply(question, context);

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    system:
      "You are the AI Reseller Pro assistant. Answer the reseller's question using the inventory/analytics context provided. Be concise and actionable.",
    messages: [{ role: "user", content: `Context:\n${context}\n\nQuestion: ${question}` }],
  });

  const text = message.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  return text?.text ?? "I couldn't come up with an answer for that.";
}

// ---------------------------------------------------------------------------
// Deterministic mock fallbacks, used whenever ANTHROPIC_API_KEY isn't set so
// the full scan -> price -> list -> approve flow still works end-to-end.
// ---------------------------------------------------------------------------

const SAMPLE_ITEMS: Omit<
  ItemAnalysis,
  "mocked" | "aiConfidence" | "conditionScore" | "conditionReason" | "condition" | "authenticityRisk" | "authenticityNotes"
>[] = [
  {
    name: "Apple MacBook Pro 14-inch M3 Pro",
    brand: "Apple",
    model: "MacBook Pro 14 M3 Pro",
    category: "Electronics",
    color: "Space Black",
    size: "14-inch",
    material: "Aluminum",
    year: "2023",
    rarity: "common",
    msrp: 1999,
    currentRetail: 1799,
    avgSoldPrice: 1450,
    lowestActive: 1299,
    highestSoldPrice: 1650,
    keywords: ["macbook pro", "apple laptop", "m3 pro", "14 inch", "space black"],
  },
  {
    name: "Nike Air Jordan 1 Retro High OG",
    brand: "Nike",
    model: "Air Jordan 1 Retro High",
    category: "Clothing",
    color: "Chicago",
    size: "US 10",
    material: "Leather",
    year: "2022",
    rarity: "rare",
    msrp: 180,
    currentRetail: 220,
    avgSoldPrice: 260,
    lowestActive: 210,
    highestSoldPrice: 340,
    keywords: ["air jordan 1", "chicago", "jordan retro", "sneakers", "nike"],
  },
  {
    name: "Sony PlayStation 5 Console (Disc Edition)",
    brand: "Sony",
    model: "PS5",
    category: "Electronics",
    color: "White",
    size: null,
    material: "Plastic",
    year: "2021",
    rarity: "common",
    msrp: 499,
    currentRetail: 449,
    avgSoldPrice: 380,
    lowestActive: 340,
    highestSoldPrice: 420,
    keywords: ["ps5", "playstation 5", "sony console", "disc edition"],
  },
  {
    name: "Coach Leather Tote Bag",
    brand: "Coach",
    model: "Signature Tote",
    category: "Luxury",
    color: "Brown",
    size: "Medium",
    material: "Leather",
    year: "2020",
    rarity: "uncommon",
    msrp: 350,
    currentRetail: 320,
    avgSoldPrice: 145,
    lowestActive: 110,
    highestSoldPrice: 190,
    keywords: ["coach bag", "leather tote", "designer handbag", "coach purse"],
  },
];

function seedFrom(images: string[], hint?: { barcode?: string }): number {
  const s = hint?.barcode || images[0] || "seed";
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function mockAnalysis(images: string[], hint?: { barcode?: string; note?: string }): ItemAnalysis {
  const seed = seedFrom(images, hint);
  const sample = SAMPLE_ITEMS[seed % SAMPLE_ITEMS.length];
  const conditionScore = 65 + (seed % 30);
  const conditions = ["Good", "Excellent", "Like New"];
  const condition = conditions[seed % conditions.length];

  return {
    ...sample,
    condition,
    conditionScore,
    conditionReason:
      "Demo mode (no ANTHROPIC_API_KEY set): minor surface wear detected from sample data, no visible damage.",
    aiConfidence: 55,
    authenticityRisk: "low",
    authenticityNotes: "Demo mode: no authenticity concerns flagged in sample data.",
    mocked: true,
  };
}

function mockListing(item: {
  name: string;
  brand?: string | null;
  model?: string | null;
  category?: string | null;
  color?: string | null;
  size?: string | null;
  material?: string | null;
  year?: string | null;
  condition: string;
  conditionReason?: string | null;
  price: number;
}): GeneratedListing {
  const parts = [item.brand, item.name, item.model !== item.name ? item.model : null, item.color, item.size, item.condition]
    .filter(Boolean)
    .join(" ");

  const description = [
    `Overview: ${item.name}${item.brand ? ` by ${item.brand}` : ""}, offered in ${item.condition} condition.`,
    item.conditionReason ? `Condition notes: ${item.conditionReason}` : null,
    `Features: ${[item.color, item.material, item.size].filter(Boolean).join(", ") || "See photos for full details."}`,
    "Included: item as shown in photos.",
    "Shipping: ships securely within 1-2 business days with tracking.",
    "Thanks for looking — bundle discounts available on multiple purchases!",
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    title: parts.slice(0, 80),
    description,
    keywords: [item.brand, item.category, item.condition].filter((v): v is string => Boolean(v)),
    itemSpecifics: {
      Brand: item.brand ?? "",
      Model: item.model ?? "",
      Color: item.color ?? "",
      Size: item.size ?? "",
      Material: item.material ?? "",
      Category: item.category ?? "",
      Year: item.year ?? "",
      Condition: item.condition,
    },
    mocked: true,
  };
}

function mockAssistantReply(question: string, context: string): string {
  return `Demo mode (no ANTHROPIC_API_KEY configured): I'd normally answer "${question}" using your live inventory data. Here's what I can see right now:\n\n${context}\n\nSet ANTHROPIC_API_KEY to enable real AI-powered answers.`;
}

function mockBuyerReply(params: {
  itemName: string;
  listingPrice: number;
  buyerName: string;
  kind: string;
  offerAmount?: number | null;
}): string {
  if (params.kind === "offer" && params.offerAmount != null) {
    const counter = Math.round(((params.offerAmount + params.listingPrice) / 2) * 100) / 100;
    return `Hi ${params.buyerName}, thanks for the offer! I can't quite do $${params.offerAmount.toFixed(2)}, but I could meet you at $${counter.toFixed(2)} — let me know if that works. (Demo mode: set ANTHROPIC_API_KEY for AI-drafted replies.)`;
  }
  return `Hi ${params.buyerName}, thanks for asking about the ${params.itemName}! It's still available at $${params.listingPrice.toFixed(2)} and ships within 1-2 business days. Let me know if you have any other questions. (Demo mode: set ANTHROPIC_API_KEY for AI-drafted replies.)`;
}

function mockReceipt(): ReceiptExtraction {
  return {
    storeName: "Demo Thrift Store",
    purchaseDate: null,
    items: [
      { name: "Item 1 (demo mode — set ANTHROPIC_API_KEY to extract real receipts)", price: 12.99, quantity: 1 },
      { name: "Item 2 (demo mode — set ANTHROPIC_API_KEY to extract real receipts)", price: 7.5, quantity: 1 },
    ],
    mocked: true,
  };
}

function mockTaxSummary(params: {
  year: number;
  grossSales: number;
  costOfGoods: number;
  fees: number;
  shippingPackaging: number;
  netProfit: number;
  itemCount: number;
}): string {
  return [
    `Demo mode (no ANTHROPIC_API_KEY configured) — here's the raw ${params.year} numbers; set the key for a written AI summary:`,
    `Items sold: ${params.itemCount}`,
    `Gross sales: $${params.grossSales.toFixed(2)}`,
    `Cost of goods sold: $${params.costOfGoods.toFixed(2)}`,
    `Marketplace fees: $${params.fees.toFixed(2)}`,
    `Shipping & packaging: $${params.shippingPackaging.toFixed(2)}`,
    `Net profit: $${params.netProfit.toFixed(2)}`,
    "This is an estimate for your own records — bring your CSV export (Settings → Data Export) to a licensed tax preparer for filing.",
  ].join("\n");
}
