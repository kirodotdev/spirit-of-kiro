import { randomInspiration } from './word-lists';
import { invoke, invokeStream } from './model';
import yaml from 'js-yaml';

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
          Your responses must be in YAML format between two <RESULT> tags, with the following fields:

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
            skills: array of length 1 to 3 depending on item usefulness, each containing:
              name: Verb-like action performed by this item on another item, capitalized (e.g., "Absorb", "Deploy", "Smash")
              description: Corny, adventurous, describes how the verb is performed on it's target
              targets: Number of targets. Either 0 (targets self), 1 (targets one other item), or 2 (joins two other items)
                  
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

// Maps original IDs to short letter IDs (a, b, c, etc.)
// This is an optimization to save token in the LLM. No need to send
// full GUID's through the LLM.
function createIdMapping(toolItem: any, targetItems: any[]): { idToShortId: Record<string, string>, shortIdToId: Record<string, string> } {
  const idToShortId: Record<string, string> = {};
  const shortIdToId: Record<string, string> = {};

  // Start with lowercase letters
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  let letterIndex = 0;

  // Map tool item ID first
  if (toolItem && toolItem.id) {
    const shortId = letters[letterIndex++];
    idToShortId[toolItem.id] = shortId;
    shortIdToId[shortId] = toolItem.id;
  }

  // Map target item IDs
  if (targetItems && targetItems.length) {
    for (const item of targetItems) {
      if (item && item.id && !idToShortId[item.id]) {
        const shortId = letters[letterIndex++];
        idToShortId[item.id] = shortId;
        shortIdToId[shortId] = item.id;
      }
    }
  }

  return { idToShortId, shortIdToId };
}

// Replace original IDs with short IDs in an item
function replaceWithShortIds(item: any, idToShortId: Record<string, string>): any {
  if (!item) return item;

  const newItem = { ...item };
  if (newItem.id && idToShortId[newItem.id]) {
    newItem.id = idToShortId[newItem.id];
  }

  return newItem;
}

// Replace short IDs with original IDs in an item
function replaceWithOriginalIds(item: any, shortIdToId: Record<string, string>): any {
  if (!item) return item;

  const newItem = { ...item };
  if (newItem.id && shortIdToId[newItem.id]) {
    newItem.id = shortIdToId[newItem.id];
  }

  return newItem;
}

