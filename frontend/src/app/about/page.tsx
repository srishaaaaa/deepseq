"use client";

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { FiHome, FiInfo, FiHelpCircle, FiArrowLeft } from 'react-icons/fi';

const OceanScene = dynamic(() => import('@/components/ocean/OceanScene'), { ssr: false });

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen bg-brand-950 text-white overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-950 via-brand-900 to-brand-950" />
        <div className="absolute -top-32 left-1/3 h-[26rem] w-[26rem] rounded-full bg-cyan-500/[0.06] blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[22rem] w-[22rem] rounded-full bg-violet-500/[0.06] blur-[110px]" />
      </div>
      <div className="pointer-events-none fixed inset-0 z-[1] opacity-50">
        <OceanScene variant="light" fish />
      </div>

      {/* Header */}
      <header className="relative z-10 bg-brand-900/80 backdrop-blur-sm shadow-lg">
        <nav className="container mx-auto flex items-center justify-between p-4">
          <div className="flex items-center space-x-2">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.592 1M12 8c-.112 0-.224.016-.335.035M2.004 15.197a4.5 4.5 0 011.026-.06C6.11 14.885 8.761 14 12 14c3.239 0 5.89.884 8.97.944a4.5 4.5 0 011.026.06l-.412 1.633a9.75 9.75 0 01-18.128 0l-.412-1.633zM12 21c-3.132 0-6.104-.633-8.875-1.761M12 21c3.132 0 6.104-.633 8.875-1.761M12 21v-3"></path></svg>
            <span className="text-xl font-bold">DEEPSEQ</span>
          </div>
          <div className="flex space-x-6">
            <Link href="/" className="flex items-center transition-colors hover:text-brand-200"><FiHome className="mr-1"/>Home</Link>
            <Link href="/about" className="flex items-center text-brand-300 font-semibold border-b-2 border-brand-300 pb-1"><FiInfo className="mr-1"/>About us</Link>
            <Link href="/help" className="flex items-center transition-colors hover:text-brand-200"><FiHelpCircle className="mr-1"/>Help</Link>
          </div>
        </nav>
      </header>

      {/* Back Arrow */}
      <button
        onClick={() => router.back()}
        className="absolute top-24 left-8 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
      >
          <FiArrowLeft size={20} />
      </button>

      {/* Main Content */}
      <main className="relative z-10 flex items-center justify-center min-h-[calc(100vh-64px)] p-4">
        <div className="container mx-auto max-w-4xl animate-fade-in">
          {/* "About Us" Title above the card */}
          <h1 className="text-5xl font-bold text-white mb-6">About Us</h1>

          {/* Content Card */}
          <div className="w-full rounded-(--radius-card) bg-black/50 p-8 text-white shadow-(--shadow-elevated) backdrop-blur-md">
            <h2 className="text-3xl font-bold mb-4 border-b-2 border-cyan-400/50 pb-2">
              What is DeepSeq?
            </h2>
            <p className="text-gray-300 leading-relaxed">
              Deepseq is a research-driven platform that connects environmental DNA (eDNA) data with marine life. Our goal is to unlock the mysteries of the ocean by linking genetic information to known fish species and identifying signals of undiscovered organisms.
            </p>

            <h2 className="text-3xl font-bold mt-8 mb-4 border-b-2 border-cyan-400/50 pb-2">
              What We Do
            </h2>
            <ul className="list-disc list-inside space-y-2 text-gray-300 leading-relaxed">
              <li>Use advanced AI pipelines to analyze DNA from water samples.</li>
              <li>Map species distribution on interactive, 3D-enabled global maps.</li>
              <li>Flag unknown DNA sequences to highlight potential new species.</li>
            </ul>

            <p className="text-gray-300 leading-relaxed mt-6">
              Our oceans hold countless mysteries, with many species still hidden from science. By combining AI, genomics, and visualization, DeepSeq provides researchers and conservationists with powerful tools to track marine life, monitor ecosystems, and accelerate the discovery of new biodiversity.
            </p>

            <h2 className="text-3xl font-bold mt-8 mb-4 border-b-2 border-cyan-400/50 pb-2">
              Credits
            </h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              The animated shark and fish models in the homepage ocean scene are
              adapted from the{' '}
              <a
                href="https://github.com/BabylonJS/MeshesLibrary"
                target="_blank"
                rel="noreferrer noopener"
                className="text-cyan-300 hover:underline"
              >
                Babylon.js Meshes Library
              </a>
              , licensed{' '}
              <a
                href="http://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noreferrer noopener"
                className="text-cyan-300 hover:underline"
              >
                CC BY 4.0
              </a>
              .
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
