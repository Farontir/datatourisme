import { z } from 'zod';

import { TouristResourceId, CategoryId, LocationId, ImageId } from './branded';

export const LocationSchema = z.object({
  id: z.string().transform(id => id as LocationId),
  name: z.string(),
  address: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  city: z.string(),
  postalCode: z.string(),
  country: z.string(),
});

export const CategorySchema = z.object({
  id: z.string().transform(id => id as CategoryId),
  name: z.string(),
  description: z.string().optional(),
  parentId: z.string().transform(id => id as CategoryId).optional(),
});

export const ImageSchema = z.object({
  id: z.string().transform(id => id as ImageId),
  url: z.string().url(),
  alt: z.string(),
  width: z.number(),
  height: z.number(),
  caption: z.string().optional(),
});

export const TouristResourceSchema = z.object({
  id: z.string().transform(id => id as TouristResourceId),
  name: z.string(),
  description: z.string(),
  shortDescription: z.string().optional(),
  category: CategorySchema,
  location: LocationSchema,
  images: z.array(ImageSchema),
  website: z.string().url().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  openingHours: z.record(z.string()),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().min(0).optional(),
  priceRange: z.enum(['FREE', 'LOW', 'MEDIUM', 'HIGH']).optional(),
  accessibility: z.object({
    wheelchairAccessible: z.boolean(),
    hearingImpaired: z.boolean(),
    visuallyImpaired: z.boolean(),
  }).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const PaginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    results: z.array(itemSchema),
    count: z.number(),
    next: z.string().url().nullable(),
    previous: z.string().url().nullable(),
  });

export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});

export type Location = z.infer<typeof LocationSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type Image = z.infer<typeof ImageSchema>;
export type TouristResource = z.infer<typeof TouristResourceSchema>;
export type PaginatedResponse<T> = z.infer<ReturnType<typeof PaginatedResponseSchema>>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;