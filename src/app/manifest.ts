import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FarmToMarket Cameroon",
    short_name: "FarmToMarket",
    description:
      "Verified agricultural supply, consolidated orders, and reliable delivery.",
    start_url: "/login",
    display: "standalone",
    background_color: "#f7f8f4",
    theme_color: "#173f32",
    orientation: "portrait-primary",
    categories: ["business", "shopping", "productivity"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
