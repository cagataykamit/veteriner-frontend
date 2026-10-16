/**
 * Paketler sayfası (`/paketler`, tasarım belgesi 5.5, ADR-034 karar 4 (c)): pilot fiyatı belirlenene kadar tek kart
 * "Pilot dönemi" + "Teklif al / yazın". Kullanıcı ve klinik sınırı yazılmaz; tek doğru backend kataloğudur (WEB-007).
 * Fiyat belirlenince (b) seçeneğine geçilir; `/auth/signup?plan=` akışı `pricing-plan.utils.ts` ile sürer.
 */

export const PUBLIC_PILOT_PACKAGE = {
    title: 'Pilot dönemi',
    lead: 'Pilot dönemindeyiz: tüm özellikler dahil, fiyat için bize yazın. Pilot fiyatı belirlenince paket başına aylık tutar burada açıkça yazılacak.',
    priceLabel: 'Pilot dönemi fiyatı için yazın',
    trialLabel: '14 gün ücretsiz · kart gerekmez · satış görüşmesi yok',
    includes: [
        'Bugün ekranı: geliş, bekleme sırası, acil ve uyarılar',
        'Muayene, reçete, aşı ve tedavi kayıtları; kesinleştirme',
        'Tahsilat, kısmi ödeme, bakiye ve borç raporu',
        'Stok, parti ve son kullanma tarihi, mal kabul, doğrudan satış',
        'Kayıt defterleri: muayene, reçete, aşı, ilaç, narkotik ve psikotropik; Aşı Bilgi raporu',
        'KVKK formları, rıza kaydı ve veri kopyası',
        'Roller ve izinler, denetim izi, birden fazla klinik',
        'Excel ile eski programdan geçiş'
    ],
    /** Dürüst "yok" listesi (ADR-034 karar 6). */
    notIncluded: ['SMS hatırlatma (yalnız e-posta)', 'e-Fatura', 'Online randevu', 'Hasta sahibi portalı ve mobil uygulama (geliştiriliyor)']
} as const;
