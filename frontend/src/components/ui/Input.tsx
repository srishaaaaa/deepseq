"use client";

import { useId } from 'react';
import type { InputHTMLAttributes, ReactElement, ReactNode, SelectHTMLAttributes } from 'react';

const FIELD_BASE =
  'block w-full appearance-none rounded-(--radius-control) border border-gray-600 bg-gray-700 ' +
  'px-3 py-2 text-white placeholder-gray-400 shadow-sm transition-colors ' +
  'focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/50 sm:text-sm ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

const ERROR_FIELD_CLASSES = 'border-danger-400 focus:border-danger-400 focus:ring-danger-400/50';

type CommonFieldProps = {
  label?: string;
  error?: string;
  hint?: string;
  className?: string;
  containerClassName?: string;
};

export type InputProps = CommonFieldProps & {
  leftIcon?: ReactElement;
  rightSlot?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>;

/** Shared text-field wrapper. Owns nothing -- value/onChange/error/loading
 * all stay driven by the consuming page's existing state, exactly as today
 * (auth forms, settings). `rightSlot` covers the password show/hide toggle
 * pattern already used in login/signup/reset-password. */
export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightSlot,
  className = '',
  containerClassName = '',
  id,
  ...rest
}: InputProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={fieldId} className="text-sm font-medium text-gray-300">
          {label}
        </label>
      )}
      <div className={`relative ${label ? 'mt-1' : ''}`}>
        {leftIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            {leftIcon}
          </span>
        )}
        <input
          id={fieldId}
          className={[
            FIELD_BASE,
            error ? ERROR_FIELD_CLASSES : '',
            leftIcon ? 'pl-10' : '',
            rightSlot ? 'pr-10' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          {...rest}
        />
        {rightSlot && (
          <span className="absolute inset-y-0 right-0 flex items-center pr-3">{rightSlot}</span>
        )}
      </div>
      {error && (
        <p id={`${fieldId}-error`} className="mt-1.5 text-sm text-danger-400">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${fieldId}-hint`} className="mt-1.5 text-xs text-gray-500">
          {hint}
        </p>
      )}
    </div>
  );
}

export type SelectProps = CommonFieldProps & SelectHTMLAttributes<HTMLSelectElement>;

export function Select({
  label,
  error,
  hint,
  className = '',
  containerClassName = '',
  id,
  children,
  ...rest
}: SelectProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={fieldId} className="block text-xs text-slate-400 mb-1.5">
          {label}
        </label>
      )}
      <select
        id={fieldId}
        className={[FIELD_BASE, error ? ERROR_FIELD_CLASSES : '', className].filter(Boolean).join(' ')}
        aria-invalid={Boolean(error)}
        {...rest}
      >
        {children}
      </select>
      {error && <p className="mt-1.5 text-sm text-danger-400">{error}</p>}
      {!error && hint && <p className="mt-1.5 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export type RangeProps = {
  label?: string;
  valueLabel?: string;
  className?: string;
  containerClassName?: string;
} & InputHTMLAttributes<HTMLInputElement>;

/** Matches the confidence-threshold slider (settings) and min-confidence
 * slider (explore filters) -- same `accent-*`-based native range input,
 * just with a consistent label + live value readout slot. */
export function Range({
  label,
  valueLabel,
  className = '',
  containerClassName = '',
  id,
  ...rest
}: RangeProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <div className={containerClassName}>
      {(label || valueLabel) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <label htmlFor={fieldId} className="block text-xs text-slate-400">
              {label}
            </label>
          )}
          {valueLabel && <span className="text-sm font-mono text-white">{valueLabel}</span>}
        </div>
      )}
      <input
        id={fieldId}
        type="range"
        className={`w-full accent-brand-500 ${className}`}
        {...rest}
      />
    </div>
  );
}
