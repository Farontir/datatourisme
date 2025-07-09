import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { 
  TouristResource, 
  PaginatedResponse, 
  TouristResourceId,
  CategoryId,
  LocationId,
  TouristResourceSchema,
  PaginatedResponseSchema,
  CategorySchema,
  LocationSchema
} from '@datatourisme/types';

import { ApiClient } from './client';

export const createApiHooks = (client: ApiClient) => {
  const useTouristResources = (
    page = 1,
    limit = 20,
    filters?: {
      category?: CategoryId;
      location?: LocationId;
      search?: string;
    },
    options?: UseQueryOptions<PaginatedResponse<TouristResource>>
  ) => {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(filters?.category && { category: filters.category }),
      ...(filters?.location && { location: filters.location }),
      ...(filters?.search && { search: filters.search }),
    });

    return useQuery({
      queryKey: ['tourist-resources', page, limit, filters],
      queryFn: async () => {
        const response = await client.get<unknown>(`/tourist-resources/?${queryParams}`);
        return PaginatedResponseSchema(TouristResourceSchema).parse(response);
      },
      ...options,
    });
  };

  const useTouristResource = (
    id: TouristResourceId,
    options?: UseQueryOptions<TouristResource>
  ) => {
    return useQuery({
      queryKey: ['tourist-resource', id],
      queryFn: async () => {
        const response = await client.get<unknown>(`/tourist-resources/${id}/`);
        return TouristResourceSchema.parse(response);
      },
      enabled: !!id,
      ...options,
    });
  };

  const useCategories = (
    options?: UseQueryOptions<PaginatedResponse<TouristResource>>
  ) => {
    return useQuery({
      queryKey: ['categories'],
      queryFn: async () => {
        const response = await client.get<unknown>('/categories/');
        return PaginatedResponseSchema(CategorySchema).parse(response);
      },
      ...options,
    });
  };

  const useLocations = (
    search?: string,
    options?: UseQueryOptions<PaginatedResponse<TouristResource>>
  ) => {
    const queryParams = search ? `?search=${encodeURIComponent(search)}` : '';
    
    return useQuery({
      queryKey: ['locations', search],
      queryFn: async () => {
        const response = await client.get<unknown>(`/locations/${queryParams}`);
        return PaginatedResponseSchema(LocationSchema).parse(response);
      },
      ...options,
    });
  };

  const useCreateTouristResource = (
    options?: UseMutationOptions<TouristResource, Error, Omit<TouristResource, 'id' | 'createdAt' | 'updatedAt'>>
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (data) => {
        const response = await client.post<unknown>('/tourist-resources/', data);
        return TouristResourceSchema.parse(response);
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ['tourist-resources'] });
        queryClient.setQueryData(['tourist-resource', data.id], data);
      },
      ...options,
    });
  };

  const useUpdateTouristResource = (
    options?: UseMutationOptions<TouristResource, Error, { id: TouristResourceId; data: Partial<TouristResource> }>
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({ id, data }) => {
        const response = await client.patch<unknown>(`/tourist-resources/${id}/`, data);
        return TouristResourceSchema.parse(response);
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ['tourist-resources'] });
        queryClient.setQueryData(['tourist-resource', data.id], data);
      },
      ...options,
    });
  };

  const useDeleteTouristResource = (
    options?: UseMutationOptions<void, Error, TouristResourceId>
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (id) => {
        await client.delete(`/tourist-resources/${id}/`);
      },
      onSuccess: (_, id) => {
        queryClient.invalidateQueries({ queryKey: ['tourist-resources'] });
        queryClient.removeQueries({ queryKey: ['tourist-resource', id] });
      },
      ...options,
    });
  };

  return {
    useTouristResources,
    useTouristResource,
    useCategories,
    useLocations,
    useCreateTouristResource,
    useUpdateTouristResource,
    useDeleteTouristResource,
  };
};

export type ApiHooks = ReturnType<typeof createApiHooks>;