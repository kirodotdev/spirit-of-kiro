# Challenge Tasks

This project has a few bugs and feature gaps that were
deliberately left behind so you could experiment with AI
engineering.

## Challenge 1: Weak landing page

See if you can get the coding agent to explore the codebase,
figure out the game's features and selling points, and
create a better landing page for the game

## Challenge 2: Basic refactor

In file like `WorkbenchFullscreen.vue` there are opportunities
to use the "return early" pattern to refactor deeply nested if statements. Can AI do this automatically? Can it find other similar
places that need to be refactored?

## Challenge 3: Physics bug

If you have items in an active physics state (such as the
player character actively moving, and colliding with an object)
then if you tab out of the game, wait a few seconds, and tab
back in, you will see a tremendous bounce that goes haywire!

Can AI figure out the cause of this bug and then fix it?

_Extra credit: There are multiple potential solutions to this problem. Be sure to ask the AI to dig deeper and suggest alternate solutions. Think about the various potential solutions, and use your strengths as a human to select the right one._

## Challenge 4: Interactions bug

Sometimes when the player is closer to the wall than to an interactive
object like an item, then the interaction prompt does not appear over the item.
Can you fix this using AI?

## Challenge 5: Image loading system

The first time you load the game, and the first time you open a storage chest
you may see the images loading in on the fly. This is because the browser
does not load images until they are actually available in the DOM. Can you
implement an image loading system that preloads all the required images for
the game, including dynamic images for items?

_Extra credit: Add a loading screen to block the game appearing until image loading is completed._

## Challenge 6: Sounds

The game currently has no sounds. Can you add a sound system to the game?
Consider how to load a list of background and interaction sounds, then trigger
them via events in all the relevant components.



