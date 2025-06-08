import accessories from './accessories';
import adhesives from './adhesives';
import carParts from './car-parts';
import clothing from './clothing';
import containers from './containers';
import cookingItems from './cooking-items';
import foodIngredients from './food-ingredients';
import householdItems from './household-items';
import liquids from './liquids';
import magical from './magical';
import tools from './tools';
import toys from './toys';
import themes from './themes';

var allItems = [];

allItems = allItems.concat(accessories);
allItems = allItems.concat(adhesives);
allItems = allItems.concat(clothing);
allItems = allItems.concat(containers);
allItems = allItems.concat(cookingItems);
allItems = allItems.concat(foodIngredients);
allItems = allItems.concat(householdItems);
allItems = allItems.concat(liquids);
allItems = allItems.concat(magical);
allItems = allItems.concat(tools);
allItems = allItems.concat(toys);

export const randomInspiration = function () {
  return themes[Math.floor(Math.random() * themes.length)] + ' ' +
         allItems[Math.floor(Math.random() * allItems.length)];
}
