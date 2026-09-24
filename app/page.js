import Image from "next/image";
import Link from "next/link";
import MobileMenu from "./mobile-menu";
import styles from "./page.module.css";

const demo = "/card/karthik-test";
const steps = [
  ["Create Account", "Sign up and create your profile."],
  ["Build Your Card", "Add professional details, services and links."],
  ["Request Approval", "Submit your card for approval."],
  ["Share Everywhere", "Share using QR code, link or WhatsApp."],
  ["Get Leads & Grow", "Receive enquiries and manage follow-ups."],
];
const features = ["Digital Business Card", "QR Code Sharing", "Save Contact", "WhatsApp Sharing", "Leads Management", "Follow-ups", "Insights & Analytics", "Services", "Portfolio", "Social Links", "Business Tools", "Card Approval", "Secure Cloud Sync"];
const faqs = [
  ["What is YNS Card?", "YNS Card is a digital business card platform for presenting your professional profile and managing connections."],
  ["How do I share my card?", "Once your card is approved, share its public link, QR code or WhatsApp link."],
  ["Can someone open my card without installing the app?", "Yes. An approved public card opens in a web browser."],
  ["Can people save my contact details?", "Yes. Visitors can use Save Contact on your public card."],
  ["Can I add services and social links?", "Yes. You can include services and social links in your profile."],
  ["Can I receive enquiries?", "Yes. Visitors can send an enquiry from an approved public card."],
  ["Can I update my card later?", "Yes. You can update your card details. Public sharing remains subject to card approval."],
  ["Why does my card need approval?", "Approval is required before a card can be shared publicly."],
  ["Do viewers need the YNS Card app?", "No. Viewers can open an approved card in their browser."],
];

export const metadata = {
  title: "YNS Card | Your Digital Identity",
  description: "Create, share and manage your professional digital business card with YNS Card by YUVARAJ NETWORKS & SOLUTIONS.",
  alternates: { canonical: "https://card.ynscrm.online/" },
  openGraph: { title: "YNS Card | Your Digital Identity", description: "Create, share and manage your professional digital business card with YNS Card by YUVARAJ NETWORKS & SOLUTIONS.", url: "https://card.ynscrm.online/" },
};

function Logo() {
  return <Image src="/brand/yns-card-logo.jpeg" alt="YNS Card" width={72} height={72} priority className={styles.logo} />;
}
function Button({ href, children, secondary = false }) {
  return <Link className={`${styles.button} ${secondary ? styles.secondary : ""}`} href={href}>{children}<span aria-hidden="true">↗</span></Link>;
}
function Device({ small = false }) {
  return <div className={`${styles.device} ${small ? styles.deviceSmall : ""}`} aria-label="Illustration of YNS Card product areas">
    <div className={styles.deviceTop}><span>YNS Card</span><span>● ● ●</span></div>
    <div className={styles.deviceBody}><div className={styles.profileDot}>Y</div><small>DIGITAL CARD</small><h3>Your professional identity</h3><p>Profile · Services · Portfolio</p><div className={styles.deviceAction}>Share your card <span>↗</span></div><div className={styles.miniGrid}><span>QR</span><span>Leads</span><span>Insights</span><span>Business</span></div></div>
    <div className={styles.deviceNav}>Home <span>Digital Card</span> Profile</div>
  </div>;
}

