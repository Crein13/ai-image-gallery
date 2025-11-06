/**
 * @param {Object} params
 * @param {string} params.basePath
 * @param {Object} params.result
 * @param {string} [params.sort]
 * @param {Object} [params.queryParams]
 * @returns {Object}
 */
export function buildPaginationLinks({ basePath, result, sort, queryParams = {} }) {
  const buildLink = (newOffset) => {
    const params = new URLSearchParams();

    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.set(key, value.toString());
      }
    });

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
 * @param {Object} params
 * @param {Array} params.items
 * @param {Object} params.result
 * @param {Object} params.links
 * @returns {Object}
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