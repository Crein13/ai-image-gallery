/**
 * Utility functions for building HATEOAS links
 */

/**
 * Build pagination links for list endpoints
 * @param {Object} params
 * @param {string} params.basePath - Base path for the endpoint
 * @param {Object} params.result - Result object with pagination info
 * @param {string} [params.sort] - Sort parameter
 * @param {Object} [params.queryParams] - Additional query parameters
 * @returns {Object} Links object
 */
export function buildPaginationLinks({ basePath, result, sort, queryParams = {} }) {
  const buildLink = (newOffset) => {
    const params = new URLSearchParams();

    // Add query parameters
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.set(key, value.toString());
      }
    });

    // Add pagination parameters
    params.set('limit', result.limit.toString());
    params.set('offset', newOffset.toString());

    if (sort) {
      params.set('sort', sort);
    }

    return `${basePath}?${params.toString()}`;
  };

  const links = {
    self: buildLink(result.offset),
  };

  if (result.hasNext) {
    links.next = buildLink(result.nextOffset);
  }

  if (result.hasPrev) {
    links.prev = buildLink(result.prevOffset);
  }

  return links;
}

/**
 * Build standard paginated response
 * @param {Object} params
 * @param {Array} params.items - Items array
 * @param {Object} params.result - Result object with pagination info
 * @param {Object} params.links - HATEOAS links
 * @returns {Object} Formatted response
 */
export function buildPaginatedResponse({ items, result, links }) {
  return {
    items,
    pagination: {
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasNext: result.hasNext,
      hasPrev: result.hasPrev,
      links,
    },
  };
}