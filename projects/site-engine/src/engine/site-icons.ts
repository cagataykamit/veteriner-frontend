/**
 * Sitenin ikon seti: 24×24 tek çizgi, dolgusuz; rengi bulunduğu yerden (`currentColor`) gelir. Dosya ve üçüncü taraf ikon fontu
 * yoktur, sunucuda çizilen sayfada da görünür. Hizmet ikonu hizmet adından seçilir (`serviceIcon`), yeni veri gerekmez.
 */
export const SITE_ICONS = {
    phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
    calendar: 'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 10h18M8 3v4M16 3v4',
    pin: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM14.5 10a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z',
    clock: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM12 7v5l3 2',
    mail: 'M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 7l9 6 9-6',
    message: 'M21 12a8 8 0 0 1-11.8 7L4 20l1.1-4.6A8 8 0 1 1 21 12z',
    external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
    menu: 'M4 7h16M4 12h16M4 17h16',
    close: 'M6 6l12 12M18 6L6 18',
    arrowRight: 'M5 12h14M13 6l6 6-6 6',
    arrowLeft: 'M19 12H5M11 6l-6 6 6 6',
    plus: 'M12 5v14M5 12h14',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    stethoscope: 'M6 3v6a4 4 0 0 0 8 0V3M10 13v3a5 5 0 0 0 10 0v-2M22 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0z',
    syringe: 'M18 2l4 4M20 4l-3 3M14 4l6 6M15.5 5.5L6 15v3h3l9.5-9.5M6 18l-3 3M9.5 11.5l2 2M12 9l2 2',
    heartPulse: 'M12 20.5l-8.3-8.3a5 5 0 0 1 7.1-7.1L12 6.3l1.2-1.2a5 5 0 0 1 7.1 7.1zM4 12h4l2-3 3 6 2-3h5',
    flask: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3M7.5 15h9',
    scan: 'M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M15.5 12a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z',
    tooth: 'M8 3C5.5 3 4 5 4 7.5c0 2 .8 3.5 1.2 5.5.5 2.4.6 8 2.6 8 1.6 0 1.4-5 4.2-5s2.6 5 4.2 5c2 0 2.1-5.6 2.6-8 .4-2 1.2-3.5 1.2-5.5C20 5 18.5 3 16 3c-1.6 0-2.5 1-4 1S9.6 3 8 3z',
    home: 'M3 11l9-7 9 7M5 10v10h14V10M9.5 20v-5h5v5',
    scissors: 'M8.5 7a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM8.5 17a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM8 8.5L20 18M8 15.5L20 6',
    chip: 'M8 7h8a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zM10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4',
    eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
    pill: 'M10.5 20.5a5 5 0 0 1-7-7l7-7a5 5 0 0 1 7 7zM7 10l7 7',
    emergency: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM12 8v8M8 12h8',
    paw: 'M8.8 9a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0zM12.8 6.5a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0zM17.3 7.5a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0zM19.8 11.5a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0zM8.5 17.5c0-2.5 2-4.5 4-4.5s4 1.5 4 4c0 1.5-1.2 2.5-2.5 2.5-1 0-1.2-.5-2-.5s-1 .5-2 .5-1.5-.8-1.5-2z'
} as const;

export type SiteIconName = keyof typeof SITE_ICONS;

/**
 * Hizmet adı → ikon. Sıra önemlidir: "muayene ve koruyucu hekimlik" muayeneye, "yatılı bakım", "diş bakımı" ve "koruyucu bakım"
 * tıraş ve bakımdan önce kendi ikonuna düşer.
 * Ad Türkçe küçük harfe ve aksansız biçime çevrilip aranır. Eşleşmeyen hizmete nötr pati ikonu gelir.
 */
const SERVICE_ICON_RULES: readonly (readonly [RegExp, SiteIconName])[] = [
    [/acil|nobet/, 'emergency'],
    [/muayene|check-?up/, 'stethoscope'],
    [/(^|\W)asi(\W|$)|asilama|parazit|koruyucu|vaksin/, 'syringe'],
    [/(^|\W)dis(\W|$)|agiz/, 'tooth'],
    [/yatili|otel|pansiyon|konaklama|bakimevi/, 'home'],
    [/cerrahi|ameliyat|operasyon|kisirla|ortopedi|kardiyo|kalp/, 'heartPulse'],
    [/rontgen|ultrason|goruntuleme|radyoloji|tomografi|ekokardiyo/, 'scan'],
    [/labor|tahlil|tetkik|analiz|(^|\W)kan(\W|$)|test/, 'flask'],
    [/mikrocip|(^|\W)cip|kimlik|pasaport/, 'chip'],
    [/(^|\W)goz(\W|$)|oftalmo/, 'eye'],
    [/eczane|ilac|recete/, 'pill'],
    [/tiras|kuafor|yikama|tirnak|tuy|bakim/, 'scissors'],
    [/kontrol|danisma|saglik/, 'stethoscope']
];

function searchable(text: string): string {
    return text
        .toLocaleLowerCase('tr')
        .replace(/ı/g, 'i')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');
}

export function serviceIcon(title: string): SiteIconName {
    const text = searchable(title);

    return SERVICE_ICON_RULES.find(([pattern]) => pattern.test(text))?.[1] ?? 'paw';
}
