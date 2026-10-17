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
}

/** "Bir günün akışı" — Geliş → Muayene → Tahsilat → Gün sonu. */
export const PUBLIC_HOME_DAY_FLOW: readonly PublicHomeFlowStepDef[] = [
    {
        id: 'gelis',
        title: 'Geliş',
        description: 'Randevulu ya da randevusuz; bekleme sırası, uzun bekleme uyarısı ve acil işareti tek listede.',
        screenshot: 'bugun'
    },
    {
        id: 'muayene',
        title: 'Muayene',
        description: 'Sıradan tek tıkla muayeneye; bölümler, şablon ve sözlük; kesinleşince kilit.',
        screenshot: 'muayene'
    },
    {
        id: 'tahsilat',
        title: 'Tahsilat',
        description: 'Ücret muayeneden doğar; kısmi ödeme, kalan bakiye ve müşteri borcu görünür.',
        screenshot: 'musteriBakiye'
    },
    {
        id: 'gun-sonu',
        title: 'Gün sonu',
        description: 'Kasa özeti ve ücretlenmemiş işlemler; gün bitmeden kapanır.',
        screenshot: 'gunSonu'
    }
];

export interface PublicHomeRoadmapItemDef {
    readonly label: string;
}

/** "Yol haritasında" — amber çipler; tarih verilmez (ADR-034 karar 6, AK-9). */
export const PUBLIC_HOME_ROADMAP: readonly PublicHomeRoadmapItemDef[] = [
    { label: 'Hasta sahibi portalı ve mobil uygulaması' },
    { label: 'SMS hatırlatma' },
    { label: 'e-Fatura' },
    { label: 'Online randevu' }
];

/** Kahraman alt satırı. */
export const PUBLIC_HOME_TRIAL_LINE = '14 gün ücretsiz · kart gerekmez · satış görüşmesi yok';
