"use client";

import { useRef } from "react";
import Link from "next/link";

const links = [
  ["Home", "/#home"],
  ["Features", "/#features"],
  ["How It Works", "/#how-it-works"],
  ["Demo", "/#demo"],
  ["FAQ", "/#faq"],
  ["Contact", "/#contact"],
];

export default function MobileMenu({ className, demo }) {
  const menuRef = useRef(null);
  const closeMenu = () => {
    if (menuRef.current) menuRef.current.open = false;
  };

  return (
    <details className={className} ref={menuRef}>
      <summary aria-label="Open menu">
        <span></span>
        <span></span>
        <span></span>
      </summary>
      <nav aria-label="Mobile navigation">
        {links.map(([label, href]) => (
          <Link key={label} href={href} onClick={closeMenu}>
            {label}
          </Link>
        ))}
        <Link href={demo} onClick={closeMenu}>
          View Demo Card
        </Link>
        <Link href="/#contact" onClick={closeMenu}>
          Talk to Us
        </Link>
      </nav>
    </details>
  );
}
