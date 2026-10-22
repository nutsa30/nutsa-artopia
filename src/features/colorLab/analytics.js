// GA4 events for /color-lab, on top of the site's helpers (src/utils/analytics.js).
// Names are `color_lab_*`; painting is reported once per tool per visit, not per
// stroke, so the numbers mean "who used what" without flooding the property.
import { trackEvent } from '../../utils/analytics.js';

export const LAB_LIST = { id: 'color_lab', name: 'ფერების ლაბორატორია' };

const used = new Set();
/** First stroke with a tool on this visit. */
export function trackFirstUse(tool) {
  if (used.has(tool)) return;
  used.add(tool);
  trackEvent('color_lab_paint', { tool });
}
export const resetFirstUse = () => used.clear();

export const trackLab = (action, params) => trackEvent(`color_lab_${action}`, params);
