import type { SiteColors, SiteDesign, WorkingDay } from '../model/site.model';
import { emptyContent, forbiddenCopy, patchClinic, sampleConfig } from '../testing/site-sample';
import { contrast } from './site-color.utils';
import { designFromConcept, SITE_CONCEPTS } from './site-concepts';
import { SITE_FONTS } from './site-fonts';
import { clinicStatus, hoursGroups, nextSlotDays } from './site-hours';
import { safeHref, safeImageSrc, socialLinks } from './site-links';
import { buildSiteTokens } from './site-tokens';
import { buildSiteVm, memberInitials, whatsappNumber } from './site-vm';
import record from '../../stock/KAYNAKLAR.json';
import { isStockPhoto, STOCK_GALLERY, STOCK_LIBRARY, STOCK_PHOTOS, stockArticlePhoto, stockSectionPhoto, stockServicePhoto, stockSharePhoto } from './stock-photos';

const NOW = new Date(Date.UTC(2026, 10, 9, 7, 30)); // Pazartesi
const voice = SITE_CONCEPTS[0].voice;

describe('safeHref', () => {
    it('yalnız http, https, tel ve mailto geçer', () => {
        expect(safeHref('https://example.com/a')).toBe('https://example.com/a');
        expect(safeHref('http://example.com/')).toBe('http://example.com/');
        expect(safeHref('tel:+905550000000')).toBe('tel:+905550000000');
        expect(safeHref('mailto:ornek@example.com')).toBe('mailto:ornek@example.com');
    });

    it('başka şema, gizlenmiş şema ve eksik adres reddedilir', () => {
        for (const value of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)', 'java\nscript:alert(1)', 'java\tscript:alert(1)', 'data:text/html,x', 'vbscript:x', 'file:///c:/x', 'blob:https://example.com/x', 'ftp://example.com', '//example.com', '/yol', 'example.com', '', '   ', null, undefined]) {
            expect(safeHref(value), String(value)).toBeNull();
        }
    });
});

