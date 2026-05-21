import Link from "next/link";
import { GitHubIcon } from "./GitHubIcon";
import { githubURL, npmURL } from "../lib/links";

const navItems = [
  { href: "#why", label: "Why" },
  { href: "#demo", label: "Live surface" },
  { href: "#install", label: "Install" }
];

export function Header() {
  return (
    <header className="site-header shell">
      <Link className="brand" href="/" aria-label="LensUI home">
        <span className="mark" aria-hidden="true" />
        <span>LensUI</span>
      </Link>
      <div className="header-right">
        <nav aria-label="Primary navigation">
          {navItems.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <a className="header-badge" href={npmURL} rel="noreferrer" target="_blank">
          <span>npm</span>
        </a>
        <a className="header-badge" href={githubURL} rel="noreferrer" target="_blank">
          <GitHubIcon />
          <span>GitHub</span>
        </a>
      </div>
    </header>
  );
}
