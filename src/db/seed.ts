import { db } from './index.js';
import { users, inviteCodes } from './schema.js';
import bcrypt from 'bcrypt';

async function seed() {
  console.log('Seeding database...');
  
  // Kreiraj admin korisnika
  const passwordHash = await bcrypt.hash('bigapple123', 10);
  
  const [admin] = await db.insert(users).values({
    username: 'nedja',
    passwordHash,
    isAdmin: true
  }).returning();
  
  console.log('✓ Created admin user:', admin.username);
  
  // Kreiraj invite code za buduće korisnike
  await db.insert(inviteCodes).values({
    code: 'SPORTS2026',
    createdBy: admin.id
  });
  
  console.log('✓ Created invite code: SPORTS2026');
  console.log('Done!');
}

seed().catch(console.error);
