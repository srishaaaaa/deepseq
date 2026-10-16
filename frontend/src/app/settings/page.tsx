"use client";

import { useEffect, useState } from 'react';
import { FiCheck, FiTrash2 } from 'react-icons/fi';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import { Button } from '@/components/ui/Button';
import { useMotion, type MotionPref, type QualityPref } from '@/lib/motion';
import { hasWebGL } from '@/lib/webgl';
import { RESULT_KEY, SEQUENCES_KEY, formatBytes } from '@/lib/analysis';

// Every setting here is a browser-side preference. Nothing is sent to the
// analysis service or stored in your account.

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-full border border-line bg-abyss/50 p-1">
      {options.map(([v, l]) => {
        const active = v === value;
        return (
          <button
            key={v}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(v)}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors duration-300 ${active ? 'bg-biolum text-abyss' : 'text-mute hover:text-ink'}`}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}

function Row({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-b border-line/70 py-6 last:border-0 md:flex-row md:items-center md:justify-between">
      <div className="max-w-md">
        <h3 className="font-medium">{title}</h3>
        <p className="mt-1 text-sm text-mute">{body}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { pref, setPref, quality, setQuality, autoLite, reduced } = useMotion();
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [stored, setStored] = useState<{ result: number; seqs: number }>({ result: 0, seqs: 0 });
  const [cleared, setCleared] = useState(false);

  const measure = () => {
    try {
      setStored({ result: localStorage.getItem(RESULT_KEY)?.length ?? 0, seqs: localStorage.getItem(SEQUENCES_KEY)?.length ?? 0 });
    } catch {}
  };
  useEffect(() => { setWebgl(hasWebGL()); measure(); }, []);

  const clearLocal = () => {
    try {
      localStorage.removeItem(RESULT_KEY);
      localStorage.removeItem(SEQUENCES_KEY);
    } catch {}
    measure();
    setCleared(true);
  };

  return (
    <WorkspaceShell title="Settings" subtitle="Display and device preferences for this browser">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="panel px-6" aria-labelledby="disp">
          <h2 id="disp" className="pt-6 text-lg font-medium">Display &amp; motion</h2>
          <Row title="Motion" body={`Reduce ambient particles, cursor trails, globe rotation and transitions. Currently: ${reduced ? 'reduced' : 'full'}.`}>
            <Segmented<MotionPref> label="Motion" value={pref} onChange={setPref} options={[['system', 'System'], ['reduced', 'Reduced'], ['full', 'Full']]} />
          </Row>
          <Row
            title="3D quality"
            body={`Low uses fewer particles and organisms and a lower pixel ratio. Auto picks ${autoLite ? 'Low' : 'High'} on this device.`}
          >
            <Segmented<QualityPref> label="3D quality" value={quality} onChange={setQuality} options={[['auto', 'Auto'], ['low', 'Low'], ['high', 'High']]} />
          </Row>
          <Row title="WebGL support" body="3D views fall back to static illustrations when WebGL is unavailable.">
            <span className="font-mono text-sm">{webgl === null ? 'Checking…' : webgl ? 'Available' : 'Unavailable — using fallbacks'}</span>
          </Row>
        </section>

        <section className="panel px-6" aria-labelledby="data">
          <h2 id="data" className="pt-6 text-lg font-medium">Data on this device</h2>
          <Row
            title="Cached analysis"
            body={`Your latest result (${formatBytes(stored.result)}) and uploaded sequences (${formatBytes(stored.seqs)}) are kept in this browser so pages can share them. Saved history in your account is not affected.`}
          >
            <Button variant="danger" onClick={clearLocal} disabled={!stored.result && !stored.seqs}>
              {cleared && !stored.result && !stored.seqs ? <><FiCheck aria-hidden /> Cleared</> : <><FiTrash2 aria-hidden /> Clear</>}
            </Button>
          </Row>
        </section>
      </div>
    </WorkspaceShell>
  );
}
