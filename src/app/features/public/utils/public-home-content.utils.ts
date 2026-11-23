/**
 * Ana sayfa içerikleri (tasarım belgesi 5.1, öneri belgesi bölüm 1.3 ve 3). Yalnız doğrulanmış yetenekler; ADR-022 dili.
 * Defterler, KVKK, kayıt güvenliği ve geçiş bölümleri ilgili sayfalarla aynı sabitleri kullanır (tek kaynak).
 */

import type { PublicScreenshotKey } from './public-screenshots.utils';

export interface PublicHomeAudienceDef {
    readonly title: string;
    readonly description: string;
    readonly icon: string;
}

/** "Kime göre" — hastane yok (ADR-034 karar 1). */
export const PUBLIC_HOME_AUDIENCE: readonly PublicHomeAudienceDef[] = [
    {
        title: 'Tek hekimli klinik',
        description: 'Kâğıt ya da Excel\'den geçiyorsanız: sabah açın, günün listesi hazır; defterler kendiliğinden dolar.',
        icon: 'pi pi-user'
    },
    {
        title: 'Birkaç kullanıcılı klinik',
        description: 'Resepsiyon geliş kaydını açar, hekim muayeneye tek tıkla geçer; roller ve izinler ayrıdır.',
        icon: 'pi pi-users'
    },
    {
        title: 'Birden fazla şube',
        description: 'Tek kurum altında birden fazla klinik; her kullanıcı yalnız kendi kliniğinin verisini görür.',
        icon: 'pi pi-building'
    }
];

export interface PublicHomeFlowStepDef {
    readonly id: string;
    readonly title: string;
    readonly description: string;
    readonly screenshot: PublicScreenshotKey;
    /** Telefondaki zaman çizgisinde adımın saati (T-03 B): örnek bir gün, anlatım içindir. */
    readonly time: string;
}

/** "Bir günün akışı" — Geliş → Muayene → Tahsilat → Gün sonu. */
export const PUBLIC_HOME_DAY_FLOW: readonly PublicHomeFlowStepDef[] = [
    {
        id: 'gelis',
        title: 'Geliş',
        description: 'Randevulu ya da randevusuz; bekleme sırası, uzun bekleme uyarısı ve acil işareti tek listede.',
        screenshot: 'bugun',
        time: '09:00'
    },
    {
        id: 'muayene',
        title: 'Muayene',
        description: 'Sıradan tek tıkla muayeneye; bölümler, şablon ve sözlük; kesinleşince kilit.',
        screenshot: 'muayene',
        time: '09:20'
    },
    {
        id: 'tahsilat',
        title: 'Tahsilat',
        description: 'Ücret muayeneden doğar; kısmi ödeme, kalan bakiye ve müşteri borcu görünür.',
        screenshot: 'musteriBakiye',
        time: '09:50'
    },
    {
        id: 'gun-sonu',
        title: 'Gün sonu',
        description: 'Kasa özeti ve ücretlenmemiş işlemler; gün bitmeden kapanır.',
        screenshot: 'gunSonu',
        time: '19:00'
    }
];

/** Kahraman: başlığın fosforlu kısmı ayrı (`marker`). */
export const PUBLIC_HOME_HERO = {
    title: 'Veteriner kliniğinizin günü',
    marker: 'tek ekranda',
    lead: 'Geliş, bekleme, muayene, tahsilat ve kayıt defterleri aynı yerde. Kâğıt, Excel ya da eski programdaki kayıtlarınızı da getirin.'
} as const;

export interface PublicHomeSectionDef {
    readonly title: string;
    readonly lead?: string;
    /** Bölümün altındaki bağlantının metni. */
    readonly link?: string;
    /** Kartın altındaki kısa not. */
    readonly note?: string;
}

/** Ana sayfa bölüm ve kart metinleri: masaüstü bölümleri ve telefondaki zaman çizgisi aynı metni kullanır. */
export const PUBLIC_HOME_SECTIONS = {
    audience: { title: 'Kime göre?', lead: 'Tek hekimli klinikten çok şubeli işletmeye; büyüdükçe şube eklersiniz.' },
    flow: { title: 'Bir günün akışı', lead: 'Gelişten gün sonuna dört adım; her adımda tek ekran.', link: 'Tüm akışı görün' },
    turkey: { title: "Türkiye'ye özgü", lead: 'Kayıt defterleri her kayıtla kendiliğinden dolar; KVKK evrakı hazır.', link: 'Defterler ve KVKK sayfası' },
    registers: { title: 'Kayıt defterleri', note: "Yazdırın, Excel'e alın." },
    kvkk: { title: 'KVKK evrakı', note: 'Rıza kaydı ve metin sürümü müşteri kartında.' },
    safety: { title: 'Kayıtlarınız güvende ve dürüst' }
} as const satisfies Record<string, PublicHomeSectionDef>;

/** Telefon kahramanının durum çipi (T-03 B). */
export const PUBLIC_HOME_PHONE_HERO_CHIP = 'Sabah açılıştan gün sonuna';

/** Telefondaki zaman çizgisinde saati olmayan duraklar: günün içine yayılan işler. */
export const PUBLIC_HOME_TIMELINE_MARKS = {
    turkey: 'Gün boyu, kendiliğinden',
    safety: 'Her kayıtta',
    site: 'Kapanıştan sonra da açık'
} as const;

/** Kahraman alt satırı. */
export const PUBLIC_HOME_TRIAL_LINE = '14 gün ücretsiz · kart gerekmez · satış görüşmesi yok';

export interface PublicHomeTrustDef {
    readonly icon: string;
    readonly text: string;
}

/** Kahramanın altındaki güven satırı: yeni iddia yok, sitedeki mevcut cümlelerden kısa parçalar. */
export const PUBLIC_HOME_TRUST: readonly PublicHomeTrustDef[] = [
    { icon: 'pi pi-map-marker', text: "Türkiye'deki veteriner klinikleri için" },
    { icon: 'pi pi-book', text: 'Kayıt defterleri her kayıtla kendiliğinden dolar' },
    { icon: 'pi pi-shield', text: 'KVKK evrakı hazır' },
    { icon: 'pi pi-lock', text: 'Kesinleşen muayene kilitlenir' },
    { icon: 'pi pi-download', text: 'Veriniz sizde kalır' }
];
