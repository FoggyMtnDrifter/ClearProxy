import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as path from 'path';
import * as schema from './lib/db/schema';

const projectRoot = process.env.DATABASE_PATH || '.';

async function initialize() {
  console.log('Initializing database...');
  
  try {
    // Initialize the database connection
    const sqlite = new Database(path.join(projectRoot, 'clearproxy.db'));
    const db = drizzle(sqlite, { schema });
    console.log('Database connection initialized successfully');

    // Run migrations
    try {
      console.log('Running database migrations...');
      await migrate(db, { migrationsFolder: path.join(projectRoot, 'src/lib/db/migrations') });
      console.log('Database migrations completed successfully');
      process.exit(0);
    } catch (migrationError) {
      console.error('Failed to run database migrations:', migrationError);
      process.exit(1);
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

initialize(); 