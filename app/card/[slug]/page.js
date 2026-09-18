"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import QRCode from "react-qr-code";
import { supabase } from "../../../lib/supabase";
import styles from "./page.module.css";

const SOCIAL_TYPES = new Set([
  "instagram",
  "facebook",
  "linkedin",
  "youtube",
  "google_reviews",
  "website",
]);

const CONTACT_TYPES = new Set([
  "whatsapp",
  "phone",
  "email",
  "location",
  "map",
]);

const LABELS = {
  whatsapp: "WA",
  phone: "PH",
  email: "EM",
  website: "WWW",
  instagram: "IG",
  facebook: "FB",
  linkedin: "IN",
  youtube: "YT",
  google_reviews: "REV",
  location: "MAP",
  map: "MAP",
  pdf: "PDF",
  video: "VID",
  drive: "DRV",
  image: "IMG",
  custom: "LINK",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_MIN_DIGITS = 7;
const PHONE_MAX_DIGITS = 15;
const PUBLIC_CARD_BASE_URL = "https://card.ynscrm.online";
const LEGACY_SYSTEM_HOSTS = new Set(["yns-card-web.vercel.app"]);

export default function PublicCardPage() {
  const params = useParams();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;

  const [loading, setLoading] = useState(true);
  const [card, setCard] = useState(null);
  const [links, setLinks] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [services, setServices] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const publicUrl = slug
    ? `${PUBLIC_CARD_BASE_URL}/card/${encodeURIComponent(slug)}`
    : "";
  const [formError, setFormError] = useState("");
  const [actionError, setActionError] = useState("");
  const submittingRef = useRef(false);
  const closeButtonRef = useRef(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    company: "",
    requirement: "",
  });

  useEffect(() => {
    if (slug) loadCard();
  }, [slug]);

  useEffect(() => {
    if (!qrOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setQrOpen(false);
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [qrOpen]);

  async function loadCard() {
    setLoading(true);
    setError("");

    try {
      const { data: cardData, error: cardError } = await supabase
        .from("digital_cards")
        .select("*")
        .eq("card_slug", slug)
        .eq("is_public", true)
        .eq("is_active", true)
        .eq("approval_status", "approved")
        .maybeSingle();

      if (cardError) throw cardError;
      if (!cardData) {
        setError("This digital card is not available.");
        return;
      }

      setCard(cardData);

      const [linksResult, blocksResult, servicesResult, portfolioResult] =
        await Promise.all([
          supabase
            .from("card_links")
            .select("*")
            .eq("card_id", cardData.id)
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),

          supabase
            .from("card_blocks")
            .select("*")
            .eq("card_id", cardData.id)
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),

          supabase
            .from("card_services")
            .select("*")
            .eq("card_id", cardData.id)
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),

          supabase
            .from("portfolio_items")
            .select("*")
            .eq("card_id", cardData.id)
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),
        ]);

      if (linksResult.error) throw linksResult.error;
      if (blocksResult.error) throw blocksResult.error;
      if (servicesResult.error) throw servicesResult.error;
      if (portfolioResult.error) throw portfolioResult.error;

      setLinks(linksResult.data || []);
      setBlocks(blocksResult.data || []);
      setServices(servicesResult.data || []);
      setPortfolio(portfolioResult.data || []);

      await recordView(cardData);
    } catch {
      setError("Unable to load this digital card right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function getVisitorToken() {
    if (typeof window === "undefined") return null;

    const key = "yns_card_visitor_token";
    let token;

    try {
      token = localStorage.getItem(key);
    } catch {
      return null;
    }

    if (!token) {
      token =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;

      try {
        localStorage.setItem(key, token);
      } catch {
        return null;
      }
    }

    return token;
  }

  async function recordView(cardData) {
    if (typeof window === "undefined") return;

    const sessionKey = `yns-card-view-${cardData.id}`;
    try {
      if (sessionStorage.getItem(sessionKey)) return;
      sessionStorage.setItem(sessionKey, "1");
    } catch {
      // Analytics should still work when storage is unavailable.
    }

    await recordEvent(cardData.id, "card_view", {
      slug: cardData.card_slug,
    });
  }

  async function recordEvent(
    cardId,
    eventType,
    metadata = {},
    linkId = null,
    blockId = null,
  ) {
    try {
      const { error: eventError } = await supabase.from("card_events").insert({
        card_id: cardId,
        link_id: linkId,
        block_id: blockId,
        event_type: eventType,
        source: "public_card",
        visitor_token: getVisitorToken(),
        metadata,
      });

      if (eventError) {
        console.warn("Analytics event:", eventError.message);
      }
    } catch (e) {
      console.warn("Analytics event failed:", e);
    }
  }

  function cleanPhone(value, allowPlus = true) {
    const input = String(value || "").trim();
    const digits = input.replace(/\D/g, "").slice(0, PHONE_MAX_DIGITS);
    return `${allowPlus && input.startsWith("+") ? "+" : ""}${digits}`;
  }

  function normalizeUrl(value) {
    const input = String(value || "").trim();
    if (!input || /[\u0000-\u001F\u007F\s]/.test(input)) return null;

    try {
      const url = new URL(
        /^https?:\/\//i.test(input) ? input : `https://${input}`,
      );
      if (LEGACY_SYSTEM_HOSTS.has(url.hostname.toLowerCase())) {
        url.protocol = "https:";
        url.hostname = "card.ynscrm.online";
        url.port = "";
      }
      return ["http:", "https:"].includes(url.protocol) && url.hostname
        ? url.href
        : null;
    } catch {
      return null;
    }
  }

  function getUrl(type, value) {
    const input = String(value || "").trim();
    if (!input) return null;

    switch (type) {
      case "whatsapp": {
        const number = cleanPhone(input, false);
        return number.length >= PHONE_MIN_DIGITS
          ? `https://wa.me/${number}`
          : null;
      }
      case "phone": {
        const number = cleanPhone(input);
        return number.replace(/\D/g, "").length >= PHONE_MIN_DIGITS
          ? `tel:${number}`
          : null;
      }
      case "email": {
        const address = input.replace(/^mailto:/i, "").trim();
        return EMAIL_PATTERN.test(address) ? `mailto:${address}` : null;
      }
      case "location":
      case "map": {
        const normalized = normalizeUrl(input);
        return /^https?:\/\//i.test(input) && normalized
          ? normalized
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              input,
            )}`;
      }
      default:
        return normalizeUrl(input);
    }
  }

  function getLinkUrl(link) {
    return getUrl(link.link_type, link.value || link.url);
  }

  function getBlockUrl(block) {
    return getUrl(block.block_type, block.url || block.value);
  }

  function getEventType(type) {
    const map = {
      whatsapp: "whatsapp_click",
      phone: "phone_click",
      email: "email_click",
      website: "website_click",
      instagram: "instagram_click",
      facebook: "facebook_click",
      linkedin: "linkedin_click",
      youtube: "youtube_click",
      google_reviews: "google_review_click",
      location: "location_click",
      map: "location_click",
      pdf: "pdf_click",
      video: "video_click",
      drive: "drive_click",
      image: "image_click",
      custom: "custom_click",
    };

    return map[type] || `${type}_click`;
  }

  function isWebUrl(url) {
    return Boolean(
      url && (url.startsWith("https://") || url.startsWith("http://")),
    );
  }

  const quickContacts = useMemo(() => {
    if (!card) return [];

    const firstByType = {};
    links.forEach((link) => {
      if (!firstByType[link.link_type]) {
        firstByType[link.link_type] = link;
      }
    });

    const whatsappLink = firstByType.whatsapp;
    const phoneLink = firstByType.phone;
    const emailLink = firstByType.email;
    const whatsapp =
      card.whatsapp || whatsappLink?.value || whatsappLink?.url || card.phone;
    const phone = card.phone || phoneLink?.value || phoneLink?.url;
    const email = card.email || emailLink?.value || emailLink?.url;

    return [
      whatsapp
        ? {
            type: "whatsapp",
            label: "WhatsApp",
            href: getUrl("whatsapp", whatsapp),
            linkId: card.whatsapp || card.phone ? null : whatsappLink?.id,
          }
        : null,
      phone
        ? {
            type: "phone",
            label: "Call",
            href: getUrl("phone", phone),
            linkId: card.phone ? null : phoneLink?.id,
          }
        : null,
      email
        ? {
            type: "email",
            label: "Email",
            href: getUrl("email", email),
            linkId: card.email ? null : emailLink?.id,
          }
        : null,
    ].filter((item) => item?.href);
  }, [card, links]);

  const socialLinks = useMemo(
    () =>
      links.filter(
        (item) => SOCIAL_TYPES.has(item.link_type) && getLinkUrl(item),
      ),
    [links],
  );

  const quickLinks = useMemo(
    () =>
      links.filter(
        (item) =>
          !SOCIAL_TYPES.has(item.link_type) &&
          !CONTACT_TYPES.has(item.link_type) &&
          getLinkUrl(item),
      ),
    [links],
  );

  const resourceBlocks = useMemo(
    () =>
      blocks.filter(
        (item) =>
          !SOCIAL_TYPES.has(item.block_type) &&
          !CONTACT_TYPES.has(item.block_type) &&
          item.block_type !== "website" &&
          getBlockUrl(item),
      ),
    [blocks],
  );

  const mobileContacts = useMemo(
    () =>
      ["whatsapp", "phone"]
        .map((type) => quickContacts.find((item) => item.type === type))
        .filter(Boolean),
    [quickContacts],
  );

  const businessDetails = useMemo(() => {
    if (!card) return [];

    const firstByType = {};
    links.forEach((link) => {
      if (!firstByType[link.link_type]) firstByType[link.link_type] = link;
    });

    const websiteLink = firstByType.website;
    const locationLink = firstByType.location || firstByType.map;
    const website = card.website || websiteLink?.value || websiteLink?.url;
    const location = card.location;

    return [
      card.phone
        ? {
            type: "phone",
            label: "Phone",
            value: card.phone,
            href: getUrl("phone", card.phone),
          }
        : null,
      card.email
        ? {
            type: "email",
            label: "Email",
            value: card.email,
            href: getUrl("email", card.email),
          }
        : null,
      website
        ? {
            type: "website",
            label: "Website",
            value: website,
            href: getUrl("website", website),
          }
        : null,
      location
        ? {
            type: "location",
            label: "Location",
            value: location,
            href: locationLink ? getLinkUrl(locationLink) : null,
          }
        : null,
      card.company
        ? { type: "company", label: "Company", value: card.company, href: null }
        : null,
    ].filter((item) => item?.value);
  }, [card, links]);

  async function handleLinkClick(link) {
    await recordEvent(
      card.id,
      getEventType(link.link_type),
      {
        label: link.label,
        origin: "card_link",
      },
      link.id,
      null,
    );
  }

  async function handleBlockClick(block) {
    await recordEvent(
      card.id,
      getEventType(block.block_type),
      {
        title: block.title,
        block_type: block.block_type,
        origin: "card_block",
      },
      null,
      block.id,
    );
  }

  async function shareCard() {
    if (typeof window === "undefined" || !publicUrl) return;

    const data = {
      title: `${card?.name || "Digital Card"} - YNS Card`,
      text: `View ${card?.name || ""}'s digital business card.`,
      url: publicUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(data);
      } else {
        await copyText(publicUrl);
        showCopied();
      }

      await recordEvent(card.id, "share_click", {
        origin: "public_card",
      });
    } catch (shareError) {
      if (shareError?.name === "AbortError") return;

      try {
        await copyText(publicUrl);
        showCopied();
        await recordEvent(card.id, "share_click", {
          origin: "public_card_fallback",
        });
      } catch {
        showActionError(
          "Sharing is unavailable. Please copy the URL from your browser.",
        );
      }
    }
  }

  function showCopied() {
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  function showActionError(message) {
    setActionError(message);
    window.setTimeout(() => setActionError(""), 4000);
  }

  async function copyLink() {
    try {
      await copyText(publicUrl);
      showCopied();
      await recordEvent(card.id, "copy_link_click", {
        origin: "qr_modal",
      });
    } catch {
      showActionError(
        "Unable to copy automatically. Please copy the URL from your browser.",
      );
    }
  }

  async function saveContact() {
    const name = card.name || "YNS Contact";
    const phone = card.phone || card.whatsapp || "";
    const email = card.email || "";
    const websiteLink = links.find((link) => link.link_type === "website");
    const website =
      card.website || websiteLink?.value || websiteLink?.url || "";
    const normalizedWebsite = normalizeUrl(website);
    const company = card.company || "";
    const title = card.designation || "";

    const vcard =
      [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${escapeVCard(name)}`,
        `N:${escapeVCard(name)};;;;`,
        `ORG:${escapeVCard(company)}`,
        `TITLE:${escapeVCard(title)}`,
        phone ? `TEL;TYPE=CELL:${escapeVCard(cleanPhone(phone))}` : "",
        email && EMAIL_PATTERN.test(email)
          ? `EMAIL;TYPE=INTERNET:${escapeVCard(email)}`
          : "",
        normalizedWebsite ? `URL:${escapeVCard(normalizedWebsite)}` : "",
        "END:VCARD",
      ]
        .filter(Boolean)
        .join("\r\n") + "\r\n";

    const blob = new Blob([vcard], {
      type: "text/vcard;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `${slugify(name) || "yns-contact"}.vcf`;

    document.body.appendChild(a);
    a.click();
    a.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);

    await recordEvent(card.id, "save_contact_click", {
      origin: "public_card",
    });
  }

  function change(key, value) {
    setFormError("");
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  async function submitEnquiry(event) {
    event.preventDefault();
    if (submittingRef.current) return;

    const name = form.name.trim();
    const phone = form.phone.trim();
    const email = form.email.trim().toLowerCase();
    const phoneDigits = phone.replace(/\D/g, "");

    if (name.length < 2) {
      setFormError("Please enter your name (at least 2 characters).");
      return;
    }

    if (!phone && !email) {
      setFormError("Please enter a phone number or email address.");
      return;
    }

    if (
      phone &&
      (phoneDigits.length < PHONE_MIN_DIGITS ||
        phoneDigits.length > PHONE_MAX_DIGITS)
    ) {
      setFormError("Please enter a valid phone number with 7 to 15 digits.");
      return;
    }

    if (email && !EMAIL_PATTERN.test(email)) {
      setFormError("Please enter a valid email address.");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setFormError("");

    try {
      const { error: connectionError } = await supabase
        .from("connections")
        .insert({
          card_id: card.id,
          name,
          phone: phone ? cleanPhone(phone) : null,
          email: email || null,
          company: form.company.trim() || null,
          requirement: form.requirement.trim() || null,
          source: "public_card",
          source_detail: card.card_slug,
          stage: "new",
        });

      if (connectionError) throw connectionError;

      await recordEvent(card.id, "lead_submit", {
        slug: card.card_slug,
      });

      setSubmitted(true);
      setForm({
        name: "",
        phone: "",
        email: "",
        company: "",
        requirement: "",
      });
    } catch {
      setFormError("Unable to send your enquiry right now. Please try again.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className={styles.centerPage}>
        <div className={styles.loader} />
        <strong>YNS CARD</strong>
        <p>Loading your digital identity...</p>
      </main>
    );
  }

  if (error || !card) {
    return (
      <main className={styles.centerPage}>
        <div className={styles.errorCard}>
          <span className={styles.errorMark}>YNS</span>
          <h1>Card unavailable</h1>
          <p>{error || "Card not found."}</p>
        </div>
      </main>
    );
  }

  const normalizedTheme = String(card.theme || "")
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const themeClass =
    normalizedTheme === "gold" || normalizedTheme === "yns_gold"
      ? styles.goldTheme
      : normalizedTheme === "ocean"
        ? styles.oceanTheme
        : styles.standardTheme;

  return (
    <main className={`${styles.page} ${themeClass}`}>
      <header className={styles.siteHeader}>
        <a href="#top" className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            ∞
          </span>
          <span>
            <strong>YNS CARD</strong>
            <small>YOUR DIGITAL IDENTITY</small>
          </span>
        </a>

        <nav className={styles.nav} aria-label="Card sections">
          <a href="#about">About</a>
          {services.length > 0 ? <a href="#services">Services</a> : null}
          {portfolio.length > 0 ? <a href="#portfolio">Portfolio</a> : null}
          <a href="#contact">Contact</a>
        </nav>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.headerGhostButton}
            onClick={shareCard}
          >
            <Icon name="share" /> SHARE CARD
          </button>

          <button
            type="button"
            className={styles.headerGoldButton}
            onClick={() => setQrOpen(true)}
          >
            <Icon name="qr" /> QR CODE
          </button>
        </div>
      </header>

      <section
        id="top"
        className={styles.hero}
        style={
          card.cover_image_url
            ? {
                backgroundImage: `linear-gradient(110deg, rgba(3,16,35,.94), rgba(5,28,57,.78)), url("${card.cover_image_url}")`,
              }
            : undefined
        }
      >
        <div className={styles.heroGlow} />
        <div className={styles.heroLines} />

        <div className={styles.heroShell}>
          <div className={styles.profilePanel}>
            <div className={styles.avatarWrap}>
              {card.profile_image_url ? (
                <img
                  src={card.profile_image_url}
                  alt={card.name || "Profile"}
                  className={styles.avatar}
                />
              ) : (
                <div className={styles.avatarFallback}>
                  {card.name?.charAt(0)?.toUpperCase() || "Y"}
                </div>
              )}
            </div>

            <div className={styles.profileInfo}>
              <div className={styles.nameRow}>
                <h1>{card.name || "YNS Card"}</h1>
              </div>

              {card.designation ? <h2>{card.designation}</h2> : null}
              {card.company ? (
                <strong className={styles.company}>{card.company}</strong>
              ) : null}
              {card.location ? (
                <p className={styles.location}>
                  <Icon name="location" />
                  {card.location}
                </p>
              ) : null}
              {card.tagline ? (
                <p className={styles.tagline}>“{card.tagline}”</p>
              ) : null}
            </div>

            <div className={styles.desktopQr}>
              <QRCode
                value={publicUrl}
                size={104}
                bgColor="#ffffff"
                fgColor="#06162d"
              />
              <span>SCAN MY CARD</span>
            </div>

            <div className={styles.contactBar}>
              {quickContacts
                .filter(
                  (item) => item.type === "whatsapp" || item.type === "phone",
                )
                .map((item) => (
                  <a
                    key={item.type}
                    href={item.href}
                    target={isWebUrl(item.href) ? "_blank" : undefined}
                    rel={isWebUrl(item.href) ? "noreferrer" : undefined}
                    className={`${styles.contactAction} ${
                      item.type === "whatsapp" ? styles.whatsappAction : ""
                    }`}
                    onClick={() =>
                      recordEvent(
                        card.id,
                        getEventType(item.type),
                        { origin: "hero_action" },
                        item.linkId || null,
                      )
                    }
                  >
                    <span className={styles.actionBadge}>
                      <Icon name={item.type} />
                    </span>
                    <strong>{item.label}</strong>
                  </a>
                ))}

              <button
                type="button"
                className={styles.contactAction}
                onClick={saveContact}
              >
                <span className={styles.actionBadge}>
                  <Icon name="save" />
                </span>
                <strong>Save Contact</strong>
              </button>
            </div>

            <div className={styles.secondaryActions}>
              <button type="button" onClick={shareCard}>
                <Icon name="share" /> Share Card
              </button>
              <button type="button" onClick={() => setQrOpen(true)}>
                <Icon name="qr" /> View QR Code
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.content}>
        <div className={styles.profileDetailsRow}>
          {card.bio || card.industry || card.location || card.company ? (
            <section
              id="about"
              className={`${styles.sectionCard} ${styles.aboutSection}`}
            >
              <SectionTitle eyebrow="ABOUT ME" title="Professional Profile" />

              {card.bio ? <p className={styles.aboutText}>{card.bio}</p> : null}

              <div className={styles.aboutMeta}>
                {card.industry ? (
                  <MetaChip label="Industry" value={card.industry} />
                ) : null}
                {card.location ? (
                  <MetaChip label="Location" value={card.location} />
                ) : null}
                {card.company ? (
                  <MetaChip label="Company" value={card.company} />
                ) : null}
              </div>
            </section>
          ) : null}

          {businessDetails.length > 0 ? (
            <section
              className={`${styles.sectionCard} ${styles.businessSection}`}
            >
              <SectionTitle
                eyebrow="BUSINESS DETAILS"
                title="Contact Information"
              />
              <div className={styles.businessGrid}>
                {businessDetails.map((detail) => {
                  const content = (
                    <>
                      <span className={styles.businessIcon}>
                        <Icon name={detail.type} />
                      </span>
                      <span className={styles.businessCopy}>
                        <small>{detail.label}</small>
                        <strong>{detail.value}</strong>
                      </span>
                      {detail.href ? <Icon name="arrow" /> : null}
                    </>
                  );

                  return detail.href ? (
                    <a
                      key={detail.type}
                      href={detail.href}
                      target={isWebUrl(detail.href) ? "_blank" : undefined}
                      rel={isWebUrl(detail.href) ? "noreferrer" : undefined}
                      className={styles.businessItem}
                      onClick={() =>
                        recordEvent(card.id, getEventType(detail.type), {
                          origin: "business_details",
                        })
                      }
                    >
                      {content}
                    </a>
                  ) : (
                    <div key={detail.type} className={styles.businessItem}>
                      {content}
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>

        {socialLinks.length > 0 ? (
          <section className={`${styles.sectionCard} ${styles.socialSection}`}>
            <SectionTitle
              eyebrow="CONNECT WITH ME"
              title="Social & Business Links"
            />

            <div className={styles.socialGrid}>
              {socialLinks.map((link) => {
                const href = getLinkUrl(link);

                return (
                  <a
                    key={link.id}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.socialItem}
                    onClick={() => handleLinkClick(link)}
                  >
                    <span
                      className={`${styles.socialIcon} ${
                        styles[`social_${link.link_type}`] || ""
                      }`}
                    >
                      <Icon name={link.link_type} />
                    </span>

                    <strong>{link.label || humanize(link.link_type)}</strong>
                  </a>
                );
              })}
            </div>
          </section>
        ) : null}

        {quickLinks.length > 0 || resourceBlocks.length > 0 ? (
          <section
            className={`${styles.sectionCard} ${styles.resourcesSection}`}
          >
            <SectionTitle eyebrow="RESOURCES" title="Useful Links" />

            <div className={styles.blockGrid}>
              {quickLinks.map((link) => {
                const href = getLinkUrl(link);

                return (
                  <a
                    key={link.id}
                    href={href}
                    target={isWebUrl(href) ? "_blank" : undefined}
                    rel={isWebUrl(href) ? "noreferrer" : undefined}
                    className={styles.blockItem}
                    onClick={() => handleLinkClick(link)}
                  >
                    <span className={styles.blockIcon}>
                      <Icon name={link.link_type} />
                    </span>

                    <span className={styles.blockContent}>
                      <strong>{link.label || humanize(link.link_type)}</strong>
                      <small>{link.value || link.url}</small>
                    </span>

                    <span className={styles.blockArrow}>
                      <Icon name="arrow" />
                    </span>
                  </a>
                );
              })}

              {resourceBlocks.map((block) => {
                const href = getBlockUrl(block);
                if (!href) return null;

                return (
                  <a
                    key={block.id}
                    href={href}
                    target={isWebUrl(href) ? "_blank" : undefined}
                    rel={isWebUrl(href) ? "noreferrer" : undefined}
                    className={styles.blockItem}
                    onClick={() => handleBlockClick(block)}
                  >
                    <span className={styles.blockIcon}>
                      <Icon name={block.block_type} />
                    </span>

                    <span className={styles.blockContent}>
                      <strong>
                        {block.title || humanize(block.block_type)}
                      </strong>
                      <small>
                        {block.subtitle || block.value || block.url}
                      </small>
                    </span>

                    <span className={styles.blockArrow}>
                      <Icon name="arrow" />
                    </span>
                  </a>
                );
              })}
            </div>
          </section>
        ) : null}

        {services.length > 0 ? (
          <section
            id="services"
            className={`${styles.sectionCard} ${styles.servicesSection}`}
          >
            <SectionTitle eyebrow="SERVICES" title="What I Can Help You With" />

            <div className={styles.serviceGrid}>
              {services.map((service, index) => (
                <article
                  key={service.id}
                  className={`${styles.serviceCard} ${
                    service.description
                      ? styles.serviceWithDescription
                      : styles.serviceCompact
                  }`}
                >
                  <span className={styles.serviceIcon}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3>{service.title}</h3>
                  {service.description ? <p>{service.description}</p> : null}
                  {!service.description ? (
                    <span className={styles.serviceArrow} aria-hidden="true">
                      <Icon name="arrow" />
                    </span>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {portfolio.length > 0 ? (
          <section
            id="portfolio"
            className={`${styles.sectionCard} ${styles.portfolioSection}`}
          >
            <SectionTitle eyebrow="PORTFOLIO" title="Selected Work" />

            <div className={styles.portfolioGrid}>
              {portfolio.map((item) => (
                <PortfolioItem key={item.id} item={item} />
              ))}
            </div>
          </section>
        ) : null}

        <section
          id="contact"
          className={`${styles.sectionCard} ${styles.enquirySection}`}
        >
          <div className={styles.enquiryIntro}>
            <SectionTitle
              eyebrow="SEND AN ENQUIRY"
              title="Let’s Work Together"
            />
            <p>
              Share your requirement and it will be sent directly to the card
              owner.
            </p>

            <div className={styles.enquiryTrust}>
              <span>DIRECT ENQUIRY</span>
              <span>SECURE SUBMISSION</span>
              <span>CARD OWNER CONTACT</span>
            </div>
          </div>

          {submitted ? (
            <div className={styles.successCard}>
              <span>✓</span>
              <h3>Enquiry sent successfully</h3>
              <p>Thank you. Your enquiry has been added to the YNS CRM.</p>
              <button type="button" onClick={() => setSubmitted(false)}>
                Send another enquiry
              </button>
            </div>
          ) : (
            <form className={styles.form} onSubmit={submitEnquiry} noValidate>
              {formError ? (
                <p className={styles.formError} role="alert">
                  {formError}
                </p>
              ) : null}
              <div className={styles.twoColumns}>
                <label>
                  Name *
                  <input
                    value={form.name}
                    onChange={(e) => change("name", e.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={100}
                  />
                </label>

                <label>
                  Phone
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => change("phone", e.target.value)}
                    placeholder="+91..."
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={25}
                  />
                </label>
              </div>

              <div className={styles.twoColumns}>
                <label>
                  Email
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => change("email", e.target.value)}
                    placeholder="you@example.com"
                    inputMode="email"
                    autoComplete="email"
                    maxLength={254}
                  />
                </label>

                <label>
                  Company
                  <input
                    value={form.company}
                    onChange={(e) => change("company", e.target.value)}
                    placeholder="Company name"
                    autoComplete="organization"
                    maxLength={150}
                  />
                </label>
              </div>

              <label>
                Requirement
                <textarea
                  value={form.requirement}
                  onChange={(e) => change("requirement", e.target.value)}
                  placeholder="Tell us what you need..."
                  rows={5}
                  maxLength={2000}
                />
              </label>

              <button
                type="submit"
                className={styles.submitButton}
                disabled={submitting}
              >
                {submitting ? "Sending..." : "SEND ENQUIRY"}
              </button>
            </form>
          )}
        </section>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <span className={styles.footerMark} aria-hidden="true">
            ∞
          </span>
          <div>
            <strong>YNS CARD</strong>
            <small>YOUR DIGITAL IDENTITY</small>
          </div>
        </div>

        <div className={styles.footerCenter}>
          <strong>YUVARAJ NETWORKS & SOLUTIONS</strong>
          <span>Empowering Brands. Building Digital Success.</span>
        </div>

        <div className={styles.footerSocial}>
          {socialLinks.slice(0, 4).map((link) => (
            <a
              key={link.id}
              href={getLinkUrl(link)}
              target="_blank"
              rel="noreferrer"
              onClick={() => handleLinkClick(link)}
            >
              <Icon name={link.link_type} />
            </a>
          ))}
        </div>

        <p className={styles.copyright}>
          © {new Date().getFullYear()} YUVARAJ NETWORKS & SOLUTIONS. All rights
          reserved.
        </p>
      </footer>

      <div className={styles.mobileStickyBar}>
        {mobileContacts.map((item) => (
          <a
            key={item.type}
            href={item.href}
            target={isWebUrl(item.href) ? "_blank" : undefined}
            rel={isWebUrl(item.href) ? "noreferrer" : undefined}
            className={
              item.type === "whatsapp"
                ? styles.mobileWhatsapp
                : styles.mobileCall
            }
            onClick={() =>
              recordEvent(
                card.id,
                getEventType(item.type),
                { origin: "mobile_sticky" },
                item.linkId || null,
              )
            }
          >
            <Icon name={item.type} />
            <strong>{item.label}</strong>
          </a>
        ))}

        <button
          type="button"
          className={styles.mobileSave}
          onClick={saveContact}
        >
          <Icon name="save" /> <strong>Save</strong>
        </button>
      </div>

      {qrOpen ? (
        <div
          className={styles.modalOverlay}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setQrOpen(false);
            }
          }}
        >
          <div
            className={styles.qrModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="qr-modal-title"
          >
            <button
              ref={closeButtonRef}
              type="button"
              className={styles.modalClose}
              onClick={() => setQrOpen(false)}
              aria-label="Close QR code"
            >
              <Icon name="close" />
            </button>

            <span className={styles.modalEyebrow}>SHARE MY CARD</span>
            <h2 id="qr-modal-title">Scan QR Code</h2>

            <div className={styles.modalQr}>
              <QRCode
                value={publicUrl}
                size={190}
                bgColor="#ffffff"
                fgColor="#06162d"
              />
            </div>

            <button
              type="button"
              className={styles.modalGold}
              onClick={shareCard}
            >
              <Icon name="share" /> SHARE CARD
            </button>

            <button
              type="button"
              className={styles.modalOutline}
              onClick={copyLink}
            >
              <Icon name={copied ? "check" : "copy"} />
              {copied ? "LINK COPIED" : "COPY LINK"}
            </button>
          </div>
        </div>
      ) : null}

      {copied ? <div className={styles.toast}>Card link copied</div> : null}
      {actionError ? (
        <div className={styles.errorToast} role="alert">
          {actionError}
        </div>
      ) : null}
    </main>
  );
}

function Icon({ name }) {
  const paths = {
    whatsapp:
      "M16.7 14.2c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-1.7-.8-2.8-1.5-3.9-3.5-.3-.5.3-.5.8-1.7.1-.2 0-.4 0-.6L8.3 6.5c-.2-.5-.5-.4-.7-.4h-.6c-.2 0-.6.1-.9.4-.3.4-1.2 1.2-1.2 2.9 0 1.7 1.2 3.3 1.4 3.5.2.2 2.4 3.7 5.9 5.2 2.2.9 3.1 1 4.2.8.7-.1 2.1-.9 2.4-1.7.3-.8.3-1.5.2-1.7-.1-.1-.3-.2-.6-.4ZM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-2.9-.4-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Z",
    phone:
      "M6.6 10.8a15.5 15.5 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.7 3.5.7.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.2.2 2.4.7 3.5.1.4 0 .8-.2 1l-2.3 2.3Z",
    email:
      "M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 4-8 5-8-5V6l8 5 8-5v2Z",
    website:
      "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.9 6h-3a15.7 15.7 0 0 0-1.4-3.6A8.1 8.1 0 0 1 18.9 8ZM12 4c.8 1 1.5 2.3 1.8 4h-3.6C10.5 6.3 11.2 5 12 4ZM4.3 14a8.3 8.3 0 0 1 0-4h3.4a16.5 16.5 0 0 0 0 4H4.3Zm.8 2h3a15.7 15.7 0 0 0 1.4 3.6A8.1 8.1 0 0 1 5.1 16Zm3-8h-3a8.1 8.1 0 0 1 4.4-3.6A15.7 15.7 0 0 0 8.1 8Zm3.9 12c-.8-1-1.5-2.3-1.8-4h3.6c-.3 1.7-1 3-1.8 4Zm2.2-6H9.8a14.3 14.3 0 0 1 0-4h4.4a14.3 14.3 0 0 1 0 4Zm.3 5.6a15.7 15.7 0 0 0 1.4-3.6h3a8.1 8.1 0 0 1-4.4 3.6Zm1.8-5.6a16.5 16.5 0 0 0 0-4h3.4a8.3 8.3 0 0 1 0 4h-3.4Z",
    location:
      "M12 2a7 7 0 0 0-7 7c0 5.3 7 13 7 13s7-7.7 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z",
    map: "M12 2a7 7 0 0 0-7 7c0 5.3 7 13 7 13s7-7.7 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z",
    company:
      "M4 22V2h11v5h5v15h-7v-4h-2v4H4Zm3-15h2V5H7v2Zm0 4h2V9H7v2Zm0 4h2v-2H7v2Zm6-4h2V9h-2v2Zm0 4h2v-2h-2v2Zm4 0h1v-2h-1v2Z",
    save: "M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4Zm-5 16a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm3-10H5V5h10v4Z",
    share:
      "M18 16a3 3 0 0 0-2.4 1.2L8.9 13.3a3.5 3.5 0 0 0 0-2.6l6.7-3.9A3 3 0 1 0 15 5l-6.9 4A3 3 0 1 0 8 15l7 4a3 3 0 1 0 3-3Z",
    qr: "M3 3h8v8H3V3Zm2 2v4h4V5H5Zm8-2h8v8h-8V3Zm2 2v4h4V5h-4ZM3 13h8v8H3v-8Zm2 2v4h4v-4H5Zm10-2h2v2h-2v-2Zm4 0h2v4h-2v-4Zm-6 4h4v4h-4v-4Zm6 2h2v2h-2v-2Z",
    copy: "M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z",
    check: "m9 16.2-4.2-4.2-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2Z",
    close:
      "M18.3 5.7 12 12l6.3 6.3-1.4 1.4-6.3-6.3-6.3 6.3-1.4-1.4L9.2 12 2.9 5.7l1.4-1.4 6.3 6.3 6.3-6.3 1.4 1.4Z",
    arrow: "m9 18 6-6-6-6 1.4-1.4 7.4 7.4-7.4 7.4L9 18Z",
    instagram:
      "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm10.5 1.5A1.5 1.5 0 1 1 16 7a1.5 1.5 0 0 1 1.5-1.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
    facebook:
      "M14 8h3V4h-3c-3 0-5 2-5 5v3H6v4h3v8h4v-8h3l1-4h-4V9c0-.6.4-1 1-1Z",
    linkedin:
      "M4 3a2.3 2.3 0 1 1 0 4.6A2.3 2.3 0 0 1 4 3ZM2 9h4v13H2V9Zm7 0h3.8v1.8h.1c.5-1 1.8-2.2 3.8-2.2 4 0 4.8 2.7 4.8 6.1V22h-4v-6.5c0-1.6 0-3.5-2.2-3.5-2.2 0-2.5 1.7-2.5 3.4V22H9V9Z",
    youtube:
      "M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2C.5 9.1.5 12 .5 12s0 2.9.5 4.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-4.8.5-4.8s0-2.9-.5-4.8ZM9.7 15.2V8.8L15.5 12l-5.8 3.2Z",
    google_reviews:
      "M21.4 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.3a4.5 4.5 0 0 1-2 3v2.6h3.2c1.9-1.8 2.9-4.4 2.9-7.5ZM12 22c2.7 0 5-.9 6.5-2.4l-3.2-2.5c-.9.6-2 1-3.3 1a5.8 5.8 0 0 1-5.4-4H3.3v2.6A10 10 0 0 0 12 22Z",
  };

  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name] || paths.website} fill="currentColor" />
    </svg>
  );
}

function SectionTitle({ eyebrow, title }) {
  return (
    <div className={styles.sectionHeading}>
      <span>{eyebrow}</span>
      <h2>{title}</h2>
    </div>
  );
}

function MetaChip({ label, value }) {
  return (
    <div className={styles.metaChip}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PortfolioItem({ item }) {
  return (
    <article className={styles.portfolioItem}>
      <div className={styles.portfolioMedia}>
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title || "Portfolio"}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span>{item.title?.charAt(0)?.toUpperCase() || "Y"}</span>
        )}
      </div>

      <div className={styles.portfolioBody}>
        <h3>{item.title}</h3>
        {item.subtitle ? <span>{item.subtitle}</span> : null}
        {item.description ? <p>{item.description}</p> : null}
      </div>
    </article>
  );
}

function humanize(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeVCard(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

async function copyText(value) {
  if (!value) throw new Error("Nothing to copy");

  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();

  if (!copied) throw new Error("Copy is unavailable");
}
