"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiEye, FiEyeOff, FiArrowLeft, FiCheckCircle } from 'react-icons/fi';
import { useState, FormEvent } from 'react';
import { signup } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import Button from '@/components/ui/Button';

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
    <div className="flex h-screen w-screen bg-[#111827]"> {/* Dark background */}
      {/* Left side: Image */}
      <div
        className="hidden lg:block lg:w-1/2 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/three.jpg')" }}
      >
        {/* Back Arrow to Home */}
        <Link href="/" className="absolute top-8 left-8 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400">
          <FiArrowLeft size={20} />
        </Link>
      </div>

      {/* Right side: Signup Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Logo at the top */}
          <div className="mb-10 text-center text-white">
            <h1 className="text-5xl font-bold">DeepSeq</h1>
          </div>

          {/* Form container */}
          <div className="rounded-(--radius-card) bg-[#1F2937] p-8 shadow-(--shadow-elevated)">
            {needsConfirmation ? (
              <div className="text-center animate-fade-in">
                <FiCheckCircle className="mx-auto mb-4 h-12 w-12 text-success-400" />
                <h2 className="mb-2 text-2xl font-semibold text-white">Check your email</h2>
                <p className="text-gray-400">
                  We&apos;ve sent a confirmation link to your email. Click it, then come back and log in.
                </p>
                <Button href="/login" className="mt-6">
                  Go to Login
                </Button>
              </div>
            ) : (
            <>
            <h2 className="mb-2 text-2xl font-semibold text-white">Create your account</h2>

            <form className="mt-6 space-y-4" onSubmit={handleSignup}>
              <Input
                id="username"
                name="username"
                type="text"
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

              {error && <p className="text-sm text-danger-400">{error}</p>}

              <div className="pt-2">
                <Button type="submit" loading={isLoading} fullWidth>
                  {isLoading ? 'Creating account...' : 'Create Account'}
                </Button>
              </div>
            </form>

            {/* Login Link */}
            <p className="mt-6 text-center text-sm text-gray-400">
              Already Have An Account?{' '}
              <Link href="/login" className="font-medium text-brand-400 hover:text-brand-300 transition-colors">Login</Link>
            </p>
            </>
            )}
          </div>

          {/* Logo at the bottom */}
          <div className="mt-8 flex justify-end">
             <svg className="h-6 w-6 text-gray-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.592 1M12 8c-.112 0-.224.016-.335.035M2.004 15.197a4.5 4.5 0 011.026-.06C6.11 14.885 8.761 14 12 14c3.239 0 5.89.884 8.97.944a4.5 4.5 0 011.026.06l-.412 1.633a9.75 9.75 0 01-18.128 0l-.412-1.633zM12 21c-3.132 0-6.104-.633-8.875-1.761M12 21c3.132 0 6.104-.633 8.875-1.761M12 21v-3"></path></svg>
             <span className="text-md font-bold text-gray-400">DEEPSEQ</span>
          </div>
        </div>
      </div>
    </div>
  );
}