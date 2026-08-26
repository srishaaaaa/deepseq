"use client";

import type { ReactElement, ReactNode } from 'react';

export type EmptyStateProps = {
  icon?: ReactElement;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

/** Replaces bare "No analyses yet. Upload a file..." text-only states
 * (history/dashboard/explore/analytics) with a consistent, centered
 * treatment -- same copy/links each page already renders, just presented
 * consistently. */
export default function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}>
      {icon && <div className="mb-4 text-3xl text-gray-500">{icon}</div>}
      <p className="text-gray-300 font-medium">{title}</p>
      {description && <p className="text-gray-500 text-sm mt-1.5 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
