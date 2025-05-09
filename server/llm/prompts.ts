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

          story - A tiny story about the item flying out of the dispenser
          items[] - An array containing exactly one item with the following properties:
            name - a descriptive name for the item, with fake brand names and model numbers where appropriate
            weight - weight of item with unit of measurement
            value - positive integer
            description - a detailed two to three sentence description of the item's condition and status
            color - human readable
            icon - short visual description, less than 10 words
            materials - array of material types
            damage - A short description of damaged or missing parts
            skills[] - If the item seems like a tool that could be used on another item, this is an array of active crafting skills 
                      Each skill should be an object with "name" and "description" and "outcome"
                      "name" must be a verb-like action, performed against an external entity, not self
                      "description" should be slightly corny and fun, in the spririt of a whacky D&D adventure
                      "outcome" is an enum of one of the following:
                         consume_self - This item is destroyed to change the other item
                         consume_other - This item changes by destroying the other item
                         change_other - This item changes the other item
                         change_self - This item changes itself
                         combine_with - This item combines with another item
                         split_other - This item splits the other item into two or more items
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