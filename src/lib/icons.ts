/** One sprite for the whole site; every path is drawn on a 24×24 grid. */
export const ICONS: Record<string, string> = {
  search: '<path d="M11 4.2a6.8 6.8 0 1 0 0 13.6 6.8 6.8 0 0 0 0-13.6Zm4.9 11.7 4 4"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  "arrow-right": '<path d="M4 12h15.5M14 6.6 19.8 12 14 17.4"/>',
  "arrow-left": '<path d="M20 12H4.5M10 6.6 4.2 12 10 17.4"/>',
  "chevron-down": '<path d="M6.5 9.5 12 15l5.5-5.5"/>',
  "zoom-in": '<path d="M11 4.6a6.4 6.4 0 1 0 0 12.8 6.4 6.4 0 0 0 0-12.8Zm4.6 11.3 3.8 3.8M11 8.4v5.2M8.4 11h5.2"/>',
  share: '<path d="M8.6 13.5 15.4 17M15.4 7 8.6 10.5M18 4.2a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8ZM6 9.6a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8ZM18 15a2.4 2.4 0 1 0 0 4.8A2.4 2.4 0 0 0 18 15Z"/>',
  mail: '<path d="M3.5 6.5h17v11h-17v-11Zm0 .4 8.5 6.4 8.5-6.4"/>',
  phone: '<path d="M6 3.8h3.3l1.7 4.2-2.1 1.5a11.5 11.5 0 0 0 5.6 5.6l1.5-2.1 4.2 1.7V18a2.2 2.2 0 0 1-2.4 2.2C10.7 19.6 4.4 13.3 3.8 6.2A2.2 2.2 0 0 1 6 3.8Z"/>',
  pin: '<path d="M12 21.2s6.6-6.1 6.6-11A6.6 6.6 0 0 0 5.4 10.2c0 4.9 6.6 11 6.6 11ZM12 12.6a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z"/>',
  clock: '<path d="M12 3.6a8.4 8.4 0 1 0 0 16.8 8.4 8.4 0 0 0 0-16.8ZM12 7.2V12l3.4 2"/>',
  instagram: '<path d="M8.2 3.8h7.6a4.4 4.4 0 0 1 4.4 4.4v7.6a4.4 4.4 0 0 1-4.4 4.4H8.2a4.4 4.4 0 0 1-4.4-4.4V8.2a4.4 4.4 0 0 1 4.4-4.4ZM12 8.3a3.7 3.7 0 1 0 0 7.4 3.7 3.7 0 0 0 0-7.4ZM16.9 7.2h.01"/>',
  facebook: '<path d="M14.6 20.2v-7.4h2.5l.4-2.9h-2.9V8a1.45 1.45 0 0 1 1.6-1.6h1.5V3.9a19 19 0 0 0-2.3-.1c-2.3 0-3.9 1.4-3.9 4v2.1H8.9v2.9h2.6v7.4h3.1Z" fill="currentColor" stroke="none"/>',
  whatsapp: '<path d="M3.9 20.1 5.2 16a7.9 7.9 0 1 1 3 2.9l-4.3 1.2ZM9 8.6c.3-.1.6 0 .8.4l.7 1.5c.1.3 0 .5-.2.7l-.5.5a5.9 5.9 0 0 0 2.6 2.6l.5-.6c.2-.2.4-.3.7-.2l1.5.7c.4.2.5.5.4.8-.3.9-1.3 1.4-2.2 1.2A7.6 7.6 0 0 1 7.8 11c-.2-.9.3-2 1.2-2.4Z"/>',
  pinterest: '<path d="M9.6 20.4c-.4-1.4-.1-3.1.2-4.5l1-4.3s-.3-.5-.3-1.3c0-1.3.7-2.2 1.7-2.2.8 0 1.2.6 1.2 1.3 0 .8-.5 2-.8 3.2-.2 1 .5 1.7 1.5 1.7 1.8 0 3-2.3 3-5 0-2-1.4-3.6-3.9-3.6a4.4 4.4 0 0 0-4.6 4.4c0 .9.3 1.5.7 1.9.2.2.2.3.1.5l-.2.8c0 .3-.2.4-.5.2C7.2 12.9 6.6 11.5 6.6 10c0-2.9 2.4-6.3 7.3-6.3 3.9 0 6.5 2.8 6.5 5.8 0 4-2.2 7-5.5 7-1.1 0-2.2-.6-2.5-1.3l-.7 2.7c-.2.9-.8 2-1.2 2.7" fill="currentColor" stroke="none"/>',
  sun: '<path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6ZM12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/>',
  moon: '<path d="M20 14.4A8.4 8.4 0 0 1 9.6 4a8.4 8.4 0 1 0 10.4 10.4Z"/>',
  heart: '<path d="M12 20s-7.4-4.6-7.4-9.6A4.1 4.1 0 0 1 12 8.1a4.1 4.1 0 0 1 7.4 2.3C19.4 15.4 12 20 12 20Z"/>',
  check: '<path d="M4.5 12.6 9.6 17.7 19.5 7.8"/>',
};

export function sprite(): string {
  const symbols = Object.entries(ICONS)
    .map(([name, body]) =>
      `<symbol id="i-${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
      `stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">${body}</symbol>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${symbols}</svg>`;
}

export const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<rect width="32" height="32" fill="#0D0C0A"/>
<path d="M6 27 C 11 21, 15 15, 19 6" stroke="#C9A271" stroke-width="1.6" fill="none" stroke-linecap="round"/>
<path d="M11 19 c 4 -3, 7 -1, 8 1 c -3 2 -6 1 -8 -1Z" fill="#C9A271"/>
<path d="M13 15 c -4 -2, -5 -5, -4 -7 c 3 1 5 4 4 7Z" fill="#C9A271"/>
<path d="M16 11 c 4 -2, 5 -5, 4 -7 c -3 1 -5 4 -4 7Z" fill="#C9A271"/>
<path d="M17 13 c -4 -1, -6 -4, -6 -6 c 3 0 6 3 6 6Z" fill="#C9A271" opacity=".85"/>
<circle cx="20" cy="4.5" r="1.5" fill="#C9A271"/>
</svg>
`;
