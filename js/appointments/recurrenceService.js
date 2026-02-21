/**
 * Generates future weekly dates based on a starting date.
 * 
 * @param {string} baseDate - The starting date in YYYY-MM-DD format.
 * @param {number} weeksCount - Number of occurrences to generate (default 8).
 * @returns {string[]} Array of date strings in YYYY-MM-DD format.
 */
export function generateWeeklyOccurrences(baseDate, weeksCount = 8) {
    if (!baseDate) return [];

    const occurrences = [];
    const start = new Date(baseDate);

    for (let i = 1; i <= weeksCount; i++) {
        const next = new Date(start);
        next.setDate(start.getDate() + (i * 7));
        occurrences.push(next.toISOString().split('T')[0]);
    }

    return occurrences;
}
