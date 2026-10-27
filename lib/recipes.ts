// Ingredients and method for each cook-in recipe in RECIPES (lib/food-data.ts),
// keyed by its id. Kept apart from the Dish so session messages and match
// push payloads stay small; the match screen looks the recipe up here.
// Written for this app. Quantities make the recipe's listed servings.

export interface IngredientGroup {
  // Omitted when the recipe has one list.
  title?: string;
  items: string[];
}

export interface Recipe {
  ingredients: IngredientGroup[];
  steps: string[];
  tip?: string;
}

export const RECIPE_DETAILS: Record<string, Recipe> = {
  r1: {
    ingredients: [
      {
        items: [
          "1½ lb (700 g) boneless, skinless chicken thighs",
          "Salt and black pepper",
          "1 tsp dried Italian seasoning",
          "1 tbsp olive oil",
          "1 tbsp butter",
          "5 cloves garlic, minced",
          "½ cup sun-dried tomatoes in oil, drained and sliced",
          "1 cup heavy cream",
          "½ cup chicken broth",
          "¾ cup grated parmesan",
          "3 cups baby spinach",
          "Pinch of red pepper flakes (optional)",
        ],
      },
    ],
    steps: [
      "Pat the chicken dry and season both sides with salt, pepper and the Italian seasoning.",
      "Heat the oil in a large skillet over medium-high. Sear the chicken 5–6 minutes per side until golden and cooked through (165°F / 74°C). Move to a plate.",
      "Lower the heat to medium. Melt the butter, add the garlic and sun-dried tomatoes and cook 1 minute until fragrant.",
      "Pour in the broth and scrape up the browned bits, then stir in the cream and parmesan. Simmer 3–4 minutes until slightly thickened.",
      "Stir in the spinach until wilted. Taste and season with salt, pepper and red pepper flakes.",
      "Return the chicken and any juices to the pan, spoon the sauce over and simmer 2 minutes. Serve with pasta, rice or crusty bread.",
    ],
  },
  r2: {
    ingredients: [
      {
        title: "Broth",
        items: [
          "1 tbsp sesame oil",
          "4 cloves garlic, grated",
          "1 tbsp grated fresh ginger",
          "6 cups chicken broth",
          "2 cups water",
          "¼ cup white miso paste",
          "2 tbsp soy sauce",
          "1 tbsp mirin",
        ],
      },
      {
        title: "Bowls",
        items: [
          "4 eggs",
          "12 oz (340 g) pork belly, thinly sliced, or store-bought chashu",
          "1 tbsp soy sauce plus 1 tsp sugar, for the pork",
          "4 portions fresh ramen noodles (about 1¼ lb / 560 g)",
          "1 cup corn kernels",
          "2 green onions, sliced",
          "2 sheets nori, cut in strips",
        ],
      },
    ],
    steps: [
      "Bring a pot of water to a boil. Lower in the eggs and cook 6½ minutes, then move them to ice water. Peel once cool.",
      "In a large pot, warm the sesame oil over medium and cook the garlic and ginger 1 minute. Add the broth and water and bring to a simmer.",
      "Whisk the miso with a ladle of hot broth until smooth, then stir it back into the pot with the soy sauce and mirin. Keep it hot but don't let it boil.",
      "Sear the pork in a hot skillet 2–3 minutes per side until browned and cooked through. Add the soy sauce and sugar and toss until glazed.",
      "Cook the noodles according to the package, usually 2–3 minutes. Drain well.",
      "Divide the noodles among bowls and ladle the broth over. Top with the pork, a halved egg, corn, green onion and nori.",
    ],
    tip: "Soft-boiled eggs keep up to 4 days in the fridge, so make extra.",
  },
  r3: {
    ingredients: [
      {
        items: [
          "2 salmon fillets (6 oz / 170 g each)",
          "1 bunch asparagus, woody ends snapped off",
          "1 cup cherry tomatoes",
          "1 tbsp olive oil",
          "Salt and black pepper",
          "2 tbsp butter, melted",
          "2 cloves garlic, minced",
          "1 lemon: zest, juice of half, other half sliced",
          "2 tbsp chopped fresh dill",
        ],
      },
    ],
    steps: [
      "Heat the oven to 400°F (200°C) and line a sheet pan with foil or parchment.",
      "Toss the asparagus and tomatoes with the olive oil, salt and pepper and spread them on the pan, leaving room in the middle.",
      "Set the salmon in the middle and season it with salt and pepper.",
      "Mix the melted butter, garlic, lemon zest and lemon juice and spoon it over the salmon. Lay the lemon slices on top.",
      "Roast 12–15 minutes, until the salmon flakes easily (at least 125°F / 52°C for medium, 145°F / 63°C for well done).",
      "Scatter the dill over everything and serve straight from the pan.",
    ],
  },
  r4: {
    ingredients: [
      {
        title: "Marinade",
        items: [
          "1½ lb (700 g) boneless chicken thighs, cut in bite-size pieces",
          "½ cup plain yogurt",
          "1 tbsp lemon juice",
          "2 tsp garam masala",
          "1 tsp ground cumin",
          "1 tsp paprika",
          "1 tsp salt",
        ],
      },
      {
        title: "Sauce",
        items: [
          "2 tbsp butter or ghee",
          "1 onion, finely chopped",
          "4 cloves garlic, minced",
          "1 tbsp grated fresh ginger",
          "2 tsp garam masala",
          "1 tsp ground cumin",
          "1 tsp ground turmeric",
          "½ tsp chili powder",
          "1 can (14 oz / 400 g) crushed tomatoes",
          "¾ cup heavy cream",
          "Salt to taste",
          "Fresh cilantro, to serve",
        ],
      },
      {
        title: "To serve",
        items: ["1½ cups basmati rice", "4 naan breads"],
      },
    ],
    steps: [
      "Mix the chicken with all the marinade ingredients and leave it 15 minutes (or overnight in the fridge).",
      "Rinse the rice and cook it according to the package while you make the curry.",
      "Heat a large skillet over high. Cook the chicken in batches, 3–4 minutes a side, until charred in spots. It finishes cooking in the sauce. Set aside.",
      "Lower the heat to medium and melt the butter. Cook the onion 6–8 minutes until soft and golden, then add the garlic, ginger and spices and stir 1 minute.",
      "Add the tomatoes and simmer 10 minutes, stirring now and then, until thick.",
      "Stir in the cream, add the chicken and simmer 8–10 minutes until it's cooked through (165°F / 74°C). Season with salt.",
      "Warm the naan in the oven or a dry pan. Serve the curry over rice, topped with cilantro.",
    ],
  },
  r5: {
    ingredients: [
      {
        items: [
          "1 lb (450 g) spaghetti",
          "6 oz (170 g) guanciale or pancetta, cut in small strips",
          "4 egg yolks plus 2 whole eggs",
          "1 cup finely grated pecorino romano, plus more to serve",
          "2 tsp freshly cracked black pepper",
          "Salt, for the pasta water",
        ],
      },
    ],
    steps: [
      "Bring a large pot of water to a boil and salt it lightly (the cheese and guanciale are salty).",
      "Whisk the yolks, whole eggs, pecorino and most of the pepper in a bowl into a thick paste.",
      "Cook the guanciale in a large cold skillet over medium heat 8–10 minutes, until crisp and the fat has rendered. Turn off the heat.",
      "Cook the spaghetti until al dente. Save 1 cup of the pasta water before draining.",
      "Tip the hot pasta into the skillet with the guanciale and toss to coat in the fat. Let it sit off the heat for 30 seconds.",
      "Whisk 2–3 tbsp of pasta water into the egg mixture, pour it over the pasta and toss fast, adding splashes of water until the sauce is glossy and creamy. Keep it off the heat so the eggs don't scramble.",
      "Serve right away with more pecorino and the rest of the pepper.",
    ],
  },
  r6: {
    ingredients: [
      {
        title: "Beef",
        items: [
          "1 lb (450 g) flank steak, thinly sliced against the grain",
          "1 tbsp soy sauce",
          "1 tbsp cornstarch",
        ],
      },
      {
        title: "Sauce",
        items: [
          "3 tbsp soy sauce",
          "1 tbsp oyster sauce",
          "1 tbsp brown sugar",
          "1 tbsp rice vinegar",
          "1 tbsp grated fresh ginger",
          "2 cloves garlic, minced",
          "1 tsp cornstarch",
          "¼ cup water",
        ],
      },
      {
        title: "Stir-fry",
        items: [
          "2 tbsp neutral oil",
          "2 cups broccoli florets",
          "1 red bell pepper, sliced",
          "1 green bell pepper, sliced",
          "2 green onions, cut in 2-inch pieces",
          "1 cup jasmine rice",
        ],
      },
    ],
    steps: [
      "Rinse the rice and cook it according to the package.",
      "Toss the beef with the soy sauce and cornstarch. Whisk all the sauce ingredients in a small bowl.",
      "Heat 1 tbsp oil in a wok or large skillet over high until shimmering. Sear the beef in one layer, 1–2 minutes a side, then move it to a plate.",
      "Add the rest of the oil and the broccoli with 2 tbsp water. Stir-fry 3 minutes, then add the peppers and cook 2 minutes more until crisp-tender.",
      "Return the beef, add the green onions, stir the sauce and pour it in. Toss 1 minute until glossy and thick.",
      "Serve over the rice.",
    ],
  },
  r7: {
    ingredients: [
      {
        title: "Dough (2 pizzas)",
        items: [
          "3¼ cups (400 g) bread flour or 00 flour",
          "1¼ cups (300 ml) warm water",
          "2¼ tsp (1 packet) instant yeast",
          "1½ tsp salt",
          "1 tbsp olive oil",
        ],
      },
      {
        title: "Toppings",
        items: [
          "1 can (14 oz / 400 g) San Marzano tomatoes",
          "1 clove garlic, grated",
          "½ tsp salt",
          "8 oz (225 g) fresh mozzarella, torn and patted dry",
          "Fresh basil leaves",
          "Extra-virgin olive oil, to drizzle",
        ],
      },
    ],
    steps: [
      "Put a pizza stone, steel or upside-down baking sheet in the oven and heat it as hot as it goes, 500–550°F (260–290°C), for at least 30 minutes.",
      "Mix the flour, yeast and salt, then add the water and oil. Knead 5 minutes until smooth. Cover and rest while the oven heats (about 30 minutes).",
      "Crush the tomatoes by hand with the garlic and salt. Don't cook the sauce.",
      "Halve the dough. On a floured surface, press each half from the middle out into a 12-inch round, leaving a thicker edge.",
      "Move one round to floured parchment. Spread on a thin layer of sauce and scatter half the mozzarella.",
      "Slide it (parchment and all) onto the hot stone and bake 7–10 minutes until the crust is blistered and the cheese bubbles. Repeat with the second pizza.",
      "Top with basil and a drizzle of olive oil and slice.",
    ],
    tip: "Short on time? Store-bought pizza dough works; let it come to room temperature first.",
  },
  r8: {
    ingredients: [
      {
        items: [
          "1½ cups jasmine rice",
          "1 tbsp neutral oil",
          "3–4 tbsp green curry paste",
          "2 cans (13.5 oz / 400 ml each) coconut milk",
          "1½ lb (700 g) boneless chicken thighs, thinly sliced",
          "1 can (8 oz) bamboo shoots, drained",
          "1 red bell pepper, sliced",
          "2 tbsp fish sauce",
          "1 tbsp brown or palm sugar",
          "1 cup Thai basil leaves (or regular basil)",
          "1 lime, cut in wedges",
        ],
      },
    ],
    steps: [
      "Rinse the rice and cook it according to the package.",
      "Heat the oil in a large pot over medium. Fry the curry paste 1 minute, stirring, until fragrant.",
      "Pour in the thick cream from the top of one can of coconut milk and simmer 2 minutes, until the oil starts to separate.",
      "Add the chicken and stir to coat, then add the rest of the coconut milk. Simmer 8–10 minutes until the chicken is cooked through.",
      "Stir in the bamboo shoots, bell pepper, fish sauce and sugar and simmer 3 minutes more.",
      "Taste: add fish sauce for salt, sugar for sweetness or more paste for heat. Stir in the basil off the heat.",
      "Serve over rice with lime wedges.",
    ],
  },
  r9: {
    ingredients: [
      {
        title: "Special sauce",
        items: [
          "½ cup mayonnaise",
          "2 tbsp ketchup",
          "1 tbsp yellow mustard",
          "2 tbsp finely chopped pickles plus 1 tsp pickle juice",
        ],
      },
      {
        title: "Burgers",
        items: [
          "1½ lb (700 g) ground beef, 80/20",
          "Salt and black pepper",
          "8 slices American cheese",
          "4 brioche buns, split",
          "1 tbsp butter, softened",
          "Pickle chips",
          "½ onion, very thinly sliced (optional)",
        ],
      },
    ],
    steps: [
      "Stir the sauce ingredients together and refrigerate.",
      "Divide the beef into 8 loose balls (3 oz each). Don't pack them tight. Keep them cold until cooking.",
      "Butter the cut sides of the buns and toast them in a large cast-iron skillet over medium until golden. Set aside.",
      "Turn the heat to high and wait until the pan is smoking hot. Add 2–3 balls with space between them and smash each flat with a sturdy spatula. Season with salt and pepper.",
      "Cook 2 minutes without moving, until a deep brown crust forms. Scrape under each patty, flip, add a slice of cheese and cook 1 minute more, until cooked through.",
      "Stack two patties per bun with sauce, pickles and onion. Repeat with the rest of the beef.",
    ],
  },
  r10: {
    ingredients: [
      {
        items: [
          "12 oz (340 g) linguine",
          "1 lb (450 g) large shrimp, peeled and deveined",
          "Salt and black pepper",
          "2 tbsp olive oil",
          "4 tbsp butter, divided",
          "5 cloves garlic, thinly sliced",
          "½ tsp red pepper flakes",
          "½ cup dry white wine (or chicken broth)",
          "1 lemon: zest and juice",
          "¼ cup chopped fresh parsley",
        ],
      },
    ],
    steps: [
      "Cook the linguine in salted boiling water until al dente. Save ½ cup of the pasta water before draining.",
      "Pat the shrimp dry and season with salt and pepper.",
      "Heat the oil and 1 tbsp butter in a large skillet over medium-high. Cook the shrimp 1–2 minutes a side until just pink, then move to a plate.",
      "Lower the heat to medium. Add 1 tbsp butter, the garlic and pepper flakes and cook 1 minute without browning.",
      "Pour in the wine and simmer 2 minutes until reduced by half. Stir in the remaining butter, the lemon zest and juice.",
      "Add the linguine, shrimp and a splash of pasta water and toss until glossy. Finish with parsley and season to taste.",
    ],
  },
  r11: {
    ingredients: [
      {
        title: "Sauce",
        items: [
          "2 tbsp gochujang",
          "1 tbsp sesame oil",
          "1 tbsp water",
          "1 tsp sugar",
          "1 tsp rice vinegar",
          "1 tsp toasted sesame seeds",
        ],
      },
      {
        title: "Quick-pickled radish",
        items: [
          "1 cup daikon radish, cut in matchsticks",
          "¼ cup rice vinegar",
          "1 tbsp sugar",
          "½ tsp salt",
        ],
      },
      {
        title: "Bowls",
        items: [
          "1 cup short-grain rice",
          "2 tbsp neutral oil, divided",
          "1 carrot, cut in matchsticks",
          "1 zucchini, cut in matchsticks",
          "4 oz (115 g) shiitake mushrooms, sliced",
          "3 cups spinach",
          "1 cup bean sprouts",
          "2 cloves garlic, minced",
          "Soy sauce and sesame oil, for the vegetables",
          "2 eggs",
        ],
      },
    ],
    steps: [
      "Rinse the rice and cook it according to the package.",
      "Mix the radish with the vinegar, sugar and salt and set aside. Stir the sauce ingredients together.",
      "Heat 1 tbsp oil in a skillet over medium-high. Cook each vegetable separately, 1–3 minutes, with a pinch of garlic and a few drops of soy sauce: carrot, zucchini, mushrooms, then spinach and sprouts. Set each aside.",
      "Toss the cooked vegetables with a few drops of sesame oil.",
      "Add the remaining oil to the pan and fry the eggs sunny side up until the whites are set.",
      "Divide the rice between bowls, arrange the vegetables and drained radish around the top and finish with an egg. Mix in the sauce at the table.",
    ],
  },
  r12: {
    ingredients: [
      {
        title: "Chicken",
        items: [
          "1½ lb (700 g) boneless chicken breasts or thighs, sliced in strips",
          "2 tbsp olive oil",
          "1 lime, juiced",
          "2 tsp chili powder",
          "1 tsp ground cumin",
          "1 tsp smoked paprika",
          "½ tsp garlic powder",
          "1 tsp salt",
        ],
      },
      {
        title: "Vegetables and to serve",
        items: [
          "1 tbsp oil",
          "3 bell peppers, mixed colors, sliced",
          "1 large onion, sliced",
          "8–12 flour tortillas",
          "Guacamole",
          "Sour cream",
          "Salsa, cilantro and lime wedges",
        ],
      },
    ],
    steps: [
      "Toss the chicken with the oil, lime juice, spices and salt. Leave 10 minutes.",
      "Heat a large cast-iron skillet over high. Cook the chicken in one layer, 5–6 minutes, turning, until charred and cooked through (165°F / 74°C). Move to a plate.",
      "Add the oil, peppers and onion and cook 5–7 minutes, stirring now and then, until soft with charred edges.",
      "Return the chicken to the pan and toss.",
      "Warm the tortillas in a dry pan or wrapped in foil in the oven.",
      "Bring the skillet to the table with the tortillas, guacamole, sour cream and toppings.",
    ],
  },
  r13: {
    ingredients: [
      {
        items: [
          "6 cups chicken or vegetable broth",
          "3 tbsp butter, divided",
          "1 tbsp olive oil",
          "1 lb (450 g) mixed mushrooms (cremini, shiitake, oyster), sliced",
          "Salt and black pepper",
          "1 shallot or small onion, finely chopped",
          "2 cloves garlic, minced",
          "1½ cups arborio rice",
          "½ cup dry white wine",
          "1 tsp fresh thyme leaves",
          "¾ cup grated parmesan",
        ],
      },
    ],
    steps: [
      "Warm the broth in a saucepan and keep it at a bare simmer.",
      "In a wide pan over medium-high, heat the oil and 1 tbsp butter. Cook the mushrooms 6–8 minutes until browned, season with salt and pepper and set aside.",
      "Melt 1 tbsp butter in the same pan over medium. Cook the shallot 3 minutes, add the garlic and rice and stir 2 minutes until the grains look translucent at the edges.",
      "Pour in the wine and stir until absorbed.",
      "Add the hot broth a ladle at a time, stirring often and waiting until each is mostly absorbed before adding the next. After 18–20 minutes the rice should be creamy and tender with a little bite.",
      "Off the heat, stir in the mushrooms, thyme, parmesan and last tbsp of butter. Season, cover for 2 minutes and serve.",
    ],
  },
  r14: {
    ingredients: [
      {
        title: "Pickled onion and lime crema",
        items: [
          "1 red onion, thinly sliced",
          "½ cup lime juice or vinegar, 1 tsp sugar, ½ tsp salt",
          "½ cup sour cream",
          "1 lime: zest and juice",
        ],
      },
      {
        title: "Chipotle slaw",
        items: [
          "3 cups shredded cabbage",
          "¼ cup mayonnaise",
          "1–2 chipotle peppers in adobo, chopped, plus 1 tsp adobo sauce",
          "1 tbsp lime juice",
        ],
      },
      {
        title: "Beer-battered cod",
        items: [
          "1½ lb (700 g) cod, cut in finger-size strips",
          "1 cup flour, plus ¼ cup for dredging",
          "1 tsp baking powder",
          "1 tsp salt",
          "1 cup cold light beer (or sparkling water)",
          "Neutral oil, for frying",
          "12 corn tortillas",
          "Cilantro, to serve",
        ],
      },
    ],
    steps: [
      "Mix the onion with the lime juice, sugar and salt and leave it to pickle. Stir together the crema. Toss the slaw ingredients.",
      "Heat 2 inches of oil in a heavy pot to 375°F (190°C).",
      "Whisk the 1 cup flour, baking powder and salt, then whisk in the beer until just smooth.",
      "Pat the fish dry, dredge it in the extra flour, then dip it in the batter and let the excess drip off.",
      "Fry in batches 3–4 minutes, turning once, until golden and cooked through. Drain on a rack and sprinkle with salt.",
      "Warm the tortillas in a dry pan. Fill each with slaw and fish and top with crema, pickled onion and cilantro.",
    ],
    tip: "Not up for frying? Season the cod with chili powder and salt and pan-sear it 3 minutes a side instead.",
  },
  r15: {
    ingredients: [
      {
        items: [
          "2 large chicken breasts, halved horizontally into 4 cutlets",
          "Salt and black pepper",
          "½ cup flour",
          "2 eggs, beaten",
          "1 cup panko breadcrumbs",
          "½ cup grated parmesan",
          "1 tsp dried Italian seasoning",
          "Olive oil, for frying",
          "2 cups marinara sauce",
          "1½ cups shredded mozzarella",
          "12 oz (340 g) spaghetti",
          "Fresh basil, to serve",
        ],
      },
    ],
    steps: [
      "Heat the oven to 425°F (220°C). Start a pot of salted water for the spaghetti.",
      "Pound the cutlets to an even ½ inch thick and season with salt and pepper.",
      "Set up three plates: flour; eggs; panko mixed with parmesan and Italian seasoning. Coat each cutlet in flour, then egg, then the crumbs, pressing to stick.",
      "Heat ¼ inch of oil in a large skillet over medium-high. Fry the cutlets 2–3 minutes a side until golden. Move to a baking sheet.",
      "Spoon a little marinara over each cutlet and top with mozzarella. Bake 10 minutes until the cheese bubbles and the chicken is cooked through (165°F / 74°C).",
      "Meanwhile cook the spaghetti, drain and toss with the remaining marinara, warmed.",
      "Serve the chicken over the spaghetti with torn basil.",
    ],
  },
  r16: {
    ingredients: [
      {
        title: "Broth",
        items: [
          "1 large onion, halved",
          "3-inch piece fresh ginger, halved lengthwise",
          "3 star anise",
          "1 cinnamon stick",
          "4 whole cloves",
          "1 tsp coriander seeds",
          "8 cups beef broth",
          "2 cups water",
          "3 tbsp fish sauce",
          "1 tbsp sugar",
        ],
      },
      {
        title: "Bowls",
        items: [
          "14 oz (400 g) dried flat rice noodles",
          "12 oz (340 g) beef eye of round or sirloin, partly frozen and sliced paper-thin",
          "2 cups bean sprouts",
          "Fresh Thai basil, cilantro and mint",
          "2 limes, cut in wedges",
          "1 jalapeño, sliced",
          "Hoisin and sriracha, to serve",
        ],
      },
    ],
    steps: [
      "Char the onion and ginger, cut side down, in a dry pot over high heat, or directly over a gas flame, until blackened in spots, about 5 minutes.",
      "Add the star anise, cinnamon, cloves and coriander and toast 1 minute, until fragrant.",
      "Pour in the broth and water, bring to a boil, then simmer gently, partly covered, for 40 minutes.",
      "Meanwhile soak the noodles in hot water for 20–30 minutes until pliable, then cook them in boiling water 30–60 seconds until tender. Drain.",
      "Strain the broth and stir in the fish sauce and sugar. Taste and adjust, then bring it back to a rolling boil.",
      "Divide the noodles among bowls, lay the raw beef on top and ladle the boiling broth straight over the beef so it cooks.",
      "Serve with the sprouts, herbs, lime, jalapeño, hoisin and sriracha for everyone to add.",
    ],
    tip: "The broth must be at a full boil when it hits the beef. If anyone prefers it cooked more, dip their slices in the pot for 30 seconds first.",
  },
  r17: {
    ingredients: [
      {
        items: [
          "2 tbsp olive oil",
          "1 onion, chopped",
          "1 red bell pepper, chopped",
          "3 cloves garlic, minced",
          "1 tsp ground cumin",
          "1 tsp smoked paprika",
          "¼ tsp chili flakes or cayenne",
          "1 can (28 oz / 800 g) crushed tomatoes",
          "Salt and black pepper",
          "6 eggs",
          "½ cup crumbled feta",
          "Chopped parsley or cilantro",
          "Crusty sourdough bread, to serve",
        ],
      },
    ],
    steps: [
      "Heat the oil in a large skillet over medium. Cook the onion and pepper 6–8 minutes until soft.",
      "Add the garlic and spices and stir 1 minute.",
      "Pour in the tomatoes, season with salt and pepper and simmer 10 minutes until slightly thickened.",
      "Make 6 wells in the sauce with a spoon and crack an egg into each.",
      "Cover and cook on low 5–8 minutes, until the whites are set and the yolks still soft.",
      "Scatter the feta and herbs over and serve from the pan with toasted sourdough.",
    ],
  },
  r18: {
    ingredients: [
      {
        title: "Bulgogi",
        items: [
          "1 lb (450 g) ribeye or sirloin, partly frozen and sliced very thin",
          "¼ cup soy sauce",
          "2 tbsp brown sugar",
          "1 tbsp sesame oil",
          "½ Asian pear or 1 small apple, grated",
          "4 cloves garlic, minced",
          "1 tsp grated fresh ginger",
          "2 green onions, sliced",
          "1 tbsp neutral oil",
        ],
      },
      {
        title: "Sesame spinach",
        items: [
          "1 bunch spinach",
          "1 tsp sesame oil",
          "1 tsp soy sauce",
          "1 tsp toasted sesame seeds",
        ],
      },
      {
        title: "Quick pickles and to serve",
        items: [
          "1 cucumber and 1 carrot, thinly sliced",
          "¼ cup rice vinegar, 1 tbsp sugar, ½ tsp salt",
          "1½ cups short-grain rice",
          "1 cup kimchi",
        ],
      },
    ],
    steps: [
      "Mix the soy sauce, sugar, sesame oil, pear, garlic, ginger and half the green onions. Toss with the beef and leave 15 minutes.",
      "Rinse the rice and cook it according to the package.",
      "Mix the cucumber and carrot with the vinegar, sugar and salt and set aside.",
      "Blanch the spinach in boiling water 30 seconds, rinse under cold water and squeeze dry. Toss with sesame oil, soy sauce and sesame seeds.",
      "Heat the oil in a large skillet over high. Cook the beef in batches in one layer, 1–2 minutes a side, until caramelized.",
      "Fill bowls with rice and top with the beef, spinach, drained pickles and kimchi. Finish with the rest of the green onions.",
    ],
  },
  r19: {
    ingredients: [
      {
        title: "Chicken and pasta",
        items: [
          "2 chicken breasts",
          "1 tbsp olive oil",
          "Salt, black pepper and ½ tsp garlic powder",
          "1 lb (450 g) fettuccine",
          "2 cups broccoli florets",
        ],
      },
      {
        title: "Alfredo sauce",
        items: [
          "4 tbsp butter",
          "3 cloves garlic, minced",
          "1½ cups heavy cream",
          "1½ cups finely grated parmesan",
          "Pinch of nutmeg",
        ],
      },
      {
        title: "Garlic bread",
        items: [
          "1 baguette, halved lengthwise",
          "4 tbsp butter, softened, mixed with 2 cloves grated garlic and chopped parsley",
        ],
      },
    ],
    steps: [
      "Heat the oven to 400°F (200°C) and start a large pot of salted water.",
      "Season the chicken with salt, pepper and garlic powder. Cook it in the oil in a skillet or grill pan over medium-high, 6–7 minutes a side, until cooked through (165°F / 74°C). Rest 5 minutes, then slice.",
      "Spread the garlic butter on the baguette and bake 8–10 minutes until golden.",
      "Cook the fettuccine. Add the broccoli for the last 3 minutes. Save 1 cup of pasta water and drain.",
      "Meanwhile melt the butter in a wide pan over medium, add the garlic for 1 minute, then the cream. Simmer 3–4 minutes. Off the heat, stir in the parmesan a handful at a time with the nutmeg.",
      "Toss the pasta and broccoli in the sauce, loosening with pasta water as needed. Top with the chicken and serve with the garlic bread.",
    ],
  },
  r20: {
    ingredients: [
      {
        title: "Salmon and teriyaki",
        items: [
          "2 salmon fillets (6 oz / 170 g each), skin removed, cut in cubes",
          "¼ cup soy sauce",
          "2 tbsp mirin",
          "1 tbsp honey or brown sugar",
          "1 tsp grated fresh ginger",
          "1 tsp cornstarch mixed with 1 tbsp water",
          "1 tbsp neutral oil",
        ],
      },
      {
        title: "Bowls",
        items: [
          "1 cup sushi rice",
          "1 tbsp rice vinegar, 1 tsp sugar, ¼ tsp salt",
          "1 cup shelled edamame, thawed",
          "1 avocado, sliced",
          "½ cucumber, sliced",
          "Toasted sesame seeds and sliced green onion",
        ],
      },
    ],
    steps: [
      "Rinse the rice until the water runs clear and cook it according to the package. Stir in the vinegar, sugar and salt while it's hot.",
      "Whisk the soy sauce, mirin, honey and ginger in a small bowl.",
      "Heat the oil in a nonstick skillet over medium-high. Sear the salmon 2 minutes a side until browned.",
      "Pour in the sauce and simmer 1 minute, then stir in the cornstarch mixture and cook until thick and glossy, turning the salmon to coat.",
      "Fill bowls with rice and top with the salmon, edamame, avocado and cucumber. Spoon over any extra sauce and sprinkle with sesame seeds and green onion.",
    ],
  },
};

// The ingredients as plain text, for sharing as a shopping list.
export function shoppingListText(name: string, recipe: Recipe): string {
  const sections = recipe.ingredients.map((g) =>
    [g.title, ...g.items.map((i) => `• ${i}`)].filter(Boolean).join("\n")
  );
  return [`ForkIt shopping list: ${name}`, ...sections].join("\n\n");
}
