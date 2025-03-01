import { initializeDatabase } from '$lib/db';

async function initialize() {
  console.log('Running database initialization...');
  
  try {
    await initializeDatabase();
    console.log('Database initialization completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

initialize(); 