import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// English project entries. Next phase adds src/content/projects/<lang>/ folders
// and the loader/base can be parameterized per locale.
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects/en' }),
  schema: z.object({
    title: z.string(),
    excerpt: z.string(),
    type: z.string(),
    tech: z.string().optional().default(''),
    cover: z.string(), // /assets/projects/<slug>.<ext>
    hero: z.string().optional(), // full-res detail hero
    order: z.number(),
    featured: z.boolean().default(false),
    siteUrl: z.string().optional(), // external "Visit" link
  }),
});

export const collections = { projects };
