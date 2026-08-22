'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export default function CardPage() {
  const params = useParams();
  const slug = params?.slug;

  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;

    async function loadCard() {
      try {
        const { data, error } = await supabase
          .from('digital_cards')
          .select('*')
          .eq('card_slug', slug)
          .maybeSingle();

        if (error) {
          console.error('Card loading error:', error);
          setError(error.message);
          return;
        }

        if (!data) {
          setError('Digital card not found.');
          return;
        }

        setCard(data);
      } catch (err) {
        console.error(err);
        setError('Unable to load digital card.');
      } finally {
        setLoading(false);
      }
    }

    loadCard();
  }, [slug]);

  if (loading) {
    return (
      <main className="screen">
        <div className="loading">
          <div className="spinner" />
          <p>Preparing your digital card...</p>
        </div>
      </main>
    );
  }

  if (error || !card) {
    return (
      <main className="screen">
        <div className="error-card">
          <h1>YNS CARD</h1>
          <p>{error || 'Digital card not found.'}</p>
        </div>
      </main>
    );
  }

  const website = card.website
    ? card.website.startsWith('http')
      ? card.website
      : `https://${card.website}`
    : null;

  async function handleShare() {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${card.name} — YNS CARD`,
          text: `${card.name}\n${card.designation}\n${card.company}`,
          url,
        });
      } catch {
        // Sharing cancelled by user.
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        alert('Card link copied.');
      } catch {
        alert(url);
      }
    }
  }

  function handleSaveContact() {
    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${card.name || ''}`,
      `ORG:${card.company || ''}`,
      `TITLE:${card.designation || ''}`,
      `TEL:${card.phone || ''}`,
      `EMAIL:${card.email || ''}`,
      `URL:${website || ''}`,
      'END:VCARD',
    ].join('\r\n');

    const blob = new Blob([vcard], {
      type: 'text/vcard;charset=utf-8',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `${card.name || 'contact'}.vcf`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  return (
    <main className="screen">
      <header className="header">
        <div>
          <h1>YNS CARD</h1>
          <p>Your digital identity</p>
        </div>

        <button
          className="menu-button"
          onClick={handleShare}
          aria-label="Share card"
        >
          ⋮
        </button>
      </header>

      <section className="business-card">
        <div className="avatar">
          {card.name?.charAt(0)?.toUpperCase() || 'K'}
        </div>

        <h2>{card.name}</h2>

        <div className="designation">
          {card.designation}
        </div>

        <div className="company">
          {card.company}
        </div>

        <div className="divider" />

        {card.phone && (
          <a
            className="contact-row"
            href={`tel:${card.phone}`}
          >
            <div className="contact-icon">☎</div>

            <div>
              <span>PHONE</span>
              <strong>{card.phone}</strong>
            </div>
          </a>
        )}

        {card.email && (
          <a
            className="contact-row"
            href={`mailto:${card.email}`}
          >
            <div className="contact-icon">✉</div>

            <div>
              <span>EMAIL</span>
              <strong>{card.email}</strong>
            </div>
          </a>
        )}

        {website && (
          <a
            className="contact-row"
            href={website}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="contact-icon">⌂</div>

            <div>
              <span>WEBSITE</span>
              <strong>{card.website}</strong>
            </div>
          </a>
        )}

        <div className="actions">
          <button
            className="primary-button"
            onClick={handleShare}
          >
            Share Card
          </button>

          <button
            className="secondary-button"
            onClick={handleSaveContact}
          >
            Save Contact
          </button>
        </div>
      </section>

      <section className="share-section">
        <div className="qr-placeholder">
          QR
        </div>

        <h3>Share your card instantly</h3>

        <p>
          Let people scan your QR code to view your
          digital card.
        </p>

        <button
          className="qr-button"
          onClick={handleShare}
        >
          Open Card
        </button>
      </section>

      <footer>
        <p>Powered by YNS CARD</p>
      </footer>
    </main>
  );
}