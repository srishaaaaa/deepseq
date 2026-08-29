"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { useState, FormEvent } from 'react';
import { login } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import AuthLayout from '@/components/auth/AuthLayout';
import FormError from '@/components/motion/FormError';
import { StaggerGroup, StaggerItem } from '@/components/motion/Stagger';

export default function LoginPage() {
  const [passwordVisible, setPasswordVisible] = useState(false);
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
    <AuthLayout>
      <StaggerGroup>
        <StaggerItem>
          <p className="mb-2 inline-flex items-center rounded-(--radius-pill) border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium tracking-wide text-cyan-200">
            Welcome back
          </p>
          <h1 className="mb-6 text-2xl font-semibold text-white">Log in to your account</h1>
        </StaggerItem>

        <StaggerItem>
          <form className="space-y-5" onSubmit={handleLogin}>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              label="Email"
              placeholder="you@example.com"
            />

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-gray-300">Password</label>
                <Link href="/forgot-password" className="text-sm text-cyan-300 transition-colors hover:text-cyan-200">Forgot?</Link>
              </div>
              <Input
                id="password"
                name="password"
                type={passwordVisible ? 'text' : 'password'}
                autoComplete="current-password"
                required
                containerClassName="mt-1"
                placeholder="Enter your password"
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setPasswordVisible(!passwordVisible)}
                    aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                    className="text-gray-400 hover:text-gray-300"
                  >
                    {passwordVisible ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                  </button>
                }
              />
            </div>

            <FormError message={error} />

            <Button type="submit" loading={isLoading} fullWidth className="rounded-(--radius-pill)">
              {isLoading ? 'Logging in...' : 'Login now'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-medium text-cyan-300 transition-colors hover:text-cyan-200">Sign up</Link>
          </p>
        </StaggerItem>
      </StaggerGroup>
    </AuthLayout>
  );
}
