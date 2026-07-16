import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Sitemap for the real public routes only. The old public/sitemap.xml listed
// two 404 routes (/name-generator, /name-history); this replaces it and stays
// in sync with the App Router pages that actually exist.
const BASE_URL = SITE_URL;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${BASE_URL}/`, lastModified, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/refund`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
