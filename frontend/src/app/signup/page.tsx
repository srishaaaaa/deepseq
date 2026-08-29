"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiEye, FiEyeOff, FiCheckCircle } from 'react-icons/fi';
import { useState, FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { signup } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import AuthLayout from '@/components/auth/AuthLayout';
import FormError from '@/components/motion/FormError';
import { StaggerGroup, StaggerItem } from '@/components/motion/Stagger';

export default function SignupPage() {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
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
      const data = await signup(username, email, password);
      if (!data.session) {
        // Supabase's "Confirm email" setting is on -- no session until the
        // user clicks the link in their inbox. Don't pretend they're logged in.
        setNeedsConfirmation(true);
        setIsLoading(false);
        return;
      }
      router.push('/upload');
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      {/* Crossfade between the form and the "check your email" screen --
          real state change (whether Supabase returned a session), just no
          longer an abrupt swap. */}
      <AnimatePresence mode="wait">
        {needsConfirmation ? (
          <motion.div
            key="confirmation"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="text-center"
          >
            <FiCheckCircle className="mx-auto mb-4 h-12 w-12 text-success-400" />
            <h2 className="mb-2 text-2xl font-semibold text-white">Check your email</h2>
            <p className="text-gray-400">
              We&apos;ve sent a confirmation link to your email. Click it, then come back and log in.
            </p>
            <Button href="/login" className="mt-6 rounded-(--radius-pill)">
              Go to Login
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <StaggerGroup>
              <StaggerItem>
                <p className="mb-2 inline-flex items-center rounded-(--radius-pill) border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium tracking-wide text-cyan-200">
                  Join DeepSeq
                </p>
                <h1 className="mb-6 text-2xl font-semibold text-white">Create your account</h1>
              </StaggerItem>

              <StaggerItem>
                <form className="space-y-4" onSubmit={handleSignup}>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    label="Username"
                    placeholder="Choose a username"
                  />

                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    label="Email"
                    placeholder="Enter your email"
                  />

                  <Input
                    id="password"
                    name="password"
                    type={passwordVisible ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    label="Password"
                    placeholder="Create a password"
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

                  <Input
                    id="confirm-password"
                    name="confirm-password"
                    type={confirmPasswordVisible ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    label="Confirm Password"
                    placeholder="Confirm your password"
                    rightSlot={
                      <button
                        type="button"
                        onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                        aria-label={confirmPasswordVisible ? 'Hide password' : 'Show password'}
                        className="text-gray-400 hover:text-gray-300"
                      >
                        {confirmPasswordVisible ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                      </button>
                    }
                  />

                  <FormError message={error} />

                  <div className="pt-2">
                    <Button type="submit" loading={isLoading} fullWidth className="rounded-(--radius-pill)">
                      {isLoading ? 'Creating account...' : 'Create Account'}
                    </Button>
                  </div>
                </form>

                <p className="mt-6 text-center text-sm text-gray-400">
                  Already have an account?{' '}
                  <Link href="/login" className="font-medium text-cyan-300 transition-colors hover:text-cyan-200">Login</Link>
                </p>
              </StaggerItem>
            </StaggerGroup>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}
