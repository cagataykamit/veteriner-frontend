import { contrast, defaultStoredConfig, composeSiteConfig, type SiteConfig } from '@site-engine';
import { suggestDesign } from '@/app/features/clinic-site/builder/design-suggest';
import { prepareSiteImage, SITE_IMAGE_MAX_BYTES, SITE_IMAGE_MAX_SIDE } from '@/app/features/clinic-site/builder/image-resize';
import { draftClaims, findClaims } from '@/app/features/clinic-site/builder/site-claims';
import { cleanLinkInput, contrastChecks, defaultCopyLabels, isSlug, publishWarnings, seoChecks, slugify, uniqueSlug } from '@/app/features/clinic-site/builder/site-checks';
import { siteQrDataUrl } from '@/app/features/clinic-site/builder/site-share.component';

const RECORD = { name: 'Çağrı', city: 'Ankara', district: '', address: 'Adres', phone: '03120000000', email: '', workingDays: [], bookingUrl: null };

function config(conceptKey = 'modern'): SiteConfig {
    return composeSiteConfig(defaultStoredConfig(conceptKey), RECORD, 'cagri');
}

describe('findClaims (K14)', () => {
    it.each([
        ['En iyi kliniğiz', 'en iyi'],
        ['EN İYİ KLİNİK', 'en iyi'],
        ['Ücretsiz muayene', 'ucretsiz'],
        ['ÜCRETSİZ aşı', 'ucretsiz'],
        ['%20 indirim', 'indirim'],
        ['Tedavi garantili', 'garantili'],
        ['7/24 açığız', '7/24'],
        ['Uzman kadro', 'uzman'],
        ['Muayene fiyatları', 'fiyatlari'],
        ['Muayene 500 TL', '500 tl'],
        ['Kesin tedavi', 'kesin tedavi']
    ])('"%s" uyarı verir', (text, term) => {
        expect(findClaims(text).map((claim) => claim.term)).toContain(term);
    });

    it.each(['Muayene sonunda ne yapıldığını anlatırız.', 'Fiyakalı değil, sakin bir klinik.', 'Bir numaralı dosya', 'Mahallenin kliniği', ''])('"%s" uyarı vermez', (text) => {
        expect(findClaims(text)).toEqual([]);
    });

    it('taslaktaki yeri söyler, düzeltme adımını verir', () => {
        const stored = defaultStoredConfig();
        const claims = draftClaims({
            ...stored,
            content: { ...stored.content, copy: { ...stored.content.copy, heroTitle: 'En iyi klinik' }, services: [{ slug: 's', title: 'Aşı', summary: 'Ücretsiz', body: '', image: null }] }
        });

        expect(claims).toEqual(expect.arrayContaining([expect.objectContaining({ where: 'Hero başlığı', step: 4 }), expect.objectContaining({ where: 'Hizmetler: Aşı', term: 'ucretsiz' })]));
    });
});

describe('yayın kontrolleri', () => {
    it('yazılmamış metinler hazır cümle olarak söylenir (K14)', () => {
        const stored = defaultStoredConfig();

        expect(defaultCopyLabels(stored)).toContain('Hero başlığı');
        expect(defaultCopyLabels({ ...stored, content: { ...stored.content, copy: { ...stored.content.copy, heroTitle: 'Başlık' } } })).not.toContain('Hero başlığı');
    });

    it('zorunlu listeyi kopyalamaz: ad, telefon, adres ve saat uyarıda yoktur (K9)', () => {
        const texts = publishWarnings(config()).map((item) => item.text);

        expect(texts).toEqual(expect.arrayContaining(['Logo yüklenmedi; baş harf çiziliyor.', 'Hizmet eklenmedi.', 'Hekim eklenmedi.']));
        expect(texts.join(' ')).not.toMatch(/telefon|adres|saat/i);
    });

    it('hazır fotoğraf önerisi engel değil uyarıdır; kendi fotoğrafı yüklenince kalkar (K7)', () => {
        const photo = { src: 'site-image:a', alt: 'x' };
        const empty = config();
        const uploaded = { ...empty, content: { ...empty.content, heroImage: photo, aboutImage: photo } };
        const note = 'Hazır fotoğraflar görünüyor; dilerseniz kendi fotoğrafınızı yükleyin.';

        expect(publishWarnings(empty).map((item) => item.text)).toContain(note);
        expect(publishWarnings(uploaded).map((item) => item.text)).not.toContain(note);
        expect(publishWarnings(empty).map((item) => item.text).join(' ')).not.toContain('Galeri');
    });

    it('paylaşım görseli boşken hazır fotoğraf kullanılır, kontrol geçer (K7)', () => {
        const check = seoChecks(config()).find((item) => item.label === 'Paylaşım görseli');

        expect(check).toEqual(expect.objectContaining({ ok: true, detail: 'Hazır fotoğraf kullanılır.' }));
    });

    it('adres biçimi sözleşmeye uyar', () => {
        expect(isSlug('cagri-vet')).toBe(true);
        expect(isSlug('ab')).toBe(false);
        expect(isSlug('-cagri')).toBe(false);
        expect(isSlug('cagri--vet')).toBe(false);
        expect(isSlug('Çağrı')).toBe(false);
        expect(isSlug('a'.repeat(61))).toBe(false);
    });

    it('bağlantı alanına yapıştırılan görünmez karakter atılır', () => {
        expect(cleanLinkInput('\uFEFFhttps://exa\u200Bmple.com')).toBe('https://example.com');
    });

    it('alt sayfa adresi Türkçe karakterden arınır, çakışmaz', () => {
        expect(slugify('Aşı ve Koruyucu Bakım')).toBe('asi-ve-koruyucu-bakim');
        expect(uniqueSlug('asi', ['asi', 'asi-2'])).toBe('asi-3');
    });

    it('dört konseptin kontrastı ölçülür ve geçer', () => {
        for (const key of ['modern', 'premium', 'friendly', 'nature']) {
            expect(contrastChecks(config(key)).every((check) => check.ok)).toBe(true);
        }
    });
});