describe('safeImageSrc', () => {
    it('tam adres, kök göreli yol ve raster data URL geçer', () => {
        expect(safeImageSrc('https://example.com/a.webp')).toBe('https://example.com/a.webp');
        expect(safeImageSrc('/api/public/images/1')).toBe('/api/public/images/1');
        expect(safeImageSrc('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
    });

    it('başka şema, SVG data URL ve protokolsüz adres reddedilir', () => {
        for (const value of ['javascript:alert(1)', 'data:image/svg+xml;base64,AAAA', 'data:text/html,x', '//example.com/a.png', 'tel:+90', 'mailto:a@b.c', '', null]) {
            expect(safeImageSrc(value), String(value)).toBeNull();
        }
    });
});

describe('socialLinks', () => {
    const clinic = sampleConfig().content.clinic;

    it('kullanıcı adı ya da tam adres bağlantıya çevrilir', () => {
        const links = socialLinks({ ...clinic, website: 'klinik.example.com', instagram: '@ornek', facebook: 'https://www.facebook.com/ornek' });

        expect(links.map((link) => link.href)).toEqual(['https://klinik.example.com/', 'https://www.instagram.com/ornek/', 'https://www.facebook.com/ornek']);
    });

    it('kullanıcı adı başka adrese kaçamaz, güvensiz değer çizilmez', () => {
        expect(socialLinks({ ...clinic, website: 'javascript:alert(1)', instagram: '../../kotu', facebook: 'javascript:alert(1)' }).map((link) => link.href)).toEqual(['https://www.instagram.com/..%2F..%2Fkotu/']);
    });

    it('boş alan bağlantı olmaz', () => {
        expect(socialLinks({ ...clinic, website: '', instagram: ' ', facebook: '' })).toEqual([]);
    });
});

describe('çalışma saatleri', () => {
    const open = (dayOfWeek: number): WorkingDay => ({ dayOfWeek, isClosed: false, opensAt: '09:00', closesAt: '19:00', breakStartsAt: '13:00', breakEndsAt: '14:00' });
    const week = [1, 2, 3, 4, 5].map(open);

    it('durum: açık, molada, açılış öncesi, kapanış sonrası', () => {
        expect(clinicStatus(week, new Date(Date.UTC(2026, 10, 9, 7, 30)))).toEqual({ state: 'open', word: 'Açık', detail: 'Kapanış 19:00' });
        expect(clinicStatus(week, new Date(Date.UTC(2026, 10, 9, 10, 30)))).toEqual({ state: 'break', word: 'Molada', detail: 'Dönüş 14:00' });
        expect(clinicStatus(week, new Date(Date.UTC(2026, 10, 9, 5, 0))).detail).toBe('Açılış bugün 09:00');
        expect(clinicStatus(week, new Date(Date.UTC(2026, 10, 9, 17, 0))).detail).toBe('Açılış yarın 09:00');
    });

    it('hafta sonu kapalıyken sonraki açılış günü söylenir; saat yoksa bozulmaz', () => {
        expect(clinicStatus(week, new Date(Date.UTC(2026, 10, 7, 9, 0))).detail).toBe('Açılış Pazartesi 09:00');
        expect(clinicStatus([], NOW).detail).toBe('Saat girilmemiş');
    });

    it('aynı saatli ardışık günler tek satır olur, bugün işaretlenir', () => {
        const groups = hoursGroups(week, NOW);

        expect(groups.map((group) => group.label)).toEqual(['Pazartesi – Cuma', 'Cumartesi – Pazar']);
        expect(groups[0]).toEqual({ label: 'Pazartesi – Cuma', value: '09:00–19:00', note: 'Mola 13:00–14:00', isToday: true });
        expect(groups[1].value).toBe('Kapalı');
    });
});

describe('nextSlotDays (TIER-017)', () => {
    const BOOKING = 'https://portal.example.com/randevu/kod';

    it('saatler güne göre toplanır; bugün ve yarın adıyla, saat İstanbul duvar saatiyle', () => {
        const days = nextSlotDays(
            [
                { date: '2026-11-09', startUtc: '2026-11-09T09:00:00Z' },
                { date: '2026-11-09', startUtc: '2026-11-09T09:30:00Z' },
                { date: '2026-11-10', startUtc: '2026-11-10T06:00:00Z' },
                { date: '2026-11-12', startUtc: '2026-11-12T13:15:00Z' }
            ],
            BOOKING,
            NOW
        );

        expect(days.map((day) => day.label)).toEqual(['Bugün, 9 Kasım', 'Yarın, 10 Kasım', 'Perşembe, 12 Kasım']);
        expect(days[0].slots.map((slot) => slot.time)).toEqual(['12:00', '12:30']);
        expect(days[2].slots[0]).toEqual({ time: '16:15', href: `${BOOKING}?saat=2026-11-12T13%3A15%3A00Z`, label: 'Perşembe, 12 Kasım 16:15 için talep formunu aç' });
    });

    it('gün API\'nin İstanbul takvimidir: UTC gece yarısından önceki saat ertesi güne yazılır', () => {
        const days = nextSlotDays([{ date: '2026-11-10', startUtc: '2026-11-09T21:30:00Z' }], BOOKING, NOW);

        expect(days).toEqual([{ label: 'Yarın, 10 Kasım', slots: [expect.objectContaining({ time: '00:30' })] }]);
    });

    it('online randevu kapalıysa ya da satır bozuksa çizilmez', () => {
        expect(nextSlotDays([{ date: '2026-11-09', startUtc: '2026-11-09T09:00:00Z' }], null, NOW)).toEqual([]);
        expect(nextSlotDays([{ date: 'bozuk', startUtc: '2026-11-09T09:00:00Z' }, { date: '2026-11-09', startUtc: 'x' }], BOOKING, NOW)).toEqual([]);
        expect(buildSiteVm(patchClinic(sampleConfig(), { bookingUrl: 'javascript:alert(1)', nextSlots: [{ date: '2026-11-09', startUtc: '2026-11-09T09:00:00Z' }] }), voice, NOW).nextSlotDays).toEqual([]);
    });
});

describe('buildSiteVm', () => {
    it('boş bırakılan metinde konseptin cümlesi kullanılır, yazılan metin korunur', () => {
        const config = sampleConfig();
        const vm = buildSiteVm({ ...config, content: { ...config.content, copy: { ...config.content.copy, heroTitle: '  Kendi başlığımız ' } } }, voice, NOW);

        expect(vm.copy.heroTitle).toBe('Kendi başlığımız');
        expect(vm.copy.heroText).toBe(voice.heroText);
    });

    it('hazır metinlerde örnek/taslak ifadesi kalmaz', () => {
        for (const concept of SITE_CONCEPTS) {
            expect(Object.values(concept.voice).join(' ').toLocaleLowerCase('tr')).not.toMatch(/örnek|taslak/);
        }
    });

    it('hazır metinler K14 sınırını aşmaz: üstünlük, süre, fiyat, ürün ve müşteri yorumu yok', () => {
        for (const concept of SITE_CONCEPTS) {
            for (const [key, text] of Object.entries(concept.voice)) {
                expect(forbiddenCopy(text), `${concept.key}.${key}`).toEqual([]);
            }
        }
    });

    it('yasak ifade denetimi sözcük başından eşleşir, büyük harfe takılmaz', () => {
        expect(forbiddenCopy('EN İYİ uzmanlık, 7/24 açık, ücretsiz muayene, garantili')).toEqual(['en iyi', 'ücret', 'garanti', '7/24', 'uzman']);
        expect(forbiddenCopy('Tamamen açık bir yaklaşım; sözcük içinde kalanlar sayılmaz: yaşamama')).toEqual([]);
    });

    it('telefon ve e-posta güvenli bağlantıya çevrilir', () => {
        const vm = buildSiteVm(patchClinic(sampleConfig(), { phone: '+90 (555) 000 00 00', whatsapp: '0555 000 00 00', email: 'ornek@example.com' }), voice, NOW);

        expect(vm.telHref).toBe('tel:+905550000000');
        expect(vm.whatsappHref).toBe('https://wa.me/905550000000');
        expect(vm.mailHref).toBe('mailto:ornek@example.com');
    });

    it('WhatsApp numarası ülke kodlu ve sıfırsız olur', () => {
        expect(whatsappNumber('0555 000 00 00')).toBe('905550000000');
        expect(whatsappNumber('555 000 00 00')).toBe('905550000000');
        expect(whatsappNumber('+90 555 000 00 00')).toBe('905550000000');
        expect(whatsappNumber('+49 151 2345 6789')).toBe('4915123456789');
        expect(whatsappNumber('')).toBe('');
    });

    it('boş içerikte ad yer tutucusu ve baş harf üretilir, bölüm listesi tanıtım ve hazır galeridir', () => {
        const vm = buildSiteVm(emptyContent(sampleConfig()), voice, NOW);

        expect(vm.name).toBe('Klinik adı');
        expect(vm.initial).toBe('K');
        expect(vm.telHref).toBeNull();
        expect(vm.mapHref).toBeNull();
        expect(vm.homeSections).toEqual(['about', 'gallery']);
    });

    it('üye baş harfleri unvanı atlar, Türkçe büyük harf kullanır', () => {
        expect(memberInitials('Dr. Örnek Hekim')).toBe('ÖH');
        expect(memberInitials('Vet. Hek. inci deniz')).toBe('İD');
        expect(memberInitials('   ')).toBe('H');
    });
});

describe('token sözleşmesi', () => {
    const textPairs = (tokens: Record<string, string>): [string, string][] => [
        [tokens['--s-ink'], tokens['--s-bg']],
        [tokens['--s-muted'], tokens['--s-surface']],
        [tokens['--s-on-primary'], tokens['--s-primary']],
        [tokens['--s-on-secondary'], tokens['--s-secondary']],
        [tokens['--s-on-accent'], tokens['--s-accent']],
        [tokens['--s-primary-text'], tokens['--s-surface']],
        [tokens['--s-accent-text'], tokens['--s-surface']],
        [tokens['--s-on-tint'], tokens['--s-tint']],
        [tokens['--s-on-band'], tokens['--s-band']],
        [tokens['--s-band-muted'], tokens['--s-band']],
        [tokens['--s-band-accent'], tokens['--s-band']],
        [tokens['--s-on-band-btn'], tokens['--s-band-btn']]
    ];

    for (const concept of SITE_CONCEPTS) {
        it(`${concept.key}: metin çiftleri 4.5:1'i geçer`, () => {
            for (const [text, background] of textPairs(buildSiteTokens(designFromConcept(concept)))) {
                expect(contrast(text, background), `${text} / ${background}`).toBeGreaterThanOrEqual(4.5);
            }
        });
    }

    it('zayıf renk seçilince de metin okunur kalır', () => {
        const colors: SiteColors = { primary: '#ffff00', secondary: '#fefefe', accent: '#f0f0f0' };

        for (const [text, background] of textPairs(buildSiteTokens({ ...designFromConcept(SITE_CONCEPTS[0]), colors }))) {
            expect(contrast(text, background), `${text} / ${background}`).toBeGreaterThanOrEqual(4.5);
        }
    });

    it('geçersiz renk konseptin rengine, bilinmeyen köşe ve zemin varsayılana düşer', () => {
        const design: SiteDesign = { ...designFromConcept(SITE_CONCEPTS[0]), colors: { primary: 'url(x)', secondary: '', accent: '#ABCDEF' }, radius: 'yok' as SiteDesign['radius'], ground: 'yok' as SiteDesign['ground'] };
        const tokens = buildSiteTokens(design);

        expect(tokens['--s-primary']).toBe(SITE_CONCEPTS[0].colors.primary);
        expect(tokens['--s-secondary']).toBe(SITE_CONCEPTS[0].colors.secondary);
        expect(tokens['--s-accent']).toBe('#ABCDEF');
        expect(tokens['--s-radius']).toBeTruthy();
        expect(tokens['--s-bg']).toBe('#ffffff');
    });
});

describe('fontlar ve hazır fotoğraf', () => {
    it('font listesinde yalnız aile adı ve sistem yedeği vardır; adres yoktur', () => {
        for (const font of SITE_FONTS) {
            expect(font.stack).toMatch(/(sans-serif|serif)$/);
            expect(font.stack).not.toMatch(/https?:|url\(/);
        }
    });

    it('konsept fontları listede tanımlı', () => {
        for (const concept of SITE_CONCEPTS) {
            expect(SITE_FONTS.some((font) => font.key === concept.headFont && font.forHeading)).toBe(true);
            expect(SITE_FONTS.some((font) => font.key === concept.bodyFont && font.forBody)).toBe(true);
        }
    });

    it('her hazır fotoğrafın kaynağı, tarihi ve lisansı kayıtlıdır; kayıtta kullanılmayan dosya yoktur (K7)', () => {
        const used = STOCK_LIBRARY.map((photo) => photo.src.replace('_stock/', '')).sort();

        expect(record.photos.map((photo) => photo.file).sort()).toEqual(used);

        for (const photo of record.photos) {
            expect(photo.source, photo.file).toMatch(/^https:\/\/unsplash\.com\/photos\//);
            expect(photo.url, photo.file).toMatch(/^https:\/\/images\.unsplash\.com\/photo-/);
            expect(photo.license, photo.file).toBe('Unsplash License');
            expect(photo.downloaded, photo.file).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
    });

    it('hazır fotoğraf adresleri göreli ve kendi sunucumuzdadır; alt metni vardır', () => {
        for (const photo of [...STOCK_LIBRARY, ...Object.values(STOCK_PHOTOS), ...STOCK_GALLERY]) {
            expect(photo.src).toMatch(/^_stock\/[a-z0-9-]+\.webp$/);
            expect(photo.alt.trim().length).toBeGreaterThan(0);
            expect(isStockPhoto(photo)).toBe(true);
        }

        expect(isStockPhoto({ src: '/api/v1/public/sites/a/images/b', alt: '' })).toBe(false);
    });

    it('her konseptin yuvaları doludur; yuvası olmayan alternatif boş döner', () => {
        for (const concept of SITE_CONCEPTS) {
            for (const type of ['hero', 'about', 'features'] as const) expect(stockSectionPhoto(concept.key, type), `${concept.key}-${type}`).not.toBeNull();
        }

        expect(stockSectionPhoto('yok', 'hero')).toBeNull();
        expect(stockSharePhoto('premium').src).toContain('tuxedo-dark');
        expect(stockSharePhoto('modern').src).toContain('bandana');
    });

    it('hizmet ve yazı karesi adresten seçilir, bilinmeyende sıradakine döner', () => {
        expect(stockServicePhoto('genel-muayene', 5).src).toContain('ex-table');
        expect(stockServicePhoto('asi-ve-koruyucu-bakim', 5).src).toContain('ex-small-dog');
        expect(stockServicePhoto('dis-bakimi', 5).src).toContain('ex-white-cat-2');
        expect(stockServicePhoto('rontgen-ve-ultrason', 0).src).toContain('ex-ultrasound');
        expect(stockServicePhoto('mikrocip', 0).src).toBe(stockServicePhoto('mikrocip', 6).src);
        expect(stockArticlePhoto('yavru-kedi-ilk-ziyaret', 3).src).toContain('orange-white');
        expect(stockArticlePhoto('baska-bir-yazi', 1).src).not.toBe(stockArticlePhoto('baska-bir-yazi', 2).src);
    });
});
