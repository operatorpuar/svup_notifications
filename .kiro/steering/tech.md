# Technology Stack

## Core Framework

- **Astro 5.15.5**: Static site generator with server-side rendering capabilities
- **TypeScript**: Strict mode enabled via `astro/tsconfigs/strict`
- **Node.js**: ES modules (`"type": "module"`)

## Styling

- **Tailwind CSS 4.1.17**: Utility-first CSS framework
- **@tailwindcss/vite**: Vite plugin integration

## Database

- **Astro DB (@astrojs/db)**: Built-in database solution
- **Backend**: Turso (libSQL) hosted on AWS US-East-2
- **Connection**: Remote database via `ASTRO_DB_REMOTE_URL` and `ASTRO_DB_APP_TOKEN`

## Deployment

- **Netlify**: Deployment platform via `@astrojs/netlify` adapter

## Common Commands

All commands run from the project root:

```bash
# Install dependencies
npm install

# Start development server (with remote DB access)
npm run dev

# Build for production (with remote DB access)
npm run build

# Preview production build locally
npm run preview

# Run Astro CLI commands
npm run astro [command]
```

## Important Notes

- Development and build commands use `--remote` flag to connect to the remote Astro DB
- Database credentials are stored in `.env` (never commit this file)
- Dev server runs on `localhost:4321` by default
