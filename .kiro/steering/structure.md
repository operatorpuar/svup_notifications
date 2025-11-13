# Project Structure

## Directory Organization

```
/
├── db/                    # Database configuration and seeding
│   ├── config.ts         # Astro DB table definitions
│   └── seed.ts           # Database seed data
├── public/               # Static assets (served as-is)
│   └── favicon.svg
├── src/
│   ├── assets/          # Processed assets (images, SVGs)
│   ├── components/      # Reusable Astro components
│   ├── layouts/         # Page layout components
│   ├── pages/           # File-based routing (each file = route)
│   └── styles/          # Global CSS files
├── .env                 # Environment variables (DO NOT COMMIT)
├── astro.config.mjs     # Astro configuration
├── package.json         # Dependencies and scripts
└── tsconfig.json        # TypeScript configuration
```

## Key Conventions

### File Types

- **`.astro` files**: Astro components with frontmatter (---) for logic and template below
- **`.ts` files**: TypeScript modules for utilities and configuration
- **`.css` files**: Global or scoped styles

### Routing

- Pages in `src/pages/` automatically become routes
- `src/pages/index.astro` → `/`
- File-based routing follows Astro conventions

### Components

- Reusable components live in `src/components/`
- Import assets using relative paths
- Use Astro's component syntax with frontmatter for logic

### Database

- Define tables in `db/config.ts` using `defineDb()`
- Seed data in `db/seed.ts`
- Access database via `import { db } from 'astro:db'`

### Styling

- Scoped styles: Use `<style>` tags within `.astro` components
- Global styles: Place in `src/styles/`
- Tailwind utilities available via Vite plugin integration

## Configuration Files

- **astro.config.mjs**: Integrations (DB, Netlify), Vite plugins, adapter settings
- **tsconfig.json**: Extends Astro's strict TypeScript config
- **.env**: Database credentials and environment-specific variables
