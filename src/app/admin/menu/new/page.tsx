'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { createMenuItem, getMenuItems } from '@/actions/menu';
import Link from 'next/link';

interface MenuItem {
  _id: string;
  category: string;
  name: string;
  description: string;
  image: string;
  price: number;
  available: boolean;
  images?: string[];
  preparation?: string;
  ingredients?: string[];
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

const estimateNutrition = (name: string, category: string) => {
  const lowerName = name.toLowerCase();
  const lowerCat = category.toLowerCase();
  
  let calories = 250;
  let protein = 12;
  let carbs = 35;
  let fat = 8;
  
  if (lowerCat.includes('salad') || lowerName.includes('salad')) {
    calories = 180; protein = 15; carbs = 8; fat = 6;
    if (lowerName.includes('chicken')) { protein = 24; calories = 220; }
  } else if (lowerCat.includes('soup') || lowerName.includes('soup')) {
    calories = 95; protein = 4; carbs = 12; fat = 2;
    if (lowerName.includes('chicken')) { protein = 8; calories = 110; }
  } else if (lowerCat.includes('momo') || lowerName.includes('momo')) {
    calories = 280; protein = 14; carbs = 38; fat = 8;
    if (lowerName.includes('fried') || lowerName.includes('crispy')) { calories = 380; fat = 16; }
    if (lowerName.includes('cheese') || lowerName.includes('paneer')) { calories = 340; fat = 14; protein = 15; }
    if (lowerName.includes('chicken') || lowerName.includes('meat')) { protein = 18; calories = 290; }
  } else if (lowerCat.includes('rice') || lowerName.includes('rice') || lowerCat.includes('noodle') || lowerName.includes('noodle')) {
    calories = 520; protein = 12; carbs = 78; fat = 10;
    if (lowerName.includes('chicken')) { protein = 22; calories = 560; fat = 12; }
    if (lowerName.includes('egg')) { protein = 16; calories = 540; }
  } else if (lowerCat.includes('roll') || lowerName.includes('roll') || lowerName.includes('wrap')) {
    calories = 420; protein = 16; carbs = 48; fat = 14;
    if (lowerName.includes('chicken')) { protein = 22; calories = 460; }
  }
  return { calories, protein, carbs, fat };
};

const estimatePreparation = (name: string, category: string) => {
  const lowerName = name.toLowerCase();
  const lowerCat = category.toLowerCase();
  
  if (lowerCat.includes('momo') || lowerName.includes('momo')) {
    if (lowerName.includes('fried') || lowerName.includes('crispy')) {
      return 'Crispy-fried in high-quality rice bran oil at 180°C, tossed with chef\'s secret seasoning and fresh herbs.';
    }
    if (lowerName.includes('tandoori')) {
      return 'Marinated in spicy hung curd and hot spices, then slow-roasted in a traditional clay tandoor oven.';
    }
    return 'Hand-rolled daily from fresh dough, filled with spiced stuffing, and steamed in authentic bamboo baskets for exactly 12 minutes.';
  }
  if (lowerCat.includes('rice') || lowerName.includes('rice') || lowerCat.includes('noodle') || lowerName.includes('noodle')) {
    return 'Stir-fried in a heavy wok over extreme high heat (wok-hei) with aromatic sesame oil, soy sauce, eggs, and freshly chopped scallions.';
  }
  if (lowerCat.includes('salad') || lowerName.includes('salad')) {
    return 'Lean proteins seasoned with local herbs, garlic, and olive oil, and gently grilled over natural charcoal stones to lock in absolute juiciness.';
  }
  if (lowerCat.includes('soup') || lowerName.includes('soup')) {
    return 'Simmered slowly for over 4 hours with farm-fresh herbs, ginger root, garlic, and a rich vegetable broth reduction.';
  }
  if (lowerCat.includes('roll') || lowerName.includes('roll') || lowerName.includes('wrap')) {
    return 'Rolled inside a freshly baked, flaky paratha flatbread lined with egg, spread with custom mint-coriander mayonnaise and crisp red onions.';
  }
  return 'Freshly prepared to order using local organic ingredients and authentic Tibetan spices.';
};

const estimateIngredients = (name: string, category: string) => {
  const lowerName = name.toLowerCase();
  const lowerCat = category.toLowerCase();
  
  let ingredients = '';
  if (lowerCat.includes('momo') || lowerName.includes('momo')) {
    ingredients = 'Refined Wheat Flour Wrapper, Ginger-Garlic Paste, Sesame Oil, Soy Sauce, Sichuan Pepper, Spring Onion';
    if (lowerName.includes('chicken')) {
      ingredients += ', Minced Chicken Breast';
    } else if (lowerName.includes('cheese') || lowerName.includes('paneer')) {
      ingredients += ', Processed Mozzarella Cheese';
    } else {
      ingredients += ', Cabbage & Carrot Medley';
    }
  } else if (lowerCat.includes('rice') || lowerName.includes('rice') || lowerCat.includes('noodle') || lowerName.includes('noodle')) {
    ingredients = 'Jasmine Rice, Hakka Noodles, Egg White, Toasted Garlic, Soy Sauce, Capsicum, Cabbage, Sesame Oil';
    if (lowerName.includes('chicken')) {
      ingredients += ', Diced Roast Chicken';
    }
  } else if (lowerCat.includes('salad') || lowerName.includes('salad')) {
    ingredients = 'Lean Grilled Chicken Breast, Iceberg Lettuce, Cucumber Slices, Red Bell Pepper, Cherry Tomatoes, Olive Oil, Lime Vinaigrette';
  } else if (lowerCat.includes('roll') || lowerName.includes('roll') || lowerName.includes('wrap')) {
    ingredients = 'Refined Wheat Flour Paratha, Spiced Tikka Filling, Sliced Red Onion, Mint-Mayo, Chilli Paste';
    if (lowerName.includes('cheese')) {
      ingredients += ', Mozzarella Cheese';
    }
  } else if (lowerCat.includes('soup') || lowerName.includes('soup')) {
    ingredients = 'Vegetable Broth, Shredded Cabbage, Carrot Julienned, Vinegar, Garlic, White Pepper';
    if (lowerName.includes('chicken')) {
      ingredients += ', Shredded Chicken';
    }
  } else {
    ingredients = 'Local Farm Vegetables, Tibetan Spices, Garlic, Ginger, Sichuan Pepper';
  }
  return ingredients;
};

export default function NewMenuItemPage() {
  const router = useRouter();
  const auth = useSelector((state: RootState) => state.auth);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [image, setImage] = useState('');
  const [available, setAvailable] = useState(true);
  
  const [preparation, setPreparation] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [calories, setCalories] = useState('0');
  const [protein, setProtein] = useState('0');
  const [carbs, setCarbs] = useState('0');
  const [fat, setFat] = useState('0');
  const [extraImages, setExtraImages] = useState<string[]>([]);
  
  const [spiceLevel, setSpiceLevel] = useState('0');
  const [portionSize, setPortionSize] = useState('Good for 1');
  const [customPortionSize, setCustomPortionSize] = useState('');
  const [prepTimeMin, setPrepTimeMin] = useState('10');
  const [prepTimeMax, setPrepTimeMax] = useState('12');
  const [chefNote, setChefNote] = useState('');

  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (auth.restaurantId) {
      getMenuItems(auth.restaurantId)
        .then((items: MenuItem[]) => {
          const cats = Array.from(new Set(items.map((i) => i.category)));
          setCategories(cats);
          if (cats.length > 0) {
            setCategory(cats[0]);
          }
        })
        .catch((err) => console.error(err));
    }
  }, [auth.restaurantId]);

  // Dynamically estimate and pre-fill fields based on item name and category changes
  useEffect(() => {
    if (!name.trim()) return;

    const currentCategoryName = category === 'new' ? customCategory : category;

    // Pre-fill preparation description if empty
    if (preparation.trim() === '') {
      setPreparation(estimatePreparation(name, currentCategoryName));
    }

    // Pre-fill ingredients list if empty
    if (ingredients.trim() === '') {
      setIngredients(estimateIngredients(name, currentCategoryName));
    }

    // Pre-fill nutrition facts if they are untouched/zero
    if ((calories === '0' || calories === '') && 
        (protein === '0' || protein === '') && 
        (carbs === '0' || carbs === '') && 
        (fat === '0' || fat === '')) {
      const est = estimateNutrition(name, currentCategoryName);
      setCalories(est.calories.toString());
      setProtein(est.protein.toString());
      setCarbs(est.carbs.toString());
      setFat(est.fat.toString());
    }

    // Pre-fill spice level if untouched
    if (spiceLevel === '0') {
      const lower = name.toLowerCase();
      if (lower.includes('peri peri') || lower.includes('schezwan noodle') || lower.includes('chilli garlic noodle')) {
        setSpiceLevel('3');
      } else if (lower.includes('schezwan') || lower.includes('chilli') || lower.includes('tandoori') || lower.includes('spicy')) {
        setSpiceLevel('2');
      } else if (lower.includes('soup') || lower.includes('noodle') || lower.includes('rice')) {
        setSpiceLevel('1');
      }
    }

    // Pre-fill portion size if untouched
    if (portionSize === 'Good for 1') {
      const catLower = currentCategoryName.toLowerCase();
      if (catLower.includes('momo') || catLower.includes('roll')) {
        setPortionSize('Shareable starter for 2-3');
      }
    }

    // Pre-fill prep time if untouched
    if (prepTimeMin === '10' && prepTimeMax === '12') {
      const catLower = currentCategoryName.toLowerCase();
      const nameLower = name.toLowerCase();
      if (catLower.includes('momo') && !nameLower.includes('gravy')) {
        setPrepTimeMin('8'); setPrepTimeMax('10');
      } else if (catLower.includes('soup')) {
        setPrepTimeMin('8'); setPrepTimeMax('10');
      } else if (catLower.includes('rice') || catLower.includes('noodle')) {
        if (nameLower.includes('bowl')) {
          setPrepTimeMin('12'); setPrepTimeMax('15');
        } else {
          setPrepTimeMin('10'); setPrepTimeMax('12');
        }
      } else if (nameLower.includes('gravy') || catLower.includes('special')) {
        setPrepTimeMin('12'); setPrepTimeMax('15');
      } else if (catLower.includes('roll')) {
        setPrepTimeMin('6'); setPrepTimeMax('8');
      } else if (catLower.includes('salad') || catLower.includes('fit')) {
        setPrepTimeMin('5'); setPrepTimeMax('7');
      }
    }

    // Pre-fill chef note if empty
    if (chefNote === '') {
      const nameLower = name.toLowerCase();
      if (nameLower.includes('tandoori momos') || nameLower.includes('tandoori momo')) {
        setChefNote('Marinated overnight, char-grilled to order');
      } else if (nameLower.includes('tokyo ramen')) {
        setChefNote('Our signature broth, simmered fresh daily');
      } else if (nameLower.includes('butter chicken rice')) {
        setChefNote("Tokyo Momos' most-loved gravy bowl");
      } else if (nameLower.includes('honey chilli chicken')) {
        setChefNote('A guest favorite — sweet heat done right');
      }
    }
  }, [name, category, customCategory, preparation, ingredients, calories, protein, carbs, fat, spiceLevel, portionSize, prepTimeMin, prepTimeMax, chefNote]);

  const compressImage = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.onerror = () => {
          reject(new Error('Failed to load image for compression'));
        };
        img.src = event.target?.result as string;
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      setImage(compressed);
    } catch (err) {
      console.error(err);
      alert('Failed to process image. Please try another file.');
    }
  };

  const handleExtraImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(async (file) => {
      try {
        const compressed = await compressImage(file);
        setExtraImages((prev) => [...prev, compressed]);
      } catch (err) {
        console.error(err);
        alert(`Failed to process image: ${file.name}`);
      }
    });
    e.target.value = '';
  };

  const handleRemoveExtraImage = (indexToRemove: number) => {
    setExtraImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const finalCategory = category === 'new' ? customCategory.trim() : category;

    if (!name.trim()) {
      setFormError('Name is required.');
      return;
    }

    if (!finalCategory) {
      setFormError('Category is required.');
      return;
    }

    if (!price || Number(price) <= 0) {
      setFormError('Please enter a valid price.');
      return;
    }

    setLoading(true);

    try {
      await createMenuItem({
        name: name.trim(),
        description: description.trim(),
        category: finalCategory,
        price: Number(price),
        image,
        available,
        preparation: preparation.trim(),
        ingredients: ingredients.split(',').map((ing) => ing.trim()).filter(Boolean),
        nutrition: {
          calories: Number(calories) || 0,
          protein: Number(protein) || 0,
          carbs: Number(carbs) || 0,
          fat: Number(fat) || 0,
        },
        images: extraImages,
        spiceLevel: Number(spiceLevel),
        portionSize: portionSize === 'custom' ? customPortionSize.trim() : portionSize,
        prepTimeMin: Number(prepTimeMin) || 0,
        prepTimeMax: Number(prepTimeMax) || 0,
        chefNote: chefNote.trim(),
      });

      router.push('/admin/menu');
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Failed to create item. Please try again.';
      setFormError(message);
      setLoading(false);
    }
  };

  return (
    <div className="font-mono-custom flex flex-col gap-6 max-w-xl mx-auto">
      {/* Header bar */}
      <div className="border-b border-black pb-4 flex justify-between items-baseline">
        <h1 className="text-xl font-bold uppercase">Add Menu Item</h1>
        <Link href="/admin/menu" className="text-xs uppercase underline">
          ← Cancel
        </Link>
      </div>

      {formError && (
        <div className="border border-black p-3 text-xs bg-zinc-100 font-bold text-red-600 uppercase">
          ⚠️ {formError}
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="border border-black p-6 bg-white flex flex-col gap-4">
        {/* Name */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase">Item Name</label>
          <input
            type="text"
            placeholder="e.g. Steamed Pork Momos"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            className="w-full text-xs"
            required
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase">Description</label>
          <textarea
            placeholder="Describe the item ingredients, preparation, spicy level..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
            rows={3}
            className="w-full text-xs border border-black p-2 rounded-none resize-none"
          />
        </div>

        {/* Price */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase">Price (₹)</label>
          <input
            type="number"
            placeholder="149"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            disabled={loading}
            className="w-full text-xs"
            required
          />
        </div>

        {/* Category Selector */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={loading}
            className="w-full text-xs border border-black p-2 rounded-none bg-white"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.toUpperCase()}
              </option>
            ))}
            <option value="new">Create New Category</option>
          </select>

          {/* Custom Category Input */}
          {(category === 'new' || categories.length === 0) && (
            <input
              type="text"
              placeholder="e.g. Desserts"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              disabled={loading}
              className="w-full text-xs mt-2"
              required
            />
          )}
        </div>

        {/* Preparation */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase">Preparation Details</label>
          <textarea
            placeholder="Describe how the dish is cooked or prepared..."
            value={preparation}
            onChange={(e) => setPreparation(e.target.value)}
            disabled={loading}
            rows={3}
            className="w-full text-xs border border-black p-2 rounded-none resize-none"
          />
        </div>

        {/* Ingredients */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase">Ingredients (Comma-separated)</label>
          <input
            type="text"
            placeholder="e.g. Flour, Soy Sauce, Chicken"
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            disabled={loading}
            className="w-full text-xs"
          />
          <span className="text-[10px] text-zinc-400 uppercase">Separate ingredients with commas. Allergen keywords like wheat, soy, dairy, egg, peanut will be auto-flagged.</span>
        </div>

        {/* Nutrition Facts */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase">Nutrition Facts</label>
          <div className="grid grid-cols-4 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase text-zinc-500">Calories</label>
              <input
                type="number"
                placeholder="0"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                disabled={loading}
                className="w-full text-xs"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase text-zinc-500">Protein (g)</label>
              <input
                type="number"
                placeholder="0"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                disabled={loading}
                className="w-full text-xs"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase text-zinc-500">Carbs (g)</label>
              <input
                type="number"
                placeholder="0"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                disabled={loading}
                className="w-full text-xs"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase text-zinc-500">Fat (g)</label>
              <input
                type="number"
                placeholder="0"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                disabled={loading}
                className="w-full text-xs"
              />
            </div>
          </div>
        </div>

        {/* Spice Level */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase">Spice Level</label>
          <select
            value={spiceLevel}
            onChange={(e) => setSpiceLevel(e.target.value)}
            disabled={loading}
            className="w-full text-xs border border-black p-2 rounded-none bg-white font-mono-custom"
          >
            <option value="0">0 - None / Mild</option>
            <option value="1">1 - Medium</option>
            <option value="2">2 - Hot</option>
            <option value="3">3 - Very Spicy</option>
          </select>
        </div>

        {/* Portion Size */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase">Portion Size</label>
          <select
            value={portionSize}
            onChange={(e) => setPortionSize(e.target.value)}
            disabled={loading}
            className="w-full text-xs border border-black p-2 rounded-none bg-white font-mono-custom"
          >
            <option value="Good for 1">Good for 1</option>
            <option value="Shareable for 2-3">Shareable for 2-3</option>
            <option value="Shareable for 3-4">Shareable for 3-4</option>
            <option value="custom">Custom Portion Size</option>
          </select>

          {portionSize === 'custom' && (
            <input
              type="text"
              placeholder="e.g. Shareable starter for 2-3"
              value={customPortionSize}
              onChange={(e) => setCustomPortionSize(e.target.value)}
              disabled={loading}
              className="w-full text-xs mt-2"
              required
            />
          )}
        </div>

        {/* Prep Time Range */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase">Prep Time Range (Minutes)</label>
          <div className="flex gap-4 items-center">
            <div className="flex-1 flex flex-col gap-0.5">
              <label className="text-[9px] uppercase text-zinc-500 font-mono-custom">Min Minutes</label>
              <input
                type="number"
                placeholder="10"
                value={prepTimeMin}
                onChange={(e) => setPrepTimeMin(e.target.value)}
                disabled={loading}
                className="w-full text-xs"
                required
              />
            </div>
            <span className="text-xs font-bold mt-3 font-mono-custom">to</span>
            <div className="flex-1 flex flex-col gap-0.5">
              <label className="text-[9px] uppercase text-zinc-500 font-mono-custom">Max Minutes</label>
              <input
                type="number"
                placeholder="12"
                value={prepTimeMax}
                onChange={(e) => setPrepTimeMax(e.target.value)}
                disabled={loading}
                className="w-full text-xs"
                required
              />
            </div>
          </div>
          <span className="text-[10px] text-zinc-400 uppercase mt-1">
            Displayed to customer as: ~{prepTimeMin || 'X'}-{prepTimeMax || 'Y'} min, made fresh to order.
          </span>
        </div>

        {/* Chef's Note */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase">Chef's Note (Optional)</label>
          <input
            type="text"
            placeholder="e.g. '2-day fermented dough' or 'our most ordered momos, 3 years running'"
            value={chefNote}
            onChange={(e) => setChefNote(e.target.value)}
            disabled={loading}
            className="w-full text-xs"
          />
          <span className="text-[10px] text-zinc-400 uppercase">
            A short insider note shown to customers in the detailed view. Leave empty to hide.
          </span>
        </div>

        {/* Slider Images List Manager */}
        <div className="flex flex-col gap-1 border-t border-dashed border-black pt-4">
          <label className="text-xs font-bold uppercase">Slider Images (Additional)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleExtraImageUpload}
            disabled={loading}
            className="text-xs w-full border border-black p-2"
          />
          <span className="text-[10px] text-zinc-400 uppercase">Upload extra images for the product slide show.</span>
          
          {extraImages.length > 0 && (
            <div className="grid grid-cols-5 gap-2 mt-2">
              {extraImages.map((img, idx) => (
                <div key={idx} className="relative border border-black group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`Slide ${idx}`} className="w-full h-12 object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveExtraImage(idx)}
                    className="absolute -top-1 -right-1 bg-black text-white text-[8px] font-bold rounded-none w-4 h-4 flex items-center justify-center border border-white cursor-pointer hover:bg-red-600 transition-colors"
                    title="Delete"
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Image Uploader */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase">Item Image</label>
          <div className="flex gap-4 items-center mt-1">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={loading}
              className="text-xs flex-1 border border-black p-2"
            />
            {image && (
              <div className="w-16 h-16 border border-black flex items-center justify-center bg-zinc-100 select-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 uppercase">
            Upload a local image (Max 1MB).
          </span>
        </div>

        {/* Availability checkbox */}
        <div className="flex items-center gap-2 mt-2 py-2 border-t border-b border-black">
          <input
            type="checkbox"
            id="available"
            checked={available}
            onChange={(e) => setAvailable(e.target.checked)}
            disabled={loading}
            className="w-4 h-4 cursor-pointer"
          />
          <label htmlFor="available" className="text-xs font-bold uppercase cursor-pointer select-none">
            Item Available immediately
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="border-2 border-black w-full py-3 text-xs font-bold uppercase bg-black text-white hover:bg-white hover:text-black transition-all cursor-pointer mt-4"
        >
          {loading ? 'CREATING MENU ITEM...' : '[ CREATE ITEM ]'}
        </button>
      </form>
    </div>
  );
}
