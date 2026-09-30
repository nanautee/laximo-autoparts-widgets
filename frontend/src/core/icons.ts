/** Inline SVG icons - no icon-font dependency, and they inherit `currentColor`. */

const svg = (paths: string, size = 18, extra = ''): string =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
  `stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${paths}</svg>`;

export const icons = {
  vin: (s?: number) =>
    svg(
      '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M5 10h3M5 14h3M9 10h2M9 14h2M14 9h5M14 12h5M14 15h3"/>',
      s,
    ),
  catalog: (s?: number) =>
    svg('<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>', s),
  oem: (s?: number) =>
    svg(
      '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M11 8v6M8 11h6"/>',
      s,
    ),
  car: (s?: number) =>
    svg(
      '<path d="M5 17h14M6 17v2M18 17v2M4 13l1.6-4.6A2 2 0 0 1 7.5 7h9a2 2 0 0 1 1.9 1.4L20 13v4H4z"/><path d="M4 13h16M7.5 15h.01M16.5 15h.01"/>',
      s,
    ),
  folder: (s?: number) =>
    svg(
      '<path d="M3 7a2 2 0 0 1 2-2h3.6l1.7 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
      s,
    ),
  box: (s?: number) =>
    svg(
      '<path d="M12 3 4 7v10l8 4 8-4V7z"/><path d="m4 7 8 4 8-4M12 21v-10"/>',
      s,
    ),
  chevron: (s?: number) => svg('<path d="m9 6 6 6-6 6"/>', s),
  back: (s?: number) => svg('<path d="M19 12H5m6-7-7 7 7 7"/>', s),
  cart: (s?: number) =>
    svg(
      '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h2.2l2.3 12.2a2 2 0 0 0 2 1.6h9.1a2 2 0 0 0 2-1.6L21 7H5"/>',
      s,
    ),
  check: (s?: number) => svg('<path d="m4 12.5 5 5L20 6.5"/>', s),
  alert: (s?: number) =>
    svg('<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.3h.01"/>', s),
  search: (s?: number) => svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', s),
  layers: (s?: number) =>
    svg('<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>', s),
  code: (s?: number) => svg('<path d="m9 8-5 4 5 4M15 8l5 4-5 4"/>', s),
  cpu: (s?: number) =>
    svg(
      '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M10 2v4M14 2v4M10 18v4M14 18v4M2 10h4M2 14h4M18 10h4M18 14h4"/>',
      s,
    ),
  refresh: (s?: number) =>
    svg('<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/>', s),
};
