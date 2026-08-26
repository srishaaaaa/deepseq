"use client";

import { FiLoader } from 'react-icons/fi';

export type LoadingStateProps = {
  label?: string;
  className?: string;
};

/** Thin wrapper around the `<FiLoader className="animate-spin" /> Loading...`
 * idiom already used identically across every page's `loading` branch. */
export default function LoadingState({ label = 'Loading...', className = '' }: LoadingStateProps) {
  return (
    <div className={`flex items-center text-gray-400 ${className}`}>
      <FiLoader className="animate-spin mr-2" /> {label}
    </div>
  );
}
