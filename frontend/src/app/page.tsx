import SiteNav from '@/components/site/SiteNav';
import Footer from '@/components/site/Footer';
import Hero from '@/components/landing/Hero';
import DnaUniverse from '@/components/landing/DnaUniverse';
import Taxonomy from '@/components/landing/Taxonomy';
import { Biodiversity, Engine, FinalCta, InvisibleOcean, WorkspacePreview, Workflow } from '@/components/landing/Story';

export default function HomePage() {
  return (
    <>
      <SiteNav />
      <main id="main">
        <Hero />
        <InvisibleOcean />
        <Workflow />
        <DnaUniverse />
        <Taxonomy />
        <Biodiversity />
        <Engine />
        <WorkspacePreview />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
