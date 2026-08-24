"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiHome, FiInfo, FiHelpCircle, FiArrowLeft } from 'react-icons/fi';

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen bg-gray-900 text-white overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/one.jpg')" }} // Assuming the same background image
      >
        <div className="absolute inset-0 bg-black opacity-70"></div> 
      </div>

      {/* Header */}
      <header className="relative z-10 bg-blue-900/80 backdrop-blur-sm shadow-lg">
        <nav className="container mx-auto flex items-center justify-between p-4">
          <div className="flex items-center space-x-2">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.592 1M12 8c-.112 0-.224.016-.335.035M2.004 15.197a4.5 4.5 0 011.026-.06C6.11 14.885 8.761 14 12 14c3.239 0 5.89.884 8.97.944a4.5 4.5 0 011.026.06l-.412 1.633a9.75 9.75 0 01-18.128 0l-.412-1.633zM12 21c-3.132 0-6.104-.633-8.875-1.761M12 21c3.132 0 6.104-.633 8.875-1.761M12 21v-3"></path></svg>
            <span className="text-xl font-bold">DEEPSEQ</span>
          </div>
          <div className="flex space-x-6">
            <Link href="/" className="flex items-center hover:text-blue-200"><FiHome className="mr-1"/>Home</Link>
            <Link href="/about" className="flex items-center text-blue-300 font-semibold border-b-2 border-blue-300 pb-1"><FiInfo className="mr-1"/>About us</Link>
            <Link href="/help" className="flex items-center hover:text-blue-200"><FiHelpCircle className="mr-1"/>Help</Link>
          </div>
        </nav>
      </header>
      
      {/* Back Arrow */}
      <button onClick={() => router.back()} className="absolute top-24 left-8 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/75">
          <FiArrowLeft size={20} />
      </button>

      {/* Main Content */}
      <main className="relative z-10 flex items-center justify-center min-h-[calc(100vh-64px)] p-4">
        <div className="container mx-auto max-w-4xl">
          {/* "About Us" Title above the card */}
          <h1 className="text-5xl font-bold text-white mb-6">About Us</h1>
          
          {/* Content Card */}
          <div className="w-full rounded-lg bg-black/50 p-8 text-white shadow-2xl backdrop-blur-md">
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
          </div>
        </div>
      </main>
    </div>
  );
}