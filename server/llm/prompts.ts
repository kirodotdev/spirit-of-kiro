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

// The only properties that the LLM should be seeing.
function filterItemProperties(item) {
  return {
    name: item.name,
    weight: item.weight,
    value: item.value,
    description: item.description,
    color: item.color,
    icon: item.icon,
    materials: item.materials,
    damage: item.damage,
    skills: item.skills
  }
}

// Use one item's skill one or more other items.
export const useSkill = async function (toolItem: any, skillIndex: any, targetItems: any): Promise<any> {
  const prompt = {
    system: [
      {
        "text": `
            You are a master crafter who enjoys working on challenging tasks.
            You are going to simulate the results of using
            a crafting skill on one or more items. The tool item is the source of the
            skill. Consider the tool item's condition when simulating success or
            failure of the skill.

            The skill may transform the tool item as well as the target item(s).
            You will simulate the outcome of the skill in a quirky but realistic manner,
            as if you are the reasonable DM of a casual Dungeons and Dragons game among friends.
            You may change the value of item properties, but you must maintain all the
            same item keys.
            
            Your responses must be in JSON format between two <RESULT> tags,
            with the following fields:

            story: A tiny story about the skill being used on any targets, and the outcome
            tool: The tool item, including any changes to the tool
            outputItems[]: The targeted item list is transformed by the tool. Potential outcomes
               are: a target item is changed by the skill, a target item is disassembled or
               broken into multiple pieces by the skill, a target item is joined to another target
               item by the skill, a target item is completely destroyed in the process of being 
               consumed by the tool. The output items list should accurately reflect the results
               of the skill use and the story.
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
            text: `Tool Item: ${JSON.stringify(filterItemProperties(toolItem))}
                   Tool Skill Index: ${skillIndex}
                   Target Item(s): ${JSON.stringify(targetItems.map(filterItemProperties))} `
          }
        ]
      }
    ]
  };

  console.log('prompt', prompt);

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