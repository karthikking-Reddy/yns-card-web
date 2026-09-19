import { supabase } from "../../../lib/supabase";

const PUBLIC_CARD_BASE_URL = "https://card.ynscrm.online";
const BRAND_IMAGE_URL = `${PUBLIC_CARD_BASE_URL}/brand/yns-card-logo.jpeg`;

function getPublicProfileImage(value) {
  if (!value) return null;

  try {
    const imageUrl = new URL(value);
    const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
    return imageUrl.protocol === "https:" &&
      imageUrl.hostname === supabaseUrl.hostname &&
      imageUrl.pathname.startsWith("/storage/v1/object/public/")
      ? imageUrl.href
      : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const safeSlug = Array.isArray(slug) ? slug[0] : slug;
  const fallback = {
    title: "YNS Card",
    description:
      "Professional digital business cards by YUVARAJ NETWORKS & SOLUTIONS.",
    robots: { index: false, follow: false },
  };

  if (!safeSlug) return fallback;

  try {
    const { data } = await supabase
      .from("digital_cards")
      .select("name, designation, company, profile_image_url")
      .eq("card_slug", safeSlug)
      .eq("is_public", true)
      .eq("is_active", true)
      .eq("approval_status", "approved")
      .maybeSingle();

    if (!data) return fallback;

    const name = data.name || "YNS Card";
    const summary =
      data.designation && data.company
        ? `${data.designation} at ${data.company}`
        : data.designation || data.company || "";
    const description = summary
      ? `${summary} | Digital business card`
      : `View ${name}'s digital business card on YNS Card.`;
    const url = `${PUBLIC_CARD_BASE_URL}/card/${encodeURIComponent(safeSlug)}`;
    const title = data.name ? `${data.name} | YNS Card` : "YNS Card";
    const image =
      getPublicProfileImage(data.profile_image_url) || BRAND_IMAGE_URL;

    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        siteName: "YNS Card",
        title,
        description,
        url,
        type: "profile",
        images: [{ url: image, alt: name }],
      },
      twitter: {
        card: "summary",
        title,
        description,
        images: [image],
      },
    };
  } catch {
    return fallback;
  }
}

export default function PublicCardLayout({ children }) {
  return children;
}
