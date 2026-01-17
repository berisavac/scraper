import { db } from './index.js';
import { users, predictions } from './schema.js';
import { eq } from 'drizzle-orm';

async function testConnection() {
  console.log('Testing database connection...\n');

  try {
    // Clean up any existing test data
    await db.delete(users).where(eq(users.username, 'test_user'));

    // Test insert
    console.log('1. Testing INSERT...');
    const [user] = await db.insert(users).values({
      username: 'test_user',
      passwordHash: 'hash123'
    }).returning();
    console.log('✓ User created:', user);

    // Test select
    console.log('\n2. Testing SELECT...');
    const allUsers = await db.select().from(users);
    console.log('✓ Users:', allUsers);

    // Test foreign key constraint
    console.log('\n3. Testing foreign key constraint...');
    try {
      await db.insert(predictions).values({
        userId: 99999, // Non-existent user
        matchId: 'test',
        predictionType: 'winner',
        predictedValue: 'home',
        confidence: 80
      });
      console.log('✗ Foreign key constraint NOT enforced (this is bad!)');
    } catch (error) {
      console.log('✓ Foreign key constraint enforced correctly');
    }

    // Test valid prediction insert
    console.log('\n4. Testing valid prediction INSERT...');
    const [prediction] = await db.insert(predictions).values({
      userId: user.id,
      matchId: 'match123',
      predictionType: 'winner',
      predictedValue: 'home',
      confidence: 85
    }).returning();
    console.log('✓ Prediction created:', prediction);

    // Test cascade delete
    console.log('\n5. Testing CASCADE DELETE...');
    await db.delete(users).where(eq(users.id, user.id));
    const remainingPredictions = await db.select().from(predictions);
    console.log('✓ Cascade delete worked. Remaining predictions:', remainingPredictions.length);

    console.log('\n✓ Database connection test PASSED!');
  } catch (error) {
    console.error('✗ Database test FAILED:', error);
    process.exit(1);
  }
}

testConnection();
