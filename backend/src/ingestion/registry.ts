import * as fs from 'fs';
import * as path from 'path';
import type { SourceRegistryEntry } from './types';

const REGISTRY_PATH = path.join(__dirname, '..', 'data', 'source_registry.json');

export function loadSourceRegistry(): SourceRegistryEntry[] {
  if (!fs.existsSync(REGISTRY_PATH)) {
    throw new Error(`Source registry not found: ${REGISTRY_PATH}`);
  }

  const parsed = JSON.parse(
    fs.readFileSync(REGISTRY_PATH, 'utf-8'),
  ) as SourceRegistryEntry[];

  return parsed.filter((entry) => entry.enabled !== false);
}

export function getSourceRegistryPath(): string {
  return REGISTRY_PATH;
}

