"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TOOLTIP_STYLE } from './chartTheme';

export type ReadsChartDatum = {
  filename: string;
  label: string;
  reads: number;
};

export default function ReadsBarChart({ data }: { data: ReadsChartDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 38)}>
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
          formatter={((value: any) => [`${value} reads`, '']) as any}
          labelFormatter={(_, payload: any) => payload?.[0]?.payload?.filename ?? ''}
        />
        <Bar dataKey="reads" fill="#60a5fa" radius={[0, 6, 6, 0]} animationDuration={700} />
      </BarChart>
    </ResponsiveContainer>
  );
}
