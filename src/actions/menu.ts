'use server';

import { cookies } from 'next/headers';
import dbConnect from '@/lib/mongodb';
import Menu from '@/models/Menu';
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

export async function getMenuItems(restaurantId: string) {
  try {
    await dbConnect();
    const items = await Menu.find({ restaurantId }).sort({ category: 1, name: 1 });
    return JSON.parse(JSON.stringify(items));
  } catch (error) {
    console.error('Error fetching menu items:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch menu items';
    throw new Error(message);
  }
}

export async function getMenuItemById(id: string) {
  try {
    await dbConnect();
    const item = await Menu.findById(id);
    if (!item) {
      throw new Error('Menu item not found');
    }
    return JSON.parse(JSON.stringify(item));
  } catch (error) {
    console.error('Error fetching menu item:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch menu item';
    throw new Error(message);
  }
}

export async function createMenuItem(data: {
  category: string;
  name: string;
  description: string;
  image: string;
  price: number;
  available?: boolean;
}) {
  try {
    const admin = await checkAdminAuth();
    await dbConnect();

    const newItem = await Menu.create({
      restaurantId: admin.restaurantId,
      category: data.category,
      name: data.name,
      description: data.description,
      image: data.image,
      price: Number(data.price),
      available: data.available !== undefined ? data.available : true,
    });

    revalidatePath(`/menu/${admin.restaurantId}`);
    return JSON.parse(JSON.stringify(newItem));
  } catch (error) {
    console.error('Error creating menu item:', error);
    const message = error instanceof Error ? error.message : 'Failed to create menu item';
    throw new Error(message);
  }
}

export async function updateMenuItem(
  id: string,
  data: {
    category: string;
    name: string;
    description: string;
    image: string;
    price: number;
    available?: boolean;
  }
) {
  try {
    const admin = await checkAdminAuth();
    await dbConnect();

    // Verify item belongs to admin's restaurant
    const item = await Menu.findById(id);
    if (!item || item.restaurantId !== admin.restaurantId) {
      throw new Error('Unauthorized or item not found');
    }

    const updatedItem = await Menu.findByIdAndUpdate(
      id,
      {
        category: data.category,
        name: data.name,
        description: data.description,
        image: data.image,
        price: Number(data.price),
        available: data.available !== undefined ? data.available : true,
      },
      { new: true }
    );

    revalidatePath(`/menu/${admin.restaurantId}`);
    return JSON.parse(JSON.stringify(updatedItem));
  } catch (error) {
    console.error('Error updating menu item:', error);
    const message = error instanceof Error ? error.message : 'Failed to update menu item';
    throw new Error(message);
  }
}

export async function toggleMenuItemAvailability(id: string, available: boolean) {
  try {
    const admin = await checkAdminAuth();
    await dbConnect();

    const item = await Menu.findById(id);
    if (!item || item.restaurantId !== admin.restaurantId) {
      throw new Error('Unauthorized or item not found');
    }

    item.available = available;
    await item.save();

    revalidatePath(`/menu/${admin.restaurantId}`);
    return JSON.parse(JSON.stringify(item));
  } catch (error) {
    console.error('Error toggling menu item availability:', error);
    const message = error instanceof Error ? error.message : 'Failed to toggle item availability';
    throw new Error(message);
  }
}

export async function deleteMenuItem(id: string) {
  try {
    const admin = await checkAdminAuth();
    await dbConnect();

    const item = await Menu.findById(id);
    if (!item || item.restaurantId !== admin.restaurantId) {
      throw new Error('Unauthorized or item not found');
    }

    await Menu.findByIdAndDelete(id);

    revalidatePath(`/menu/${admin.restaurantId}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting menu item:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete menu item';
    throw new Error(message);
  }
}
