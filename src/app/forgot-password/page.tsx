"use client";

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiLoader, FiCheckCircle } from 'react-icons/fi';
import { requestPasswordReset } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      await requestPasswordReset(email, redirectTo);
      setSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#111827] text-white">
      <div className="w-full max-w-sm rounded-lg bg-[#1F2937] p-8 shadow-2xl">
        {sent ? (
          <div className="text-center">
            <FiCheckCircle className="mx-auto mb-4 h-12 w-12 text-green-400" />
            <h1 className="text-2xl font-semibold mb-2">Check your email</h1>
            <p className="text-gray-400 mb-6">
              If an account exists for <span className="text-white">{email}</span>, we&apos;ve sent a link to reset your password.
            </p>
            <Link href="/login" className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500">
              <FiArrowLeft className="mr-2" /> Back to Login
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold mb-2 text-center">Reset your password</h1>
            <p className="text-gray-400 mb-6 text-center text-sm">
              Enter the email you signed up with and we&apos;ll send you a reset link.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="text-sm font-medium text-gray-300">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1 block w-full appearance-none rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:cursor-not-allowed disabled:bg-gray-500"
              >
                {isLoading && <FiLoader className="animate-spin mr-2" />}
                {isLoading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-gray-400">
              <Link href="/login" className="font-medium text-blue-400 hover:text-blue-300">Back to Login</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
