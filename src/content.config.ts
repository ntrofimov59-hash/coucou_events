import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const services = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/services' }),
  schema: z.object({
    title: z.string(),
    category: z.string(),
    description: z.string(),
    cities: z.array(z.string()).default([]),
    price: z.string().optional(),
    priceFrom: z.string().optional(),
    image: z.string().optional(),
    images: z.array(z.string()).optional(),
    features: z.array(z.any()).optional().default([]),
    searchKeywords: z.array(z.string()).optional(),
    order: z.number().default(0),
    published: z.boolean().default(true),
  }),
});

// Коллекция портфолио
const portfolio = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/portfolio' }),
  schema: z.object({
    title: z.string(),
    category: z.string(),
    location: z.string(),
    guests: z.string(),
    budget: z.string(),
    span: z.string().default('col-span-1 row-span-1'),
    description: z.string(),
    review: z.string(),
    client: z.string(),
    image: z.string(),
    order: z.number().default(0),
  }),
});

// Коллекция отзывов
const testimonials = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/testimonials' }),
  schema: z.object({
    author: z.string(),
    authorEn: z.string().optional(),
    authorEsp: z.string().optional(),
    authorArm: z.string().optional(),

    text: z.string(),
    textEn: z.string().optional(),
    textEsp: z.string().optional(),
    textArm: z.string().optional(),

    rating: z.number().min(1).max(5).default(5),
    date: z.coerce.date().optional(),

    event: z.string().optional(),
    eventEn: z.string().optional(),
    eventEsp: z.string().optional(),
    eventArm: z.string().optional(),

    platform: z.string().optional(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    keywords: z.string().optional(),
  }),
});

// Коллекция превью (галерея на главной)
const previews = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/previews' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    picture: z.string(),
    order: z.number().default(0),
  }),
});

export const collections = { services, portfolio, testimonials, previews };