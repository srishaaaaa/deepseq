"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, FormEvent } from 'react';
import { signup } from '@/lib/api';
import AuthLayout, { Field, PasswordField } from '@/components/site/AuthLayout';
import { Button } from '@/components/ui/Button';

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const username = formData.get('username') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirm-password') as string;

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await signup(username, email, password);
      router.push('/upload');
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      image="/images/four.jpg"
      eyebrow="Join the expedition"
      title="Create your account"
      footer={<>Already have an account? <Link href="/login" className="text-biolum link-underline">Login</Link></>}
    >
      <form className="space-y-4" onSubmit={handleSignup}>
        <Field label="Username" id="username" type="text" required placeholder="Choose a username" autoComplete="username" />
        <Field label="Email" id="email" type="email" autoComplete="email" required placeholder="Enter your email" />
        <PasswordField label="Password" id="password" autoComplete="new-password" placeholder="Create a password" />
        <PasswordField label="Confirm Password" id="confirm-password" autoComplete="new-password" placeholder="Confirm your password" />
        {error && <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-ink">{error}</p>}
        <div className="pt-2">
          <Button type="submit" loading={isLoading} className="w-full">
            {isLoading ? 'Creating account...' : 'Create Account'}
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}
