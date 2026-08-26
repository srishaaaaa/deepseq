"use client";

import type { ReactElement, ReactNode } from 'react';

export type PageHeaderProps = {
  title: string;
  subtitle?: ReactNode;
  icon?: ReactElement;
  actions?: ReactNode;
  className?: string;
};

/** Consistent <h1> + subtitle + optional icon/actions row, replacing each
 * page's hand-written heading block with the same structure/spacing. */
export default function PageHeader({ title, subtitle, icon, actions, className = '' }: PageHeaderProps) {
  return (
    <div className={`flex items-start justify-between flex-wrap gap-3 mb-6 ${className}`}>
      <div>
        <h1 className="text-3xl font-bold flex items-center text-white">
          {icon && (
            <span className="mr-3 flex h-10 w-10 items-center justify-center rounded-(--radius-control) bg-brand-500/15 text-brand-300">
              {icon}
            </span>
          )}
          {title}
        </h1>
        {subtitle && (
          <p className={`text-slate-400 mt-1 ${icon ? 'ml-[3.25rem]' : ''}`}>{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
