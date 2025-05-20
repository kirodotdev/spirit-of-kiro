import { randomInspiration } from './word-lists';
import { invoke } from './model';

// Generates a random item that might be found in a scrapyard.
export const generateItems = async function (itemCount: number): Promise<any> {
  const randomItems: string[] = [];
  const brokenessLevels: string[] = [];

  for (var itemNumber = 0; itemNumber < itemCount; itemNumber++) {
    const item = randomInspiration();
    if (item) {
      randomItems.push(item);
      const brokeness = Math.floor(Math.random() * 100);
      brokenessLevels.push(`${brokeness}%`);
    }
  }

  const prompt = {
    system: [
      {
        "text": `
          You are running a dispenser that taps into a dimension full of discarded items.
          Your responses must be in JSON format between two <RESULT> tags, with the following fields:

          story: A tiny story about the item flying out of the dispenser
          items: An array (length 1) with one object describing the item, including:
            name: a descriptive name for the item, with fake brand names and model numbers where appropriate
            weight: Include unit (e.g., "2.5 kg")
            value: A positive integer, representing its in-world value.
            description: 2–3 flavorful sentences about the item's current state and past usage
            color: human readable
            icon: short description of item appearance
            materials: array of material types (e.g., ["Ceramic", "Metal"])
            damage: A short description of damaged or missing parts
            skills[] - length 1 to 3 depending on item usefulness
              "name": Verb-like action performed by this item on another item, capitalized (e.g., "Absorb", "Deploy", "Smash")
              "description": Corny, adventurous, describes how the verb is performed on it's target
              "targets": Number of targets. Either 0 (target's self), 1 (target's one other item), or 2 (joins two other items)
                  
          `
      },
      {
        "cachePoint": {
          "type": "default"
        }
      }
    ],
    messages: [
      {
        role: 'user',
        content: [
          {
            text: `Generate a single item that might come out of the dispenser, drawing random inspiration from the following items: ${randomItems.map((item, i) => `${item} (${brokenessLevels[i]} damaged)`).join(', ')}`
          }
        ]
      }
    ]
  };

  const result = await invoke(prompt);
  if (!result) return null;

  const resultMatch = result.match(/<RESULT>([\s\S]*?)<\/RESULT>/);
  const resultContent = resultMatch ? resultMatch[1].trim() : result;
  return JSON.parse(resultContent);
};

// Disassemble an item into some components.
export const disassembleItem = async function (persona: any, item: any): Promise<any> {
  const prompt = `\n\nHuman:

    I am a scrapyard mechanic. The following document describes my skills, available tools:

    ${JSON.stringify(persona)}

    I plan to disassemble the following item in order to salvage it's components:

    ${JSON.stringify(item)}

    Write a list of parts in this item.
    Write a list of steps for disassembling the item.
    Then output in JSON format between two <RESULT> tags, with the following fields:

    story - A short paragraph about how I disassemble the item. Consider my skills and available tools.
            Think step by step about how to disassemble the item. If my tools don't allow me to disassemble
            the item then I will fail to disassemble. I may also fail or break parts if my skills are bad,
            or I do not have the appropriate tool.
    persona-improvements
    persona-improvements[].skill - A skill to approve
    persona-improvements[].improvement - Number between 1 and 100 representing how much success was had using the skill
    items - A list of components I have salvaged from the item. Attempt to break the item into up to five parts.
            Parts I am unable to remove should stay on the original item.
    items[].name - Name for the component. Microscopic components should be described in atomic or subatomic terms.
    items[].description - A description of the condition of the component, including details of damage.
                          Do not mention value or my skills. Prefer to refer to the item using "an" instead of "the"
    items[].weight - weight of item
    items[].value - integer
    items[].icon - single word name for this
    items[].color - human readable
    items[].materials - array of material types
    items[].damage - short description of any damage to the component
    items[].equipmentSlots[] - An array of equipment slots this item can be equipped to, including effects when equipped.
                               Each entry should be an object with "slot" and "effects" properties. Valid slots are "head"
                               "hands", "body", "feet", and "toolbelt". Effects should be interesting, slightly corny statements
                               about how the character looks, feels, or behaves when equipped.

    Assistant:\n`;

  const result = await invoke(prompt);
  if (!result) return null;

  const resultMatch = result.match(/<RESULT>([\s\S]*?)<\/RESULT>/);
  const resultContent = resultMatch ? resultMatch[1].trim() : result;
  return JSON.parse(resultContent);
};

// Generate a description of a character based on equipped items
export const generatePersonaDescription = async function (equippedItems: any[]): Promise<string | null> {
  const prompt = `
    I am a character in a whimsical post-apocalyptic world. I have the following items equipped:
    ${equippedItems.map(item => `${item.name} - ${item.description}\nEquipment effects: ${item.equipmentSlots.map(slot => slot.effects).join(', ')}`).join('\n')}

    Write a single descriptive paragraph about my appearance and demeanor based on these equipped items and their effects.
    The response should be plain text between two <RESULT> tags.
  `;

  const result = await invoke(prompt);
  if (!result) return null;

  const resultMatch = result.match(/<RESULT>([\s\S]*?)<\/RESULT>/);
  return resultMatch ? resultMatch[1].trim() : null;
};