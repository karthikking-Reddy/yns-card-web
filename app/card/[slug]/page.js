'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import QRCode from 'react-qr-code';
import { supabase } from '../../../lib/supabase';
import styles from './page.module.css';

const SOCIAL_TYPES = new Set([
  'instagram',
  'facebook',
  'linkedin',
  'youtube',
  'google_reviews',
  'website',
]);

const LABELS = {
  whatsapp: 'WA',
  phone: 'PH',
  email: 'EM',
  website: 'WWW',
  instagram: 'IG',
  facebook: 'FB',
  linkedin: 'IN',
  youtube: 'YT',
  google_reviews: 'REV',
  location: 'MAP',
  map: 'MAP',
  pdf: 'PDF',
  video: 'VID',
  drive: 'DRV',
  image: 'IMG',
  custom: 'LINK',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_MIN_DIGITS = 7;
const PHONE_MAX_DIGITS = 15;
const PUBLIC_CARD_BASE_URL = 'https://card.ynscrm.online';

export default function PublicCardPage() {
  const params = useParams();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;

  const [loading, setLoading] = useState(true);
  const [card, setCard] = useState(null);
  const [links, setLinks] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [services, setServices] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const publicUrl = slug
    ? `${PUBLIC_CARD_BASE_URL}/card/${encodeURIComponent(slug)}`
    : '';
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');
  const submittingRef = useRef(false);
  const closeButtonRef = useRef(null);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    requirement: '',
  });

  useEffect(() => {
    if (slug) loadCard();
  }, [slug]);

  useEffect(() => {
    if (!qrOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setQrOpen(false);
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [qrOpen]);

  async function loadCard() {
    setLoading(true);
    setError('');

    try {
      const { data: cardData, error: cardError } = await supabase
        .from('digital_cards')
        .select('*')
        .eq('card_slug', slug)
        .eq('is_public', true)
        .eq('is_active', true)
        .eq('approval_status', 'approved')
        .maybeSingle();

      if (cardError) throw cardError;
      if (!cardData) {
        setError('This digital card is not available.');
        return;
      }

      setCard(cardData);

      const [linksResult, blocksResult, servicesResult, portfolioResult] =
        await Promise.all([
          supabase
            .from('card_links')
            .select('*')
            .eq('card_id', cardData.id)
            .eq('is_active', true)
            .order('sort_order', { ascending: true }),

          supabase
            .from('card_blocks')
            .select('*')
            .eq('card_id', cardData.id)
            .eq('is_active', true)
            .order('sort_order', { ascending: true }),

          supabase
            .from('card_services')
            .select('*')
            .eq('card_id', cardData.id)
            .eq('is_active', true)
            .order('sort_order', { ascending: true }),

          supabase
            .from('portfolio_items')
            .select('*')
            .eq('card_id', cardData.id)
            .eq('is_active', true)
            .order('sort_order', { ascending: true }),
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
      setError('Unable to load this digital card right now. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function getVisitorToken() {
    if (typeof window === 'undefined') return null;

    const key = 'yns_card_visitor_token';
    let token;

    try {
      token = localStorage.getItem(key);
    } catch {
      return null;
    }

    if (!token) {
      token =
        typeof crypto !== 'undefined' && crypto.randomUUID
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
    if (typeof window === 'undefined') return;

    const sessionKey = `yns-card-view-${cardData.id}`;
    try {
      if (sessionStorage.getItem(sessionKey)) return;
      sessionStorage.setItem(sessionKey, '1');
    } catch {
      // Analytics should still work when storage is unavailable.
    }

    await recordEvent(cardData.id, 'card_view', {
      slug: cardData.card_slug,
    });
  }

  async function recordEvent(
    cardId,
    eventType,
    metadata = {},
    linkId = null,
    blockId = null
  ) {
    try {
      const { error: eventError } = await supabase.from('card_events').insert({
        card_id: cardId,
        link_id: linkId,
        block_id: blockId,
        event_type: eventType,
        source: 'public_card',
        visitor_token: getVisitorToken(),
        metadata,
      });

      if (eventError) {
        console.warn('Analytics event:', eventError.message);
      }
    } catch (e) {
      console.warn('Analytics event failed:', e);
    }
  }

  function cleanPhone(value, allowPlus = true) {
    const input = String(value || '').trim();
    const digits = input.replace(/\D/g, '').slice(0, PHONE_MAX_DIGITS);
    return `${allowPlus && input.startsWith('+') ? '+' : ''}${digits}`;
  }

  function normalizeUrl(value) {
    const input = String(value || '').trim();
    if (!input || /[\u0000-\u001F\u007F\s]/.test(input)) return null;

    try {
      const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
      return ['http:', 'https:'].includes(url.protocol) && url.hostname
        ? url.href
        : null;
    } catch {
      return null;
    }
  }

  function getUrl(type, value) {
    const input = String(value || '').trim();
    if (!input) return null;

    switch (type) {
      case 'whatsapp': {
        const number = cleanPhone(input, false);
        return number.length >= PHONE_MIN_DIGITS
          ? `https://wa.me/${number}`
          : null;
      }
      case 'phone': {
        const number = cleanPhone(input);
        return number.replace(/\D/g, '').length >= PHONE_MIN_DIGITS
          ? `tel:${number}`
          : null;
      }
      case 'email': {
        const address = input.replace(/^mailto:/i, '').trim();
        return EMAIL_PATTERN.test(address) ? `mailto:${address}` : null;
      }
      case 'location':
      case 'map': {
        const normalized = normalizeUrl(input);
        return /^https?:\/\//i.test(input) && normalized
          ? normalized
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              input
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
      whatsapp: 'whatsapp_click',
      phone: 'phone_click',
      email: 'email_click',
      website: 'website_click',
      instagram: 'instagram_click',
      facebook: 'facebook_click',
      linkedin: 'linkedin_click',
      youtube: 'youtube_click',
      google_reviews: 'google_review_click',
      location: 'location_click',
      map: 'location_click',
      pdf: 'pdf_click',
      video: 'video_click',
      drive: 'drive_click',
      image: 'image_click',
      custom: 'custom_click',
    };

    return map[type] || `${type}_click`;
  }

  function isWebUrl(url) {
    return Boolean(
      url && (url.startsWith('https://') || url.startsWith('http://'))
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
    const whatsapp = card.whatsapp || whatsappLink?.value || whatsappLink?.url || card.phone;
    const phone = card.phone || phoneLink?.value || phoneLink?.url;
    const email = card.email || emailLink?.value || emailLink?.url;

    return [
      whatsapp
        ? {
            type: 'whatsapp',
            label: 'WhatsApp',
            href: getUrl('whatsapp', whatsapp),
            linkId: card.whatsapp || card.phone ? null : whatsappLink?.id,
          }
        : null,
      phone
        ? {
            type: 'phone',
            label: 'Call',
            href: getUrl('phone', phone),
            linkId: card.phone ? null : phoneLink?.id,
          }
        : null,
      email
        ? {
            type: 'email',
            label: 'Email',
            href: getUrl('email', email),
            linkId: card.email ? null : emailLink?.id,
          }
        : null,
    ].filter((item) => item?.href);
  }, [card, links]);

  const socialLinks = useMemo(
    () =>
      links.filter(
        (item) => SOCIAL_TYPES.has(item.link_type) && getLinkUrl(item)
      ),
    [links]
  );

  const quickLinks = useMemo(
    () =>
      links.filter(
        (item) => !SOCIAL_TYPES.has(item.link_type) && getLinkUrl(item)
      ),
    [links]
  );

  const mobileContacts = useMemo(
    () =>
      ['whatsapp', 'phone']
        .map((type) => quickContacts.find((item) => item.type === type))
        .filter(Boolean),
    [quickContacts]
  );

  async function handleLinkClick(link) {
    await recordEvent(
      card.id,
      getEventType(link.link_type),
      {
        label: link.label,
        origin: 'card_link',
      },
      link.id,
      null
    );
  }

  async function handleBlockClick(block) {
    await recordEvent(
      card.id,
      getEventType(block.block_type),
      {
        title: block.title,
        block_type: block.block_type,
        origin: 'card_block',
      },
      null,
      block.id
    );
  }

  async function shareCard() {
    if (typeof window === 'undefined' || !publicUrl) return;

    const data = {
      title: `${card?.name || 'Digital Card'} - YNS Card`,
      text: `View ${card?.name || ''}'s digital business card.`,
      url: publicUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(data);
      } else {
        await copyText(publicUrl);
        showCopied();
      }

      await recordEvent(card.id, 'share_click', {
        origin: 'public_card',
      });
    } catch (shareError) {
      if (shareError?.name === 'AbortError') return;

      try {
        await copyText(publicUrl);
        showCopied();
        await recordEvent(card.id, 'share_click', {
          origin: 'public_card_fallback',
        });
      } catch {
        showActionError('Sharing is unavailable. Please copy the URL from your browser.');
      }
    }
  }

  function showCopied() {
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  function showActionError(message) {
    setActionError(message);
    window.setTimeout(() => setActionError(''), 4000);
  }

  async function copyLink() {
    try {
      await copyText(publicUrl);
      showCopied();
      await recordEvent(card.id, 'copy_link_click', {
        origin: 'qr_modal',
      });
    } catch {
      showActionError('Unable to copy automatically. Please copy the URL from your browser.');
    }
  }

  async function saveContact() {
    const name = card.name || 'YNS Contact';
    const phone = card.phone || card.whatsapp || '';
    const email = card.email || '';
    const websiteLink = links.find((link) => link.link_type === 'website');
    const website = card.website || websiteLink?.value || websiteLink?.url || '';
    const normalizedWebsite = normalizeUrl(website);
    const company = card.company || '';
    const title = card.designation || '';

    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${escapeVCard(name)}`,
      `N:${escapeVCard(name)};;;;`,
      `ORG:${escapeVCard(company)}`,
      `TITLE:${escapeVCard(title)}`,
      phone ? `TEL;TYPE=CELL:${escapeVCard(cleanPhone(phone))}` : '',
      email && EMAIL_PATTERN.test(email) ? `EMAIL;TYPE=INTERNET:${escapeVCard(email)}` : '',
      normalizedWebsite ? `URL:${escapeVCard(normalizedWebsite)}` : '',
      'END:VCARD',
    ]
      .filter(Boolean)
      .join('\r\n') + '\r\n';

    const blob = new Blob([vcard], {
      type: 'text/vcard;charset=utf-8',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = `${slugify(name) || 'yns-contact'}.vcf`;

    document.body.appendChild(a);
    a.click();
    a.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);

    await recordEvent(card.id, 'save_contact_click', {
      origin: 'public_card',
    });
  }

  function change(key, value) {
    setFormError('');
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
    const phoneDigits = phone.replace(/\D/g, '');

    if (name.length < 2) {
      setFormError('Please enter your name (at least 2 characters).');
      return;
    }

    if (!phone && !email) {
      setFormError('Please enter a phone number or email address.');
      return;
    }

    if (phone && (phoneDigits.length < PHONE_MIN_DIGITS || phoneDigits.length > PHONE_MAX_DIGITS)) {
      setFormError('Please enter a valid phone number with 7 to 15 digits.');
      return;
    }

    if (email && !EMAIL_PATTERN.test(email)) {
      setFormError('Please enter a valid email address.');
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setFormError('');

    try {
      const { error: connectionError } = await supabase
        .from('connections')
        .insert({
          card_id: card.id,
          name,
          phone: phone ? cleanPhone(phone) : null,
          email: email || null,
          company: form.company.trim() || null,
          requirement: form.requirement.trim() || null,
          source: 'public_card',
          source_detail: card.card_slug,
          stage: 'new',
        });

      if (connectionError) throw connectionError;

      await recordEvent(card.id, 'lead_submit', {
        slug: card.card_slug,
      });

      setSubmitted(true);
      setForm({
        name: '',
        phone: '',
        email: '',
        company: '',
        requirement: '',
      });
    } catch {
      setFormError('Unable to send your enquiry right now. Please try again.');
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
          <p>{error || 'Card not found.'}</p>
        </div>
      </main>
    );
  }

  const normalizedTheme = String(card.theme || '')
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  const themeClass =
    normalizedTheme === 'gold' || normalizedTheme === 'yns_gold'
      ? styles.goldTheme
      : normalizedTheme === 'ocean'
      ? styles.oceanTheme
      : styles.standardTheme;

  return (
    <main className={`${styles.page} ${themeClass}`}>
      <header className={styles.siteHeader}>
        <a href="#top" className={styles.brand}>
          <span className={styles.brandMark}>YNS</span>
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
            SHARE
          </button>

          <button
            type="button"
            className={styles.headerGoldButton}
            onClick={() => setQrOpen(true)}
          >
            QR CODE
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
                  alt={card.name || 'Profile'}
                  className={styles.avatar}
                />
              ) : (
                <div className={styles.avatarFallback}>
                  {card.name?.charAt(0)?.toUpperCase() || 'Y'}
                </div>
              )}
              <span className={styles.onlineDot} />
            </div>

            <div className={styles.profileInfo}>
              <div className={styles.nameRow}>
                <h1>{card.name || 'YNS Card'}</h1>
                <span className={styles.verified} aria-label="Verified">✓</span>
              </div>

              {card.designation ? <h2>{card.designation}</h2> : null}
              {card.company ? (
                <strong className={styles.company}>{card.company}</strong>
              ) : null}
              {card.location ? (
                <p className={styles.location}>
                  <span>PIN</span>
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
              {quickContacts.map((item) => (
                <a
                  key={item.type}
                  href={item.href}
                  target={isWebUrl(item.href) ? '_blank' : undefined}
                  rel={isWebUrl(item.href) ? 'noreferrer' : undefined}
                  className={`${styles.contactAction} ${
                    item.type === 'whatsapp' ? styles.whatsappAction : ''
                  }`}
                  onClick={() =>
                    recordEvent(
                      card.id,
                      getEventType(item.type),
                      { origin: 'hero_action' },
                      item.linkId || null
                    )
                  }
                >
                  <span className={styles.actionBadge}>
                    {LABELS[item.type] || 'GO'}
                  </span>
                  <strong>{item.label}</strong>
                </a>
              ))}

              <button
                type="button"
                className={styles.contactAction}
                onClick={saveContact}
              >
                <span className={styles.actionBadge}>VC</span>
                <strong>Save Contact</strong>
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.content}>
        <section id="about" className={`${styles.sectionCard} ${styles.aboutSection}`}>
          <SectionTitle eyebrow="ABOUT ME" title="Professional Profile" />

          <p className={styles.aboutText}>
            {card.bio ||
              `Connect with ${
                card.name || 'this professional'
              } through this verified YNS digital business card.`}
          </p>

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

        {socialLinks.length > 0 ? (
          <section className={styles.sectionCard}>
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
                        styles[`social_${link.link_type}`] || ''
                      }`}
                    >
                      {LABELS[link.link_type] || 'GO'}
                    </span>

                    <strong>
                      {link.label || humanize(link.link_type)}
                    </strong>
                  </a>
                );
              })}
            </div>
          </section>
        ) : null}

        {quickLinks.length > 0 || blocks.length > 0 ? (
          <section className={styles.sectionCard}>
            <SectionTitle eyebrow="QUICK LINKS" title="Connect & Explore" />

            <div className={styles.blockGrid}>
              {quickLinks.map((link) => {
                const href = getLinkUrl(link);

                return (
                  <a
                    key={link.id}
                    href={href}
                    target={isWebUrl(href) ? '_blank' : undefined}
                    rel={isWebUrl(href) ? 'noreferrer' : undefined}
                    className={styles.blockItem}
                    onClick={() => handleLinkClick(link)}
                  >
                    <span className={styles.blockIcon}>
                      {LABELS[link.link_type] || 'LINK'}
                    </span>

                    <span className={styles.blockContent}>
                      <strong>
                        {link.label || humanize(link.link_type)}
                      </strong>
                      <small>{link.value || link.url}</small>
                    </span>

                    <span className={styles.blockArrow}>&gt;</span>
                  </a>
                );
              })}

              {blocks.map((block) => {
                const href = getBlockUrl(block);
                if (!href) return null;

                return (
                  <a
                    key={block.id}
                    href={href}
                    target={isWebUrl(href) ? '_blank' : undefined}
                    rel={isWebUrl(href) ? 'noreferrer' : undefined}
                    className={styles.blockItem}
                    onClick={() => handleBlockClick(block)}
                  >
                    <span className={styles.blockIcon}>
                      {LABELS[block.block_type] || 'LINK'}
                    </span>

                    <span className={styles.blockContent}>
                      <strong>
                        {block.title || humanize(block.block_type)}
                      </strong>
                      <small>
                        {block.subtitle || block.value || block.url}
                      </small>
                    </span>

                    <span className={styles.blockArrow}>&gt;</span>
                  </a>
                );
              })}
            </div>
          </section>
        ) : null}

        {services.length > 0 ? (
          <section id="services" className={styles.sectionCard}>
            <SectionTitle
              eyebrow="SERVICES"
              title="What I Can Help You With"
            />

            <div className={styles.serviceGrid}>
              {services.map((service, index) => (
                <article key={service.id} className={styles.serviceCard}>
                  <span className={styles.serviceIcon}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3>{service.title}</h3>
                  {service.description ? <p>{service.description}</p> : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {portfolio.length > 0 ? (
          <section id="portfolio" className={styles.sectionCard}>
            <SectionTitle eyebrow="PORTFOLIO" title="Selected Work & People" />

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
            <SectionTitle eyebrow="SEND AN ENQUIRY" title="Let’s Work Together" />
            <p>
              Share your requirement and it will be sent directly to the card
              owner.
            </p>

            <div className={styles.enquiryTrust}>
              <span>DIRECT CRM</span>
              <span>SECURE</span>
              <span>FAST RESPONSE</span>
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
                    onChange={(e) => change('name', e.target.value)}
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
                    onChange={(e) => change('phone', e.target.value)}
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
                    onChange={(e) => change('email', e.target.value)}
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
                    onChange={(e) => change('company', e.target.value)}
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
                  onChange={(e) => change('requirement', e.target.value)}
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
                {submitting ? 'Sending...' : 'SEND ENQUIRY'}
              </button>
            </form>
          )}
        </section>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <span className={styles.footerMark}>YNS</span>
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
              {LABELS[link.link_type] || 'GO'}
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
            target={isWebUrl(item.href) ? '_blank' : undefined}
            rel={isWebUrl(item.href) ? 'noreferrer' : undefined}
            className={
              item.type === 'whatsapp'
                ? styles.mobileWhatsapp
                : styles.mobileCall
            }
            onClick={() =>
              recordEvent(
                card.id,
                getEventType(item.type),
                { origin: 'mobile_sticky' },
                item.linkId || null
              )
            }
          >
            {LABELS[item.type] || 'GO'}
            <strong>{item.label}</strong>
          </a>
        ))}

        <button
          type="button"
          className={styles.mobileSave}
          onClick={saveContact}
        >
          VC <strong>Save</strong>
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
              ×
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
              SHARE CARD
            </button>

            <button
              type="button"
              className={styles.modalOutline}
              onClick={copyLink}
            >
              {copied ? 'LINK COPIED' : 'COPY LINK'}
            </button>
          </div>
        </div>
      ) : null}

      {copied ? <div className={styles.toast}>Card link copied</div> : null}
      {actionError ? (
        <div className={styles.errorToast} role="alert">{actionError}</div>
      ) : null}
    </main>
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
          <img src={item.image_url} alt={item.title || 'Portfolio'} />
        ) : (
          <span>{item.title?.charAt(0)?.toUpperCase() || 'Y'}</span>
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
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeVCard(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

async function copyText(value) {
  if (!value) throw new Error('Nothing to copy');

  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();

  if (!copied) throw new Error('Copy is unavailable');
}
