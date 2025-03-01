# Database Management in ClearProxy

ClearProxy uses [Drizzle ORM](https://orm.drizzle.team/) with SQLite for database management. This document covers database setup, migrations, and best practices.

## Overview

The database system is designed to be:
- Self-contained (SQLite)
- Automatically migrated
- Easy to backup and restore
- Developer-friendly

## Configuration

### Environment Variables

- `DATABASE_PATH`: Path to SQLite database file (default: `./clearproxy.db`)

### File Structure

```
src/
└── lib/
    └── db/
        ├── migrations/  # Generated migration files
        ├── schema.ts    # Database schema definitions
        └── index.ts     # Database connection and setup
```

## Development Workflow

### Basic Commands

```bash
# Push schema changes (development only)
npm run db:push

# Generate migration files
npm run db:generate

# View and manage database content
npm run db:studio
```

### Making Schema Changes

1. Update schema in `src/lib/db/schema.ts`
2. During development:
   - Use `db:push` for quick iterations
   - Test changes thoroughly
3. Before committing:
   - Run `db:generate` to create migrations
   - Commit both schema and migration files
   - Test migrations in both directions

## Migration System

ClearProxy uses an "on startup" migration strategy.

### Why On Startup?

- Self-hosted application - each user has their own database
- Automatic updates when users upgrade
- No manual intervention required
- Ensures database schema matches application version

### How It Works

1. Application starts up
2. Migration system checks current database version
3. Applies any pending migrations in order
4. Logs migration status and any errors
5. Application continues startup if migrations succeed

### Migration Files

- Located in `src/lib/db/migrations/`
- Generated automatically with `db:generate`
- Include both "up" and "down" migrations
- Tracked in version control

## Best Practices

### Development

1. **Schema Changes**
   - Make small, focused changes
   - Test thoroughly in development
   - Document breaking changes

2. **Testing**
   - Test migrations in both directions
   - Verify data integrity
   - Check foreign key constraints

3. **Version Control**
   - Commit schema and migration files together
   - Include meaningful commit messages
   - Document breaking changes

### Production

1. **Deployment**
   - Never use `db:push` in production
   - Always use migration files
   - Backup database before updates

2. **Monitoring**
   - Check logs for migration errors
   - Monitor database size and performance
   - Set up alerts for migration failures

3. **Maintenance**
   - Regular backups
   - Monitor disk space
   - Clean up old data when appropriate

## Backup and Restore

### Backup Process

1. Stop the application
2. Copy the database file:
   ```bash
   cp clearproxy.db clearproxy.db.backup
   ```
3. Restart the application

### Restore Process

1. Stop the application
2. Replace the database file:
   ```bash
   cp clearproxy.db.backup clearproxy.db
   ```
3. Restart the application

## Troubleshooting

### Common Issues

1. **Migration Failures**
   - Check migration logs
   - Verify database permissions
   - Ensure sufficient disk space

2. **Performance Issues**
   - Monitor database size
   - Check for missing indexes
   - Review query performance

3. **Data Integrity**
   - Verify foreign key constraints
   - Check data types
   - Validate unique constraints

### Debug Tools

1. **Drizzle Studio**
   ```bash
   npm run db:studio
   ```
   - View table structure
   - Inspect data
   - Test queries

2. **SQLite CLI**
   ```bash
   sqlite3 clearproxy.db
   ```
   - Direct database access
   - Run manual queries
   - Check database integrity 