export default function Home() {
  return <div className={styles.site} id="home">
    <header className={styles.header}><div className={styles.headerInner}>
      <Link href="#home" className={styles.brand} aria-label="YNS Card home"><Logo /><span>YNS <b>Card</b></span></Link>
      <nav className={styles.desktopNav} aria-label="Main navigation"><a href="#home">Home</a><a href="#features">Features</a><a href="#how-it-works">How It Works</a><a href="#demo">Demo</a><a href="#faq">FAQ</a><a href="#contact">Contact</a></nav>
      <div className={styles.headerActions}><Link href={demo}>View Demo Card</Link><Link href="/#contact" className={styles.headerCta}>Talk to Us ↗</Link></div>
      <MobileMenu className={styles.mobileMenu} demo={demo} />
    </div></header>
    <main>
      <section className={styles.hero}><div className={styles.heroGlow}></div><div className={`${styles.container} ${styles.heroGrid}`}><div className={styles.heroCopy}><div className={styles.eyebrow}>SMARTER NETWORKING FOR A BRIGHTER TOMORROW</div><h1>Your Digital <em>Identity</em></h1><h2>Create. Share. Grow.</h2><p>YNS Card helps professionals, entrepreneurs and businesses create a professional digital business card, share it instantly, capture leads and manage business connections from one platform.</p><div className={styles.buttonRow}><Button href={demo}>View Demo Card</Button><Button href="#how-it-works" secondary>See How It Works</Button></div><div className={styles.heroNote}><span></span> A smarter way to make every connection count</div></div><div className={styles.heroVisual}><div className={styles.orbit}></div><Device /><div className={`${styles.floatCard} ${styles.floatLeft}`}><span>◇</span><div><b>Digital Card</b><small>One link. Your full profile.</small></div></div><div className={`${styles.floatCard} ${styles.floatRight}`}><span>▦</span><div><b>QR Sharing</b><small>Connect in a moment.</small></div></div></div></div></section>
      <div className={styles.trust}><div className={styles.container}>{["Professional", "Easy to Share", "Secure", "Business Ready"].map(x => <span key={x}><i>✦</i>{x}</span>)}</div></div>
      <section id="how-it-works" className={`${styles.section} ${styles.ivory}`}><div className={styles.container}><div className={styles.sectionIntro}><span className={styles.kicker}>THE SIMPLE PATH FORWARD</span><h2>Get Started in Minutes</h2><p>From your first profile to your next business connection.</p></div><div className={styles.steps}>{steps.map(([title, body], i) => <article key={title} className={styles.step}><div className={styles.stepNumber}>{String(i + 1).padStart(2, "0")}</div><h3>{title}</h3><p>{body}</p></article>)}</div></div></section>
      <section id="features" className={styles.section}><div className={styles.container}><div className={styles.sectionIntro}><span className={styles.kicker}>BUILT FOR THE WAY YOU CONNECT</span><h2>Everything You Need in One Card</h2><p>Your identity, sharing tools and business connections in one place.</p></div><div className={styles.features}>{features.map((x, i) => <div className={styles.feature} key={x}><span className={styles.featureIcon}>{["◈", "▦", "◎", "↗", "✉", "✓", "▤", "✦", "▧", "∞", "⌘", "◆", "☁"][i]}</span><strong>{x}</strong></div>)}</div></div></section>
      <section id="demo" className={`${styles.section} ${styles.demo}`}><div className={`${styles.container} ${styles.split}`}><div><span className={styles.kicker}>EXPLORE THE EXPERIENCE</span><h2>See YNS Card in Action</h2><p>Explore a real public digital card, then discover how YNS Card brings Leads, Insights and Business tools together.</p><div className={styles.demoTags}><span>Digital Card</span><span>Leads</span><span>Insights</span><span>Business tools</span></div><div className={styles.buttonRow}><Button href={demo}>View Live Demo</Button></div><p className={styles.comingNote}>Product Video Coming Soon</p></div><div className={styles.demoPreview}><Device small /></div></div></section>
      <section className={`${styles.section} ${styles.ivory}`}><div className={`${styles.container} ${styles.split}`}><div><span className={styles.kicker}>MORE THAN A BUSINESS CARD</span><h2>One Card. Many Opportunities.</h2><p>Bring your professional identity, contact information, services, portfolio and social links together. Share by QR, capture leads and stay organized with follow-ups and business tools.</p><div className={styles.benefits}>{["Better first impression", "Faster contact sharing", "Centralized business profile", "Lead capture", "Follow-up management", "Professional online presence"].map(x => <span key={x}>✓ {x}</span>)}</div></div><div className={styles.valuePanel}><div className={styles.valueTop}>YOUR PROFESSIONAL PRESENCE <span>✦</span></div><div className={styles.valueCenter}>One card.<br/><em>Every connection.</em></div><div className={styles.valueBottom}>PROFILE <span>•</span> SHARE <span>•</span> GROW</div></div></div></section>
      <section className={styles.realCard}><div className={styles.container}><span className={styles.kicker}>TAKE A CLOSER LOOK</span><h2>See a Real YNS Card</h2><p>Open the approved demo card to see the public experience for yourself.</p><Button href={demo}>Open Demo Card</Button></div></section>
      <section id="faq" className={`${styles.section} ${styles.ivory}`}><div className={styles.container}><div className={styles.sectionIntro}><span className={styles.kicker}>GOOD TO KNOW</span><h2>Frequently Asked Questions</h2></div><div className={styles.faq}>{faqs.map(([q, a]) => <details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></div></section>
      <section className={styles.android}><div className={`${styles.container} ${styles.androidInner}`}><div><span className={styles.kicker}>ON THE WAY</span><h2>YNS Card for Android</h2><p>The YNS Card Android app is being prepared for release.</p></div><button disabled>Coming Soon</button></div></section>
      <section id="contact" className={styles.finalCta}><div className={styles.container}><span className={styles.kicker}>YOUR NEXT CONNECTION STARTS HERE</span><h2>Ready to Build Your Digital Identity?</h2><p>Talk with YNS about creating your professional digital identity.</p><div className={styles.buttonRow}><Button href={demo}>View Demo Card</Button><Button href="/#contact" secondary>Contact YNS</Button></div></div></section>
    </main>
    <footer className={styles.footer}><div className={`${styles.container} ${styles.footerGrid}`}><div className={styles.footerBrand}><Link href="#home" className={styles.brand}><Logo /><span>YNS <b>Card</b></span></Link><p>Digital identity for meaningful business connections.</p><strong>YUVARAJ NETWORKS &amp; SOLUTIONS</strong></div><div><h3>Product</h3><a href="#features">Features</a><a href="#how-it-works">How It Works</a><a href="#demo">Demo</a></div><div><h3>Company</h3><a href="#home">About YNS Card</a><a href="#contact">Contact</a></div><div><h3>Support</h3><a href="#faq">FAQ</a></div></div><div className={`${styles.container} ${styles.footerBottom}`}>© {new Date().getFullYear()} YUVARAJ NETWORKS &amp; SOLUTIONS</div></footer>
  </div>;
}
