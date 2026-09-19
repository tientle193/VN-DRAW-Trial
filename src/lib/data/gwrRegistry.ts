import { base } from '$app/paths';
import type { LatLngBoundsExpression } from 'leaflet';

/**
 * Exact bounds extracted from QGIS export for Vietnam GWR rasters
 * [[South, West], [North, East]]
 */
export const GWR_RASTER_BOUNDS: LatLngBoundsExpression = [
  [8.569927810396463, 102.19234671221461],
  [23.36518053984499, 109.38785213801198]
];

/**
 * Returns the path to the static raster PNG for a given year and month.
 */
export function getGwrRasterUrl(year: number, month: number): string {
  const mm = String(month).padStart(2, '0');
  return `${base}/rasters/gwr/gwr_spei_${year}_${mm}.png`;
}