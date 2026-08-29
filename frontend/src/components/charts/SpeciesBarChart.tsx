"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TOOLTIP_STYLE } from './chartTheme';

export type SpeciesChartDatum = {
  species: string;
  label: string;
  totalCount: number;
  avgConfidence: number;
};

/** Recharts pulls in a real chunk of JS -- kept out of the analytics page's
 * initial bundle via next/dynamic(..., { ssr: false }) at the call site,
 * same lazy pattern as the globe/ocean scenes. */
export default function SpeciesBarChart({ data }: { data: SpeciesChartDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 42)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
        <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          stroke="#94a3b8"
          fontSize={12}
          width={150}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={{ color: '#94a3b8' }}
          formatter={
            ((value: any, _name: any, entry: any) => [
              `${value} reads · ${entry.payload.avgConfidence}% avg. confidence`,
              entry.payload.species,
            ]) as any
          }
          labelFormatter={() => ''}
        />
        <Bar dataKey="totalCount" fill="#34d399" radius={[0, 6, 6, 0]} animationDuration={700} />
      </BarChart>
    </ResponsiveContainer>
  );
}
