# Challenge Tasks

This project has a few bugs and feature gaps that were
deliberately left behind so you could experiment with AI
engineering.

## Challenge 1: Weak landing page

See if you can get the coding agent to explore the codebase,
figure out the game's features and selling points, and
create a better landing page for the game

## Challenge 2: Physics bug

If you have items in an active physics state (such as the
player character actively moving, and colliding with an object)
then if you tab out of the game, wait a few seconds, and tab
back in, you will see a tremendous bounce that goes haywire!

Easy reproduction is to pull the lever, switch browser tabs for
at least 20-30 seconds so that the item is dispensed while the
tab is backgrounded, then switch back to the game tab. 

Can AI figure out the cause of this bug and then fix it?

_Extra credit: There are multiple potential solutions to this problem. Be sure to ask the AI to dig deeper and suggest alternate solutions. Think about the various potential solutions, and use your strengths as a human to select the right one._

## Challenge 3: Interactions bug

Sometimes when the player is closer to the wall than to an interactive
object like an item, then the interaction prompt does not appear over the item.
Can you fix this using AI?

## Challenge 4: Implement password reset

You may notice that there is no "forgot password" link on sign in. It looks
like we need to implement that! This application uses Amazon Cognito for auth.
Can you implement password reset screens in the client and the backend for password
resets in the server?

## Challenge 5: Sounds

The game currently has no sounds. Can you add a sound system to the game?
There is a list of royalty free, no attribution required sounds available here:
https://sonniss.com/gameaudiogdc/
Consider how to load a list of background and interaction sounds, then trigger
these sounds to play via events that are emitted from all relevant components.



