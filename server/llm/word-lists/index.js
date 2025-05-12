import accessories from './accessories';
import carParts from './car-parts';
import clothing from './clothing';
import containers from './containers';
import cookingItems from './cooking-items';
import householdItems from './household-items';
import tools from './tools';
import toys from './toys';
import themes from './themes';

var allItems = [];

allItems = allItems.concat(accessories);
//allItems = allItems.concat(carParts);
allItems = allItems.concat(clothing);
allItems = allItems.concat(containers);
allItems = allItems.concat(cookingItems);
allItems = allItems.concat(householdItems);
allItems = allItems.concat(tools);
allItems = allItems.concat(toys);

export const randomInspiration = function () {
  return themes[Math.floor(Math.random() * themes.length)] + ' ' +
         allItems[Math.floor(Math.random() * allItems.length)];
}
