/**
 * Sitenin ikon seti: 24×24 tek çizgi, dolgusuz; rengi bulunduğu yerden (`currentColor`) gelir. Dosya ve üçüncü taraf ikon fontu
 * yoktur, sunucuda çizilen sayfada da görünür.
 */
export const SITE_ICONS = {
    phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
    calendar: 'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 10h18M8 3v4M16 3v4',
    pin: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM14.5 10a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z',
    mail: 'M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 7l9 6 9-6',
    message: 'M21 12a8 8 0 0 1-11.8 7L4 20l1.1-4.6A8 8 0 1 1 21 12z',
    external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
    menu: 'M4 7h16M4 12h16M4 17h16',
    close: 'M6 6l12 12M18 6L6 18',
    arrowRight: 'M5 12h14M13 6l6 6-6 6',
    arrowLeft: 'M19 12H5M11 6l-6 6 6 6',
    arrowDown: 'M12 5v14M6 13l6 6 6-6',
    plus: 'M12 5v14M5 12h14',
    paw: 'M8.8 9a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0zM12.8 6.5a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0zM17.3 7.5a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0zM19.8 11.5a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0zM8.5 17.5c0-2.5 2-4.5 4-4.5s4 1.5 4 4c0 1.5-1.2 2.5-2.5 2.5-1 0-1.2-.5-2-.5s-1 .5-2 .5-1.5-.8-1.5-2z'
} as const;

export type SiteIconName = keyof typeof SITE_ICONS;
