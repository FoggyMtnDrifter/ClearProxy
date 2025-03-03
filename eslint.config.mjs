import js from '@eslint/js'
import prettier from 'eslint-plugin-prettier'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import sveltePlugin from 'eslint-plugin-svelte'
import svelteParser from 'svelte-eslint-parser'
import svelteConfig from './svelte.config.js'

export default [
  {
    ignores: [
      'node_modules',
      '.output',
      '.vercel',
      '.netlify',
      '.wrangler',
      '.svelte-kit',
      'build',
      'dist',
      '.DS_Store',
      'Thumbs.db',
      '.env',
      '.env.*',
      'logs',
      '*.log',
      'npm-debug.log*',
      'yarn-debug.log*',
      'yarn-error.log*',
      'pnpm-debug.log*',
      'lerna-debug.log*',
      '.vscode',
      '.idea',
      '*.suo',
      '*.ntvs*',
      '*.njsproj',
      '*.sln',
      '*.sw?',
      'Caddyfile.bak',
      'caddy.json',
      '.caddy',
      'certificates',
      '*.sqlite',
      '*.sqlite3',
      '*.db',
      '.pnpm-debug.log*',
      '.npm',
      '.eslintcache',
      '.stylelintcache',
      'coverage',
      '*.lcov',
      '*.tsbuildinfo',
      'dist-ssr',
      '.cache',
      'data/caddy/data',
      'data/caddy/config',
      'data/certificates',
      'data/clearproxy.db'
    ]
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        document: 'readonly',
        window: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        fetch: 'readonly',
        crypto: 'readonly'
      }
    }
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.eslint.json',
        extraFileExtensions: ['.svelte']
      }
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      'no-undef': 'warn',
      'no-useless-catch': 'warn'
    }
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: {
          ts: tsParser,
          typescript: tsParser,
          js: 'espree'
        },
        svelteConfig,
        project: './tsconfig.eslint.json',
        extraFileExtensions: ['.svelte']
      }
    },
    plugins: {
      svelte: sveltePlugin,
      '@typescript-eslint': tsPlugin
    },
    rules: {
      ...sveltePlugin.configs.recommended.rules,
      'svelte/no-unused-svelte-ignore': 'warn',
      'svelte/valid-compile': 'warn',
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off'
    },
    settings: {
      svelte: {
        ignoreWarnings: [
          '@typescript-eslint/no-unsafe-assignment',
          '@typescript-eslint/no-unsafe-member-access'
        ]
      }
    }
  },
  {
    plugins: { prettier },
    rules: {
      'prettier/prettier': 'warn'
    }
  }
]
