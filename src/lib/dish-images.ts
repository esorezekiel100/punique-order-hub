import afang from "@/assets/dish-afang.jpg";
import asunRice from "@/assets/dish-jollof.jpg";
import curry from "@/assets/dish-fried-rice.jpg";
import egusi from "@/assets/dish-egusi.jpg";
import friedRice from "@/assets/dish-fried-rice.jpg";
import jollof from "@/assets/dish-jollof.jpg";
import noodles from "@/assets/dish-noodles.jpg";
import okra from "@/assets/dish-okra.jpg";
import pancakes from "@/assets/dish-pancakes.jpg";
import sandwich from "@/assets/dish-sandwich.jpg";

const DISH_IMAGES: Record<string, string> = {
  "Afang Soup": afang,
  "Beef Curry Sauce": curry,
  "Chicken Curry Sauce": curry,
  "Creamy Beef Sandwich": sandwich,
  "Egusi Soup": egusi,
  "Goat Meat Curry Sauce": curry,
  "Okra Soup": okra,
  Pancakes: pancakes,
  "Smokey Jollof Rice": jollof,
  "Special Asun Rice": asunRice,
  "Stir Fry Noodles and Egg": noodles,
  "Stir-Fried Rice": friedRice,
};

export const HERO_SLIDES = [jollof, egusi, noodles];

export function getDishImage(name: string) {
  return DISH_IMAGES[name] ?? jollof;
}