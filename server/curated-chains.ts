// Our own short list of real menu items for the biggest US chains: their
// long-running signature items, not every add-on and side a menu database
// lists ("Red Pepper Strips" at Chick-fil-A). Checked before spoonacular, so
// these chains cost no quota and never fall back to a dishless card.
//
// Names are as the chain words them; `photo` names an example photo in
// assets/dishes (labeled "example photo") when one fits, else the card shows
// the place's own Google photo. Breakfast items show only in breakfast
// rooms, and everything else only at lunch and dinner.
//
// Keep to items a chain has sold for years: a retired item is worse than a
// short list.

import type { Meal } from "../lib/food-data";
import { sameChain } from "./chain-menus";

export interface CuratedDish {
  name: string;
  breakfast?: boolean;
  photo?: string;
}

const d = (name: string, photo?: string): CuratedDish => ({ name, photo });
const b = (name: string, photo?: string): CuratedDish => ({ name, photo, breakfast: true });

// Each chain's names as Google tends to give them; a place matches when its
// name equals one or extends it ("Chili's Grill & Bar" -> "Chili's").
const CHAINS: { names: string[]; dishes: CuratedDish[] }[] = [
  {
    names: ["McDonald's"],
    dishes: [
      d("Big Mac", "classic-cheeseburger"),
      d("Quarter Pounder with Cheese", "classic-cheeseburger"),
      d("Chicken McNuggets"),
      d("McChicken"),
      d("Filet-O-Fish"),
      d("Double Cheeseburger", "classic-cheeseburger"),
      b("Egg McMuffin", "breakfast-sandwich"),
      b("Sausage McGriddles"),
      b("Hotcakes", "pancake-stack"),
      b("Sausage Burrito", "breakfast-burrito"),
    ],
  },
  {
    names: ["Chick-fil-A"],
    dishes: [
      d("Chick-fil-A Chicken Sandwich"),
      d("Spicy Chicken Sandwich"),
      d("Chick-fil-A Nuggets"),
      d("Chick-n-Strips", "chicken-tenders"),
      d("Grilled Chicken Sandwich"),
      d("Cobb Salad", "cobb-salad"),
      d("Spicy Southwest Salad"),
      b("Chick-fil-A Chicken Biscuit"),
      b("Chick-n-Minis"),
      b("Hash Brown Scramble Burrito", "breakfast-burrito"),
      b("Egg White Grill", "breakfast-sandwich"),
    ],
  },
  {
    names: ["Taco Bell"],
    dishes: [
      d("Crunchwrap Supreme"),
      d("Chalupa Supreme"),
      d("Mexican Pizza"),
      d("Nachos BellGrande"),
      d("Burrito Supreme"),
      d("Cheesy Gordita Crunch"),
      d("Chicken Quesadilla"),
      b("Breakfast Crunchwrap"),
    ],
  },
  {
    names: ["Wendy's"],
    dishes: [
      d("Dave's Single", "classic-cheeseburger"),
      d("Baconator", "bacon-bbq-burger"),
      d("Spicy Chicken Sandwich"),
      d("Classic Chicken Sandwich"),
      d("Jr. Bacon Cheeseburger"),
      b("Breakfast Baconator", "breakfast-sandwich"),
      b("Honey Butter Chicken Biscuit"),
    ],
  },
  {
    names: ["Burger King"],
    dishes: [
      d("Whopper", "classic-cheeseburger"),
      d("Bacon King"),
      d("Original Chicken Sandwich"),
      d("Impossible Whopper", "impossible-burger"),
      d("Big Fish"),
      b("Croissan'wich", "breakfast-sandwich"),
      b("French Toast Sticks", "french-toast"),
    ],
  },
  {
    names: ["Subway"],
    dishes: [
      d("Italian B.M.T.", "italian-sub"),
      d("Meatball Marinara"),
      d("Spicy Italian", "italian-sub"),
      d("Steak & Cheese", "philly-cheesesteak"),
      d("Turkey Breast"),
      d("Tuna"),
    ],
  },
  {
    names: ["Chipotle", "Chipotle Mexican Grill"],
    dishes: [
      d("Chicken Burrito", "carne-asada-burrito"),
      d("Steak Burrito Bowl"),
      d("Carnitas Tacos"),
      d("Chicken Quesadilla"),
      d("Barbacoa Burrito", "carne-asada-burrito"),
      d("Sofritas Bowl"),
    ],
  },
  {
    names: ["Sonic", "Sonic Drive-In"],
    dishes: [
      d("SuperSONIC Double Cheeseburger", "classic-cheeseburger"),
      d("Sonic Cheeseburger", "classic-cheeseburger"),
      d("Footlong Quarter Pound Coney"),
      d("Crispy Chicken Sandwich"),
      d("Super Crunch Chicken Strips", "chicken-tenders"),
      b("Breakfast Burrito", "breakfast-burrito"),
      b("Breakfast Toaster", "breakfast-sandwich"),
    ],
  },
  {
    names: ["Panda Express"],
    dishes: [
      d("The Original Orange Chicken"),
      d("Beijing Beef"),
      d("Kung Pao Chicken", "kung-pao-chicken"),
      d("Broccoli Beef"),
      d("Honey Walnut Shrimp"),
      d("Grilled Teriyaki Chicken"),
      d("String Bean Chicken Breast"),
    ],
  },
  {
    names: ["Popeyes", "Popeyes Louisiana Kitchen"],
    dishes: [
      d("Classic Chicken Sandwich"),
      d("Spicy Chicken Sandwich"),
      d("Bonafide Chicken"),
      d("Chicken Tenders", "chicken-tenders"),
      d("Popcorn Shrimp"),
    ],
  },
  {
    names: ["KFC", "Kentucky Fried Chicken"],
    dishes: [
      d("Original Recipe Chicken"),
      d("Extra Crispy Chicken"),
      d("Famous Bowl"),
      d("Chicken Pot Pie"),
      d("KFC Chicken Sandwich"),
      d("Extra Crispy Tenders", "chicken-tenders"),
    ],
  },
  {
    names: ["Arby's"],
    dishes: [
      d("Classic Roast Beef"),
      d("Beef 'n Cheddar"),
      d("Smokehouse Brisket", "smoked-brisket"),
      d("Reuben", "reuben-sandwich"),
      d("Classic French Dip & Swiss"),
      d("Greek Gyro"),
    ],
  },
  {
    names: ["Jack in the Box"],
    dishes: [
      d("Jumbo Jack", "classic-cheeseburger"),
      d("Sourdough Jack"),
      d("Ultimate Cheeseburger", "classic-cheeseburger"),
      d("Spicy Chicken Sandwich"),
      d("Chicken Teriyaki Bowl"),
      b("Supreme Croissant", "breakfast-sandwich"),
      b("Breakfast Jack", "breakfast-sandwich"),
    ],
  },
  {
    names: ["Whataburger"],
    dishes: [
      d("Whataburger", "classic-cheeseburger"),
      d("Double Meat Whataburger", "classic-cheeseburger"),
      d("Patty Melt"),
      d("Honey BBQ Chicken Strip Sandwich"),
      d("Whatachick'n Sandwich"),
      d("Whatachick'n Strips", "chicken-tenders"),
      b("Honey Butter Chicken Biscuit"),
      b("Taquito with Cheese"),
      b("Breakfast on a Bun", "breakfast-sandwich"),
    ],
  },
  {
    names: ["Five Guys"],
    dishes: [
      d("Cheeseburger", "classic-cheeseburger"),
      d("Bacon Cheeseburger", "classic-cheeseburger"),
      d("Little Bacon Burger"),
      d("Cheese Dog"),
      d("Veggie Sandwich"),
    ],
  },
  {
    names: ["In-N-Out", "In-N-Out Burger"],
    dishes: [
      d("Double-Double", "classic-cheeseburger"),
      d("Cheeseburger", "classic-cheeseburger"),
      d("Hamburger"),
      d("Animal Style Double-Double"),
      d("Protein Style Double-Double"),
    ],
  },
  {
    names: ["Culver's"],
    dishes: [
      d("ButterBurger The Original", "classic-cheeseburger"),
      d("The Culver's Deluxe"),
      d("Crispy Chicken Sandwich"),
      d("North Atlantic Cod Filet Sandwich"),
      d("Pot Roast Sandwich", "pot-roast"),
      d("Chicken Tenders", "chicken-tenders"),
    ],
  },
  {
    names: ["Raising Cane's", "Raising Cane's Chicken Fingers"],
    dishes: [
      d("The Box Combo", "chicken-tenders"),
      d("3 Finger Combo", "chicken-tenders"),
      d("Caniac Combo", "chicken-tenders"),
      d("The Sandwich Combo"),
    ],
  },
  {
    names: ["Wingstop"],
    dishes: [
      d("Lemon Pepper Wings", "buffalo-wings"),
      d("Original Hot Wings", "buffalo-wings"),
      d("Garlic Parmesan Boneless Wings"),
      d("Crispy Tenders", "chicken-tenders"),
      d("Chicken Sandwich"),
    ],
  },
  {
    names: ["Zaxby's"],
    dishes: [
      d("Chicken Fingerz Plate", "chicken-tenders"),
      d("Wings & Things", "buffalo-wings"),
      d("Kickin' Chicken Sandwich"),
      d("Cobb Zalad", "cobb-salad"),
      d("Big Zax Snak"),
    ],
  },
  {
    names: ["Panera Bread", "Panera"],
    dishes: [
      d("Broccoli Cheddar Soup"),
      d("Mac & Cheese", "mac-and-cheese"),
      d("Chipotle Chicken Avo Melt"),
      d("Green Goddess Cobb Salad", "cobb-salad"),
      d("Caesar Salad with Chicken"),
      d("Classic Grilled Cheese", "grilled-cheese-deluxe"),
      b("Bacon, Egg & Cheese on Brioche", "breakfast-sandwich"),
      b("Avocado, Egg White & Spinach", "breakfast-sandwich"),
    ],
  },
  {
    names: ["Jersey Mike's", "Jersey Mike's Subs"],
    dishes: [
      d("The Original Italian", "italian-sub"),
      d("Big Kahuna Cheese Steak", "philly-cheesesteak"),
      d("Chipotle Cheese Steak", "philly-cheesesteak"),
      d("Club Supreme", "club-sandwich"),
      d("Turkey and Provolone"),
      d("Tuna Fish"),
    ],
  },
  {
    names: ["Jimmy John's"],
    dishes: [
      d("Vito", "italian-sub"),
      d("Italian Night Club", "italian-sub"),
      d("Beach Club", "club-sandwich"),
      d("Turkey Tom"),
      d("The Gargantuan"),
    ],
  },
  {
    names: ["Firehouse Subs"],
    dishes: [
      d("Hook & Ladder"),
      d("Firehouse Meatball"),
      d("Italian", "italian-sub"),
      d("Smokehouse Beef & Cheddar Brisket", "smoked-brisket"),
      d("Steak & Cheese", "philly-cheesesteak"),
    ],
  },
  {
    names: ["Qdoba", "Qdoba Mexican Eats", "Qdoba Mexican Grill"],
    dishes: [
      d("Chicken Burrito", "carne-asada-burrito"),
      d("Steak Burrito", "carne-asada-burrito"),
      d("Chicken Burrito Bowl"),
      d("Chicken Quesadilla"),
      d("Knockout Tacos"),
    ],
  },
  {
    names: ["Carl's Jr."],
    dishes: [
      d("Famous Star with Cheese", "classic-cheeseburger"),
      d("Western Bacon Cheeseburger", "bacon-bbq-burger"),
      d("Super Star with Cheese", "classic-cheeseburger"),
      d("Hand-Breaded Chicken Tenders", "chicken-tenders"),
    ],
  },
  {
    names: ["Hardee's"],
    dishes: [
      d("Original Thickburger", "classic-cheeseburger"),
      d("Mushroom 'N' Swiss Thickburger", "mushroom-swiss-burger"),
      d("Frisco Burger"),
      d("Hand-Breaded Chicken Tenders", "chicken-tenders"),
      b("Monster Biscuit"),
      b("Sausage Biscuit"),
      b("Frisco Breakfast Sandwich", "breakfast-sandwich"),
    ],
  },
  {
    names: ["Shake Shack"],
    dishes: [
      d("ShackBurger", "smash-burger"),
      d("SmokeShack", "smash-burger"),
      d("Shack Stack"),
      d("Chicken Shack"),
      d("'Shroom Burger"),
    ],
  },
  {
    names: ["Domino's", "Domino's Pizza"],
    dishes: [
      d("Pepperoni Pizza", "pepperoni-pizza"),
      d("ExtravaganZZa", "meat-lovers-pizza"),
      d("MeatZZa", "meat-lovers-pizza"),
      d("Pacific Veggie Pizza"),
      d("Philly Cheese Steak Pizza"),
      d("Chicken Alfredo Pasta"),
    ],
  },
  {
    names: ["Pizza Hut"],
    dishes: [
      d("Pepperoni Pan Pizza", "pepperoni-pizza"),
      d("Meat Lover's Pizza", "meat-lovers-pizza"),
      d("Supreme Pizza"),
      d("Veggie Lover's Pizza"),
      d("Traditional Wings", "buffalo-wings"),
    ],
  },
  {
    names: ["Papa Johns", "Papa John's", "Papa Johns Pizza"],
    dishes: [
      d("Pepperoni Pizza", "pepperoni-pizza"),
      d("The Works Pizza"),
      d("The Meats Pizza", "meat-lovers-pizza"),
      d("Garden Fresh Pizza"),
    ],
  },
  {
    names: ["Little Caesars", "Little Caesars Pizza"],
    dishes: [
      d("Classic Pepperoni Pizza", "pepperoni-pizza"),
      d("Deep Deep Dish Pizza"),
      d("3 Meat Treat Pizza", "meat-lovers-pizza"),
      d("Ultimate Supreme Pizza"),
      d("Caesar Wings", "buffalo-wings"),
    ],
  },
  {
    names: ["Dairy Queen", "DQ Grill & Chill", "Dairy Queen Grill & Chill"],
    dishes: [
      d("Chicken Strip Basket", "chicken-tenders"),
      d("Original Cheeseburger", "classic-cheeseburger"),
      d("FlameThrower Burger"),
      d("Crispy Chicken Sandwich"),
      d("Chili Cheese Dog"),
    ],
  },
  {
    names: ["Bojangles", "Bojangles'"],
    dishes: [
      d("Cajun Fried Chicken"),
      d("Chicken Supremes", "chicken-tenders"),
      d("Cajun Filet Sandwich"),
      b("Cajun Filet Biscuit"),
      b("Sausage Biscuit"),
    ],
  },
  {
    names: ["El Pollo Loco"],
    dishes: [
      d("Fire-Grilled Chicken"),
      d("Original Pollo Bowl"),
      d("Chicken Avocado Burrito"),
      d("Chicken Taco al Carbon"),
    ],
  },
  {
    names: ["Noodles & Company", "Noodles and Company"],
    dishes: [
      d("Wisconsin Mac & Cheese", "mac-and-cheese"),
      d("Japanese Pan Noodles"),
      d("Penne Rosa"),
      d("Pad Thai", "pad-thai"),
      d("Spicy Korean Beef Noodles"),
    ],
  },
  {
    names: ["CAVA"],
    dishes: [
      d("Harissa Avocado Bowl"),
      d("Chicken + Rice Bowl"),
      d("Spicy Lamb + Avocado Bowl"),
      d("Greek Salad", "greek-salad"),
    ],
  },
  {
    names: ["sweetgreen"],
    dishes: [
      d("Harvest Bowl"),
      d("Kale Caesar"),
      d("Guacamole Greens"),
      d("Chicken Pesto Parm"),
    ],
  },
  {
    names: ["Waffle House"],
    dishes: [
      d("Texas Bacon Patty Melt"),
      d("Texas Cheesesteak Melt", "philly-cheesesteak"),
      d("Double Cheeseburger Deluxe", "classic-cheeseburger"),
      b("All-Star Special"),
      b("Classic Waffle"),
      b("Pecan Waffle"),
    ],
  },
  {
    names: ["IHOP"],
    dishes: [
      d("Ultimate Steakburger", "classic-cheeseburger"),
      d("Crispy Chicken Strips & Fries", "chicken-tenders"),
      d("Chicken & Waffles", "chicken-and-waffles"),
      b("Original Buttermilk Pancakes", "pancake-stack"),
      b("Breakfast Sampler"),
      b("Stuffed French Toast", "french-toast"),
    ],
  },
  {
    names: ["Denny's"],
    dishes: [
      d("Bacon Slamburger", "classic-cheeseburger"),
      d("Country-Fried Steak", "chicken-fried-steak"),
      d("Sirloin Steak"),
      d("Club Sandwich", "club-sandwich"),
      b("Original Grand Slam"),
      b("Moons Over My Hammy"),
      b("Lumberjack Slam"),
    ],
  },
  {
    names: ["Cracker Barrel", "Cracker Barrel Old Country Store"],
    dishes: [
      d("Chicken n' Dumplins"),
      d("Meatloaf", "meatloaf"),
      d("Country Fried Steak", "chicken-fried-steak"),
      d("Homestyle Chicken"),
      d("Hamburger Steak"),
      b("Old Timer's Breakfast"),
      b("Momma's Pancake Breakfast", "pancake-stack"),
    ],
  },
  {
    names: ["Bob Evans"],
    dishes: [
      d("Country Fried Steak", "chicken-fried-steak"),
      d("Turkey & Dressing"),
      d("Pot Roast", "pot-roast"),
      b("Farmer's Choice Breakfast"),
      b("Rise & Shine"),
    ],
  },
  {
    names: ["First Watch"],
    dishes: [
      b("Chickichanga"),
      b("Lemon Ricotta Pancakes", "pancake-stack"),
      b("Avocado Toast", "avocado-toast"),
    ],
  },
  {
    names: ["Olive Garden", "Olive Garden Italian Restaurant"],
    dishes: [
      d("Fettuccine Alfredo"),
      d("Tour of Italy"),
      d("Chicken Parmigiana", "chicken-parmigiana"),
      d("Lasagna Classico"),
      d("Shrimp Scampi", "shrimp-scampi"),
      d("Zuppa Toscana"),
    ],
  },
  {
    names: ["Applebee's", "Applebee's Grill + Bar"],
    dishes: [
      d("Bourbon Street Chicken & Shrimp"),
      d("Chicken Tenders Platter", "chicken-tenders"),
      d("Classic Bacon Cheeseburger", "classic-cheeseburger"),
      d("Fiesta Lime Chicken"),
      d("Boneless Wings", "buffalo-wings"),
    ],
  },
  {
    names: ["Chili's", "Chili's Grill & Bar"],
    dishes: [
      d("Baby Back Ribs", "bbq-ribs"),
      d("Oldtimer with Cheese", "classic-cheeseburger"),
      d("Chicken Crispers", "chicken-tenders"),
      d("Cajun Chicken Pasta"),
      d("Chicken Fajitas"),
      d("Triple Dipper"),
    ],
  },
  {
    names: ["Texas Roadhouse"],
    dishes: [
      d("Sirloin Steak"),
      d("Ft. Worth Ribeye", "ribeye-steak"),
      d("Dallas Filet", "filet-mignon"),
      d("Fall-Off-The-Bone Ribs", "bbq-ribs"),
      d("Grilled BBQ Chicken"),
    ],
  },
  {
    names: ["Outback Steakhouse"],
    dishes: [
      d("Bloomin' Onion"),
      d("Center-Cut Sirloin"),
      d("Victoria's Filet Mignon", "filet-mignon"),
      d("Bone-In Ribeye", "ribeye-steak"),
      d("Alice Springs Chicken"),
      d("Baby Back Ribs", "bbq-ribs"),
    ],
  },
  {
    names: ["LongHorn Steakhouse"],
    dishes: [
      d("Flo's Filet", "filet-mignon"),
      d("Outlaw Ribeye", "ribeye-steak"),
      d("Renegade Sirloin"),
      d("Parmesan Crusted Chicken"),
      d("LongHorn Salmon", "grilled-salmon"),
    ],
  },
  {
    names: ["Red Lobster"],
    dishes: [
      d("Ultimate Feast"),
      d("Admiral's Feast"),
      d("Walt's Favorite Shrimp"),
      d("Salmon New Orleans", "grilled-salmon"),
      d("Parrot Isle Jumbo Coconut Shrimp"),
    ],
  },
  {
    names: ["Buffalo Wild Wings"],
    dishes: [
      d("Traditional Wings", "buffalo-wings"),
      d("Boneless Wings", "buffalo-wings"),
      d("All-American Cheeseburger", "classic-cheeseburger"),
      d("Chicken Tenders", "chicken-tenders"),
    ],
  },
  {
    names: ["The Cheesecake Factory", "Cheesecake Factory"],
    dishes: [
      d("Chicken Madeira"),
      d("Louisiana Chicken Pasta"),
      d("Chicken Parmesan", "chicken-parmigiana"),
      d("Avocado Eggrolls"),
      d("Factory Burrito Grande", "carne-asada-burrito"),
      d("Fish Tacos", "fish-tacos"),
    ],
  },
  {
    names: ["Red Robin", "Red Robin Gourmet Burgers and Brews"],
    dishes: [
      d("Whiskey River BBQ Burger", "bacon-bbq-burger"),
      d("Royal Red Robin Burger"),
      d("Banzai Burger"),
      d("Gourmet Cheeseburger", "classic-cheeseburger"),
      d("Clucks & Fries", "chicken-tenders"),
    ],
  },
  {
    names: ["TGI Fridays", "TGI Friday's"],
    dishes: [
      d("Whiskey-Glazed Ribs", "bbq-ribs"),
      d("Whiskey-Glazed Burger", "bacon-bbq-burger"),
      d("Loaded Potato Skins"),
      d("Bruschetta Chicken Pasta"),
      d("Sesame Jack Chicken Strips", "chicken-tenders"),
    ],
  },
  {
    names: ["Steak 'n Shake"],
    dishes: [
      d("Original Double 'n Cheese Steakburger", "smash-burger"),
      d("Frisco Melt"),
      d("Garlic Double Steakburger", "smash-burger"),
      d("Chili 3-Way"),
    ],
  },
  {
    names: ["Freddy's", "Freddy's Frozen Custard & Steakburgers"],
    dishes: [
      d("Original Double Steakburger", "smash-burger"),
      d("California Style Steakburger", "smash-burger"),
      d("Patty Melt"),
      d("Chicken Tenders", "chicken-tenders"),
    ],
  },
  {
    names: ["Smashburger"],
    dishes: [
      d("Classic Smash", "smash-burger"),
      d("Truffle Mushroom Swiss", "mushroom-swiss-burger"),
      d("BBQ Bacon Cheddar", "bacon-bbq-burger"),
      d("Crispy Chicken Sandwich"),
    ],
  },
  {
    names: ["Portillo's"],
    dishes: [
      d("Italian Beef"),
      d("Chicago-Style Hot Dog"),
      d("Maxwell Street Polish"),
      d("Chopped Salad"),
      d("Char-Grilled Cheeseburger", "classic-cheeseburger"),
    ],
  },
  {
    names: ["White Castle"],
    dishes: [
      d("The Original Slider"),
      d("Cheese Slider"),
      d("Chicken Rings"),
      d("Impossible Slider"),
    ],
  },
];

const DISHES_PER_PLACE = 4;

function pickRandom<T>(items: T[], count: number): T[] {
  return [...items].sort(() => Math.random() - 0.5).slice(0, count);
}

// A few of this chain's dishes for the meal; [] when the chain is on the
// list but serves nothing for it (no breakfast at Olive Garden), and null
// when it isn't on the list at all.
export function curatedChainDishes(placeName: string, meal: Meal): CuratedDish[] | null {
  const chain = CHAINS.find((c) => c.names.some((n) => sameChain(n, placeName)));
  if (!chain) return null;
  const forMeal = chain.dishes.filter((dish) => !!dish.breakfast === (meal === "breakfast"));
  return pickRandom(forMeal, DISHES_PER_PLACE);
}
