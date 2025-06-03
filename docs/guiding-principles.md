# Kiro Demo Game - Guiding Principles

## Core Principles

### 1. AI is used to enable emergent interactions that are impossible in traditional gaming

In most traditional games, crafting is essentially hardcoded: specific items combine in
specific ways to produce specific outputs. In this game, crafting is free form. Items have
skills/quirks that can be used on other items. AI calculates an outcome. There is no required,
hardcoded schema for item metadata. In fact, it is theoretically possible to have an item 
with a "hack" type skill that specializes in modifying the metadata of other items. The AI
doesn't care what the structure or shape of an item's metadata looks like, as long as it is
semantically meaningful.

### 2. Scale enables efficiency and improved player experience

The game's performance should improve with more players.

Example 1: AI is used to generate net new items with unique stories, properties, and skills and
it can take around 10 seconds for the LLM to "mint" a new item from scratch. However,
if another player discards or consumes an item, rather than completely deleting it, we put it into
a shared pool to pull from later. This means a second player to the server can pull a previously
minted item nearly instantly, without needing to wait on the AI. This mechanic scales better and
better the more players there are. Eventually only a tiny fraction of the player base is waiting
on brand new item minting, and although there is a constant stream of new items being minted, the
number of new items that are minted naturally decreases over time.

Example 2: By far the biggest cost and biggest wait in this game is item image generation. As
an optimization, we keep a vector database of embeddings that match generated item descriptions.
If an item is visually similar to another pre-existing item, we reuse that other items image
rather than needing to generate a new image from scratch. Over time the vector database will
start matching a higher and higher percentage of items. AI usage will decrease, and players will
receive items with images almost instantly.

