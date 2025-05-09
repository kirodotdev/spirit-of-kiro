import bag from '../assets/icons/bag.png';
import bonnet from '../assets/icons/bonnet.png';
import boots from '../assets/icons/boots.png';
import bottle from '../assets/icons/bottle.png';
import box from '../assets/icons/box.png';
import burner from '../assets/icons/burner.png';
import cabinet from '../assets/icons/cabinet.png';
import can from '../assets/icons/can.png';
import chair from '../assets/icons/chair.png';
import chest from '../assets/icons/chest.png';
import container from '../assets/icons/container.png';
import cultivator from '../assets/icons/cultivator.png';
import electronics from '../assets/icons/electronics.png';
import fridge from '../assets/icons/fridge.png';
import gear from '../assets/icons/gear.png';
import grill from '../assets/icons/grill.png';
import hat from '../assets/icons/hat.png';
import house from '../assets/icons/house.png';
import pants from '../assets/icons/pants.png';
import pulley from '../assets/icons/pulley.png';
import sock from '../assets/icons/sock.png';
import stereo from '../assets/icons/stereo.png';
import stone from '../assets/icons/stone.png';
import strainer from '../assets/icons/strainer.png';
import tights from '../assets/icons/tights.png';
import veil from '../assets/icons/veil.png';
import vest from '../assets/icons/vest.png';
import windshield from '../assets/icons/windshield.png';

// Array of available item icons
export const itemIcons = [
  bag,
  bonnet,
  boots,
  bottle,
  box,
  burner,
  cabinet,
  can,
  chair,
  chest,
  container,
  cultivator,
  electronics,
  fridge,
  gear,
  grill,
  hat,
  house,
  pants,
  pulley,
  sock,
  stereo,
  stone,
  strainer,
  tights,
  veil,
  vest,
  windshield
];

// Helper to get random icon
export function getRandomIcon(): string {
  const randomIndex = Math.floor(Math.random() * itemIcons.length);
  return itemIcons[randomIndex];
}
