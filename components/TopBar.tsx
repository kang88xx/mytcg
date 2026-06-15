import Link from "next/link";

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME ?? "마이TCG";

export default function TopBar() {
  return (
    <div className="container" style={{ paddingBottom: 0 }}>
      <div className="topbar">
        <Link href="/" className="brand">
          <span className="dot" />
          {BRAND}
        </Link>
        <nav className="navlinks">
          <Link href="/create">카드 만들기</Link>
          <Link href="/leaderboard">리더보드</Link>
        </nav>
      </div>
    </div>
  );
}
