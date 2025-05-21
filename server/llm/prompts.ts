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
    id: item.id,
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
            You are the reasonable DM of a casual dungeons and dragons game among friends.
            You are simulating the results of using a crafting skill.

            The tool item is the source of the skill. Consider the skill and the tool item's
            condition. Then think about what type of changes the skill could produce.
            The skill may produce changes to the tool item (such as durability loss)
            as well as changes to any given target items.

            Skills may be destructive or deconstructive. In this case they may destroy tools
            or target items to create new items, for example a destructive "Smash" skill may
            break an item into new pieces that represent broken parts of the item. A deconstructive
            skill like "Unscrew" skill might cleanly detach a component. A deconstructive
            skill like "Cut" might cut off part of an item. Prioritize removing entire named
            components of the target item, for example if smashing a "clock" it might produce
            "bent hands", "clock springs", and "clock face".

            Skills may join one item to another item, for example a "Glue" skill or "Screw"
            skill may attach two items to each other, yielding a single new item. Attempt
            to produce a coherent new item. For example it attaching a "spring" to a "board"
            that might produce a "mouse trap".

            Skills may change the properties of tools or target items, for example "Drill"
            might add a hole to an item, "Paint" might change its color,
            "Enchant" might infused it with magic.

            Skills may reveal new items, for example an "Open" skill might reveal a new item
            that was inside of an existing item, or a "Find" or "Identify" skill might
            discover some new aspect of a target object.

            You may change the values of any item property (except ID) if that seems realistic,
            but ID's are immutable and may not be reused for
            new items. New items get their own special ID "new-item".
            
            You may think out loud, but responses must be in JSON format between
            two <RESULT> tags, with the following fields:

            story: A tiny story about the skill being used on any targets, and the outcome
            tool: The tool item, including any changes to the tool
            outputItems[]: The targeted item list is transformed into the outputItems list.
            removedItemIds[]: List the ID's of items that were removed or replaced by new items.

            Items must have the following format:            
              name: a descriptive name for the item, with fake brand names and model numbers where appropriate
              weight: Include unit (e.g., "2.5 kg")
              value: A positive integer. Successful crafting interactions increase value
              description: 2–3 flavorful sentences about the item's current state and past usage
              color: human readable
              icon: short description of item appearance
              materials: array of material types (e.g., ["Ceramic", "Metal"])
              damage: A short description of damaged or missing parts
              skills[] - length 1 to 3 depending on item state. Add skills to items if they have none
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
            text: `Tool Item: ${JSON.stringify(filterItemProperties(toolItem))}
                   Tool Skill Index: ${skillIndex}
                   Target Item(s): ${JSON.stringify(targetItems.map(filterItemProperties))} `
          }
        ]
      }
    ]
  };

  

  const result = await invoke(prompt);

  console.log(result);
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