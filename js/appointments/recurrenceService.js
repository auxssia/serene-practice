/**
 * Generates future weekly dates based on a starting date.
 * 
 * @param {string} baseDate - The starting date in YYYY-MM-DD format.
 * @param {number} weeksCount - Number of occurrences to generate (default 8).
 * @returns {string[]} Array of date strings in YYYY-MM-DD format.
 */
export function generateWeeklyOccurrences(baseDate, weeksCount = 8) {
    if (!baseDate) return [];

    const [y, m, d] = baseDate.split('-').map(Number);
    const occurrences = [];

    for (let i = 1; i <= weeksCount; i++) {
        // Construct date in local time
        const next = new Date(y, m - 1, d + (i * 7));

        // Format back to YYYY-MM-DD local
        const ny = next.getFullYear();
        const nm = String(next.getMonth() + 1).padStart(2, '0');
        const nd = String(next.getDate()).padStart(2, '0');
        occurrences.push(`${ny}-${nm}-${nd}`);
    }

    return occurrences;
}
