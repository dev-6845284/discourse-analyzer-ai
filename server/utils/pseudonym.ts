import crypto from 'crypto';

// Words lists kept small for readability; can be expanded later
const ADJECTIVES = [
  'Azure','Cobalt','Crimson','Emerald','Golden','Indigo','Ivory','Jade','Mauve','Olive',
  'Ruby','Saffron','Scarlet','Silver','Teal','Umber','Violet','Amber','Coral','Pearl'
];

const ANIMALS = [
  'Otter','Lynx','Falcon','Fox','Hawk','Wolf','Orca','Puma','Koala','Heron',
  'Badger','Cobra','Eagle','Seal','Tiger','Bison','Quail','Panda','Yak','Zebra'
];

/**
 * Returns true if name is a generic placeholder like "Speaker 1" or "Unknown".
 */
export function isGenericSpeakerName(name: string): boolean {
  const n = name.trim().toLowerCase();
  return n === 'unknown' || /^speaker\s*\d+$/.test(n) || /^speaker$/.test(n);
}

/**
 * Deterministically generate a code name (e.g., "Olive Otter") from a seed.
 * Seed should be stable across runs to avoid random renames.
 */
export function generateCodeName(seed: string): string {
  const hash = crypto.createHash('sha256').update(seed).digest();
  const aIdx = hash[0] % ADJECTIVES.length;
  const anIdx = hash[1] % ANIMALS.length;
  return `${ADJECTIVES[aIdx]} ${ANIMALS[anIdx]}`;
}

/**
 * If name is generic, append a distinct pseudonym suffix to keep it unique.
 * Example: "Speaker 1" -> "Speaker 1 — Olive Otter [Pseudonym]".
 * The [Pseudonym] tag signals to AI that this is a temporary identifier.
 * Otherwise returns the original name.
 */
export function withPseudonymIfGeneric(name: string, seed: string): string {
  if (!isGenericSpeakerName(name)) return name;
  const code = generateCodeName(seed);
  // Use an em dash for readability, add [Pseudonym] tag for AI context
  return `${name} — ${code} [Pseudonym]`;
}
