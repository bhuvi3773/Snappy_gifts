import { prisma } from '../src/lib/prisma';
import { hashPassword, validatePasswordStrength } from '../src/lib/auth/password';
import { Role } from '@prisma/client';
import crypto from 'node:crypto';

async function bootstrapAdmin() {
  console.log('--- Snappy Gifts: Admin Bootstrap Procedure ---');

  const email = (process.env.ADMIN_BOOTSTRAP_EMAIL || '').trim().toLowerCase();
  let password = process.env.ADMIN_BOOTSTRAP_PASSWORD || '';

  if (!email || !email.includes('@')) {
    console.error('Error: Please provide a valid email via ADMIN_BOOTSTRAP_EMAIL environment variable.');
    console.error('Example: ADMIN_BOOTSTRAP_EMAIL="admin@snappygifts.in" ADMIN_BOOTSTRAP_PASSWORD="YourSecurePassword123" npx tsx scripts/bootstrap-admin.ts');
    process.exit(1);
  }

  // If password not provided, generate a secure 16-character alphanumeric password
  if (!password) {
    password = `Sg!${crypto.randomBytes(8).toString('hex')}9`;
    console.log(`No password provided. Generated secure temporary password.`);
  }

  const validation = validatePasswordStrength(password);
  if (!validation.isValid) {
    console.error(`Error: Password validation failed - ${validation.error}`);
    process.exit(1);
  }

  try {
    const existingAdmin = await prisma.user.findFirst({
      where: { role: Role.ADMIN },
    });

    if (existingAdmin && existingAdmin.email !== email) {
      console.warn(`Warning: An existing administrator (${existingAdmin.email}) is already configured.`);
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        role: Role.ADMIN,
        passwordHash: hashedPassword,
        isActive: true,
        isEmailVerified: true,
      },
      create: {
        email,
        name: 'Snappy Gifts Administrator',
        role: Role.ADMIN,
        passwordHash: hashedPassword,
        isActive: true,
        isEmailVerified: true,
      },
    });

    console.log(`✔ Administrator successfully bootstrapped!`);
    console.log(`  User ID: ${user.id}`);
    console.log(`  Email:   ${user.email}`);
    console.log(`  Role:    ${user.role}`);
    console.log(`  Password: ${password}`);
    console.log('--- Bootstrap Complete ---');
  } catch (error) {
    console.error('Database connection error during bootstrap:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

bootstrapAdmin();
