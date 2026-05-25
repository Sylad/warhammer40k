#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, '').split('=');
  return [key, rest.join('=') || 'true'];
}));

const unitId = args.get('unit');
if (!unitId) {
  console.error('Usage: node scripts/propose-lore-ollama.mjs --unit=<unit-id>');
  process.exit(1);
}

const ollamaBaseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
const ollamaModel = process.env.OLLAMA_MODEL ?? 'qwen2.5:7b';
const outputPath = path.resolve(root, '..', 'tmp', `warhammer-lore-${unitId}.json`);

const units = JSON.parse(await readFile(path.resolve(root, 'backend', 'seed', 'units.json'), 'utf8'));
const factions = JSON.parse(await readFile(path.resolve(root, 'backend', 'seed', 'factions.json'), 'utf8'));
const unit = units.find((entry) => entry.id === unitId);
if (!unit) {
  console.error(`Unknown unit id: ${unitId}`);
  process.exit(1);
}
const faction = factions.find((entry) => entry.id === unit.factionId);

const prompt = `Tu proposes un enrichissement lore Warhammer 40K en francais.
Usage: backoffice uniquement. Ne modifie aucune regle tabletop.
Retourne uniquement un JSON valide:
{
  "unitId": "string",
  "loreCourt": "une phrase",
  "loreLong": "2 a 3 paragraphes",
  "capacities": ["3 a 5 capacites narratives"],
  "citation": "courte citation in-universe"
}

Faction: ${faction?.nom ?? unit.factionId}
Unite: ${unit.nom}
Type: ${unit.type}
Role existant: ${unit.role ?? ''}
Description existante: ${unit.description ?? ''}
Lore existant: ${unit.loreLong ?? unit.loreCourt ?? ''}`;

const response = await fetch(`${ollamaBaseUrl.replace(/\/$/, '')}/api/generate`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ model: ollamaModel, stream: false, format: 'json', prompt }),
});

if (!response.ok) {
  throw new Error(`Ollama HTTP ${response.status}`);
}

const payload = await response.json();
const proposal = JSON.parse(payload.response ?? '{}');
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify({ generatedAt: new Date().toISOString(), proposal }, null, 2));
console.log(outputPath);
