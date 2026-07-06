import { pool, db } from '../db/client.js';
import { archetypes } from '../db/schema.js';
import type { Playstyle } from '@pokedeck/shared';

/** A small curated seed of well-known TCG strategies to bootstrap recommendations. */
const SEED: Array<{
  slug: string;
  name: string;
  description: string;
  playstyle: Playstyle;
  typicalTypes: string[];
}> = [
  {
    slug: 'charizard-ex',
    name: 'Charizard ex',
    description: 'Big-basic control deck fueled by Charizard ex hitting hard while grinding value.',
    playstyle: 'control',
    typicalTypes: ['Fire', 'Darkness'],
  },
  {
    slug: 'lost-zone-toolbox',
    name: 'Lost Zone Toolbox',
    description: 'Lost Zone engine enabling flexible attackers and precise prizes.',
    playstyle: 'toolbox',
    typicalTypes: ['Water', 'Psychic'],
  },
  {
    slug: 'lugia-archeops',
    name: 'Lugia Archeops',
    description: 'Ramp Special Energy with Archeops to power up huge Lugia VSTAR turns.',
    playstyle: 'midrange',
    typicalTypes: ['Colorless'],
  },
  {
    slug: 'gardevoir-ex',
    name: 'Gardevoir ex',
    description: 'Psychic engine that streams attackers with endless energy acceleration.',
    playstyle: 'combo',
    typicalTypes: ['Psychic'],
  },
  {
    slug: 'raging-bolt',
    name: 'Raging Bolt ex',
    description: 'Aggressive Dragon deck scaling damage off attached energy.',
    playstyle: 'aggro',
    typicalTypes: ['Dragon', 'Fighting'],
  },
];

async function main() {
  for (const a of SEED) {
    await db
      .insert(archetypes)
      .values({ ...a, isCurated: true })
      .onConflictDoUpdate({
        target: archetypes.slug,
        set: { name: a.name, description: a.description, playstyle: a.playstyle, typicalTypes: a.typicalTypes },
      });
  }
  console.log(`✅ Seeded ${SEED.length} archetypes.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
