import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Admin from '@/models/Admin';
import Menu from '@/models/Menu';
import PairingRule from '@/models/PairingRule';
import DiscountTier from '@/models/DiscountTier';
import ComboRule from '@/models/ComboRule';
import Order from '@/models/Order';
import Event from '@/models/Event';
import { hashPassword } from '@/lib/auth';

const SVG_MOMO = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+lnzwvdGV4dD48L3N2Zz4=`;
const SVG_RICE = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+fjzwvdGV4dD48L3N2Zz4=`;
const SVG_BOWL = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+NuDwvdGV4dD48L3N2Zz4=`;
const SVG_ROLL = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+MmuC4mzwvdGV4dD48L3N2Zz4=`;
const SVG_SALAD = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+kow==PC90ZXh0Pjwvc3ZnPg==`;
const SVG_SOUP = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+🥣PC90ZXh0Pjwvc3ZnPg==`;
// const SVG_DRINK = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+fofwvdGV4dD48L3N2Zz4=`;
const SVG_SNACKS = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIzNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+fjzwvdGV4dD48L3N2Zz4=`;

export async function GET() {
  try {
    await dbConnect();

    // 1. Seed default admin
    const defaultEmail = 'admin@growlic.com';
    let admin = await Admin.findOne({ email: defaultEmail });
    
    if (!admin) {
      const hashedPassword = await hashPassword('password123');
      admin = await Admin.create({
        email: defaultEmail,
        password: hashedPassword,
        restaurantId: 'tokyo-momos',
        restaurantName: 'Tokyo Momos',
      });
    }

    const restId = 'tokyo-momos';

    // 2. Complete Tokyo Momos menu seeding
    const menuItems = [
      // Category: Classic Momos
      {
        restaurantId: restId,
        category: 'Classic Momos',
        name: 'Steam Momos',
        description: 'Perfectly steamed dumplings stuffed with fresh fillings and authentic herbs.',
        image: SVG_MOMO,
        price: 139,
        available: true,
        pairsWithCategories: ['Momos Woksizzle', 'Momos Gravy Add Ons'],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Classic Momos',
        name: 'Fried Momos',
        description: 'Crispy fried dumplings with a golden crust and hot delicious filling.',
        image: SVG_MOMO,
        price: 149,
        available: true,
        pairsWithCategories: ['Momos Woksizzle', 'Momos Gravy Add Ons'],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Classic Momos',
        name: 'Crispy Momos',
        description: 'Double crunchy outer coating with spiced succulent filling.',
        image: SVG_MOMO,
        price: 189,
        available: true,
        pairsWithCategories: [],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Classic Momos',
        name: 'Cheese Momos',
        description: 'Melted cheese and fresh veggies stuffed inside soft wrappers.',
        image: SVG_MOMO,
        price: 209,
        available: true,
        pairsWithCategories: [],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Classic Momos',
        name: 'Tandoori Momos',
        description: 'Charcoal grilled tandoori clay oven momos marinated in spicy yogurt sauce.',
        image: SVG_MOMO,
        price: 199,
        available: true,
        pairsWithCategories: [],
        active: true,
      },

      // Category: Momos Gravy Add Ons
      {
        restaurantId: restId,
        category: 'Momos Gravy Add Ons',
        name: 'Butter Chicken Momos',
        description: 'Dumplings tossed in rich, creamy, buttery tomato-based gravy.',
        image: SVG_BOWL,
        price: 209,
        available: true,
        pairsWithCategories: [],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Momos Gravy Add Ons',
        name: 'Afghani Momos',
        description: 'Momos drenched in mild cream, yogurt, cashew-rich afghani gravy.',
        image: SVG_BOWL,
        price: 189,
        available: true,
        pairsWithCategories: [],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Momos Gravy Add Ons',
        name: 'Malai Momos',
        description: 'Dumplings bathed in heavily spiced aromatic cardamon malai cream sauce.',
        image: SVG_BOWL,
        price: 199,
        available: true,
        pairsWithCategories: [],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Momos Gravy Add Ons',
        name: 'Savoury Momos',
        description: 'Juicy dumplings tossed in a custom savory ginger scallion dark glaze.',
        image: SVG_BOWL,
        price: 189,
        available: true,
        pairsWithCategories: [],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Momos Gravy Add Ons',
        name: 'Kadha Momos',
        description: 'Spicy momos tossed with bell peppers and onion in a classic kadhai wok gravy.',
        image: SVG_BOWL,
        price: 199,
        available: true,
        pairsWithCategories: [],
        active: true,
      },

      // Category: Momos Woksizzle
      {
        restaurantId: restId,
        category: 'Momos Woksizzle',
        name: 'Schezwan Momos',
        description: 'Tossed in fiery homemade Schezwan sauce with peppers and spring onions.',
        image: SVG_MOMO,
        price: 179,
        available: true,
        pairsWithCategories: [],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Momos Woksizzle',
        name: 'Chilli Garlic Momos',
        description: 'Stir fried with minced garlic, crushed chillies, and savory dark soy glaze.',
        image: SVG_MOMO,
        price: 179,
        available: true,
        pairsWithCategories: [],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Momos Woksizzle',
        name: 'Pan Fried Momos',
        description: 'Lightly pot-stickered base pan fried and glazed in mild spicy sauce.',
        image: SVG_MOMO,
        price: 179,
        available: true,
        pairsWithCategories: [],
        active: true,
      },

      // Category: Tokyo Rice Paradise
      {
        restaurantId: restId,
        category: 'Tokyo Rice Paradise',
        name: 'Classic Chicken Fried Rice',
        description: 'Wok-tossed rice with tender chicken chunks, egg, and fresh scallions.',
        image: SVG_RICE,
        price: 149,
        available: true,
        pairsWithCategories: ['Tokyo Soups', 'Tokyo Rolls'],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Tokyo Rice Paradise',
        name: 'Chilli Garlic Fried Rice',
        description: 'Spicy fried rice enhanced with strong toasted garlic flavor and red chillies.',
        image: SVG_RICE,
        price: 169,
        available: true,
        pairsWithCategories: ['Tokyo Soups', 'Tokyo Rolls'],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Tokyo Rice Paradise',
        name: 'Schezwan Fried Rice',
        description: 'Fiery red fried rice tossed in premium spicy Schezwan pepper sauce.',
        image: SVG_RICE,
        price: 189,
        available: true,
        pairsWithCategories: ['Tokyo Soups', 'Tokyo Rolls'],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Tokyo Rice Paradise',
        name: 'Singapore Fried Rice',
        description: 'Tossed with curry powder, cashew nuts, and fresh mixed vegetables.',
        image: SVG_RICE,
        price: 209,
        available: true,
        pairsWithCategories: ['Tokyo Soups', 'Tokyo Rolls'],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Tokyo Rice Paradise',
        name: 'Hong Kong Fried Rice',
        description: 'Unique savory fried rice style with soy sauce, mixed meat, and mushrooms.',
        image: SVG_RICE,
        price: 219,
        available: true,
        pairsWithCategories: ['Tokyo Soups', 'Tokyo Rolls'],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Tokyo Rice Paradise',
        name: 'Veg Fried Rice',
        description: 'Classic wok-tossed long-grain rice loaded with diced carrots, beans, and peas.',
        image: SVG_RICE,
        price: 119,
        available: true,
        pairsWithCategories: ['Tokyo Soups', 'Tokyo Rolls'],
        active: true,
      },

      // Category: Tokyo Rice Bowls
      {
        restaurantId: restId,
        category: 'Tokyo Rice Bowls',
        name: 'Manchurian Rice Bowl',
        description: 'Fried rice served together with hot veggie or chicken Manchurian gravy.',
        image: SVG_BOWL,
        price: 219,
        available: true,
        pairsWithCategories: ['Tokyo Soups', 'Tokyo Rolls'],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Tokyo Rice Bowls',
        name: 'Chilly Chicken Rice Bowl',
        description: 'Spiced rice served alongside delicious, glossy, semi-dry Chilli Chicken.',
        image: SVG_BOWL,
        price: 219,
        available: true,
        pairsWithCategories: ['Tokyo Soups', 'Tokyo Rolls'],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Tokyo Rice Bowls',
        name: 'Afghani Chicken Rice Bowl',
        description: 'Rich cream sauce chicken curry served over premium seasoned basmati rice.',
        image: SVG_BOWL,
        price: 269,
        available: true,
        pairsWithCategories: ['Tokyo Soups', 'Tokyo Rolls'],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Tokyo Rice Bowls',
        name: 'Kadhai Chicken Rice Bowl',
        description: 'Aromatic bell pepper chicken gravy served in a single-serve rice bowl.',
        image: SVG_BOWL,
        price: 269,
        available: true,
        pairsWithCategories: ['Tokyo Soups', 'Tokyo Rolls'],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Tokyo Rice Bowls',
        name: 'Butter Chicken Rice Bowl',
        description: 'Creamy tandoori butter chicken gravy loaded on top of seasoned white rice.',
        image: SVG_BOWL,
        price: 279,
        available: true,
        pairsWithCategories: ['Tokyo Soups', 'Tokyo Rolls'],
        active: true,
      },

      // Category: Tokyo Special
      {
        restaurantId: restId,
        category: 'Tokyo Special',
        name: 'Tokyo Ramen Bowl',
        description: 'Traditional rich broth with noodles, fresh greens, egg, and chicken/tofu slices.',
        image: SVG_BOWL,
        price: 169,
        available: true,
        pairsWithCategories: ['Tokyo Soups', 'Tokyo Rolls'],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Tokyo Special',
        name: 'Thukpa',
        description: 'Tibetan-style hot noodle soup with garlic, ginger, cilantro, and veggies.',
        image: SVG_SOUP,
        price: 159,
        available: true,
        pairsWithCategories: ['Tokyo Soups', 'Tokyo Rolls'],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Tokyo Special',
        name: 'Honey Chilli Chicken',
        description: 'Crispy fried chicken strips glazed in sweet honey and spicy chilli glaze.',
        image: SVG_SNACKS,
        price: 229,
        available: true,
        pairsWithCategories: ['Tokyo Soups', 'Tokyo Rolls'],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Tokyo Special',
        name: 'Chicken Manchurian',
        description: 'Crispy chicken balls tossed in sweet, sour, and hot dark soy gravy.',
        image: SVG_SNACKS,
        price: 199,
        available: true,
        pairsWithCategories: ['Tokyo Soups', 'Tokyo Rolls'],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Tokyo Special',
        name: 'Chilli Chicken',
        description: 'Sautéed capsicums, onions, green chillies, and fried chicken in soy sauce.',
        image: SVG_SNACKS,
        price: 219,
        available: true,
        pairsWithCategories: ['Tokyo Soups', 'Tokyo Rolls'],
        active: true,
      },

      // Category: Tokyo Soups
      {
        restaurantId: restId,
        category: 'Tokyo Soups',
        name: 'Hot n Sour Soup',
        description: 'Fiery broth balanced with vinegar acidity, loaded with shredded veggies.',
        image: SVG_SOUP,
        price: 99,
        available: true,
        pairsWithCategories: [],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Tokyo Soups',
        name: 'Manchow Soup',
        description: 'Ginger-garlic soy soup served with plenty of crispy fried noodles on top.',
        image: SVG_SOUP,
        price: 99,
        available: true,
        pairsWithCategories: [],
        active: true,
      },

      // Category: Tokyo Noodles
      {
        restaurantId: restId,
        category: 'Tokyo Noodles',
        name: 'Classic Chicken Noodle',
        description: 'Wok tossed Hakka noodles with chicken slices, spring onions, and carrots.',
        image: SVG_BOWL,
        price: 149,
        available: true,
        pairsWithCategories: ['Tokyo Soups', 'Tokyo Rolls'],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Tokyo Noodles',
        name: 'Chilli Garlic Noodle',
        description: 'Noodles tossed in hot garlic sauce with crushed red pepper flakes.',
        image: SVG_BOWL,
        price: 169,
        available: true,
        pairsWithCategories: ['Tokyo Soups', 'Tokyo Rolls'],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Tokyo Noodles',
        name: 'Schezwan Noodle',
        description: 'Hot noodles stir-fried in rich Schezwan paste with pepper strips.',
        image: SVG_BOWL,
        price: 179,
        available: true,
        pairsWithCategories: ['Tokyo Soups', 'Tokyo Rolls'],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Tokyo Noodles',
        name: 'Singapore Noodle',
        description: 'Thin vermicelli noodles seasoned with curry powder and fresh vegetables.',
        image: SVG_BOWL,
        price: 189,
        available: true,
        pairsWithCategories: ['Tokyo Soups', 'Tokyo Rolls'],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Tokyo Noodles',
        name: 'Hong Kong Noodle',
        description: 'Stir fried egg noodles with savory dark sweet oyster-soy blend.',
        image: SVG_BOWL,
        price: 199,
        available: true,
        pairsWithCategories: ['Tokyo Soups', 'Tokyo Rolls'],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Tokyo Noodles',
        name: 'Veg Noodle',
        description: 'Stir-fried noodles loaded with healthy shredded cabbage, beans, and carrots.',
        image: SVG_BOWL,
        price: 119,
        available: true,
        pairsWithCategories: ['Tokyo Soups', 'Tokyo Rolls'],
        active: true,
      },

      // Category: Tokyo Rolls
      {
        restaurantId: restId,
        category: 'Tokyo Rolls',
        name: 'Chilli Garlic Roll',
        description: 'Spiced chicken wrapped inside fresh flaky roll with chilli garlic spread.',
        image: SVG_ROLL,
        price: 149,
        available: true,
        pairsWithCategories: ['Tokyo Soups'],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Tokyo Rolls',
        name: 'Schaslic Roll',
        description: 'Grilled shashlik cubes packed with pickled onions and mint mayo.',
        image: SVG_ROLL,
        price: 159,
        available: true,
        pairsWithCategories: ['Tokyo Soups'],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Tokyo Rolls',
        name: 'Afghani Roll',
        description: 'Mild creamy cardamom chicken chunks rolled in dynamic flatbread wrapper.',
        image: SVG_ROLL,
        price: 169,
        available: true,
        pairsWithCategories: ['Tokyo Soups'],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Tokyo Rolls',
        name: 'Schezwan Roll',
        description: 'Hot wok-tossed Schezwan chicken wrapped tightly in thin roll paratha.',
        image: SVG_ROLL,
        price: 149,
        available: true,
        pairsWithCategories: ['Tokyo Soups'],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Tokyo Rolls',
        name: 'Chicken Tikka Roll',
        description: 'Classic clay oven cooked chicken tikka strips with fresh lemon juice and red onions.',
        image: SVG_ROLL,
        price: 169,
        available: true,
        pairsWithCategories: ['Tokyo Soups'],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Tokyo Rolls',
        name: 'Butter Chicken Roll',
        description: 'Rich buttery tomato chicken gravy wrapped in flaky paratha bread wrapper.',
        image: SVG_ROLL,
        price: 189,
        available: true,
        pairsWithCategories: ['Tokyo Soups'],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Tokyo Rolls',
        name: 'Crispy Chicken Roll',
        description: 'Double fried crunchy chicken strips with shredded iceberg and special mayo.',
        image: SVG_ROLL,
        price: 159,
        available: true,
        pairsWithCategories: ['Tokyo Soups'],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Tokyo Rolls',
        name: 'Cheesy Chicken Roll',
        description: 'Warm chicken tikka rolled up with plenty of melted mozzarella cheese.',
        image: SVG_ROLL,
        price: 189,
        available: true,
        pairsWithCategories: ['Tokyo Soups'],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Tokyo Rolls',
        name: 'Burrito Roll',
        description: 'Fused Mexican-Asian roll with chicken, rice, beans, and spices.',
        image: SVG_ROLL,
        price: 169,
        available: true,
        pairsWithCategories: ['Tokyo Soups'],
        active: true,
      },

      // Category: Chicken Salad
      {
        restaurantId: restId,
        category: 'Chicken Salad',
        name: 'Chicken Salad (24g Protein)',
        description: 'Healthy shredded chicken breast on top of fresh cucumbers, lettuce, and bell peppers.',
        image: SVG_SALAD,
        price: 149,
        available: true,
        pairsWithCategories: [],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Chicken Salad',
        name: 'Chicken Salad (30g Protein)',
        description: 'High protein fitness salad with extra chicken breast portions and lime vinaigrette.',
        image: SVG_SALAD,
        price: 169,
        available: true,
        pairsWithCategories: [],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Chicken Salad',
        name: 'Chicken Salad (40g Protein)',
        description: 'Mega protein bodybuilder special salad packed with lean chicken breast strips.',
        image: SVG_SALAD,
        price: 199,
        available: true,
        pairsWithCategories: [],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Chicken Salad',
        name: 'Chicken Salad (60g Protein)',
        description: 'Ultimate protein salad designed for hardcore diet plans and muscle recovery.',
        image: SVG_SALAD,
        price: 269,
        available: true,
        pairsWithCategories: [],
        active: true,
      },

      // Category: Fit Meals
      {
        restaurantId: restId,
        category: 'Fit Meals',
        name: 'Chicken Vietnamese Breast (100g)',
        description: 'Lightly seasoned chicken breast prepared with lemongrass and Vietnamese herbs.',
        image: SVG_SALAD,
        price: 99,
        available: true,
        pairsWithCategories: ['Fit Meals', 'Chicken Salad'],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Fit Meals',
        name: 'Chicken Chinese Breast (100g)',
        description: 'Lean breast pieces prepared with mild Chinese five spices and ginger scallion sauce.',
        image: SVG_SALAD,
        price: 99,
        available: true,
        pairsWithCategories: ['Fit Meals', 'Chicken Salad'],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Fit Meals',
        name: 'Tokyo Chilli Wrap (100g)',
        description: 'Low-carb wheat wrap packed with lean grilled chicken breast and crisp green chillies.',
        image: SVG_ROLL,
        price: 149,
        available: true,
        pairsWithCategories: ['Fit Meals', 'Chicken Salad'],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Fit Meals',
        name: 'Lean Breast + Rice (100g)',
        description: 'Perfect combination of clean carbs and lean proteins: brown rice and steamed chicken breast.',
        image: SVG_RICE,
        price: 139,
        available: true,
        pairsWithCategories: ['Fit Meals', 'Chicken Salad'],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Fit Meals',
        name: 'Grilled Lebanese Chicken Breast',
        description: 'Tender chicken breast marinated in garlic, lemon, oregano, and olive oil, then charcoal grilled.',
        image: SVG_SALAD,
        price: 99,
        available: true,
        pairsWithCategories: ['Fit Meals', 'Chicken Salad'],
        active: true,
      },

      // Category: Additional Snacks
      {
        restaurantId: restId,
        category: 'Additional Snacks',
        name: 'Peri Peri Chicken Strips',
        description: 'Crispy fried chicken strips dusted with hot and tangy Peri Peri seasoning.',
        image: SVG_SNACKS,
        price: 139,
        available: true,
        pairsWithCategories: ['Momos Woksizzle'],
        active: true,
      },
      {
        restaurantId: restId,
        category: 'Additional Snacks',
        name: 'Chicken Popcorn',
        description: 'Bite-sized crispy popcorn chicken pieces, crunchy and seasoned.',
        image: SVG_SNACKS,
        price: 139,
        available: true,
        pairsWithCategories: ['Momos Woksizzle'],
        active: true,
      }
    ];

    // Map items to inject realistic detailed information dynamically
    const detailedMenuItems = menuItems.map((item) => {
      const name = item.name;
      const category = item.category;
      
      // Determine preparation text
      let prep = '';
      if (category.includes('Momos')) {
        if (name.includes('Fried') || name.includes('Crispy') || name.includes('Woksizzle')) {
          prep = 'Crispy-fried in high-quality rice bran oil at 180°C, tossed with chef\'s secret seasoning and fresh herbs.';
        } else if (name.includes('Tandoori')) {
          prep = 'Marinated in spicy hung curd and hot spices, then slow-roasted in a traditional clay tandoor oven.';
        } else {
          prep = 'Hand-rolled daily from fresh dough, filled with spiced chicken or vegetable stuffing, and steamed in authentic bamboo baskets for exactly 12 minutes.';
        }
      } else if (category.includes('Rice') || category.includes('Noodles') || category.includes('Special')) {
        prep = 'Stir-fried in a heavy wok over extreme high heat (wok-hei) with aromatic sesame oil, soy sauce, eggs, and freshly chopped scallions.';
      } else if (category.includes('Salad') || category.includes('Fit Meals')) {
        prep = 'Lean proteins seasoned with local herbs, garlic, and olive oil, and gently grilled over natural charcoal stones to lock in absolute juiciness.';
      } else if (category.includes('Soups')) {
        prep = 'Simmered slowly for over 4 hours with farm-fresh herbs, ginger root, garlic, and a rich vegetable broth reduction.';
      } else if (category.includes('Rolls')) {
        prep = 'Rolled inside a freshly baked, flaky paratha flatbread lined with egg, spread with custom mint-coriander mayonnaise and crisp red onions.';
      } else {
        prep = 'Freshly prepared to order using local organic ingredients and authentic Tibetan spices.';
      }

      // Determine ingredients list
      let ingredients: string[] = [];
      if (category.includes('Momos')) {
        ingredients = ['Refined Wheat Flour Wrapper', 'Ginger-Garlic Paste', 'Sesame Oil', 'Soy Sauce', 'Sichuan Pepper', 'Spring Onion'];
        if (name.toLowerCase().includes('chicken') || name.toLowerCase().includes('butter') || name.toLowerCase().includes('steam') || name.toLowerCase().includes('fried') || name.toLowerCase().includes('crispy')) {
          ingredients.push('Minced Chicken Breast');
        } else if (name.toLowerCase().includes('cheese')) {
          ingredients.push('Processed Mozzarella Cheese');
        } else {
          ingredients.push('Cabbage & Carrot Medley');
        }
      } else if (category.includes('Rice') || category.includes('Noodles')) {
        ingredients = ['Jasmine Rice / Hakka Noodles', 'Egg White', 'Toasted Garlic', 'Soy Sauce', 'Capsicum', 'Cabbage', 'Sesame Oil'];
        if (name.toLowerCase().includes('chicken')) {
          ingredients.push('Diced Roast Chicken');
        }
      } else if (category.includes('Salad') || category.includes('Fit Meals')) {
        ingredients = ['Lean Grilled Chicken Breast', 'Iceberg Lettuce', 'Cucumber Slices', 'Red Bell Pepper', 'Cherry Tomatoes', 'Olive Oil', 'Lime Juice'];
      } else if (category.includes('Rolls')) {
        ingredients = ['Refined Wheat Flour Paratha', 'Spiced Tikka Filling', 'Sliced Red Onion', 'Mint-Mayo', 'Chilli Paste'];
        if (name.toLowerCase().includes('cheese') || name.toLowerCase().includes('cheesy')) {
          ingredients.push('Mozzarella Cheese');
        }
      } else if (category.includes('Soups')) {
        ingredients = ['Vegetable Broth', 'Shredded Cabbage', 'Carrot Julienned', 'Vinegar', 'Garlic', 'White Pepper'];
        if (name.toLowerCase().includes('chicken')) {
          ingredients.push('Shredded Chicken');
        }
      } else {
        ingredients = ['Local Farm Vegetables', 'Tibetan Spices', 'Garlic', 'Ginger', 'Sichuan Pepper'];
      }

      // Determine nutrition macros
      let calories = 250;
      let protein = 12;
      let carbs = 35;
      let fat = 6;

      if (category.includes('Salad') || category.includes('Fit Meals')) {
        // Match specific proteins
        if (name.includes('24g')) {
          protein = 24; calories = 210; carbs = 6; fat = 4;
        } else if (name.includes('30g')) {
          protein = 30; calories = 260; carbs = 8; fat = 5;
        } else if (name.includes('40g')) {
          protein = 40; calories = 310; carbs = 8; fat = 6;
        } else if (name.includes('60g')) {
          protein = 60; calories = 420; carbs = 10; fat = 8;
        } else if (name.includes('100g')) {
          protein = 28; calories = 220; carbs = 5; fat = 4;
        } else {
          protein = 25; calories = 240; carbs = 10; fat = 6;
        }
      } else if (category.includes('Momos')) {
        calories = name.includes('Cheese') || name.includes('Butter') ? 380 : 280;
        protein = name.includes('Cheese') ? 14 : 16;
        carbs = 38;
        fat = name.includes('Cheese') || name.includes('Butter') || name.includes('Fried') ? 14 : 6;
      } else if (category.includes('Rice') || category.includes('Noodles')) {
        calories = 520;
        protein = name.toLowerCase().includes('chicken') ? 22 : 12;
        carbs = 78;
        fat = 12;
      } else if (category.includes('Rolls')) {
        calories = 420;
        protein = 18;
        carbs = 48;
        fat = 16;
      } else if (category.includes('Soups')) {
        calories = 90;
        protein = 4;
        carbs = 10;
        fat = 2;
      }

      // Generate dynamic slider image variations
      let extraImages: string[] = [];
      if (item.image && item.image.startsWith('data:image/svg+xml;base64,')) {
        try {
          const base64Data = item.image.split(',')[1];
          const svgText = Buffer.from(base64Data, 'base64').toString('utf-8');
          
          const svgAlt1 = svgText.replace(/fill="#fff"/i, 'fill="#fef3c7"').replace(/fill="#zinc-50"/i, 'fill="#fef3c7"');
          const svgAlt2 = svgText.replace(/fill="#fff"/i, 'fill="#ffe4e6"').replace(/fill="#zinc-50"/i, 'fill="#ffe4e6"');
          
          const base64Alt1 = 'data:image/svg+xml;base64,' + Buffer.from(svgAlt1).toString('base64');
          const base64Alt2 = 'data:image/svg+xml;base64,' + Buffer.from(svgAlt2).toString('base64');
          
          extraImages = [base64Alt1, base64Alt2];
        } catch (e) {
          console.error('Error generating extra images:', e);
        }
      }

      // Determine spice level
      let spiceLevel = 0;
      const lowerName = name.toLowerCase();
      if (lowerName.includes('peri peri') || lowerName.includes('schezwan noodle') || lowerName.includes('chilli garlic noodle')) {
        spiceLevel = 3;
      } else if (lowerName.includes('schezwan') || lowerName.includes('chilli') || lowerName.includes('tandoori') || lowerName.includes('spicy')) {
        spiceLevel = 2;
      } else if (category.includes('Soups') && lowerName.includes('hot n sour')) {
        spiceLevel = 2;
      } else if (category.includes('Noodles') || category.includes('Rice') || category.includes('Soups')) {
        spiceLevel = 1;
      }

      // Determine portion size
      let portionSize = 'Good for 1';
      if (category.includes('Momos') || category.includes('Rolls')) {
        portionSize = 'Shareable starter for 2-3';
      }

      // Determine prep time min-max
      let prepTimeMin = 10;
      let prepTimeMax = 12;

      if (category.includes('Momos') && !lowerName.includes('gravy')) {
        prepTimeMin = 8; prepTimeMax = 10;
      } else if (category.includes('Soups')) {
        prepTimeMin = 8; prepTimeMax = 10;
      } else if (category.includes('Rice') || category.includes('Noodles')) {
        if (lowerName.includes('bowl')) {
          prepTimeMin = 12; prepTimeMax = 15;
        } else {
          prepTimeMin = 10; prepTimeMax = 12;
        }
      } else if (lowerName.includes('gravy') || category.includes('Special')) {
        prepTimeMin = 12; prepTimeMax = 15;
      } else if (category.includes('Rolls')) {
        prepTimeMin = 6; prepTimeMax = 8;
      } else if (category.includes('Salad') || category.includes('Fit Meals')) {
        prepTimeMin = 5; prepTimeMax = 7;
      }

      // Determine chef's note
      let chefNote = '';
      if (lowerName.includes('tandoori momos') || lowerName.includes('tandoori momo')) {
        chefNote = 'Marinated overnight, char-grilled to order';
      } else if (lowerName.includes('tokyo ramen')) {
        chefNote = 'Our signature broth, simmered fresh daily';
      } else if (lowerName.includes('butter chicken rice')) {
        chefNote = "Tokyo Momos' most-loved gravy bowl";
      } else if (lowerName.includes('honey chilli chicken')) {
        chefNote = 'A guest favorite — sweet heat done right';
      }

      return {
        ...item,
        preparation: prep,
        ingredients,
        nutrition: { calories, protein, carbs, fat },
        images: extraImages,
        spiceLevel,
        portionSize,
        prepTimeMin,
        prepTimeMax,
        chefNote,
      };
    });

    // Seed Menu items
    await Menu.deleteMany({ restaurantId: restId });
    const insertedMenu = await Menu.insertMany(detailedMenuItems);

    // 3. Seed default PairingRule configurations
    const defaultPairings = [
      {
        restaurantId: restId,
        triggerCategory: 'Tokyo Rice Paradise',
        suggestCategories: ['Tokyo Soups', 'Tokyo Rolls'],
        active: true,
      },
      {
        restaurantId: restId,
        triggerCategory: 'Tokyo Noodles',
        suggestCategories: ['Tokyo Soups', 'Tokyo Rolls'],
        active: true,
      },
      {
        restaurantId: restId,
        triggerCategory: 'Tokyo Rice Bowls',
        suggestCategories: ['Tokyo Soups', 'Tokyo Rolls'],
        active: true,
      },
      {
        restaurantId: restId,
        triggerCategory: 'Tokyo Special',
        suggestCategories: ['Tokyo Soups', 'Tokyo Rolls'],
        active: true,
      },
      {
        restaurantId: restId,
        triggerCategory: 'Classic Momos',
        suggestCategories: ['Momos Woksizzle', 'Momos Gravy Add Ons'],
        active: true,
      },
      {
        restaurantId: restId,
        triggerCategory: 'Tokyo Rolls',
        suggestCategories: ['Tokyo Soups'],
        active: true,
      },
      {
        restaurantId: restId,
        triggerCategory: 'Additional Snacks',
        suggestCategories: ['Momos Woksizzle'],
        active: true,
      },
    ];

    await PairingRule.deleteMany({ restaurantId: restId });
    const insertedPairings = await PairingRule.insertMany(defaultPairings);

    // 4. Seed default DiscountTier configurations
    const defaultDiscountTiers = [
      { restaurantId: restId, minSpend: 399, percentOff: 5, categoryScope: null },
      { restaurantId: restId, minSpend: 599, percentOff: 10, categoryScope: null },
      { restaurantId: restId, minSpend: 899, percentOff: 20, categoryScope: null },
    ];

    await DiscountTier.deleteMany({ restaurantId: restId });
    const insertedTiers = await DiscountTier.insertMany(defaultDiscountTiers);

    // 5. Seed default ComboRule configurations
    const defaultComboRules = [
      {
        restaurantId: restId,
        conditionCategory: 'Classic Momos,Momos Gravy Add Ons,Momos Woksizzle',
        conditionExcludeCategory: 'Tokyo Soups',
        rewardType: 'free_item',
        rewardTarget: 'Tokyo Soups',
        customerMessage: "Add a soup, it's on us with 2+ momos",
        active: true,
      },
      {
        restaurantId: restId,
        conditionCategory: 'Tokyo Rice Paradise,Tokyo Noodles,Tokyo Rice Bowls,Tokyo Special',
        conditionExcludeCategory: 'Tokyo Rolls',
        rewardType: 'percent_off_item',
        rewardTarget: 'Tokyo Rolls:10',
        customerMessage: 'Add a roll, get 10% off it — completes the combo',
        active: true,
      },
      {
        restaurantId: restId,
        conditionCategory: 'subtotal:350',
        conditionExcludeCategory: 'Additional Snacks',
        rewardType: 'percent_off_item',
        rewardTarget: 'Additional Snacks:15',
        customerMessage: "Your order's substantial — add a snack at 15% off",
        active: true,
      },
      {
        restaurantId: restId,
        conditionCategory: 'momos_variety',
        conditionExcludeCategory: null,
        rewardType: 'free_item',
        rewardTarget: 'cheapest_momo',
        customerMessage: "Mixing momos flavors? Your cheapest one's free",
        active: true,
      },
    ];

    await ComboRule.deleteMany({ restaurantId: restId });
    const insertedCombos = await ComboRule.insertMany(defaultComboRules);

    // 6. Seed dummy completed orders and events (staged for realistic analytics)
    await Order.deleteMany({ restaurantId: restId });
    await Event.deleteMany({ restaurantId: restId });

    const dummyOrders = [];
    const dummyEvents = [];

    // Seed 110 cart started events
    for (let i = 0; i < 110; i++) {
      dummyEvents.push({
        restaurantId: restId,
        type: 'cart_create',
        itemId: '',
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      });
    }

    // Seed nudge shown events
    // 50 cross sell shows
    for (let i = 0; i < 50; i++) {
      const rule = insertedPairings[i % insertedPairings.length];
      dummyEvents.push({
        restaurantId: restId,
        type: 'nudge_show',
        itemId: rule._id.toString(),
        nudgeType: 'cross_sell',
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      });
    }
    // 40 threshold discount shows
    for (let i = 0; i < 40; i++) {
      const tier = insertedTiers[i % insertedTiers.length];
      dummyEvents.push({
        restaurantId: restId,
        type: 'nudge_show',
        itemId: tier._id.toString(),
        nudgeType: 'threshold_discount',
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      });
    }
    // 30 combo freebie shows
    for (let i = 0; i < 30; i++) {
      const rule = insertedCombos[i % insertedCombos.length];
      dummyEvents.push({
        restaurantId: restId,
        type: 'nudge_show',
        itemId: rule._id.toString(),
        nudgeType: 'combo_freebie',
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      });
    }

    // Modal open events:
    const steamMomo = insertedMenu.find(m => m.name === 'Steam Momos');
    const chilliMomo = insertedMenu.find(m => m.name === 'Chilli Garlic Momos');

    // 40 opens for Steam Momos (high interest)
    if (steamMomo) {
      for (let i = 0; i < 40; i++) {
        dummyEvents.push({
          restaurantId: restId,
          type: 'modal_open',
          itemId: steamMomo._id.toString(),
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        });
      }
    }

    // 15 opens for Chilli Garlic Momos
    if (chilliMomo) {
      for (let i = 0; i < 15; i++) {
        dummyEvents.push({
          restaurantId: restId,
          type: 'modal_open',
          itemId: chilliMomo._id.toString(),
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        });
      }
    }

    // Other items get random modal opens
    insertedMenu.forEach(item => {
      if (item.name !== 'Steam Momos' && item.name !== 'Chilli Garlic Momos') {
        const count = Math.floor(Math.random() * 4) + 2;
        for (let i = 0; i < count; i++) {
          dummyEvents.push({
            restaurantId: restId,
            type: 'modal_open',
            itemId: item._id.toString(),
            createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          });
        }
      }
    });

    // Create 40 orders containing Fried Rice + Soup (15 with cross_sell nudge)
    for (let i = 0; i < 40; i++) {
      const hasNudge = i < 15;
      const rule = insertedPairings[0];
      dummyOrders.push({
        restaurantId: restId,
        customerName: `Data Test ${i}`,
        customerPhone: `99999000${i.toString().padStart(2, '0')}`,
        items: [
          {
            menuItemId: 'classic_chicken_fried_rice_dummy_id',
            name: 'Classic Chicken Fried Rice',
            price: 149,
            quantity: 1,
          },
          {
            menuItemId: 'hot_n_sour_soup_dummy_id',
            name: 'Hot n Sour Soup',
            price: 99,
            quantity: 1,
            originatedFromNudge: hasNudge,
            nudgeType: hasNudge ? 'cross_sell' as const : undefined,
            nudgeRuleId: hasNudge ? rule._id.toString() : undefined,
          }
        ],
        subtotal: 248,
        total: 248,
        status: 'completed',
        estimatedTime: 15,
        createdAt: new Date(Date.now() - (60 - i) * 60 * 60 * 1000),
      });
    }

    // Create 10 orders containing Noodle + Roll (5 with combo nudge)
    for (let i = 0; i < 10; i++) {
      const hasNudge = i < 5;
      const rule = insertedCombos[1];
      dummyOrders.push({
        restaurantId: restId,
        customerName: `Data Test Noodle ${i}`,
        customerPhone: `88888000${i.toString().padStart(2, '0')}`,
        items: [
          {
            menuItemId: 'classic_chicken_noodle_dummy_id',
            name: 'Classic Chicken Noodle',
            price: 149,
            quantity: 1,
          },
          {
            menuItemId: 'chilli_garlic_roll_dummy_id',
            name: 'Chilli Garlic Roll',
            price: 149,
            quantity: 1,
            originatedFromNudge: hasNudge,
            nudgeType: hasNudge ? 'combo_freebie' as const : undefined,
            nudgeRuleId: hasNudge ? rule._id.toString() : undefined,
          }
        ],
        subtotal: 298,
        total: 298,
        status: 'completed',
        estimatedTime: 15,
        createdAt: new Date(Date.now() - (20 - i) * 60 * 60 * 1000),
      });
    }

    // Create 10 orders containing Momos + Chicken (4 with threshold nudge)
    // Steam Momos: 2 orders (total conversion rate = 2/40 = 5% -> triggers friction flag!)
    // Chilli Garlic Momos: 8 orders (total conversion rate = 8/15 = 53%)
    for (let i = 0; i < 10; i++) {
      const hasNudge = i < 4;
      const tier = insertedTiers[0];
      const momoItemName = i < 2 ? 'Steam Momos' : 'Chilli Garlic Momos';
      const momoItem = insertedMenu.find(m => m.name === momoItemName);
      
      dummyOrders.push({
        restaurantId: restId,
        customerName: `Data Test Momo ${i}`,
        customerPhone: `77777000${i.toString().padStart(2, '0')}`,
        items: [
          {
            menuItemId: momoItem ? momoItem._id.toString() : 'steam_momos_dummy_id',
            name: momoItemName,
            price: 139,
            quantity: 1,
          },
          {
            menuItemId: 'peri_peri_chicken_strips_dummy_id',
            name: 'Peri Peri Chicken Strips',
            price: 139,
            quantity: 1,
            originatedFromNudge: hasNudge,
            nudgeType: hasNudge ? 'threshold_discount' as const : undefined,
            nudgeRuleId: hasNudge ? tier._id.toString() : undefined,
          }
        ],
        subtotal: 278,
        total: 278,
        status: 'completed',
        estimatedTime: 15,
        createdAt: new Date(Date.now() - (20 - i) * 60 * 60 * 1000),
      });
    }

    await Order.insertMany(dummyOrders);
    await Event.insertMany(dummyEvents);

    return NextResponse.json({
      success: true,
      message: 'Seeding completed successfully with default rules, 60 test orders, and analytical events.',
      admin: {
        email: admin.email,
        restaurantId: admin.restaurantId,
        restaurantName: admin.restaurantName,
      },
      menuItemsCount: insertedMenu.length,
      pairingsCount: defaultPairings.length,
      discountTiersCount: defaultDiscountTiers.length,
      comboRulesCount: defaultComboRules.length,
      completedOrdersSeededCount: dummyOrders.length,
      eventsCount: dummyEvents.length,
    });
  } catch (error) {
    console.error('Seeding error:', error);
    const message = error instanceof Error ? error.message : 'Seeding failed';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
