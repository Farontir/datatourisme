import { http, HttpResponse } from 'msw';

export const handlers = [
  // Mock search API
  http.get('/api/search', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    const page = parseInt(url.searchParams.get('page') || '1');
    
    const mockResource = (id: number) => ({
      id: id.toString(),
      name: `Test Resource ${id}`,
      description: `Test description for resource ${id}`,
      location: {
        name: `Test Location ${id}`,
        latitude: 45.7640 + (id * 0.01),
        longitude: 4.8357 + (id * 0.01),
      },
      category: {
        id: 'test-category',
        name: 'Test Category',
      },
      rating: 4.2,
      reviewCount: 100 + id,
      priceRange: 'MEDIUM',
      images: [{
        id: `img-${id}`,
        url: `/test-image-${id}.jpg`,
        alt: `Test image ${id}`,
        width: 400,
        height: 300,
      }],
      accessibility: {
        wheelchairAccessible: id % 2 === 0,
      },
    });

    const resources = Array.from({ length: 10 }, (_, i) => 
      mockResource(page * 10 - 10 + i + 1)
    );

    return HttpResponse.json({
      results: resources,
      count: 100,
      next: page < 10 ? `/api/search?page=${page + 1}` : null,
      previous: page > 1 ? `/api/search?page=${page - 1}` : null,
    });
  }),

  // Mock categories API
  http.get('/api/categories', () => {
    return HttpResponse.json({
      results: [
        { id: 'mountains', name: 'Montagnes', count: 100 },
        { id: 'beaches', name: 'Plages', count: 50 },
        { id: 'cities', name: 'Villes', count: 75 },
      ],
      count: 3,
    });
  }),

  // Mock stats API
  http.get('/api/stats', () => {
    return HttpResponse.json({
      totalResources: 12847,
      totalUsers: 45632,
      totalLocations: 1247,
      averageRating: 4.2,
    });
  }),
];