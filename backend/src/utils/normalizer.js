/**
 * normalizer.js
 * Converts raw data from any external API into the unified CachedEvent DB shape.
 * Phase 2 services import normalizeEvent(); every route uses serializeEvent().
 */

/**
 * Prepares a raw event object for insertion into the CachedEvent table.
 */
function normalizeEvent({
  externalId,
  source,
  categoryId,
  subcategoryId,
  title,
  description,
  date,
  time,
  endTime,
  venue,
  location,
  imageUrl,
  tags,
  status,
}) {
  const dateStr =
    date instanceof Date ? date.toISOString().split('T')[0] : String(date);

  const expiresAt = new Date(dateStr);
  expiresAt.setDate(expiresAt.getDate() + 2); // expire 2 days after event date

  return {
    externalId: String(externalId),
    source: source || 'unknown',
    categoryId,
    subcategoryId,
    title: String(title || '').slice(0, 255),
    description: String(description || '').slice(0, 1000),
    date: dateStr,
    time: time || '00:00',
    endTime: endTime || '',
    venue: venue || '',
    location: location || '',
    imageUrl: imageUrl || '',
    tags: Array.isArray(tags) ? tags.join('|') : tags || '',
    status: status || 'upcoming',
    expiresAt,
  };
}

/**
 * Converts a CachedEvent DB row into the API response shape sent to the frontend.
 */
function serializeEvent(row, categoryName, categoryIcon, subcategoryName, subcategoryIcon) {
  return {
    id: row.externalId,
    source: row.source,
    categoryId: row.categoryId,
    categoryName: categoryName || row.categoryId,
    categoryIcon: categoryIcon || '📌',
    subcategoryId: row.subcategoryId,
    subcategoryName: subcategoryName || row.subcategoryId,
    subcategoryIcon: subcategoryIcon || '📌',
    title: row.title,
    description: row.description,
    date: row.date,
    time: row.time,
    endTime: row.endTime,
    venue: row.venue,
    location: row.location,
    image: row.imageUrl,
    tags: row.tags ? row.tags.split('|').filter(Boolean) : [],
    status: row.status,
  };
}

module.exports = { normalizeEvent, serializeEvent };
