'use server';

import { cookies } from 'next/headers';
import dbConnect from '@/lib/mongodb';
import Menu from '@/models/Menu';
import PairingRule from '@/models/PairingRule';
import DiscountTier from '@/models/DiscountTier';
import ComboRule from '@/models/ComboRule';
import Order from '@/models/Order';
import { verifyToken } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

async function checkAdminAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) {
    throw new Error('Unauthorized: No token provided');
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    throw new Error('Unauthorized: Invalid token');
  }

  return decoded;
}

// Get all configurations for upsells (can be accessed by client/admin)
export async function getUpsellConfig(restaurantId: string) {
  try {
    await dbConnect();

    const menuItems = await Menu.find({ restaurantId }).sort({ category: 1, name: 1 });
    const pairingRules = await PairingRule.find({ restaurantId, active: true });
    const discountTiers = await DiscountTier.find({ restaurantId }).sort({ minSpend: 1 });
    const comboRules = await ComboRule.find({ restaurantId, active: true });

    // Compute data-driven affinity scores if completed orders count > 50
    const completedOrders = await Order.find({ restaurantId, status: 'completed' });
    const completedCount = completedOrders.length;
    const computedAffinity: Record<string, Array<{ name: string; confidence: number }>> = {};

    if (completedCount >= 50) {
      const itemCountMap: Record<string, number> = {};
      const coOccurrenceMap: Record<string, Record<string, number>> = {};

      completedOrders.forEach((order) => {
        const uniqueItems = Array.from(new Set(order.items.map((i) => i.name)));
        
        uniqueItems.forEach((item) => {
          itemCountMap[item] = (itemCountMap[item] || 0) + 1;
        });

        for (let i = 0; i < uniqueItems.length; i++) {
          for (let j = 0; j < uniqueItems.length; j++) {
            if (i === j) continue;
            const itemA = uniqueItems[i];
            const itemB = uniqueItems[j];

            if (!coOccurrenceMap[itemA]) {
              coOccurrenceMap[itemA] = {};
            }
            coOccurrenceMap[itemA][itemB] = (coOccurrenceMap[itemA][itemB] || 0) + 1;
          }
        }
      });

      // Filter pairs where occurrence count >= 20 and confidence > 0.2
      Object.keys(coOccurrenceMap).forEach((itemA) => {
        const countA = itemCountMap[itemA] || 0;
        if (countA >= 20) {
          const suggestions: Array<{ name: string; confidence: number }> = [];
          Object.keys(coOccurrenceMap[itemA]).forEach((itemB) => {
            const countPair = coOccurrenceMap[itemA][itemB];
            if (countPair >= 20) {
              const confidence = countPair / countA;
              if (confidence > 0.2) {
                suggestions.push({ name: itemB, confidence });
              }
            }
          });

          if (suggestions.length > 0) {
            computedAffinity[itemA] = suggestions.sort((a, b) => b.confidence - a.confidence);
          }
        }
      });
    }

    return {
      menuItems: JSON.parse(JSON.stringify(menuItems)),
      pairingRules: JSON.parse(JSON.stringify(pairingRules)),
      discountTiers: JSON.parse(JSON.stringify(discountTiers)),
      comboRules: JSON.parse(JSON.stringify(comboRules)),
      computedAffinity,
      completedCount,
    };
  } catch (error) {
    console.error('Error fetching upsell config:', error);
    throw new Error('Failed to load recommendation settings');
  }
}

// 1. Tagging updates
export async function updateMenuItemCategory(itemId: string, category: string) {
  try {
    const admin = await checkAdminAuth();
    await dbConnect();

    const updated = await Menu.findOneAndUpdate(
      { _id: itemId, restaurantId: admin.restaurantId },
      { category: category.trim() },
      { new: true }
    );

    revalidatePath(`/admin/upsell`);
    revalidatePath(`/menu/${admin.restaurantId}`);
    return JSON.parse(JSON.stringify(updated));
  } catch (error) {
    console.error('Error updating category:', error);
    throw new Error('Failed to update category');
  }
}

export async function updateMenuItemPairsWith(itemId: string, pairsWithCategories: string[]) {
  try {
    const admin = await checkAdminAuth();
    await dbConnect();

    const updated = await Menu.findOneAndUpdate(
      { _id: itemId, restaurantId: admin.restaurantId },
      { pairsWithCategories },
      { new: true }
    );

    revalidatePath(`/admin/upsell`);
    revalidatePath(`/menu/${admin.restaurantId}`);
    return JSON.parse(JSON.stringify(updated));
  } catch (error) {
    console.error('Error updating pairings:', error);
    throw new Error('Failed to update item pairings');
  }
}

export async function updateMenuItemActive(itemId: string, active: boolean) {
  try {
    const admin = await checkAdminAuth();
    await dbConnect();

    const updated = await Menu.findOneAndUpdate(
      { _id: itemId, restaurantId: admin.restaurantId },
      { active, available: active },
      { new: true }
    );

    revalidatePath(`/admin/upsell`);
    revalidatePath(`/menu/${admin.restaurantId}`);
    return JSON.parse(JSON.stringify(updated));
  } catch (error) {
    console.error('Error updating item state:', error);
    throw new Error('Failed to update item active status');
  }
}

