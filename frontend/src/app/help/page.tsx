import Link from 'next/link';
import { FiArrowLeft, FiHelpCircle } from 'react-icons/fi';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto animate-fade-in">
        <Link
          href="/"
          className="inline-flex items-center text-brand-300 hover:text-brand-200 transition-colors mb-8"
        >
          <FiArrowLeft className="mr-2" /> Back to Home
        </Link>

        <PageHeader title="Help" icon={<FiHelpCircle />} />

        <Card padding="lg">
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
