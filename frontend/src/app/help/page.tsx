"use client";

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { FiArrowLeft, FiHelpCircle } from 'react-icons/fi';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';

const OceanScene = dynamic(() => import('@/components/ocean/OceanScene'), { ssr: false });

export default function HelpPage() {
  return (
    <div className="relative min-h-screen bg-brand-950 text-white p-8">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-950 via-brand-900 to-brand-950" />
        <div className="absolute -top-32 right-1/4 h-[24rem] w-[24rem] rounded-full bg-cyan-500/[0.06] blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 h-[22rem] w-[22rem] rounded-full bg-violet-500/[0.06] blur-[110px]" />
      </div>
      <div className="pointer-events-none fixed inset-0 z-[1] opacity-40">
        <OceanScene variant="light" fish />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto animate-fade-in">
        <Link
          href="/"
          className="inline-flex items-center text-brand-300 hover:text-brand-200 transition-colors mb-8"
        >
          <FiArrowLeft className="mr-2" /> Back to Home
        </Link>

        <PageHeader title="Help" icon={<FiHelpCircle />} />

        <Card padding="lg" className="border-white/10 bg-white/[0.03]">
          <div className="space-y-4 text-gray-300">
            <p>
              <strong className="text-white">1. Upload a sequence file.</strong> Go to the Upload
              page and provide a .fasta or .fastq file. No file handy? Use the sample file
              provided on that page.
            </p>
            <p>
              <strong className="text-white">2. Review species on the globe.</strong> Once
              analysis finishes, you&apos;ll see identified species plotted on the globe with
              heatmaps of where they were detected.
            </p>
            <p>
              <strong className="text-white">3. Download your report.</strong> From the globe
              view, click &quot;View Analysis Insights&quot; to see charts and export a PDF
              summary.
            </p>
            <p>
              Having trouble? Make sure the analysis backend is running and reachable — see the
              project README for setup instructions.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
