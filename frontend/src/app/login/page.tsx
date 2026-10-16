"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, FormEvent } from 'react';
import { login } from '@/lib/api';
import AuthLayout, { Field, PasswordField } from '@/components/site/AuthLayout';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      await login(email, password);
      router.push('/upload');
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      image="/images/three.jpg"
      eyebrow="Welcome back"
      title="Login to your account"
      footer={<>Don&apos;t have an account? <Link href="/signup" className="text-biolum link-underline">Sign up</Link></>}
    >
      <form className="space-y-5" onSubmit={handleLogin} noValidate={false}>
        <Field label="Email" id="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        <PasswordField
          label="Password"
          id="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          aside={<Link href="/forgot-password" className="text-xs text-biolum link-underline">Forgot?</Link>}
        />
        {error && <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-ink">{error}</p>}
        <Button type="submit" loading={isLoading} className="w-full">
          {isLoading ? 'Logging in...' : 'Login now'}
        </Button>
      </form>
    </AuthLayout>
  );
}
