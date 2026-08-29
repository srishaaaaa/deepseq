// Shared dark-theme styling for every Recharts tooltip in the app, so
// charts on different pages read as one system.
export const TOOLTIP_STYLE = {
  background: '#0f1b33',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  fontSize: 13,
};

export function truncateLabel(value: string, max = 22) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
