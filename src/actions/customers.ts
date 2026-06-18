'use server';

import { cookies } from 'next/headers';
import dbConnect from '@/lib/mongodb';
import Customer from '@/models/Customer';
import { verifyToken } from '@/lib/auth';

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

export async function getCustomers(searchPhone?: string) {
  try {
    const admin = await checkAdminAuth();
    await dbConnect();

    const query: { restaurantId: string; phone?: { $regex: string; $options: string } } = {
      restaurantId: admin.restaurantId,
    };

    if (searchPhone) {
      // Search by partial phone match
      query.phone = { $regex: searchPhone.trim(), $options: 'i' };
    }

    const customers = await Customer.find(query).sort({ totalSpent: -1, totalOrders: -1 });
    return JSON.parse(JSON.stringify(customers));
  } catch (error) {
    console.error('Error fetching customers:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch customers';
    throw new Error(message);
  }
}
