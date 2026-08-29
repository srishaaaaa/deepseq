"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { FiSettings, FiSave, FiCheck } from 'react-icons/fi';
import {
  fetchSettings,
  saveSettings,
  isLoggedIn,
  logout,
  getCurrentUser,
  getUsername,
  UserSettings,
} from '@/lib/api';
import AppNavbar from '@/components/nav/AppNavbar';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import LoadingState from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import { Range } from '@/components/ui/Input';
import { useTheme } from '@/components/theme/ThemeProvider';

const OceanScene = dynamic(() => import('@/components/ocean/OceanScene'), { ssr: false });

const EXPORT_FORMATS: { value: UserSettings['default_export_format']; label: string }[] = [
  { value: 'pdf', label: 'PDF Report' },
  { value: 'csv', label: 'CSV' },
  { value: 'geojson', label: 'GeoJSON' },
];

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
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
        const fetched = await fetchSettings();
        setSettings(fetched);
        setTheme(fetched.theme); // apply the account preference on load
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [router, setTheme]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      // `theme` is the live source of truth (it can also be flipped from the
      // navbar toggle while this page is open).
      await saveSettings({ ...settings, theme });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-brand-950 text-white">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-950 via-brand-900 to-brand-950" />
        <div className="absolute -top-32 left-1/4 h-[24rem] w-[24rem] rounded-full bg-cyan-500/[0.06] blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[22rem] w-[22rem] rounded-full bg-violet-500/[0.06] blur-[110px]" />
      </div>
      <div className="pointer-events-none fixed inset-0 z-[1] opacity-40">
        <OceanScene variant="light" fish />
      </div>

      <div className="relative z-10">
      <AppNavbar username={username} onLogout={handleLogout} />

      <div className="p-8">
        <div className="max-w-2xl mx-auto animate-fade-in">
          <PageHeader
            title="Settings"
            icon={<FiSettings />}
            subtitle={username ? `Signed in as ${username}` : undefined}
          />

          {loading ? (
            <LoadingState />
          ) : (
            <div className="space-y-6">
              {/* Confidence threshold */}
              <Card padding="lg">
                <h2 className="font-semibold mb-1">Classification Confidence Threshold</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Reads scoring below this similarity are labeled "Unclassified taxon" instead of
                  being assigned to a species. Lower it to see more (less certain) matches; raise it
                  to only trust strong matches. The backend's own default is 20%.
                </p>
                <Range
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings.confidence_threshold}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, confidence_threshold: parseFloat(e.target.value) }))
                  }
                  valueLabel={`${Math.round(settings.confidence_threshold * 100)}%`}
                />
              </Card>

              {/* Default export format */}
              <Card padding="lg">
                <h2 className="font-semibold mb-1">Default Export Format</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Used to pre-select the format when you export a report from the Report page.
                </p>
                <div className="flex gap-3">
                  {EXPORT_FORMATS.map((fmt) => (
                    <button
                      key={fmt.value}
                      onClick={() => setSettings((s) => ({ ...s, default_export_format: fmt.value }))}
                      className={`px-4 py-2 rounded-(--radius-control) text-sm border transition-colors ${
                        settings.default_export_format === fmt.value
                          ? 'bg-brand-500 border-brand-400'
                          : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                      }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </Card>

              {/* Theme */}
              <Card padding="lg">
                <h2 className="font-semibold mb-1">Theme</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Switches the interface between dark and light instantly. The choice is remembered
                  on this device and saved to your account when you press Save.
                </p>
                <div className="flex gap-3">
                  {(['dark', 'light'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setTheme(t);
                        setSettings((s) => ({ ...s, theme: t }));
                      }}
                      className={`px-4 py-2 rounded-(--radius-control) text-sm border capitalize transition-colors ${
                        theme === t
                          ? 'bg-brand-500 border-brand-400'
                          : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </Card>

              {error && <p className="text-danger-400 text-sm">{error}</p>}

              <Button onClick={handleSave} loading={saving} icon={saved ? <FiCheck className="text-success-300" /> : <FiSave />}>
                {saved ? 'Saved' : 'Save Settings'}
              </Button>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
