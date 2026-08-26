"use client";

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiCheckCircle } from 'react-icons/fi';
import { requestPasswordReset } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import Button from '@/components/ui/Button';

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
      <div className="w-full max-w-sm rounded-(--radius-card) bg-[#1F2937] p-8 shadow-(--shadow-elevated) animate-fade-in">
        {sent ? (
          <div className="text-center animate-fade-in">
            <FiCheckCircle className="mx-auto mb-4 h-12 w-12 text-success-400" />
            <h1 className="text-2xl font-semibold mb-2">Check your email</h1>
            <p className="text-gray-400 mb-6">
              If an account exists for <span className="text-white">{email}</span>, we&apos;ve sent a link to reset your password.
            </p>
            <Button href="/login" icon={<FiArrowLeft />}>
              Back to Login
            </Button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold mb-2 text-center">Reset your password</h1>
            <p className="text-gray-400 mb-6 text-center text-sm">
              Enter the email you signed up with and we&apos;ll send you a reset link.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                id="email"
                name="email"
                type="email"
                required
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />

              {error && <p className="text-sm text-danger-400">{error}</p>}

              <Button type="submit" loading={isLoading} fullWidth>
                {isLoading ? 'Sending...' : 'Send reset link'}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-gray-400">
              <Link href="/login" className="font-medium text-brand-400 hover:text-brand-300 transition-colors">Back to Login</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
