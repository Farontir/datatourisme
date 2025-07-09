declare const __brand: unique symbol;

export type Brand<T, TBrand extends string> = T & {
  readonly [__brand]: TBrand;
};

export type TouristResourceId = Brand<string, 'TouristResourceId'>;
export type UserId = Brand<string, 'UserId'>;
export type CategoryId = Brand<string, 'CategoryId'>;
export type LocationId = Brand<string, 'LocationId'>;
export type ImageId = Brand<string, 'ImageId'>;

export const createTouristResourceId = (id: string): TouristResourceId => 
  id as TouristResourceId;

export const createUserId = (id: string): UserId => 
  id as UserId;

export const createCategoryId = (id: string): CategoryId => 
  id as CategoryId;

export const createLocationId = (id: string): LocationId => 
  id as LocationId;

export const createImageId = (id: string): ImageId => 
  id as ImageId;