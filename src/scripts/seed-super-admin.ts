/**
 * Super Admin Setup & Migration Script
 * 
 * Description:
 * This script seeds a single super admin account using credentials from environment variables
 * and migrates existing admin records to ensure they have the role field set to 'restaurant_admin' if missing.
 * 
 * How to run:
 * npx tsx src/scripts/seed-super-admin.ts
 */

import { loadEnvConfig } from '@next/env';

// Load environment variables before any other imports to prevent ES module hoisting issues
const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function run() {
  // Dynamically import dependencies so they read the loaded environment variables
  const dbConnect = (await import('../lib/mongodb')).default;
  const { Admin } = await import('../features/auth/model');
  const { hashPassword } = await import('../lib/auth');

  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Error: SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be defined in your environment/env.local file.');
    process.exit(1);
  }

  console.log('Connecting to database...');
  await dbConnect();

  const mongooseInstance = require('mongoose');
  const conn = mongooseInstance.connection;
  console.log('[SEED SCRIPT] Connected to DB host:', conn.host);
  console.log('[SEED SCRIPT] Connected to DB name:', conn.name);

  // 1. Seed/ensure super admin account exists
  console.log('Checking for existing super admin...');
  const existingSuperAdmin = await Admin.findOne({ restaurantId: 'super-admin' });

  if (existingSuperAdmin) {
    console.log(`Super admin already exists with email: ${existingSuperAdmin.email}. Updating password and details to match current env variables...`);
    const hashedPassword = await hashPassword(password);
    existingSuperAdmin.email = email.toLowerCase();
    existingSuperAdmin.password = hashedPassword;
    existingSuperAdmin.role = 'super_admin';
    existingSuperAdmin.active = true;
    existingSuperAdmin.location = 'Tokyo';
    existingSuperAdmin.restaurantName = 'Super Admin';
    await existingSuperAdmin.save();
    console.log('Super admin details updated successfully.');
  } else {
    console.log(`Creating new super admin account with email: ${email}...`);
    const hashedPassword = await hashPassword(password);
    await Admin.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      restaurantId: 'super-admin',
      restaurantName: 'Super Admin',
      phone: '0000000000',
      designation: 'Super Administrator',
      role: 'super_admin',
      active: true,
      location: 'Tokyo',
    });
    console.log('Super admin seeded successfully.');
  }

  // 2. Migrate existing admin records
  console.log('Running migration to ensure all admin documents have role set to restaurant_admin if missing...');
  // Find all admins where role is not one of the allowed role values, excluding the super_admin
  const result = await Admin.updateMany(
    { 
      restaurantId: { $ne: 'super-admin' },
      $or: [
        { role: { $exists: false } },
        { role: { $eq: null } }
      ]
    } as any,
    { $set: { role: 'restaurant_admin' } }
  );

  console.log(`Migration completed. Modified ${result.modifiedCount} records.`);
  process.exit(0);
}

run().catch((error) => {
  console.error('Unhandled error during seeding:', error);
  process.exit(1);
});