describe('suggestDesign (K5)', () => {
    it('karakterden konsept seçer, nedenini söyler', () => {
        const base = config();
        const result = suggestDesign({ ...base, design: { ...base.design, character: 'dogal' } }, null);

        expect(result.design.conceptKey).toBe('nature');
        expect(result.reason).toContain('doğal');
        expect(result.reason).toContain(result.conceptName);
    });

    it('logodan palet kurarken açık renkte bile okunur ana renk verir', () => {
        const result = suggestDesign(config(), '#f7e04a');

        expect(contrast(result.design.colors.primary, '#ffffff')).toBeGreaterThanOrEqual(3);
        expect(result.reason).toContain('logonuzun');
    });

    it('fotoğrafsız hekimlerde satır düzeni önerir ve söyler', () => {
        const base = config();
        const members = [1, 2].map((n) => ({ slug: `h${n}`, kind: 'hekim' as const, name: `Hekim ${n}`, title: '', specialties: '', bio: '', image: null }));
        const result = suggestDesign({ ...base, design: { ...base.design, character: 'samimi' }, content: { ...base.content, members } }, null);

        expect(result.design.sections.team).toBe('modern');
        expect(result.reason).toContain('fotoğraf');
    });
});

async function imageFile(width: number, height: number, type = 'image/png'): Promise<File> {
    const canvas = document.createElement('canvas');

    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')!.fillRect(0, 0, width, height);

    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((value) => resolve(value!), type));

    return new File([blob], 'foto.png', { type });
}

function latin1(bytes: Uint8Array): string {
    return Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
}

/** JPEG'in başına telefon fotoğrafındaki gibi bir APP1 (EXIF) parçası ekler. */
async function withExif(file: File): Promise<File> {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const payload = Array.from('Exif\0\0GPSLatitude39.9', (char) => char.charCodeAt(0));
    const length = payload.length + 2;
    const segment = [0xff, 0xe1, length >> 8, length & 0xff, ...payload];

    return new File([bytes.slice(0, 2), new Uint8Array(segment), bytes.slice(2)], 'telefon.jpg', { type: 'image/jpeg' });
}

async function size(file: File): Promise<[number, number]> {
    const bitmap = await createImageBitmap(file);

    return [bitmap.width, bitmap.height];
}

describe('prepareSiteImage (K12)', () => {
    it('en uzun kenarı sınıra indirir, oranı korur, boyut sınırının altında kalır', async () => {
        const prepared = await prepareSiteImage(await imageFile(3000, 1500));

        expect(await size(prepared)).toEqual([SITE_IMAGE_MAX_SIDE, 1200]);
        expect(['image/webp', 'image/jpeg']).toContain(prepared.type);
        expect(prepared.size).toBeLessThanOrEqual(SITE_IMAGE_MAX_BYTES);
    });

    it('küçük görseli büyütmez', async () => {
        expect(await size(await prepareSiteImage(await imageFile(300, 200)))).toEqual([300, 200]);
    });

    it('küçük görseli de yeniden kodlar: EXIF ve konum bilgisi çıkar', async () => {
        const original = await withExif(await imageFile(300, 200, 'image/jpeg'));
        const before = latin1(new Uint8Array(await original.arrayBuffer()));

        expect(before).toContain('Exif');
        expect(before).toContain('GPSLatitude39.9');

        const after = latin1(new Uint8Array(await (await prepareSiteImage(original)).arrayBuffer()));

        expect(after).not.toContain('Exif');
        expect(after).not.toContain('EXIF');
        expect(after).not.toContain('GPSLatitude');
    });

    it('canvas işleyemezse özgün dosyaya düşmez, anlaşılır hata verir', async () => {
        const file = await imageFile(300, 200);
        const toBlob = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(null));

        try {
            await expect(prepareSiteImage(file)).rejects.toThrow('işlenemedi');
        } finally {
            toBlob.mockRestore();
        }
    });

    it('izin verilmeyen türü ve görsel olmayan dosyayı açıklar', async () => {
        await expect(prepareSiteImage(new File(['x'], 'belge.pdf', { type: 'application/pdf' }))).rejects.toThrow('JPEG, PNG ve WebP');
        await expect(prepareSiteImage(new File(['x'], 'bozuk.png', { type: 'image/png' }))).rejects.toThrow('açılamadı');
    });
});

describe('siteQrDataUrl', () => {
    it('üçüncü tarafa gitmeden SVG üretir', () => {
        const url = siteQrDataUrl('https://vetinity.com/k/cagri');

        expect(url.startsWith('data:image/svg+xml')).toBe(true);
        expect(decodeURIComponent(url)).toContain('<svg');
        expect(url).not.toContain('http%3A%2F%2Fapi');
    });
});
