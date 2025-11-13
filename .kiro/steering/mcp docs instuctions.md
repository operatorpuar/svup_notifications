---
inclusion: always
---
---
inclusion: always
---

# Documentation Lookup Strategy

When working with this codebase, use the appropriate MCP server for documentation lookups:

## Astro Framework

- **Use**: Astro docs MCP server (`mcp_Astro_docs_search_astro_docs`)
- **When**: Questions about Astro framework features, APIs, components, routing, integrations, or configuration
- **Examples**: 
  - Astro component syntax
  - File-based routing
  - Server-side rendering
  - Astro DB usage patterns
  - Integration configuration

## All Other Libraries

- **Use**: Context7 MCP server (`mcp_Context7_resolve_library_id` then `mcp_Context7_get_library_docs`)
- **When**: Questions about third-party libraries and frameworks
- **Examples**:
  - Tailwind CSS utilities
  - TypeScript features
  - Node.js APIs
  - npm packages