// Minimal ambient shim so tests can read files with `fs` without pulling in the
// full @types/node dependency. Only the surface the tests use is declared.
declare module 'fs' {
  export function readFileSync(path: string, encoding: string): string;
}
