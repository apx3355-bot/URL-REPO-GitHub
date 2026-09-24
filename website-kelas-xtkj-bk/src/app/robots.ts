import type { MetadataRoute } from "next";

// Robot crawler: halaman dashboard bersifat private (sudah noindex via metadata)
// — lapisan robots.txt ini melarang crawling area tersebut.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/api"],
      },
    ],
  };
}
