# Contributing to ClearProxy

Thank you for your interest in contributing to ClearProxy! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct (to be implemented). We are committed to providing a welcoming and inclusive environment for all contributors.

## Getting Started

1. Fork the repository
2. Clone your fork:
```bash
git clone https://github.com/yourusername/clearproxy.git
cd clearproxy
```

3. Set up your development environment:
```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

## Development Guidelines

### Code Style

We follow these coding standards:
- Use TypeScript for all new code
- Follow the existing code style in the project
- Use 2 spaces for indentation
- Use meaningful variable and function names
- Add JSDoc comments for public functions and complex logic
- Keep functions small and focused
- Use async/await for asynchronous operations
- Handle errors appropriately with try/catch blocks
- Use strong typing - avoid `any` types unless absolutely necessary

### Git Workflow

1. Create a feature branch from `main`:
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes in small, logical commits:
```bash
git commit -m "feat: add new feature"
```

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `style:` for formatting changes
- `refactor:` for code refactoring
- `test:` for adding tests
- `chore:` for maintenance tasks

### Testing

Before submitting a pull request:

1. Run the test suite:
```bash
npm run test
```

2. Run the linter:
```bash
npm run lint
```

3. Ensure your changes have appropriate test coverage:
- Unit tests for utility functions
- Integration tests for API endpoints
- End-to-end tests for critical user flows

### Database Management

#### Development Workflow

```bash
# Push schema changes (development only)
npm run db:push

# Generate migration files
npm run db:generate

# View database content
npm run db:studio
```

#### Making Database Changes

1. Update schema in `src/lib/db/schema.ts`
2. During development:
   - Use `db:push` for quick iterations
   - Test changes thoroughly
3. Before committing:
   - Run `db:generate` to create migrations
   - Commit both schema and migration files
   - Test migrations in both directions

### Project Structure

```
clearproxy/
├── src/
│   ├── lib/           # Shared utilities and components
│   │   ├── db/       # Database management
│   │   ├── caddy/    # Caddy configuration
│   │   ├── logger/   # Logging utilities
│   │   └── utils/    # General utilities
│   ├── routes/       # SvelteKit routes
│   └── tests/        # Test files
├── static/           # Static assets
└── docs/            # Documentation
```

## Pull Request Process

1. Update documentation for any new features or changes
2. Add or update tests as needed
3. Ensure all tests pass and linting is clean
4. Update the CHANGELOG.md file
5. Submit a pull request with:
   - Clear title and description
   - Reference to any related issues
   - Screenshots for UI changes
   - List of testing steps if applicable

## Documentation

- Update documentation alongside code changes
- Use clear, concise language
- Include code examples where appropriate
- Update both inline documentation and markdown files
- Keep the README.md up to date

## Questions and Support

- Open an issue for bugs or feature requests
- Use discussions for general questions
- Join our community chat (coming soon)

## License

By contributing to ClearProxy, you agree that your contributions will be licensed under the same terms as the project (MIT License). 