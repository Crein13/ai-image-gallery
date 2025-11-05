import { buildPaginationLinks, buildPaginatedResponse } from '../../utils/hateoas.js';

describe('hateoas utilities', () => {
  describe('buildPaginationLinks', () => {
    it('should build basic pagination links', () => {
      const result = {
        limit: 20,
        offset: 0,
        hasNext: true,
        hasPrev: false,
        nextOffset: 20,
        prevOffset: null
      };

      const links = buildPaginationLinks({
        basePath: '/api/images',
        result,
        sort: 'newest'
      });

      expect(links).toEqual({
        self: '/api/images?limit=20&offset=0&sort=newest',
        next: '/api/images?limit=20&offset=20&sort=newest'
      });
    });

    it('should build links with query parameters', () => {
      const result = {
        limit: 10,
        offset: 10,
        hasNext: true,
        hasPrev: true,
        nextOffset: 20,
        prevOffset: 0
      };

      const links = buildPaginationLinks({
        basePath: '/api/images/search',
        result,
        sort: 'oldest',
        queryParams: {
          q: 'sunset',
          color: '#ff0000'
        }
      });

      expect(links).toEqual({
        self: '/api/images/search?q=sunset&color=%23ff0000&limit=10&offset=10&sort=oldest',
        next: '/api/images/search?q=sunset&color=%23ff0000&limit=10&offset=20&sort=oldest',
        prev: '/api/images/search?q=sunset&color=%23ff0000&limit=10&offset=0&sort=oldest'
      });
    });

    it('should handle null/undefined query parameters', () => {
      const result = {
        limit: 20,
        offset: 0,
        hasNext: false,
        hasPrev: false,
        nextOffset: null,
        prevOffset: null
      };

      const links = buildPaginationLinks({
        basePath: '/api/images',
        result,
        queryParams: {
          q: null,
          color: undefined,
          validParam: 'value'
        }
      });

      expect(links).toEqual({
        self: '/api/images?validParam=value&limit=20&offset=0'
      });
    });

    it('should work without sort parameter', () => {
      const result = {
        limit: 20,
        offset: 0,
        hasNext: false,
        hasPrev: false
      };

      const links = buildPaginationLinks({
        basePath: '/api/images',
        result
      });

      expect(links).toEqual({
        self: '/api/images?limit=20&offset=0'
      });
    });
  });

  describe('buildPaginatedResponse', () => {
    it('should build a standard paginated response', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const result = {
        total: 100,
        limit: 20,
        offset: 0,
        hasNext: true,
        hasPrev: false
      };
      const links = {
        self: '/api/images?limit=20&offset=0',
        next: '/api/images?limit=20&offset=20'
      };

      const response = buildPaginatedResponse({ items, result, links });

      expect(response).toEqual({
        items,
        pagination: {
          total: 100,
          limit: 20,
          offset: 0,
          hasNext: true,
          hasPrev: false,
          links
        }
      });
    });
  });
});