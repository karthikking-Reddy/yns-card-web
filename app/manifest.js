export default function manifest() {
  return {
    name: "YNS Card",
    short_name: "YNS Card",
    description:
      "Professional digital business cards by YUVARAJ NETWORKS & SOLUTIONS.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF8F2",
    theme_color: "#061B36",
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png" },
      {
        src: "/brand/yns-card-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
