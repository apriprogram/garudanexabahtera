// Modul virtual dari scripts/asset-versions.mjs (plugin di vite.config.ts dan vitest.config.ts).
declare module 'virtual:gn-asset-versions' {
  /** Path publik → 8 hex awal sha256 isinya, mis. '/og/catalog.jpg' → '1a2b3c4d'. */
  const versions: Readonly<Record<string, string>>;
  export default versions;
}
