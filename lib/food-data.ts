export interface Dish {
  id: string;
  name: string;
  restaurant: string;
  cuisine: string;
  description: string;
  image: string;
  price: string;
  rating?: number;
  address?: string;
  placeId?: string;
}

export const DISHES: Dish[] = [
  {
    id: "d1",
    name: "Truffle Margherita",
    restaurant: "Bella Napoli",
    cuisine: "Italian",
    description: "Wood-fired crust, San Marzano tomato, fresh mozzarella, black truffle shavings",
    image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80",
    price: "$22",
  },
  {
    id: "d2",
    name: "Wagyu Burger",
    restaurant: "The Grill House",
    cuisine: "American",
    description: "A5 Wagyu beef patty, aged cheddar, caramelized onions, truffle aioli, brioche bun",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80",
    price: "$28",
  },
  {
    id: "d3",
    name: "Salmon Sashimi Platter",
    restaurant: "Sakura Japanese",
    cuisine: "Japanese",
    description: "Premium Atlantic salmon, soy glaze, pickled ginger, wasabi, cucumber rolls",
    image: "https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=800&q=80",
    price: "$32",
  },
  {
    id: "d4",
    name: "Spicy Pad Thai",
    restaurant: "Bangkok Street",
    cuisine: "Thai",
    description: "Rice noodles, tiger prawns, bean sprouts, peanuts, tamarind sauce, lime",
    image: "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=800&q=80",
    price: "$18",
  },
  {
    id: "d5",
    name: "Lamb Shawarma Bowl",
    restaurant: "Zara Mediterranean",
    cuisine: "Mediterranean",
    description: "Slow-roasted lamb, saffron rice, hummus, tzatziki, pickled cabbage",
    image: "https://images.unsplash.com/photo-1541014741259-de529411b96a?w=800&q=80",
    price: "$20",
  },
  {
    id: "d6",
    name: "Lobster Bisque",
    restaurant: "Harbor & Co.",
    cuisine: "Seafood",
    description: "Maine lobster, cream, sherry, tarragon oil, toasted sourdough croutons",
    image: "https://images.unsplash.com/photo-1547592180-85f173990554?w=800&q=80",
    price: "$24",
  },
  {
    id: "d7",
    name: "Mushroom Ramen",
    restaurant: "Noodle Lab",
    cuisine: "Japanese",
    description: "Rich porcini broth, silky noodles, soft-boiled egg, crispy tofu, scallions",
    image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&q=80",
    price: "$17",
  },
  {
    id: "d8",
    name: "BBQ Brisket Tacos",
    restaurant: "Smoke & Barrel",
    cuisine: "Mexican",
    description: "12-hour smoked brisket, pickled jalapeño, cotija cheese, cilantro, corn tortillas",
    image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&q=80",
    price: "$16",
  },
  {
    id: "d9",
    name: "Butter Chicken",
    restaurant: "Spice Route",
    cuisine: "Indian",
    description: "Tender chicken in creamy tomato gravy, aromatic spices, garlic naan",
    image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&q=80",
    price: "$19",
  },
  {
    id: "d10",
    name: "Avocado Toast Deluxe",
    restaurant: "Green Bowl Cafe",
    cuisine: "Brunch",
    description: "Sourdough, smashed avocado, poached eggs, everything bagel seasoning, microgreens",
    image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&q=80",
    price: "$15",
  },
  {
    id: "d11",
    name: "Duck Confit",
    restaurant: "Maison Française",
    cuisine: "French",
    description: "Slow-cooked duck leg, cherry gastrique, pomme purée, haricots verts",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
    price: "$36",
  },
  {
    id: "d12",
    name: "Ceviche Tostada",
    restaurant: "La Playa",
    cuisine: "Mexican",
    description: "Fresh sea bass, citrus cure, mango, red onion, avocado cream, crispy tostada",
    image: "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=800&q=80",
    price: "$14",
  },
  {
    id: "d13",
    name: "Pepperoni Deep Dish",
    restaurant: "Chicago Style Co.",
    cuisine: "Italian",
    description: "Thick crust loaded with pepperoni, mozzarella, house marinara, Italian sausage",
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80",
    price: "$26",
  },
  {
    id: "d14",
    name: "Prawn Laksa",
    restaurant: "Singapore Kitchen",
    cuisine: "Asian",
    description: "Coconut curry broth, fat prawns, rice noodles, tofu puffs, sambal",
    image: "https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=800&q=80",
    price: "$21",
  },
  {
    id: "d15",
    name: "Steak Frites",
    restaurant: "The Grill House",
    cuisine: "American",
    description: "8oz ribeye, crispy shoestring fries, compound butter, red wine jus",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80",
    price: "$42",
  },
];

export function shuffleDishes(): Dish[] {
  return [...DISHES].sort(() => Math.random() - 0.5);
}
