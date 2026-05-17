/**
 * utils.js - Utility functions for video generation
 */

/**
 * Format a number as Chilean peso currency
 * @param {number} num - Number to format
 * @returns {string} Formatted currency string
 */
export function formatCurrency(num) {
  if (num >= 1e12) {
    return `$${(num / 1e12).toFixed(1)}B`; // Billones
  } else if (num >= 1e9) {
    return `$${(num / 1e9).toFixed(1)}M`; // Millones
  } else if (num >= 1e6) {
    return `$${(num / 1e6).toFixed(1)}K`; // Miles
  }
  return `$${num.toLocaleString('es-CL')}`;
}

/**
 * Format a number with thousand separators
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(num) {
  return num.toLocaleString('es-CL');
}

/**
 * Format a SIMCE score
 * @param {number} score - SIMCE score
 * @returns {string} Formatted score
 */
export function formatSimce(score) {
  return score.toString();
}

/**
 * Get difference indicator string
 * @param {number} diff - Difference from average
 * @returns {string} Indicator (+/- X)
 */
export function getDiffIndicator(diff) {
  if (diff > 0) return `+${diff}`;
  return diff.toString();
}