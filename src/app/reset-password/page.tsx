"use client";

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiLoader, FiCheckCircle, FiEye, FiEyeOff } from 'react-icons/fi';
import { updatePassword } from '@/lib/api';
import { supabase } from '@/lib/supabase';

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
    <div className="flex h-screen w-screen items-center justify-center bg-[#111827] text-white">
      <div className="w-full max-w-sm rounded-lg bg-[#1F2937] p-8 shadow-2xl">
        {done ? (
          <div className="text-center">
            <FiCheckCircle className="mx-auto mb-4 h-12 w-12 text-green-400" />
            <h1 className="text-2xl font-semibold mb-2">Password updated</h1>
            <p className="text-gray-400">Redirecting you now...</p>
          </div>
        ) : invalidLink && !ready ? (
          <div className="text-center">
            <h1 className="text-2xl font-semibold mb-2">Link expired or invalid</h1>
            <p className="text-gray-400 mb-6">Request a new password reset link and try again.</p>
            <Link href="/forgot-password" className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500">
              Request new link
            </Link>
          </div>
        ) : !ready ? (
          <div className="flex flex-col items-center py-8">
            <FiLoader className="animate-spin h-8 w-8 mb-3 text-blue-400" />
            <p className="text-gray-400">Verifying reset link...</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold mb-6 text-center">Set a new password</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="text-sm font-medium text-gray-300">New Password</label>
                <div className="relative mt-1">
                  <input
                    id="password"
                    type={passwordVisible ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full appearance-none rounded-md border border-gray-600 bg-gray-700 px-3 py-2 pr-10 text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  />
                  <button type="button" onClick={() => setPasswordVisible(!passwordVisible)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
                    {passwordVisible ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirm-password" className="text-sm font-medium text-gray-300">Confirm New Password</label>
                <input
                  id="confirm-password"
                  type={passwordVisible ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 block w-full appearance-none rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:cursor-not-allowed disabled:bg-gray-500"
              >
                {isLoading && <FiLoader className="animate-spin mr-2" />}
                {isLoading ? 'Updating...' : 'Update password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
