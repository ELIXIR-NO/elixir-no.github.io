const MONTHS = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

// Article dates are free-text English "Month D, YYYY" (full or abbreviated
// month, optional trailing period on the abbreviation). Returns a UTC-midnight
// Date, or null if the string does not match this exact shape.
export function parseArticleDate(str) {
    if (typeof str !== 'string') return null;
    const m = str.trim().match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})$/);
    if (!m) return null;
    const month = MONTHS[m[1].slice(0, 3).toLowerCase()];
    if (month === undefined) return null;
    const day = Number(m[2]);
    const year = Number(m[3]);
    if (day < 1 || day > 31) return null;
    const d = new Date(Date.UTC(year, month, day));
    if (d.getUTCMonth() !== month || d.getUTCDate() !== day) return null; // reject e.g. Feb 30
    return d;
}
