import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { config as runtimeConfig } from "@/lib/config";
import { getPageBySlug, getSiteConfig, listPages } from "@/lib/content";
import { runMigrations } from "@/lib/db";

type PageProps = {
  params: Promise<{
    slug?: string[];
  }>;
};

function pathFromSlug(slug?: string[]) {
  if (!slug?.length) {
    return "/";
  }

  return `/${slug.join("/")}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  runMigrations();
  const { slug } = await params;
  const path = pathFromSlug(slug);
  const site = getSiteConfig();
  const page = getPageBySlug(path);

  return {
    title: page?.title ? `${page.title} | ${site.siteName}` : site.siteName,
    description: site.tagline,
  };
}

function ChatWidget({ enabled }: { enabled: boolean }) {
  if (!enabled || !runtimeConfig.parentPrismBaseUrl) {
    return null;
  }

  return (
    <a
      className="chat-widget"
      href={`${runtimeConfig.parentPrismBaseUrl}/tenants/${encodeURIComponent(runtimeConfig.tenantId)}/chat`}
    >
      Ask for an update
    </a>
  );
}

function SiteNav({
  nav,
  siteName,
}: {
  nav: Array<{ label: string; slug: string }>;
  siteName: string;
}) {
  return (
    <header className="site-header">
      <a className="brand" href="/">
        {siteName}
      </a>
      <nav>
        {nav.map((item) => (
          <a href={item.slug} key={`${item.label}-${item.slug}`}>
            {item.label}
          </a>
        ))}
      </nav>
    </header>
  );
}

function DocsLayout({
  page,
  pages,
  site,
}: {
  page: NonNullable<ReturnType<typeof getPageBySlug>>;
  pages: ReturnType<typeof listPages>;
  site: ReturnType<typeof getSiteConfig>;
}) {
  return (
    <main className="docs-shell">
      <SiteNav nav={site.nav} siteName={site.siteName} />
      <div className="docs-grid">
        <aside className="docs-sidebar">
          <p className="sidebar-label">Pages</p>
          {pages.map((item) => (
            <a href={item.slug} key={item.id}>
              {item.title}
            </a>
          ))}
        </aside>
        <article className="markdown-page">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{page.body}</ReactMarkdown>
        </article>
      </div>
      <ChatWidget enabled={site.chatWidgetEnabled} />
    </main>
  );
}

function PortfolioClassic({
  page,
  site,
}: {
  page: NonNullable<ReturnType<typeof getPageBySlug>>;
  site: ReturnType<typeof getSiteConfig>;
}) {
  return (
    <main className="portfolio classic">
      <SiteNav nav={site.nav} siteName={site.siteName} />
      <section className="portfolio-hero two-column">
        <div className="portfolio-copy">
          <p className="eyebrow">Portfolio</p>
          <h1>{page.title}</h1>
          <p className="lede">{site.tagline}</p>
        </div>
        <div className="portfolio-panel">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{page.body}</ReactMarkdown>
        </div>
      </section>
      <ChatWidget enabled={site.chatWidgetEnabled} />
    </main>
  );
}

function PortfolioEditorial({
  page,
  site,
}: {
  page: NonNullable<ReturnType<typeof getPageBySlug>>;
  site: ReturnType<typeof getSiteConfig>;
}) {
  return (
    <main className="portfolio editorial">
      <SiteNav nav={site.nav} siteName={site.siteName} />
      <section className="portfolio-hero editorial-hero">
        <p className="eyebrow">Selected work</p>
        <h1>{page.title}</h1>
        <p className="lede">{site.tagline}</p>
      </section>
      <section className="editorial-body">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{page.body}</ReactMarkdown>
      </section>
      <ChatWidget enabled={site.chatWidgetEnabled} />
    </main>
  );
}

function PortfolioShowcase({
  page,
  site,
}: {
  page: NonNullable<ReturnType<typeof getPageBySlug>>;
  site: ReturnType<typeof getSiteConfig>;
}) {
  return (
    <main className="portfolio showcase">
      <SiteNav nav={site.nav} siteName={site.siteName} />
      <section className="showcase-hero">
        <div>
          <p className="eyebrow">Studio</p>
          <h1>{page.title}</h1>
        </div>
        <p className="lede">{site.tagline}</p>
      </section>
      <section className="showcase-card">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{page.body}</ReactMarkdown>
      </section>
      <ChatWidget enabled={site.chatWidgetEnabled} />
    </main>
  );
}

export default async function SitePage({ params }: PageProps) {
  runMigrations();
  const { slug } = await params;
  const path = pathFromSlug(slug);
  const site = getSiteConfig();
  const page = getPageBySlug(path);
  const pages = listPages();

  if (!page) {
    notFound();
  }

  if (site.themeKey === "portfolio-editorial") {
    return <PortfolioEditorial page={page} site={site} />;
  }

  if (site.themeKey === "portfolio-showcase") {
    return <PortfolioShowcase page={page} site={site} />;
  }

  if (site.themeKey === "portfolio-classic" || runtimeConfig.templateKey === "portfolio-site") {
    return <PortfolioClassic page={page} site={site} />;
  }

  return <DocsLayout page={page} pages={pages} site={site} />;
}
