"use client";

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { FiLoader, FiCheckCircle, FiEye, FiEyeOff } from 'react-icons/fi';
import { updatePassword } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import AuthLayout from '@/components/auth/AuthLayout';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Clicking the emailed link redirects here with a recovery token in the
    // URL; supabase-js exchanges it for a session automatically and fires
    // this event once that's done.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });

    // If the session is already established (e.g. page reload after the
    // exchange already happened), don't leave the user stuck waiting.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!ready) setInvalidLink(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [ready]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    try {
      await updatePassword(password);
      setDone(true);
      setTimeout(() => router.push('/upload'), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      {done ? (
        <div className="animate-fade-in text-center">
          <FiCheckCircle className="mx-auto mb-4 h-12 w-12 text-success-400" />
          <h1 className="mb-2 text-2xl font-semibold">Password updated</h1>
          <p className="text-gray-400">Redirecting you now...</p>
        </div>
      ) : invalidLink && !ready ? (
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-semibold">Link expired or invalid</h1>
          <p className="mb-6 text-gray-400">Request a new password reset link and try again.</p>
          <Button href="/forgot-password" className="rounded-(--radius-pill)">
            Request new link
          </Button>
        </div>
      ) : !ready ? (
        <div className="flex flex-col items-center py-8">
          <FiLoader className="mb-3 h-8 w-8 animate-spin text-cyan-300" />
          <p className="text-gray-400">Verifying reset link...</p>
        </div>
      ) : (
        <>
          <h1 className="mb-6 text-2xl font-semibold text-center text-white">Set a new password</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="password"
              type={passwordVisible ? 'text' : 'password'}
              autoComplete="new-password"
              required
              label="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              rightSlot={
                <button
                  type="button"
                  onClick={() => setPasswordVisible(!passwordVisible)}
                  aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                  className="text-gray-400 hover:text-gray-300"
                >
                  {passwordVisible ? <FiEyeOff /> : <FiEye />}
                </button>
              }
            />
            <Input
              id="confirm-password"
              type={passwordVisible ? 'text' : 'password'}
              autoComplete="new-password"
              required
              label="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            {error && <p className="text-sm text-danger-400">{error}</p>}

            <Button type="submit" loading={isLoading} fullWidth className="rounded-(--radius-pill)">
              {isLoading ? 'Updating...' : 'Update password'}
            </Button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
