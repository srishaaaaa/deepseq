"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiLoader, FiSettings, FiSave, FiCheck, FiLogOut } from 'react-icons/fi';
import {
  fetchSettings,
  saveSettings,
  isLoggedIn,
  logout,
  getCurrentUser,
  getUsername,
  UserSettings,
} from '@/lib/api';

const EXPORT_FORMATS: { value: UserSettings['default_export_format']; label: string }[] = [
  { value: 'pdf', label: 'PDF Report' },
  { value: 'csv', label: 'CSV' },
  { value: 'geojson', label: 'GeoJSON' },
];

export default function SettingsPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [settings, setSettings] = useState<UserSettings>({
    confidence_threshold: 0.2,
    default_export_format: 'pdf',
    theme: 'dark',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const loggedIn = await isLoggedIn();
      if (!loggedIn) {
        router.replace('/login');
        return;
      }
      const user = await getCurrentUser();
      setUsername(getUsername(user));

      try {
        setSettings(await fetchSettings());
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await saveSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/dashboard" className="inline-flex items-center text-blue-300 hover:text-blue-200">
            <FiArrowLeft className="mr-2" /> Back to Dashboard
          </Link>
          <button onClick={handleLogout} className="inline-flex items-center text-gray-400 hover:text-red-300 text-sm">
            <FiLogOut className="mr-1" /> Log out
          </button>
        </div>

        <h1 className="text-3xl font-bold mb-2 flex items-center">
          <FiSettings className="mr-3 text-blue-300" /> Settings
        </h1>
        {username && <p className="text-gray-400 mb-8">Signed in as {username}</p>}

        {loading ? (
          <div className="flex items-center text-gray-400">
            <FiLoader className="animate-spin mr-2" /> Loading...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Confidence threshold */}
            <section className="rounded-lg bg-gray-800 p-6">
              <h2 className="font-semibold mb-1">Classification Confidence Threshold</h2>
              <p className="text-sm text-gray-500 mb-4">
                Reads scoring below this similarity are labeled "Unclassified taxon" instead of
                being assigned to a species. Lower it to see more (less certain) matches; raise it
                to only trust strong matches. The backend's own default is 20%.
              </p>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings.confidence_threshold}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, confidence_threshold: parseFloat(e.target.value) }))
                  }
                  className="flex-1"
                />
                <span className="w-14 text-right font-mono text-sm">
                  {Math.round(settings.confidence_threshold * 100)}%
                </span>
              </div>
            </section>

            {/* Default export format */}
            <section className="rounded-lg bg-gray-800 p-6">
              <h2 className="font-semibold mb-1">Default Export Format</h2>
              <p className="text-sm text-gray-500 mb-4">
                Used to pre-select the format when you export a report from the Report page.
              </p>
              <div className="flex gap-3">
                {EXPORT_FORMATS.map((fmt) => (
                  <button
                    key={fmt.value}
                    onClick={() => setSettings((s) => ({ ...s, default_export_format: fmt.value }))}
                    className={`px-4 py-2 rounded-md text-sm border transition ${
                      settings.default_export_format === fmt.value
                        ? 'bg-blue-600 border-blue-500'
                        : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                    }`}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Theme */}
            <section className="rounded-lg bg-gray-800 p-6">
              <h2 className="font-semibold mb-1">Theme</h2>
              <p className="text-sm text-gray-500 mb-4">
                Saved to your account. The interface is dark-first today — light mode is stored
                as a preference for a future release.
              </p>
              <div className="flex gap-3">
                {(['dark', 'light'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setSettings((s) => ({ ...s, theme: t }))}
                    className={`px-4 py-2 rounded-md text-sm border capitalize transition ${
                      settings.theme === t
                        ? 'bg-blue-600 border-blue-500'
                        : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </section>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
            >
              {saving ? (
                <FiLoader className="animate-spin mr-2" />
              ) : saved ? (
                <FiCheck className="mr-2 text-green-300" />
              ) : (
                <FiSave className="mr-2" />
              )}
              {saved ? 'Saved' : 'Save Settings'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
