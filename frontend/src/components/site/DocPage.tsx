import SiteNav from './SiteNav';
import Footer from './Footer';

/** Editorial page frame shared by Research and Documentation. */
export default function DocPage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <>
      <SiteNav />
      <main id="main" className="mx-auto max-w-4xl px-6 pb-28 pt-36">
        <p className="eyebrow" style={{ animation: 'rise 0.8s var(--ease-abyss) both' }}>{eyebrow}</p>
        <h1 className="mt-5 text-[clamp(2.4rem,6vw,4.4rem)] font-semibold leading-[1]" style={{ animation: 'rise 0.9s 0.1s var(--ease-abyss) both' }}>
          {title}
        </h1>
        {intro && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-mute" style={{ animation: 'rise 0.9s 0.2s var(--ease-abyss) both' }}>{intro}</p>}
        <div className="mt-16 space-y-8">{children}</div>
      </main>
      <Footer />
    </>
  );
}

export function DocSection({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} data-reveal className="panel scroll-mt-28 p-7 sm:p-9">
      <h2 className="text-2xl font-medium">{title}</h2>
      <div className="mt-4 space-y-4 leading-relaxed text-mute [&_strong]:font-medium [&_strong]:text-ink">{children}</div>
    </section>
  );
}