// 2. Pairing Rules CRUD
export async function savePairingRule(data: {
  _id?: string;
  triggerCategory: string;
  suggestCategories: string[];
  active: boolean;
}) {
  try {
    const admin = await checkAdminAuth();
    await dbConnect();

    let rule;
    if (data._id) {
      rule = await PairingRule.findOneAndUpdate(
        { _id: data._id, restaurantId: admin.restaurantId },
        {
          triggerCategory: data.triggerCategory,
          suggestCategories: data.suggestCategories,
          active: data.active,
        },
        { new: true }
      );
    } else {
      rule = await PairingRule.create({
        restaurantId: admin.restaurantId,
        triggerCategory: data.triggerCategory,
        suggestCategories: data.suggestCategories,
        active: data.active,
      });
    }

    revalidatePath(`/admin/upsell`);
    return JSON.parse(JSON.stringify(rule));
  } catch (error) {
    console.error('Error saving pairing rule:', error);
    throw new Error('Failed to save pairing rule');
  }
}

export async function deletePairingRule(id: string) {
  try {
    const admin = await checkAdminAuth();
    await dbConnect();

    await PairingRule.deleteOne({ _id: id, restaurantId: admin.restaurantId });
    revalidatePath(`/admin/upsell`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting pairing rule:', error);
    throw new Error('Failed to delete pairing rule');
  }
}

// 3. Discount Tiers CRUD
export async function saveDiscountTier(data: {
  _id?: string;
  minSpend: number;
  percentOff: number;
  categoryScope: string | null;
  active?: boolean;
}) {
  try {
    const admin = await checkAdminAuth();
    await dbConnect();

    let tier;
    if (data._id) {
      tier = await DiscountTier.findOneAndUpdate(
        { _id: data._id, restaurantId: admin.restaurantId },
        {
          minSpend: Number(data.minSpend),
          percentOff: Number(data.percentOff),
          categoryScope: data.categoryScope ? data.categoryScope.trim() : null,
          active: data.active !== undefined ? data.active : true,
        },
        { new: true }
      );
    } else {
      tier = await DiscountTier.create({
        restaurantId: admin.restaurantId,
        minSpend: Number(data.minSpend),
        percentOff: Number(data.percentOff),
        categoryScope: data.categoryScope ? data.categoryScope.trim() : null,
        active: data.active !== undefined ? data.active : true,
      });
    }

    revalidatePath(`/admin/upsell`);
    return JSON.parse(JSON.stringify(tier));
  } catch (error) {
    console.error('Error saving discount tier:', error);
    throw new Error('Failed to save discount tier');
  }
}

export async function deleteDiscountTier(id: string) {
  try {
    const admin = await checkAdminAuth();
    await dbConnect();

    await DiscountTier.deleteOne({ _id: id, restaurantId: admin.restaurantId });
    revalidatePath(`/admin/upsell`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting discount tier:', error);
    throw new Error('Failed to delete discount tier');
  }
}

// 4. Combo Rules CRUD
export async function saveComboRule(data: {
  _id?: string;
  conditionCategory: string;
  conditionExcludeCategory: string | null;
  rewardType: 'free_item' | 'percent_off_item' | 'percent_off_order';
  rewardTarget: string;
  customerMessage: string;
  active: boolean;
}) {
  try {
    const admin = await checkAdminAuth();
    await dbConnect();

    let rule;
    if (data._id) {
      rule = await ComboRule.findOneAndUpdate(
        { _id: data._id, restaurantId: admin.restaurantId },
        {
          conditionCategory: data.conditionCategory,
          conditionExcludeCategory: data.conditionExcludeCategory,
          rewardType: data.rewardType,
          rewardTarget: data.rewardTarget,
          customerMessage: data.customerMessage,
          active: data.active,
        },
        { new: true }
      );
    } else {
      rule = await ComboRule.create({
        restaurantId: admin.restaurantId,
        conditionCategory: data.conditionCategory,
        conditionExcludeCategory: data.conditionExcludeCategory,
        rewardType: data.rewardType,
        rewardTarget: data.rewardTarget,
        customerMessage: data.customerMessage,
        active: data.active,
      });
    }

    revalidatePath(`/admin/upsell`);
    return JSON.parse(JSON.stringify(rule));
  } catch (error) {
    console.error('Error saving combo rule:', error);
    throw new Error('Failed to save combo rule');
  }
}

export async function deleteComboRule(id: string) {
  try {
    const admin = await checkAdminAuth();
    await dbConnect();

    await ComboRule.deleteOne({ _id: id, restaurantId: admin.restaurantId });
    revalidatePath(`/admin/upsell`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting combo rule:', error);
    throw new Error('Failed to delete combo rule');
  }
}