// Appraise an item to determine its market value
export const appraiseItem = async function (item: any): Promise<any> {
  // Filter item properties to only include what's needed for appraisal
  const itemToAppraise = filterItemProperties(item);

  const prompt = {
    system: [
      {
        "text": `
          You are an experienced appraiser in a fantasy scrapyard game.
          Your job is to evaluate items and determine their market value.
          
          You are very sensitive to the condition of items, and you treat
          the "value" field on the item as the maximum you would be willing
          to pay for the item if it was in perfect condition.

          You will be disappointed, and reduce your appraisal based
          on the following factors:
          - Material quality and rarity
          - Condition (damage level)
          - Utility (practicality of skills and functionality)
          - Some wiggle room for uniqueness and collectability
          
          Your responses must be in YAML format between two <RESULT> tags, with the following fields:
          
          appraisal:
            analysis: A brief, colorful analysis of the item (2-3 sentences)
            saleAmount: The amount of gold the appraiser is willing to pay
            happiness: A number between -100 and 100 indicating how happy/unhappy the appraiser is with the item
              # -100: Extremely disappointed, item is broken, worthless, or offensive
              # 0: Neutral, item is average
              # 100: Extremely excited, item is exceptional
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
            text: `Please appraise this item: ${JSON.stringify(itemToAppraise)}`
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

// Interface for streaming skill use callbacks
export interface SkillStreamCallbacks {
  onStory?: (story: string) => void;
  onTool?: (tool: any) => void;
  onOutputItem?: (item: any) => void;
  onRemovedItemId?: (id: string) => void;
  onComplete?: (result: any) => void;
}

// Use one item's skill on one or more other items with streaming response
export const useSkillStream = async function (
  toolItem: any,
  skillIndex: any,
  targetItems: any,
  callbacks: SkillStreamCallbacks
): Promise<void> {
  // Create ID mappings for tool item and target items
  const { idToShortId, shortIdToId } = createIdMapping(toolItem, targetItems);

  // Create copies with short IDs
  const shortIdToolItem = replaceWithShortIds(filterItemProperties(toolItem), idToShortId);
  const shortIdTargetItems = targetItems.map(item => replaceWithShortIds(filterItemProperties(item), idToShortId));

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
            
            You must structure your response using specific XML tags for each part:
            
            <STORY>A tiny story about the skill being used on any targets, and the outcome</STORY>
            
            <TOOL>
            # YAML representation of the tool item, including any changes to the tool
            # Include all required item properties
            </TOOL>
            
            <OUTPUT_ITEM>
            # YAML representation of an output item
            # Include all required item properties
            # Use one OUTPUT_ITEM tag per item
            </OUTPUT_ITEM>
            
            <REMOVED_ITEM>itemId</REMOVED_ITEM>
            
            Items must have the following format:            
              id: You may change the values of any item property (except ID) if that seems realistic,
                  but ID's are immutable and may not be reused for
                  new items. New items get their own special ID "new-item".
              name: a descriptive name for the item, with fake brand names and model numbers where appropriate
              weight: Include unit (e.g., "2.5 kg")
              value: A positive integer. Successful crafting interactions increase value
              description: 2–3 flavorful sentences about the item's current state and past usage
              color: human readable
              icon: short description of item appearance
              materials: array of material types (e.g., ["Ceramic", "Metal"])
              damage: A short description of damaged or missing parts
              skills[] - length 1 to 3 depending on item state. Add skills to items if they have none
                name: Verb-like action performed by this item on another item, capitalized (e.g., "Absorb", "Deploy", "Smash")
                description: Corny, adventurous, describes how the verb is performed on it's target
                targets: Number of targets. Either 0 (targets self), 1 (targets one other item), or 2 (joins two other items)
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
            text: `Tool Item: ${JSON.stringify(shortIdToolItem)}
                   Tool Skill Index: ${skillIndex}
                   Target Item(s): ${JSON.stringify(shortIdTargetItems)} `
          }
        ]
      }
    ]
  };

  // Buffers to accumulate partial XML tags
  let buffer = '';
  let storyContent = '';
  let toolContent = '';
  const outputItems: any[] = [];
  const removedItemIds: string[] = [];

  // Process each chunk as it arrives
  await invokeStream(prompt, (chunk) => {

    // Add the new chunk to our buffer
    buffer += chunk;

    // Process any complete XML tags in the buffer
    processBuffer();
  }, (fullResponse) => {
    // Process any remaining content in the buffer
    buffer += ' '; // Add a space to help with regex matching
    processBuffer(true);

    // Construct the final result object
    const result = {
      story: storyContent,
      tool: toolContent ? yaml.load(toolContent) : null,
      outputItems: outputItems.map(item => yaml.load(item)),
      removedItemIds: removedItemIds
    };

    // Convert short IDs back to original IDs
    if (result.tool) {
      result.tool = replaceWithOriginalIds(result.tool, shortIdToId);
    }

    if (result.outputItems && Array.isArray(result.outputItems)) {
      result.outputItems = result.outputItems.map(item =>
        replaceWithOriginalIds(item, shortIdToId)
      );
    }

    if (result.removedItemIds && Array.isArray(result.removedItemIds)) {
      result.removedItemIds = result.removedItemIds.map(id =>
        shortIdToId[id] || id
      );
    }

    // Call the completion callback with the final result
    if (callbacks.onComplete) {
      callbacks.onComplete(result);
    }
  });

  // Helper function to process the buffer for complete XML tags
  function processBuffer(isFinal = false) {
    // Process <STORY> tags
    let storyMatch;
    const storyRegex = /<STORY>([\s\S]*?)<\/STORY>/g;
    while ((storyMatch = storyRegex.exec(buffer)) !== null) {
      const story = storyMatch[1].trim();
      storyContent = story; // Store the story content
      if (callbacks.onStory) {
        callbacks.onStory(story);
      }
      // Remove the processed tag from the buffer
      buffer = buffer.replace(storyMatch[0], '');
    }

    // Process <TOOL> tags
    let toolMatch;
    const toolRegex = /<TOOL>([\s\S]*?)<\/TOOL>/g;
    while ((toolMatch = toolRegex.exec(buffer)) !== null) {
      const toolYaml = toolMatch[1].trim();
      toolContent = toolYaml; // Store the tool YAML
      if (callbacks.onTool) {
        try {
          const tool = yaml.load(toolYaml);
          // Convert short IDs back to original IDs before callback
          const toolWithOriginalIds = replaceWithOriginalIds(tool, shortIdToId);
          callbacks.onTool(toolWithOriginalIds);
        } catch (e) {
          console.error('Error parsing tool YAML:', e);
        }
      }
      // Remove the processed tag from the buffer
      buffer = buffer.replace(toolMatch[0], '');
    }

    // Process <OUTPUT_ITEM> tags
    let itemMatch;
    const itemRegex = /<OUTPUT_ITEM>([\s\S]*?)<\/OUTPUT_ITEM>/g;
    while ((itemMatch = itemRegex.exec(buffer)) !== null) {
      const itemYaml = itemMatch[1].trim();
      outputItems.push(itemYaml); // Store the output item YAML
      if (callbacks.onOutputItem) {
        try {
          const item = yaml.load(itemYaml);
          // Convert short IDs back to original IDs before callback
          const itemWithOriginalIds = replaceWithOriginalIds(item, shortIdToId);
          callbacks.onOutputItem(itemWithOriginalIds);
        } catch (e) {
          console.error('Error parsing output item YAML:', e);
        }
      }
      // Remove the processed tag from the buffer
      buffer = buffer.replace(itemMatch[0], '');
    }

    // Process <REMOVED_ITEM> tags
    let removedMatch;
    const removedRegex = /<REMOVED_ITEM>(.*?)<\/REMOVED_ITEM>/g;
    while ((removedMatch = removedRegex.exec(buffer)) !== null) {
      const itemId = removedMatch[1].trim();
      removedItemIds.push(itemId); // Store the removed item ID
      if (callbacks.onRemovedItemId) {
        // Convert short ID back to original ID before callback
        const originalId = shortIdToId[itemId] || itemId;
        callbacks.onRemovedItemId(originalId);
      }
      // Remove the processed tag from the buffer
      buffer = buffer.replace(removedMatch[0], '');
    }

    // If this is the final processing and we still have content in the buffer,
    // try to extract any partial tags or remaining content
    if (isFinal && buffer.trim()) {
      console.log('Remaining buffer content:', buffer);
    }
  }
};