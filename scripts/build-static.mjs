import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

// Deployment-only output. The local Node server continues to serve the source root.
const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'dist');

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all([
  cp(resolve(root, 'index.html'), resolve(output, 'index.html')),
  cp(resolve(root, 'js'), resolve(output, 'js'), { recursive: true }),
  cp(resolve(root, 'styles'), resolve(output, 'styles'), { recursive: true })
]);

console.log(`Static deployment output created at ${output}`);
