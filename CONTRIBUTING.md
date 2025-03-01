# Contributing to ClearProxy

Thank you for your interest in contributing to ClearProxy! This document provides guidelines and instructions for setting up your development environment and working with the project.

## Getting Started

1. Fork the repository
2. Clone your fork:
```bash
git clone https://github.com/yourusername/clearproxy.git
cd clearproxy
```

## Development Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

## Database Management

The project uses Drizzle ORM with SQLite for database management. Here's how to work with the database:

### Development Workflow

During development, use the following commands:

```bash
# Push schema changes directly to the database (development only)
npm run db:push

# Generate migration files for production deployment
npm run db:generate

# View and manage database content through the Drizzle Studio
npm run db:studio
```

### Database Structure

- Database files:
  - `src/lib/db/schema.ts` - Contains table definitions
  - `src/lib/db/index.ts` - Database connection and migration setup
  - `src/lib/db/migrations/` - Generated migration files

### Making Database Changes

1. Modify the schema in `src/lib/db/schema.ts`
2. During development:
   - Use `npm run db:push` to quickly apply changes
   - Test your changes thoroughly
3. Before committing:
   - Run `npm run db:generate` to create migration files
   - Commit both schema changes and generated migration files

### Migration Strategy

This project uses an "on startup" migration strategy:

1. **Why on startup?**
   - The application is self-hosted, meaning each user has their own database
   - Migrations need to run when users update their installation
   - This ensures databases are always up-to-date with the application version

2. **How it works:**
   - When the application starts, it checks for and runs any pending migrations
   - Migrations are stored in `src/lib/db/migrations/`
   - The migration process is automatic and requires no user intervention
   - If migrations fail, the application will log errors but continue running

3. **Best practices for adding migrations:**
   - Always test migrations on a development database first
   - Keep migrations small and focused
   - Include both "up" and "down" migrations when possible
   - Document any breaking changes in the release notes

### Production Deployment

For production deployments:
1. Never use `db:push` directly on production
2. Always use migration files generated with `db:generate`
3. Migrations run automatically on application startup
4. Monitor logs for any migration errors

## Project Structure

```
clearproxy/
├── src/
│   ├── lib/
│   │   ├── db/              # Database management
│   │   │   ├── migrations/  # Migration files
│   │   │   ├── schema.ts    # Database schema
│   │   │   └── index.ts     # DB connection
│   │   ├── caddy/          # Caddy configuration
│   │   └── ...
│   ├── routes/             # SvelteKit routes
│   └── ...
├── drizzle.config.ts      # Drizzle ORM configuration
└── ...
```

## Code Style

- Use TypeScript for type safety
- Follow the existing code style
- Use async/await for asynchronous operations
- Add appropriate error handling
- Include comments for complex logic

## Testing

[TODO: Add testing instructions when implemented]

## Submitting Changes

1. Create a new branch for your changes
2. Make your changes following the guidelines above
3. Test your changes thoroughly
4. Submit a pull request with a clear description of your changes

## Questions or Problems?

If you have questions or run into problems, please open an issue on the GitHub repository. 