import { supabase } from "../../../lib/supabase";

const PUBLIC_CARD_BASE_URL = "https://card.ynscrm.online";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const safeSlug = Array.isArray(slug) ? slug[0] : slug;
  const fallback = {
    title: "YNS Card | Your Digital Identity",
    description: "A secure digital business card powered by YNS Card.",
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
    const summary = [data.designation, data.company]
      .filter(Boolean)
      .join(" at ");
    const description = summary
      ? `${name} — ${summary}. View this digital business card on YNS Card.`
      : `View ${name}'s digital business card on YNS Card.`;
    const url = `${PUBLIC_CARD_BASE_URL}/card/${encodeURIComponent(safeSlug)}`;

    return {
      title: `${name} | YNS Card`,
      description,
      alternates: { canonical: url },
      openGraph: {
        title: `${name} | YNS Card`,
        description,
        url,
        type: "profile",
        images: data.profile_image_url
          ? [{ url: data.profile_image_url, alt: name }]
          : undefined,
      },
    };
  } catch {
    return fallback;
  }
}

export default function PublicCardLayout({ children }) {
  return children;
}
