// Ambient module declarations for imports Next.js's own type definitions
// don't cover. Next.js's global.d.ts (node_modules/next/types/global.d.ts)
// only declares `*.module.css` (CSS Modules); it has no declaration for a
// plain side-effect stylesheet import like `leaflet/dist/leaflet.css`
// (used in src/app/explore/BiodiversityMap.tsx). Webpack handles the import
// at build time regardless, but without this the TypeScript language server
// reports "Cannot find module or type declarations" in the editor.
declare module '*.css';
