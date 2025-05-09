/**
 * Item name generator utility
 * Generates interesting and varied names for scrapyard items
 */

// Arrays of words to combine for item names
const adjectives = [
  'Rusty', 'Broken', 'Ancient', 'Mysterious', 'Glowing', 'Cracked', 
  'Weathered', 'Tarnished', 'Gleaming', 'Dusty', 'Polished', 'Dented',
  'Scorched', 'Frozen', 'Enchanted', 'Haunted', 'Mechanical', 'Digital',
  'Quantum', 'Alien', 'Forgotten', 'Forbidden', 'Experimental', 'Prototype',
  'Salvaged', 'Retrofitted', 'Augmented', 'Reinforced', 'Miniature', 'Massive'
];

const materials = [
  'Iron', 'Steel', 'Copper', 'Bronze', 'Brass', 'Silver', 'Gold', 
  'Titanium', 'Aluminum', 'Plastic', 'Glass', 'Ceramic', 'Crystal', 
  'Wood', 'Stone', 'Obsidian', 'Carbon', 'Nanofiber', 'Alloy', 'Composite'
];

const objects = [
  'Gear', 'Cog', 'Sprocket', 'Circuit', 'Chip', 'Capacitor', 'Battery',
  'Lens', 'Prism', 'Container', 'Tube', 'Pipe', 'Valve', 'Switch', 'Lever',
  'Dial', 'Gauge', 'Sensor', 'Transmitter', 'Receiver', 'Shield', 'Core',
  'Engine', 'Reactor', 'Generator', 'Converter', 'Amplifier', 'Stabilizer',
  'Regulator', 'Accelerator', 'Inhibitor', 'Catalyst', 'Module', 'Component',
  'Device', 'Tool', 'Instrument', 'Apparatus', 'Mechanism', 'Contraption'
];

const rarePrefixes = [
  'Hyper', 'Ultra', 'Mega', 'Super', 'Omni', 'Multi', 'Trans', 'Neo',
  'Cyber', 'Astro', 'Chrono', 'Techno', 'Bio', 'Psy', 'Cryo', 'Pyro',
  'Hydro', 'Aero', 'Geo', 'Cosmo', 'Xeno', 'Void', 'Flux', 'Quantum'
];

const rareSuffixes = [
  'Prime', 'X', 'Zero', 'Alpha', 'Omega', 'Nexus', 'Matrix', 'Core',
  'Node', 'Link', 'Shard', 'Fragment', 'Relic', 'Artifact', 'Prototype',
  '3000', '9000', 'XL', 'MK-II', 'v2.0', 'Plus', 'Pro', 'Elite', 'Supreme'
];

/**
 * Generates a random item name
 * @param rarity A number between 0 and 1 indicating item rarity (higher = rarer)
 * @returns A randomly generated item name
 */
export function generateItemName(rarity = Math.random()): string {
  // Basic name structure: Adjective + Material + Object
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const material = materials[Math.floor(Math.random() * materials.length)];
  const object = objects[Math.floor(Math.random() * objects.length)];
  
  let name = `${adj} ${material} ${object}`;
  
  // Add special prefixes or suffixes based on rarity
  if (rarity > 0.85) {
    // Very rare items get both a prefix and suffix
    const prefix = rarePrefixes[Math.floor(Math.random() * rarePrefixes.length)];
    const suffix = rareSuffixes[Math.floor(Math.random() * rareSuffixes.length)];
    name = `${prefix}-${name} ${suffix}`;
  } else if (rarity > 0.7) {
    // Somewhat rare items get a suffix
    const suffix = rareSuffixes[Math.floor(Math.random() * rareSuffixes.length)];
    name = `${name} ${suffix}`;
  } else if (rarity > 0.5) {
    // Uncommon items get a prefix
    const prefix = rarePrefixes[Math.floor(Math.random() * rarePrefixes.length)];
    name = `${prefix}-${name}`;
  }
  
  return name;
}

/**
 * Generates a description for an item based on its name
 * @param name The name of the item
 * @returns A description for the item
 */
export function generateItemDescription(name: string): string {
  const descriptions = [
    `A ${name.toLowerCase()} salvaged from the scrapyard. Its purpose is unclear.`,
    `This ${name.toLowerCase()} appears to be from an advanced technology. Handle with care.`,
    `The ${name.toLowerCase()} hums with a strange energy. Its origin is unknown.`,
    `A rare ${name.toLowerCase()} that seems valuable to collectors.`,
    `This ${name.toLowerCase()} might be useful for crafting or trading.`,
    `The ${name.toLowerCase()} shows signs of extensive use. Still functional.`,
    `An unusual ${name.toLowerCase()} with peculiar markings on its surface.`,
    `This ${name.toLowerCase()} was clearly part of something much larger.`,
    `The ${name.toLowerCase()} is surprisingly lightweight despite its appearance.`,
    `A heavy ${name.toLowerCase()} that feels important somehow.`
  ];
  
  return descriptions[Math.floor(Math.random() * descriptions.length)];
}