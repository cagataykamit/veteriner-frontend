import type { SiteColors, SiteDesign, WorkingDay } from '../model/site.model';
import { emptyContent, patchClinic, sampleConfig } from '../testing/site-sample';
import { contrast } from './site-color.utils';
import { designFromConcept, SITE_CONCEPTS } from './site-concepts';
import { SITE_FONTS } from './site-fonts';
import { clinicStatus, hoursGroups } from './site-hours';
import { safeHref, safeImageSrc, socialLinks } from './site-links';
import { buildSiteTokens } from './site-tokens';
import { buildSiteVm, memberInitials } from './site-vm';
import { STOCK_PHOTOS, stockPhoto } from './stock-photos';

const NOW = new Date(2026, 10, 9, 10, 30); // Pazartesi
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
        expect(clinicStatus(week, new Date(2026, 10, 9, 10, 30))).toEqual({ state: 'open', word: 'Açık', detail: 'Kapanış 19:00' });
        expect(clinicStatus(week, new Date(2026, 10, 9, 13, 30))).toEqual({ state: 'break', word: 'Molada', detail: 'Dönüş 14:00' });
        expect(clinicStatus(week, new Date(2026, 10, 9, 8, 0)).detail).toBe('Açılış bugün 09:00');
        expect(clinicStatus(week, new Date(2026, 10, 9, 20, 0)).detail).toBe('Açılış yarın 09:00');
    });

    it('hafta sonu kapalıyken sonraki açılış günü söylenir; saat yoksa bozulmaz', () => {
        expect(clinicStatus(week, new Date(2026, 10, 7, 12, 0)).detail).toBe('Açılış Pazartesi 09:00');
        expect(clinicStatus([], NOW).detail).toBe('Saat girilmemiş');
    });

    it('aynı saatli ardışık günler tek satır olur, bugün işaretlenir', () => {
        const groups = hoursGroups(week, NOW);

        expect(groups.map((group) => group.label)).toEqual(['Pazartesi – Cuma', 'Cumartesi – Pazar']);
        expect(groups[0]).toEqual({ label: 'Pazartesi – Cuma', value: '09:00–19:00', note: 'Mola 13:00–14:00', isToday: true });
        expect(groups[1].value).toBe('Kapalı');
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

    it('telefon ve e-posta güvenli bağlantıya çevrilir', () => {
        const vm = buildSiteVm(patchClinic(sampleConfig(), { phone: '+90 (555) 000 00 00', whatsapp: '0555 000 00 00', email: 'ornek@example.com' }), voice, NOW);

        expect(vm.telHref).toBe('tel:+905550000000');
        expect(vm.whatsappHref).toBe('https://wa.me/05550000000');
        expect(vm.mailHref).toBe('mailto:ornek@example.com');
    });

    it('boş içerikte ad yer tutucusu ve baş harf üretilir, bölüm listesi yalnız tanıtımdır', () => {
        const vm = buildSiteVm(emptyContent(sampleConfig()), voice, NOW);

        expect(vm.name).toBe('Klinik adı');
        expect(vm.initial).toBe('K');
        expect(vm.telHref).toBeNull();
        expect(vm.mapHref).toBeNull();
        expect(vm.homeSections).toEqual(['about']);
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

    it('hazır set şimdilik boştur; boş yuva görsel üretmez (K7)', () => {
        expect(Object.keys(STOCK_PHOTOS)).toEqual([]);
        expect(stockPhoto('modern-hero')).toBeNull();
    });
});
