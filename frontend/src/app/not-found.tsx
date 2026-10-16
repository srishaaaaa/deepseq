import SiteNav from '@/components/site/SiteNav';
import { LinkButton } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <>
      <SiteNav />
      <main id="main" className="flex min-h-[100svh] flex-col items-center justify-center px-6 text-center">
        <p className="eyebrow">Signal lost · 404</p>
        <h1 className="mt-5 text-[clamp(2.4rem,6vw,4.4rem)] font-semibold leading-none">Nothing at this depth.</h1>
        <p className="mt-5 max-w-md text-mute">The page you were looking for drifted out of range.</p>
        <div className="mt-10 flex gap-3">
          <LinkButton href="/">Return to surface</LinkButton>
          <LinkButton href="/dashboard" variant="secondary">Open workspace</LinkButton>
        </div>
      </main>
    </>
  );
}
