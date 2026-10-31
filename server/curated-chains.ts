// Our own short list of real menu items for the biggest US chains: their
// long-running signature items, not every add-on and side a menu database
// lists ("Red Pepper Strips" at Chick-fil-A). Checked before spoonacular, so
// these chains cost no quota and never fall back to a dishless card.
//
// Names are as the chain words them. Cards show the place's own Google
// photo, labeled as a photo of the place: never a generic example photo,
// since a stock cheeseburger standing in for a Big Mac fools nobody.
// Breakfast items show only in breakfast rooms, and everything else only at
// lunch and dinner.
//
// Keep to items a chain has sold for years: a retired item is worse than a
// short list.

import type { Meal } from "../lib/food-data";
import { sameChain } from "./chain-menus";

export interface CuratedDish {
  name: string;
  breakfast?: boolean;
}

const d = (name: string): CuratedDish => ({ name });
const b = (name: string): CuratedDish => ({ name, breakfast: true });

// Each chain's names as Google tends to give them; a place matches when its
// name equals one or extends it ("Chili's Grill & Bar" -> "Chili's").
const CHAINS: { names: string[]; dishes: CuratedDish[] }[] = [
  {
    names: ["McDonald's"],
    dishes: [
      d("Big Mac"),
      d("Quarter Pounder with Cheese"),
      d("Chicken McNuggets"),
      d("McChicken"),
      d("Filet-O-Fish"),
      d("Double Cheeseburger"),
      b("Egg McMuffin"),
      b("Sausage McGriddles"),
      b("Hotcakes"),
      b("Sausage Burrito"),
    ],
  },
  {
    names: ["Chick-fil-A"],
    dishes: [
      d("Chick-fil-A Chicken Sandwich"),
      d("Spicy Chicken Sandwich"),
      d("Chick-fil-A Nuggets"),
      d("Chick-n-Strips"),
      d("Grilled Chicken Sandwich"),
      d("Cobb Salad"),
      d("Spicy Southwest Salad"),
      b("Chick-fil-A Chicken Biscuit"),
      b("Chick-n-Minis"),
      b("Hash Brown Scramble Burrito"),
      b("Egg White Grill"),
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
      d("Dave's Single"),
      d("Baconator"),
      d("Spicy Chicken Sandwich"),
      d("Classic Chicken Sandwich"),
      d("Jr. Bacon Cheeseburger"),
      b("Breakfast Baconator"),
      b("Honey Butter Chicken Biscuit"),
    ],
  },
  {
    names: ["Burger King"],
    dishes: [
      d("Whopper"),
      d("Bacon King"),
      d("Original Chicken Sandwich"),
      d("Impossible Whopper"),
      d("Big Fish"),
      b("Croissan'wich"),
      b("French Toast Sticks"),
    ],
  },
  {
    names: ["Subway"],
    dishes: [
      d("Italian B.M.T."),
      d("Meatball Marinara"),
      d("Spicy Italian"),
      d("Steak & Cheese"),
      d("Turkey Breast"),
      d("Tuna"),
    ],
  },
  {
    names: ["Chipotle", "Chipotle Mexican Grill"],
    dishes: [
      d("Chicken Burrito"),
      d("Steak Burrito Bowl"),
      d("Carnitas Tacos"),
      d("Chicken Quesadilla"),
      d("Barbacoa Burrito"),
      d("Sofritas Bowl"),
    ],
  },
  {
    names: ["Sonic", "Sonic Drive-In"],
    dishes: [
      d("SuperSONIC Double Cheeseburger"),
      d("Sonic Cheeseburger"),
      d("Footlong Quarter Pound Coney"),
      d("Crispy Chicken Sandwich"),
      d("Super Crunch Chicken Strips"),
      b("Breakfast Burrito"),
      b("Breakfast Toaster"),
    ],
  },
  {
    names: ["Panda Express"],
    dishes: [
      d("The Original Orange Chicken"),
      d("Beijing Beef"),
      d("Kung Pao Chicken"),
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
      d("Chicken Tenders"),
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
      d("Extra Crispy Tenders"),
    ],
  },
  {
    names: ["Arby's"],
    dishes: [
      d("Classic Roast Beef"),
      d("Beef 'n Cheddar"),
      d("Smokehouse Brisket"),
      d("Reuben"),
      d("Classic French Dip & Swiss"),
      d("Greek Gyro"),
    ],
  },
  {
    names: ["Jack in the Box"],
    dishes: [
      d("Jumbo Jack"),
      d("Sourdough Jack"),
      d("Ultimate Cheeseburger"),
      d("Spicy Chicken Sandwich"),
      d("Chicken Teriyaki Bowl"),
      b("Supreme Croissant"),
      b("Breakfast Jack"),
    ],
  },
  {
    names: ["Whataburger"],
    dishes: [
      d("Whataburger"),
      d("Double Meat Whataburger"),
      d("Patty Melt"),
      d("Honey BBQ Chicken Strip Sandwich"),
      d("Whatachick'n Sandwich"),
      d("Whatachick'n Strips"),
      b("Honey Butter Chicken Biscuit"),
      b("Taquito with Cheese"),
      b("Breakfast on a Bun"),
    ],
  },
  {
    names: ["Five Guys"],
    dishes: [
      d("Cheeseburger"),
      d("Bacon Cheeseburger"),
      d("Little Bacon Burger"),
      d("Cheese Dog"),
      d("Veggie Sandwich"),
    ],
  },
  {
    names: ["In-N-Out", "In-N-Out Burger"],
    dishes: [
      d("Double-Double"),
      d("Cheeseburger"),
      d("Hamburger"),
      d("Animal Style Double-Double"),
      d("Protein Style Double-Double"),
    ],
  },
  {
    names: ["Culver's"],
    dishes: [
      d("ButterBurger The Original"),
      d("The Culver's Deluxe"),
      d("Crispy Chicken Sandwich"),
      d("North Atlantic Cod Filet Sandwich"),
      d("Pot Roast Sandwich"),
      d("Chicken Tenders"),
    ],
  },
  {
    names: ["Raising Cane's", "Raising Cane's Chicken Fingers"],
    dishes: [
      d("The Box Combo"),
      d("3 Finger Combo"),
      d("Caniac Combo"),
      d("The Sandwich Combo"),
    ],
  },
  {
    names: ["Wingstop"],
    dishes: [
      d("Lemon Pepper Wings"),
      d("Original Hot Wings"),
      d("Garlic Parmesan Boneless Wings"),
      d("Crispy Tenders"),
      d("Chicken Sandwich"),
    ],
  },
  {
    names: ["Zaxby's"],
    dishes: [
      d("Chicken Fingerz Plate"),
      d("Wings & Things"),
      d("Kickin' Chicken Sandwich"),
      d("Cobb Zalad"),
      d("Big Zax Snak"),
    ],
  },
  {
    names: ["Panera Bread", "Panera"],
    dishes: [
      d("Broccoli Cheddar Soup"),
      d("Mac & Cheese"),
      d("Chipotle Chicken Avo Melt"),
      d("Green Goddess Cobb Salad"),
      d("Caesar Salad with Chicken"),
      d("Classic Grilled Cheese"),
      b("Bacon, Egg & Cheese on Brioche"),
      b("Avocado, Egg White & Spinach"),
    ],
  },
  {
    names: ["Jersey Mike's", "Jersey Mike's Subs"],
    dishes: [
      d("The Original Italian"),
      d("Big Kahuna Cheese Steak"),
      d("Chipotle Cheese Steak"),
      d("Club Supreme"),
      d("Turkey and Provolone"),
      d("Tuna Fish"),
    ],
  },
  {
    names: ["Jimmy John's"],
    dishes: [
      d("Vito"),
      d("Italian Night Club"),
      d("Beach Club"),
      d("Turkey Tom"),
      d("The Gargantuan"),
    ],
  },
  {
    names: ["Firehouse Subs"],
    dishes: [
      d("Hook & Ladder"),
      d("Firehouse Meatball"),
      d("Italian"),
      d("Smokehouse Beef & Cheddar Brisket"),
      d("Steak & Cheese"),
    ],
  },
  {
    names: ["Qdoba", "Qdoba Mexican Eats", "Qdoba Mexican Grill"],
    dishes: [
      d("Chicken Burrito"),
      d("Steak Burrito"),
      d("Chicken Burrito Bowl"),
      d("Chicken Quesadilla"),
      d("Knockout Tacos"),
    ],
  },
  {
    names: ["Carl's Jr."],
    dishes: [
      d("Famous Star with Cheese"),
      d("Western Bacon Cheeseburger"),
      d("Super Star with Cheese"),
      d("Hand-Breaded Chicken Tenders"),
    ],
  },
  {
    names: ["Hardee's"],
    dishes: [
      d("Original Thickburger"),
      d("Mushroom 'N' Swiss Thickburger"),
      d("Frisco Burger"),
      d("Hand-Breaded Chicken Tenders"),
      b("Monster Biscuit"),
      b("Sausage Biscuit"),
      b("Frisco Breakfast Sandwich"),
    ],
  },
  {
    names: ["Shake Shack"],
    dishes: [
      d("ShackBurger"),
      d("SmokeShack"),
      d("Shack Stack"),
      d("Chicken Shack"),
      d("'Shroom Burger"),
    ],
  },
  {
    names: ["Domino's", "Domino's Pizza"],
    dishes: [
      d("Pepperoni Pizza"),
      d("ExtravaganZZa"),
      d("MeatZZa"),
      d("Pacific Veggie Pizza"),
      d("Philly Cheese Steak Pizza"),
      d("Chicken Alfredo Pasta"),
    ],
  },
  {
    names: ["Pizza Hut"],
    dishes: [
      d("Pepperoni Pan Pizza"),
      d("Meat Lover's Pizza"),
      d("Supreme Pizza"),
      d("Veggie Lover's Pizza"),
      d("Traditional Wings"),
    ],
  },
  {
    names: ["Papa Johns", "Papa John's", "Papa Johns Pizza"],
    dishes: [
      d("Pepperoni Pizza"),
      d("The Works Pizza"),
      d("The Meats Pizza"),
      d("Garden Fresh Pizza"),
    ],
  },
  {
    names: ["Little Caesars", "Little Caesars Pizza"],
    dishes: [
      d("Classic Pepperoni Pizza"),
      d("Deep Deep Dish Pizza"),
      d("3 Meat Treat Pizza"),
      d("Ultimate Supreme Pizza"),
      d("Caesar Wings"),
    ],
  },
  {
    names: ["Dairy Queen", "DQ Grill & Chill", "Dairy Queen Grill & Chill"],
    dishes: [
      d("Chicken Strip Basket"),
      d("Original Cheeseburger"),
      d("FlameThrower Burger"),
      d("Crispy Chicken Sandwich"),
      d("Chili Cheese Dog"),
    ],
  },
  {
    names: ["Bojangles", "Bojangles'"],
    dishes: [
      d("Cajun Fried Chicken"),
      d("Chicken Supremes"),
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
      d("Wisconsin Mac & Cheese"),
      d("Japanese Pan Noodles"),
      d("Penne Rosa"),
      d("Pad Thai"),
      d("Spicy Korean Beef Noodles"),
    ],
  },
  {
    names: ["CAVA"],
    dishes: [
      d("Harissa Avocado Bowl"),
      d("Chicken + Rice Bowl"),
      d("Spicy Lamb + Avocado Bowl"),
      d("Greek Salad"),
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
      d("Texas Cheesesteak Melt"),
      d("Double Cheeseburger Deluxe"),
      b("All-Star Special"),
      b("Classic Waffle"),
      b("Pecan Waffle"),
    ],
  },
  {
    names: ["IHOP"],
    dishes: [
      d("Ultimate Steakburger"),
      d("Crispy Chicken Strips & Fries"),
      d("Chicken & Waffles"),
      b("Original Buttermilk Pancakes"),
      b("Breakfast Sampler"),
      b("Stuffed French Toast"),
    ],
  },
  {
    names: ["Denny's"],
    dishes: [
      d("Bacon Slamburger"),
      d("Country-Fried Steak"),
      d("Sirloin Steak"),
      d("Club Sandwich"),
      b("Original Grand Slam"),
      b("Moons Over My Hammy"),
      b("Lumberjack Slam"),
    ],
  },
  {
    names: ["Cracker Barrel", "Cracker Barrel Old Country Store"],
    dishes: [
      d("Chicken n' Dumplins"),
      d("Meatloaf"),
      d("Country Fried Steak"),
      d("Homestyle Chicken"),
      d("Hamburger Steak"),
      b("Old Timer's Breakfast"),
      b("Momma's Pancake Breakfast"),
    ],
  },
  {
    names: ["Bob Evans"],
    dishes: [
      d("Country Fried Steak"),
      d("Turkey & Dressing"),
      d("Pot Roast"),
      b("Farmer's Choice Breakfast"),
      b("Rise & Shine"),
    ],
  },
  {
    names: ["First Watch"],
    dishes: [
      b("Chickichanga"),
      b("Lemon Ricotta Pancakes"),
      b("Avocado Toast"),
    ],
  },
  {
    names: ["Olive Garden", "Olive Garden Italian Restaurant"],
    dishes: [
      d("Fettuccine Alfredo"),
      d("Tour of Italy"),
      d("Chicken Parmigiana"),
      d("Lasagna Classico"),
      d("Shrimp Scampi"),
      d("Zuppa Toscana"),
    ],
  },
  {
    names: ["Applebee's", "Applebee's Grill + Bar"],
    dishes: [
      d("Bourbon Street Chicken & Shrimp"),
      d("Chicken Tenders Platter"),
      d("Classic Bacon Cheeseburger"),
      d("Fiesta Lime Chicken"),
      d("Boneless Wings"),
    ],
  },
  {
    names: ["Chili's", "Chili's Grill & Bar"],
    dishes: [
      d("Baby Back Ribs"),
      d("Oldtimer with Cheese"),
      d("Chicken Crispers"),
      d("Cajun Chicken Pasta"),
      d("Chicken Fajitas"),
      d("Triple Dipper"),
    ],
  },
  {
    names: ["Texas Roadhouse"],
    dishes: [
      d("Sirloin Steak"),
      d("Ft. Worth Ribeye"),
      d("Dallas Filet"),
      d("Fall-Off-The-Bone Ribs"),
      d("Grilled BBQ Chicken"),
    ],
  },
  {
    names: ["Outback Steakhouse"],
    dishes: [
      d("Bloomin' Onion"),
      d("Center-Cut Sirloin"),
      d("Victoria's Filet Mignon"),
      d("Bone-In Ribeye"),
      d("Alice Springs Chicken"),
      d("Baby Back Ribs"),
    ],
  },
  {
    names: ["LongHorn Steakhouse"],
    dishes: [
      d("Flo's Filet"),
      d("Outlaw Ribeye"),
      d("Renegade Sirloin"),
      d("Parmesan Crusted Chicken"),
      d("LongHorn Salmon"),
    ],
  },
  {
    names: ["Red Lobster"],
    dishes: [
      d("Ultimate Feast"),
      d("Admiral's Feast"),
      d("Walt's Favorite Shrimp"),
      d("Salmon New Orleans"),
      d("Parrot Isle Jumbo Coconut Shrimp"),
    ],
  },
  {
    names: ["Buffalo Wild Wings"],
    dishes: [
      d("Traditional Wings"),
      d("Boneless Wings"),
      d("All-American Cheeseburger"),
      d("Chicken Tenders"),
    ],
  },
  {
    names: ["The Cheesecake Factory", "Cheesecake Factory"],
    dishes: [
      d("Chicken Madeira"),
      d("Louisiana Chicken Pasta"),
      d("Chicken Parmesan"),
      d("Avocado Eggrolls"),
      d("Factory Burrito Grande"),
      d("Fish Tacos"),
    ],
  },
  {
    names: ["Red Robin", "Red Robin Gourmet Burgers and Brews"],
    dishes: [
      d("Whiskey River BBQ Burger"),
      d("Royal Red Robin Burger"),
      d("Banzai Burger"),
      d("Gourmet Cheeseburger"),
      d("Clucks & Fries"),
    ],
  },
  {
    names: ["TGI Fridays", "TGI Friday's"],
    dishes: [
      d("Whiskey-Glazed Ribs"),
      d("Whiskey-Glazed Burger"),
      d("Loaded Potato Skins"),
      d("Bruschetta Chicken Pasta"),
      d("Sesame Jack Chicken Strips"),
    ],
  },
  {
    names: ["Steak 'n Shake"],
    dishes: [
      d("Original Double 'n Cheese Steakburger"),
      d("Frisco Melt"),
      d("Garlic Double Steakburger"),
      d("Chili 3-Way"),
    ],
  },
  {
    names: ["Freddy's", "Freddy's Frozen Custard & Steakburgers"],
    dishes: [
      d("Original Double Steakburger"),
      d("California Style Steakburger"),
      d("Patty Melt"),
      d("Chicken Tenders"),
    ],
  },
  {
    names: ["Smashburger"],
    dishes: [
      d("Classic Smash"),
      d("Truffle Mushroom Swiss"),
      d("BBQ Bacon Cheddar"),
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
      d("Char-Grilled Cheeseburger"),
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
