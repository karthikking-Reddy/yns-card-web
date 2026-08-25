'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useParams,
} from 'next/navigation';

import { supabase } from '../../../lib/supabase';

import styles from './page.module.css';


export default function PublicCardPage() {
  const params = useParams();

  const slug =
    Array.isArray(params?.slug)
      ? params.slug[0]
      : params?.slug;

  const [loading, setLoading] =
    useState(true);

  const [card, setCard] =
    useState(null);

  const [links, setLinks] =
    useState([]);

  const [blocks, setBlocks] =
    useState([]);

  const [services, setServices] =
    useState([]);

  const [portfolio, setPortfolio] =
    useState([]);

  const [error, setError] =
    useState('');

  const [submitting, setSubmitting] =
    useState(false);

  const [submitted, setSubmitted] =
    useState(false);

  const [form, setForm] =
    useState({
      name: '',
      phone: '',
      email: '',
      company: '',
      requirement: '',
    });


  useEffect(() => {
    if (!slug) {
      return;
    }

    loadCard();
  }, [slug]);


  async function loadCard() {
    setLoading(true);
    setError('');

    try {
      const {
        data: cardData,
        error: cardError,
      } = await supabase
        .from('digital_cards')
        .select('*')
        .eq('card_slug', slug)
        .eq('is_public', true)
        .eq('is_active', true)
        .maybeSingle();

      if (cardError) {
        throw cardError;
      }

      if (!cardData) {
        setError(
          'This digital card is not available.'
        );

        return;
      }

      setCard(cardData);

      const [
        linksResult,
        blocksResult,
        servicesResult,
        portfolioResult,
      ] = await Promise.all([
        supabase
          .from('card_links')
          .select('*')
          .eq(
            'card_id',
            cardData.id
          )
          .eq(
            'is_active',
            true
          )
          .order(
            'sort_order',
            {
              ascending: true,
            }
          ),

        supabase
          .from('card_blocks')
          .select('*')
          .eq(
            'card_id',
            cardData.id
          )
          .eq(
            'is_active',
            true
          )
          .order(
            'sort_order',
            {
              ascending: true,
            }
          ),

        supabase
          .from('card_services')
          .select('*')
          .eq(
            'card_id',
            cardData.id
          )
          .eq(
            'is_active',
            true
          )
          .order(
            'sort_order',
            {
              ascending: true,
            }
          ),

        supabase
          .from('portfolio_items')
          .select('*')
          .eq(
            'card_id',
            cardData.id
          )
          .eq(
            'is_active',
            true
          )
          .order(
            'sort_order',
            {
              ascending: true,
            }
          ),
      ]);

      if (linksResult.error) {
        throw linksResult.error;
      }

      if (blocksResult.error) {
        throw blocksResult.error;
      }

      if (servicesResult.error) {
        throw servicesResult.error;
      }

      if (portfolioResult.error) {
        throw portfolioResult.error;
      }

      setLinks(
        linksResult.data || []
      );

      setBlocks(
        blocksResult.data || []
      );

      setServices(
        servicesResult.data || []
      );

      setPortfolio(
        portfolioResult.data || []
      );

      await recordView(
        cardData
      );
    } catch (loadError) {
      console.error(
        'Public card load error:',
        loadError
      );

      setError(
        loadError?.message ||
          'Unable to load digital card.'
      );
    } finally {
      setLoading(false);
    }
  }


  function getVisitorToken() {
    if (
      typeof window ===
      'undefined'
    ) {
      return null;
    }

    const key =
      'yns_card_visitor_token';

    let token =
      localStorage.getItem(
        key
      );

    if (!token) {
      token =
        typeof crypto !==
          'undefined' &&
        crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;

      localStorage.setItem(
        key,
        token
      );
    }

    return token;
  }


  async function recordView(
    cardData
  ) {
    if (
      typeof window ===
      'undefined'
    ) {
      return;
    }

    const sessionKey =
      `yns-card-view-${cardData.id}`;

    if (
      sessionStorage.getItem(
        sessionKey
      )
    ) {
      return;
    }

    sessionStorage.setItem(
      sessionKey,
      '1'
    );

    await recordEvent(
      cardData.id,
      'card_view',
      {
        slug:
          cardData.card_slug,
      }
    );
  }


  async function recordEvent(
    cardId,
    eventType,
    metadata = {},
    linkId = null,
    blockId = null
  ) {
    try {
      const {
        error: eventError,
      } = await supabase
        .from('card_events')
        .insert({
          card_id: cardId,

          link_id:
            linkId || null,

          block_id:
            blockId || null,

          event_type:
            eventType,

          source:
            'public_card',

          visitor_token:
            getVisitorToken(),

          metadata,
        });

      if (eventError) {
        console.warn(
          'Analytics event:',
          eventError.message
        );
      }
    } catch (eventError) {
      console.warn(
        'Analytics event failed:',
        eventError
      );
    }
  }


  function change(
    key,
    value
  ) {
    setForm(
      (previous) => ({
        ...previous,
        [key]: value,
      })
    );
  }


  function cleanPhone(
    value
  ) {
    return String(
      value || ''
    ).replace(
      /[^\d+]/g,
      ''
    );
  }


  function normalizeUrl(
    value
  ) {
    const clean =
      String(
        value || ''
      ).trim();

    if (!clean) {
      return null;
    }

    if (
      clean.startsWith(
        'http://'
      ) ||
      clean.startsWith(
        'https://'
      )
    ) {
      return clean;
    }

    return `https://${clean}`;
  }


  function getLinkUrl(
    link
  ) {
    const value =
      String(
        link.value || ''
      ).trim();

    switch (
      link.link_type
    ) {
      case 'whatsapp':
        return value
          ? `https://wa.me/${cleanPhone(
              value
            ).replace(
              '+',
              ''
            )}`
          : null;

      case 'phone':
        return value
          ? `tel:${cleanPhone(
              value
            )}`
          : null;

      case 'email':
        return value
          ? `mailto:${value}`
          : null;

      case 'website':
        return normalizeUrl(
          value
        );

      case 'location':
        if (!value) {
          return null;
        }

        if (
          value.startsWith(
            'http'
          )
        ) {
          return value;
        }

        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          value
        )}`;

      default:
        return normalizeUrl(
          value
        );
    }
  }


  function getBlockUrl(
    block
  ) {
    const type =
      block.block_type;

    const value =
      String(
        block.value || ''
      ).trim();

    const url =
      String(
        block.url || ''
      ).trim();

    const target =
      url || value;

    switch (type) {
      case 'whatsapp':
        return target
          ? `https://wa.me/${cleanPhone(
              target
            ).replace(
              '+',
              ''
            )}`
          : null;

      case 'phone':
        return target
          ? `tel:${cleanPhone(
              target
            )}`
          : null;

      case 'email':
        return target
          ? `mailto:${target}`
          : null;

      case 'map':
      case 'location':
        if (!target) {
          return null;
        }

        if (
          target.startsWith(
            'http'
          )
        ) {
          return target;
        }

        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          target
        )}`;

      case 'website':
      case 'instagram':
      case 'facebook':
      case 'linkedin':
      case 'youtube':
      case 'google_reviews':
      case 'pdf':
      case 'video':
      case 'drive':
      case 'image':
      case 'custom':
      default:
        return normalizeUrl(
          target
        );
    }
  }


  function getEventType(
    type
  ) {
    const map = {
      whatsapp:
        'whatsapp_click',

      phone:
        'phone_click',

      email:
        'email_click',

      website:
        'website_click',

      instagram:
        'instagram_click',

      facebook:
        'facebook_click',

      linkedin:
        'linkedin_click',

      youtube:
        'youtube_click',

      google_reviews:
        'google_review_click',

      location:
        'location_click',

      map:
        'location_click',

      pdf:
        'pdf_click',

      video:
        'video_click',

      drive:
        'drive_click',

      image:
        'image_click',

      custom:
        'custom_click',
    };

    return (
      map[type] ||
      'block_click'
    );
  }


  function getIcon(
    type
  ) {
    const icons = {
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

    return (
      icons[type] ||
      'LINK'
    );
  }

  function shouldOpenNewTab(
    type
  ) {
    return ![
      'phone',
      'email',
    ].includes(type);
  }


  async function handleLinkClick(
    link
  ) {
    if (!card) {
      return;
    }

    await recordEvent(
      card.id,
      getEventType(
        link.link_type
      ),
      {
        label:
          link.label,

        type:
          link.link_type,

        origin:
          'card_link',
      },
      link.id,
      null
    );
  }


  async function handleBlockClick(
    block
  ) {
    if (!card) {
      return;
    }

    await recordEvent(
      card.id,
      getEventType(
        block.block_type
      ),
      {
        title:
          block.title,

        block_type:
          block.block_type,

        origin:
          'card_block',
      },
      null,
      block.id
    );
  }


  async function submitEnquiry(
    event
  ) {
    event.preventDefault();

    if (!card) {
      return;
    }

    if (
      !form.name.trim()
    ) {
      alert(
        'Please enter your name.'
      );

      return;
    }

    if (
      !form.phone.trim() &&
      !form.email.trim()
    ) {
      alert(
        'Please enter a phone number or email address.'
      );

      return;
    }

    setSubmitting(true);

    try {
      const {
        error:
          connectionError,
      } = await supabase
        .from('connections')
        .insert({
          card_id:
            card.id,

          name:
            form.name.trim(),

          phone:
            form.phone.trim() ||
            null,

          email:
            form.email.trim() ||
            null,

          company:
            form.company.trim() ||
            null,

          requirement:
            form.requirement.trim() ||
            null,

          source:
            'public_card',

          source_detail:
            card.card_slug,

          stage:
            'new',
        });

      if (
        connectionError
      ) {
        throw connectionError;
      }

      await recordEvent(
        card.id,
        'lead_submit',
        {
          slug:
            card.card_slug,
        }
      );

      setSubmitted(true);

      setForm({
        name: '',
        phone: '',
        email: '',
        company: '',
        requirement: '',
      });
    } catch (
      submitError
    ) {
      console.error(
        'Lead submit error:',
        submitError
      );

      alert(
        submitError?.message ||
          'Unable to submit enquiry.'
      );
    } finally {
      setSubmitting(false);
    }
  }


  async function shareCard() {
    if (
      typeof window ===
      'undefined'
    ) {
      return;
    }

    const shareData = {
      title:
        `${card?.name || 'Digital Card'} - YNS Card`,

      text:
        `View ${card?.name || ''}'s digital business card.`,

      url:
        window.location.href,
    };

    try {
      if (
        navigator.share
      ) {
        await navigator.share(
          shareData
        );
      } else {
        await navigator.clipboard.writeText(
          window.location.href
        );

        alert(
          'Card link copied.'
        );
      }
    } catch {
      // Share cancelled.
    }
  }


  const students =
    useMemo(
      () =>
        portfolio.filter(
          (item) =>
            item.portfolio_type ===
            'student'
        ),
      [portfolio]
    );


  const employees =
    useMemo(
      () =>
        portfolio.filter(
          (item) =>
            item.portfolio_type ===
            'employee'
        ),
      [portfolio]
    );


  if (loading) {
    return (
      <main
        className={
          styles.centerPage
        }
      >
        <div
          className={
            styles.loader
          }
        />

        <p>
          Loading digital card...
        </p>
      </main>
    );
  }


  if (
    error ||
    !card
  ) {
    return (
      <main
        className={
          styles.centerPage
        }
      >
        <div
          className={
            styles.errorCard
          }
        >
          <h1>
            YNS CARD
          </h1>

          <p>
            {error ||
              'Card not found.'}
          </p>
        </div>
      </main>
    );
  }


  return (
    <main
      className={`${styles.page} ${
        card.theme === 'gold'
          ? styles.goldTheme
          : card.theme === 'ocean'
          ? styles.oceanTheme
          : styles.standardTheme
      }`}
    >
      <section
        className={
          styles.cardShell
        }
      >
        <div
          className={
            styles.topBrand
          }
        >
          <div>
            <strong>
              YNS CARD
            </strong>

            <span>
              Your digital identity
            </span>
          </div>

          <button
            type="button"
            className={
              styles.shareButton
            }
            onClick={
              shareCard
            }
          >
            Share
          </button>
        </div>


        <div
          className={
            styles.profileCard
          }
        >
          {card.profile_image_url ? (
            <img
              src={
                card.profile_image_url
              }
              alt={
                card.name
              }
              className={
                styles.avatar
              }
            />
          ) : (
            <div
              className={
                styles.avatarFallback
              }
            >
              {card.name
                ?.charAt(0)
                ?.toUpperCase() ||
                'Y'}
            </div>
          )}

          <h1>
            {card.name}
          </h1>

          {card.designation ? (
            <p
              className={
                styles.designation
              }
            >
              {
                card.designation
              }
            </p>
          ) : null}

          {card.company ? (
            <h2>
              {
                card.company
              }
            </h2>
          ) : null}

          {card.tagline ? (
            <p
              className={
                styles.tagline
              }
            >
              {card.tagline}
            </p>
          ) : null}

          {card.bio ? (
            <p
              className={
                styles.bio
              }
            >
              {card.bio}
            </p>
          ) : null}


          {links.length > 0 ? (
            <div
              className={
                styles.actionGrid
              }
            >
              {links.map(
                (link) => {
                  const href =
                    getLinkUrl(
                      link
                    );

                  if (!href) {
                    return null;
                  }

                  return (
                    <a
                      key={
                        link.id
                      }
                      href={
                        href
                      }
                      target={
                        shouldOpenNewTab(
                          link.link_type
                        )
                          ? '_blank'
                          : undefined
                      }
                      rel={
                        shouldOpenNewTab(
                          link.link_type
                        )
                          ? 'noreferrer'
                          : undefined
                      }
                      className={
                        styles.action
                      }
                      onClick={() =>
                        handleLinkClick(
                          link
                        )
                      }
                    >
                      <span
                        className={
                          styles.actionIcon
                        }
                      >
                        {getIcon(
                          link.link_type
                        )}
                      </span>

                      <span>
                        {
                          link.label
                        }
                      </span>
                    </a>
                  );
                }
              )}
            </div>
          ) : null}
        </div>


        {blocks.length > 0 ? (
          <section
            className={
              styles.section
            }
          >
            <div
              className={
                styles.sectionHeading
              }
            >
              <span>
                QUICK LINKS
              </span>

              <strong>
                Connect & Explore
              </strong>
            </div>

            <div
              className={
                styles.blockGrid
              }
            >
              {blocks.map(
                (block) => {
                  const href =
                    getBlockUrl(
                      block
                    );

                  if (!href) {
                    return null;
                  }

                  return (
                    <a
                      key={
                        block.id
                      }
                      href={href}
                      target={
                        shouldOpenNewTab(
                          block.block_type
                        )
                          ? '_blank'
                          : undefined
                      }
                      rel={
                        shouldOpenNewTab(
                          block.block_type
                        )
                          ? 'noreferrer'
                          : undefined
                      }
                      className={
                        styles.blockItem
                      }
                      onClick={() =>
                        handleBlockClick(
                          block
                        )
                      }
                    >
                      <div
                        className={
                          styles.blockIcon
                        }
                      >
                        {getIcon(
                          block.block_type
                        )}
                      </div>

                      <div
                        className={
                          styles.blockContent
                        }
                      >
                        <strong
                          className={
                            styles.blockTitle
                          }
                        >
                          {block.title ||
                            'Open'}
                        </strong>

                        {block.subtitle ? (
                          <span
                            className={
                              styles.blockSubtitle
                            }
                          >
                            {
                              block.subtitle
                            }
                          </span>
                        ) : null}

                        {block.value ? (
                          <span
                            className={
                              styles.blockValue
                            }
                          >
                            {
                              block.value
                            }
                          </span>
                        ) : null}
                      </div>

                      <span
                        className={
                          styles.blockArrow
                        }
                      >
                        {'>'}
                      </span>
                    </a>
                  );
                }
              )}
            </div>
          </section>
        ) : null}


        {services.length >
        0 ? (
          <section
            className={
              styles.section
            }
          >
            <div
              className={
                styles.sectionHeading
              }
            >
              <span>
                OUR SERVICES
              </span>

              <strong>
                What we do
              </strong>
            </div>

            <div
              className={
                styles.serviceGrid
              }
            >
              {services.map(
                (service) => (
                  <article
                    key={
                      service.id
                    }
                    className={
                      styles.service
                    }
                  >
                    <div
                      className={
                        styles.serviceMark
                      }
                    >
                      S
                    </div>

                    <div>
                      <h3>
                        {
                          service.title
                        }
                      </h3>

                      {service.short_description ? (
                        <p>
                          {
                            service.short_description
                          }
                        </p>
                      ) : null}
                    </div>
                  </article>
                )
              )}
            </div>
          </section>
        ) : null}


        {portfolio.length >
        0 ? (
          <section
            className={
              styles.section
            }
          >
            <div
              className={
                styles.sectionHeading
              }
            >
              <span>
                PORTFOLIO
              </span>

              <strong>
                People & Projects
              </strong>
            </div>

            {students.length >
            0 ? (
              <>
                <h3
                  className={
                    styles.portfolioTitle
                  }
                >
                  Students
                </h3>

                <div
                  className={
                    styles.portfolioGrid
                  }
                >
                  {students.map(
                    (item) => (
                      <PortfolioItem
                        key={
                          item.id
                        }
                        item={
                          item
                        }
                      />
                    )
                  )}
                </div>
              </>
            ) : null}


            {employees.length >
            0 ? (
              <>
                <h3
                  className={
                    styles.portfolioTitle
                  }
                >
                  Employees
                </h3>

                <div
                  className={
                    styles.portfolioGrid
                  }
                >
                  {employees.map(
                    (item) => (
                      <PortfolioItem
                        key={
                          item.id
                        }
                        item={
                          item
                        }
                      />
                    )
                  )}
                </div>
              </>
            ) : null}
          </section>
        ) : null}


        <section
          className={
            styles.section
          }
        >
          <div
            className={
              styles.sectionHeading
            }
          >
            <span>
              GET IN TOUCH
            </span>

            <strong>
              Send an enquiry
            </strong>
          </div>

          {submitted ? (
            <div
              className={
                styles.success
              }
            >
              <div
                className={
                  styles.successIcon
                }
              >
                ?
              </div>

              <h3>
                Thank you!
              </h3>

              <p>
                Your enquiry has
                been sent successfully.
              </p>

              <button
                type="button"
                onClick={() =>
                  setSubmitted(
                    false
                  )
                }
              >
                Send another enquiry
              </button>
            </div>
          ) : (
            <form
              className={
                styles.form
              }
              onSubmit={
                submitEnquiry
              }
            >
              <label>
                Name *

                <input
                  value={
                    form.name
                  }
                  onChange={(
                    event
                  ) =>
                    change(
                      'name',
                      event.target
                        .value
                    )
                  }
                  placeholder="Your name"
                />
              </label>


              <div
                className={
                  styles.twoColumns
                }
              >
                <label>
                  Phone

                  <input
                    value={
                      form.phone
                    }
                    onChange={(
                      event
                    ) =>
                      change(
                        'phone',
                        event.target
                          .value
                      )
                    }
                    placeholder="+91..."
                  />
                </label>


                <label>
                  Email

                  <input
                    type="email"
                    value={
                      form.email
                    }
                    onChange={(
                      event
                    ) =>
                      change(
                        'email',
                        event.target
                          .value
                      )
                    }
                    placeholder="you@example.com"
                  />
                </label>
              </div>


              <label>
                Company

                <input
                  value={
                    form.company
                  }
                  onChange={(
                    event
                  ) =>
                    change(
                      'company',
                      event.target
                        .value
                    )
                  }
                  placeholder="Company name"
                />
              </label>


              <label>
                Requirement

                <textarea
                  value={
                    form.requirement
                  }
                  onChange={(
                    event
                  ) =>
                    change(
                      'requirement',
                      event.target
                        .value
                    )
                  }
                  placeholder="Tell us what you need..."
                  rows={4}
                />
              </label>


              <button
                type="submit"
                className={
                  styles.submitButton
                }
                disabled={
                  submitting
                }
              >
                {submitting
                  ? 'Sending...'
                  : 'Send Enquiry'}
              </button>

              <p
                className={
                  styles.formHelp
                }
              >
                Your enquiry will
                be sent directly to
                this card owner.
              </p>
            </form>
          )}
        </section>


        <footer
          className={
            styles.footer
          }
        >
          <strong>
            YNS CARD
          </strong>

          <span>
            Powered by YUVARAJ
            NETWORKS & SOLUTIONS
          </span>
        </footer>
      </section>
    </main>
  );
}


function PortfolioItem({
  item,
}) {
  return (
    <article
      className={
        styles.portfolioItem
      }
    >
      {item.image_url ? (
        <img
          src={
            item.image_url
          }
          alt={
            item.title
          }
          className={
            styles.portfolioImage
          }
        />
      ) : (
        <div
          className={
            styles.portfolioFallback
          }
        >
          {item.title
            ?.charAt(0)
            ?.toUpperCase()}
        </div>
      )}

      <div>
        <h4>
          {item.title}
        </h4>

        {item.subtitle ? (
          <span>
            {item.subtitle}
          </span>
        ) : null}

        {item.description ? (
          <p>
            {item.description}
          </p>
        ) : null}
      </div>
    </article>
  );
}

