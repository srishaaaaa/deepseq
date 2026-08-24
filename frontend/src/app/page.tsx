import Link from 'next/link';
import { FiHome, FiInfo, FiHelpCircle, FiArrowRight } from 'react-icons/fi';

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-gray-900 text-white overflow-hidden">
      {/* Background Image Container */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/one.jpg')" }}
      >
        <div className="absolute inset-0 bg-black opacity-50"></div> 
      </div>

      {/* Header / Navbar */}
      <header className="relative z-10 bg-blue-900 bg-opacity-80 backdrop-blur-sm shadow-lg">
        <nav className="container mx-auto flex items-center justify-between p-4">
          
          {/* --- MODIFIED: Logo is now a clickable link to "/" --- */}
          <Link href="/" className="flex items-center space-x-2">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.592 1M12 8c-.112 0-.224.016-.335.035M2.004 15.197a4.5 4.5 0 011.026-.06C6.11 14.885 8.761 14 12 14c3.239 0 5.89.884 8.97.944a4.5 4.5 0 011.026.06l-.412 1.633a9.75 9.75 0 01-18.128 0l-.412-1.633zM12 21c-3.132 0-6.104-.633-8.875-1.761M12 21c3.132 0 6.104-.633 8.875-1.761M12 21v-3"></path></svg>
            <span className="text-xl font-bold">DEEPSEQ</span>
          </Link>

          {/* --- MODIFIED: Navigation links with "Home" as active --- */}
          <div className="flex space-x-6">
            <Link href="/" className="flex items-center pb-1 font-semibold text-blue-300 border-b-2 border-blue-300"><FiHome className="mr-1"/>Home</Link>
            <Link href="/about" className="flex items-center hover:text-blue-200"><FiInfo className="mr-1"/>About us</Link>
            <Link href="/help" className="flex items-center hover:text-blue-200"><FiHelpCircle className="mr-1"/>Help</Link>
          </div>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-4">
        <div className="bg-white rounded-lg p-8 md:p-12 text-center max-w-lg w-full shadow-xl">
          <h1 className="text-5xl font-extrabold text-gray-800 leading-tight mb-6">DeepSeq</h1>
          <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
            AI-powered platform that links environmental DNA (eDNA) to known
            fish and marine species. It also flags unknown DNA signatures,
            revealing insights into undiscovered biodiversity in the deep sea.
          </p>
          <Link href="/login" className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-blue-600 text-white font-semibold text-lg hover:bg-blue-700 transition-all shadow-lg">
            Try it <FiArrowRight className="ml-3 h-6 w-6" />
          </Link>
        </div>
      </main>
    </div>
  );
}