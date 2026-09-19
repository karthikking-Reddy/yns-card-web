import Image from "next/image";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#FAF8F2",
        color: "#061B36",
        textAlign: "center",
      }}
    >
      <div>
        <Image
          src="/brand/yns-card-logo.jpeg"
          alt="YNS Card — Your Digital Identity"
          width={220}
          height={220}
          priority
          style={{
            display: "block",
            margin: "0 auto",
            maxWidth: "100%",
            height: "auto",
          }}
        />
        <p style={{ margin: "16px 0 0", fontSize: 14 }}>
          Professional digital business cards by YUVARAJ NETWORKS &amp;
          SOLUTIONS.
        </p>
      </div>
    </main>
  );
}
