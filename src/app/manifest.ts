import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AI Reseller Pro",
    short_name: "Reseller Pro",
    description:
      "AI-powered product sourcing, valuation, inventory, and multi-marketplace selling platform.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0b0d12",
    theme_color: "#4f46e5",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
