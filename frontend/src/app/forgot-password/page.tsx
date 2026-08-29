"use client";

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiCheckCircle } from 'react-icons/fi';
import { requestPasswordReset } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import AuthLayout from '@/components/auth/AuthLayout';

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
    <AuthLayout>
      {sent ? (
        <div className="animate-fade-in text-center">
          <FiCheckCircle className="mx-auto mb-4 h-12 w-12 text-success-400" />
          <h1 className="mb-2 text-2xl font-semibold">Check your email</h1>
          <p className="mb-6 text-gray-400">
            If an account exists for <span className="text-white">{email}</span>, we&apos;ve sent a link to reset your password.
          </p>
          <Button href="/login" icon={<FiArrowLeft />} className="rounded-(--radius-pill)">
            Back to Login
          </Button>
        </div>
      ) : (
        <>
          <p className="mb-2 inline-flex items-center rounded-(--radius-pill) border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium tracking-wide text-cyan-200">
            Password reset
          </p>
          <h1 className="mb-2 text-2xl font-semibold text-white">Reset your password</h1>
          <p className="mb-6 text-sm text-gray-400">
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

            <Button type="submit" loading={isLoading} fullWidth className="rounded-(--radius-pill)">
              {isLoading ? 'Sending...' : 'Send reset link'}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-gray-400">
            <Link href="/login" className="font-medium text-cyan-300 transition-colors hover:text-cyan-200">Back to Login</Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
