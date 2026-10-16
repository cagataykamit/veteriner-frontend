/**
 * Herkese açık hukuki metinler (ADR-024). Kaynak: ürün deposu `legal/` taslakları; metin aynen aktarılır,
 * köşeli parantezli alanlar doldurulmadan bırakılır.
 */

/**
 * Taslak uyarısı — tek yer. Hukuki onay gelince `null` yapılır; bant ve `noindex` birlikte kalkar.
 */
export const LEGAL_DRAFT_NOTICE: string | null = 'Bu metin taslaktır, hukuki onaydan geçmemiştir.';

export interface LegalInlinePart {
    readonly text: string;
    readonly strong?: boolean;
    readonly routerLink?: string;
}

export type LegalInline = string | LegalInlinePart;

export type LegalParagraph = string | readonly LegalInline[];

export interface LegalSectionDef {
    readonly heading: string;
    readonly paragraphs?: readonly LegalParagraph[];
    readonly items?: readonly string[];
}

export interface LegalDocumentDef {
    readonly path: string;
    readonly title: string;
    /** Bağlantı ve sekme başlığı için kısa ad. */
    readonly shortTitle: string;
    readonly subtitle: string;
    readonly versionLine: string;
    readonly description: string;
    readonly intro?: readonly LegalParagraph[];
    readonly sections: readonly LegalSectionDef[];
}

export const PRIVACY_POLICY_PATH = '/gizlilik';
export const TERMS_OF_USE_PATH = '/kullanim-sartlari';

export const PRIVACY_POLICY_DOCUMENT: LegalDocumentDef = {
    path: PRIVACY_POLICY_PATH,
    title: 'Vetinity Gizlilik Politikası',
    shortTitle: 'Gizlilik Politikası',
    subtitle: 'kullanıcı / site ziyaretçisi',
    versionLine: 'Sürüm: 0.1 (taslak) · Taslak tarihi: 2026-10-15 · Durum: hukuki onay bekliyor',
    description: "Vetinity'nin kendi kullanıcılarına ve site ziyaretçilerine ilişkin kişisel verilerin işlenmesi.",
    intro: [
        "Bu politika Vetinity'nin kendi kullanıcılarına (klinik yöneticisi ve çalışanları, site ziyaretçileri, deneme kaydı yapanlar) ilişkindir. Kliniklerin müşterilerinin (hayvan sahipleri) verileri bakımından veri sorumlusu ilgili kliniktir; Vetinity bu verileri klinik adına veri işleyen olarak işler (veri işleme sözleşmesi)."
    ],
    sections: [
        {
            heading: '1. Veri sorumlusu',
            paragraphs: ['[Şirket unvanı], [adres], [MERSİS/ticaret sicil no], [iletişim e-postası]. 6698 sayılı Kanun kapsamında veri sorumlusudur.']
        },
        {
            heading: '2. Hangi verileri işleriz',
            items: [
                'Hesap: ad, soyad, e-posta, telefon, rol ve yetkiler, klinik adı ve bilgileri, parola (yalnız geri döndürülemez özet olarak).',
                'Abonelik ve ödeme: paket, fatura bilgileri, ödeme durumu. Kart bilgileri bizde saklanmaz; ödeme altyapısı sağlayıcısı (iyzico) tarafından işlenir.',
                'Kullanım ve güvenlik: giriş kayıtları, IP adresi, tarayıcı/cihaz bilgisi, işlem (denetim) kayıtları, hata kayıtları.',
                'İletişim: destek talepleri ve yazışmalar.',
                'Çerezler: oturum için zorunlu çerezler; zorunlu olmayan çerez/analitik kullanılırsa açık rıza alınır [çerez politikası eklenecek].'
            ]
        },
        {
            heading: '3. Amaçlar ve hukuki sebepler',
            paragraphs: [
                'Hesabın açılması, hizmetin sunulması ve güvenliği (sözleşmenin ifası); faturalandırma ve yasal kayıtlar (hukuki yükümlülük); hizmet duyuruları ve destek (sözleşmenin ifası, meşru menfaat); suistimal ve güvenlik olaylarının önlenmesi (meşru menfaat); hakların korunması (hakkın tesisi); açık rıza gerektiren iletişimler yalnız rıza ile.'
            ]
        },
        {
            heading: '4. Aktarım',
            paragraphs: [
                'Barındırma ve altyapı, ödeme (iyzico), e-posta/SMS gönderimi, destek ve muhasebe/hukuk danışmanlığı sağlayıcılarına; mevzuatın zorunlu kıldığı hallerde yetkili kurumlara. [Yurt dışına aktarım varsa: sağlayıcı, ülke ve Kanun m.9 mekanizması buraya yazılır.] Verileriniz satılmaz.'
            ]
        },
        {
            heading: '5. Saklama',
            paragraphs: [
                'Hesap açık olduğu sürece ve sonrasında yasal zamanaşımı/saklama yükümlülükleri (örneğin vergi ve ticari defter belgeleri için 10 yıl) bitene kadar; ardından silinir, yok edilir veya anonimleştirilir. Ayrıntı: saklama ve imha politikası.'
            ]
        },
        {
            heading: '6. Güvenlik',
            paragraphs: [
                "Erişim yetkilendirmesi, rol/izin sistemi, iletişimde şifreleme, denetim kaydı ve yedekleme gibi teknik ve idari tedbirler uygulanır. Hiçbir sistem tamamen risksizdir; ihlal halinde Kanun m.12 uyarınca ilgili kişilere ve Kurul'a bildirim yapılır."
            ]
        },
        {
            heading: '7. Haklarınız ve başvuru',
            paragraphs: [
                "Kanun m.11 kapsamındaki haklar (öğrenme, bilgi isteme, düzeltme, silme/yok etme, aktarılan kişilere bildirme, itiraz, zarar giderim) için [başvuru e-postası/adresi]'ne başvurabilirsiniz; en geç 30 gün içinde yanıtlanır. Kişisel Verileri Koruma Kurulu'na şikâyet hakkınız saklıdır."
            ]
        },
        {
            heading: '8. Değişiklikler',
            paragraphs: ['Politika güncellendiğinde yeni sürüm yayımlanır; önemli değişiklikler uygulama içinde duyurulur.']
        }
    ]
};

export const TERMS_OF_USE_DOCUMENT: LegalDocumentDef = {
    path: TERMS_OF_USE_PATH,
    title: 'Vetinity Kullanım Şartları',
    shortTitle: 'Kullanım Şartları',
    subtitle: 'klinik abonelik sözleşmesi',
    versionLine: 'Sürüm: 0.1 (taslak) · Taslak tarihi: 2026-10-15 · Durum: hukuki onay bekliyor',
    description: "Vetinity ile Vetinity'yi kullanan veteriner kliniği arasındaki abonelik ve kullanım şartları.",
    sections: [
        {
            heading: '1. Taraflar ve kapsam',
            paragraphs: [
                'Bu şartlar, [Şirket unvanı] ("Vetinity") ile Vetinity\'yi kullanan veteriner kliniği veya hekimi ("Klinik") arasındadır. Vetinity, klinik yönetimi için bulut tabanlı yazılım hizmeti ("Hizmet") sunar. Hizmeti kullanmak veya kayıt olmakla şartları kabul etmiş olursunuz; kabul eden kişi Kliniği temsil yetkisine sahip olduğunu beyan eder.'
            ]
        },
        {
            heading: '2. Hizmetin niteliği',
            paragraphs: [
                [
                    'Vetinity bir kayıt ve yönetim aracıdır; ',
                    { text: 'veterinerlik, hukuk, mali müşavirlik veya resmî bildirim tavsiyesi vermez', strong: true },
                    '. Klinik, hekimlik kararlarından, kayıtların doğruluğundan ve mevzuattan doğan yükümlülüklerinden (resmî defterler, reçete, bildirim, saklama, vergi/fatura) kendisi sorumludur. Hizmetteki resmî defter ve belge çıktıları Klinik tarafından kontrol edilir; resmî biçime uygunluk garanti edilmez [hukuki inceleme: B1–B7]. Hizmetteki fişler mali değer taşımaz.'
                ]
            ]
        },
        {
            heading: '3. Hesap ve kullanıcılar',
            paragraphs: [
                "Klinik, kullanıcı hesaplarının güvenliğinden ve yetkilendirmeden sorumludur; parolalar paylaşılmaz. Kullanıcıların yetkisi Klinik tarafından yönetilir. Yetkisiz erişim şüphesi derhal Vetinity'ye bildirilir."
            ]
        },
        {
            heading: '4. Deneme, abonelik ve ödeme',
            paragraphs: [
                'Deneme süresi [süre] gündür; süre sonunda ücretli pakete geçilmezse hesap salt okunur olur [TRIAL ilkelerine göre] ve veriler [süre] boyunca saklanır. Ücretler, paket ve fatura dönemi uygulama içinde belirtilir; ödeme iyzico aracılığıyla alınır. İptal ve iade: [iade/iptal kuralları, mesafeli satış mevzuatı — hukuk belirler]. Fiyat değişikliği, yürürlüğe girmeden en az [30] gün önce bildirilir.'
            ]
        },
        {
            heading: '5. Kullanım kuralları',
            paragraphs: [
                'Hizmet hukuka aykırı amaçla, başkalarının haklarını ihlal edecek biçimde, güvenliği aşmaya, tersine mühendisliğe, otomatik toplu veri çekmeye veya Hizmeti aksatmaya yönelik kullanılamaz. Klinik, yüklediği içeriğin hukuka uygunluğundan sorumludur.'
            ]
        },
        {
            heading: '6. Veri ve gizlilik',
            paragraphs: [
                [
                    "Müşteri/hasta verilerinin sahibi ve veri sorumlusu Kliniktir; Vetinity bu verileri Klinik adına, veri işleme sözleşmesi çerçevesinde işler. Vetinity'nin kendi kullanıcı verileri ",
                    { text: 'gizlilik politikası', routerLink: PRIVACY_POLICY_PATH },
                    ' kapsamındadır. Sonlandırmada Klinik verisini dışa aktarabilir; ayrıntı saklama ve imha politikasındadır.'
                ]
            ]
        },
        {
            heading: '7. Fikri mülkiyet',
            paragraphs: [
                "Yazılım, arayüz ve markalar Vetinity'ye aittir; Klinik'e Hizmet süresince devredilemez, münhasır olmayan kullanım hakkı verilir. Klinik verileri Klinik'e aittir."
            ]
        },
        {
            heading: '8. Kullanılabilirlik ve değişiklikler',
            paragraphs: [
                'Vetinity makul çabayla kesintisiz hizmet hedefler; bakım ve mücbir sebepler hariç tutulur, kesintisizlik garanti edilmez [hizmet seviyesi: pilot sonrası]. Hizmet ve şartlar değiştirilebilir; önemli değişiklikler önceden bildirilir ve yeni sürümün kabulü sürümlü olarak kaydedilir.'
            ]
        },
        {
            heading: '9. Sorumluluk sınırı',
            paragraphs: [
                "Kasıt ve ağır kusur hariç, Vetinity'nin toplam sorumluluğu son [12] ayda ödenen bedelle sınırlıdır; dolaylı zararlar (kâr kaybı, itibar kaybı, klinik hekimlik sonuçları) kapsam dışıdır. [Hukuk: tüketici/KOBİ ayrımı ve emredici hükümler gözden geçirilecek.]"
            ]
        },
        {
            heading: '10. Fesih',
            paragraphs: [
                'Taraflar [30] gün önceden yazılı bildirimle sona erdirebilir; şartların ağır ihlalinde Vetinity erişimi derhal askıya alabilir. Fesihte Klinik verisini dışa aktarma süresi tanınır [süre].'
            ]
        },
        {
            heading: '11. Uygulanacak hukuk',
            paragraphs: [
                'Türkiye Cumhuriyeti hukuku; yetkili mahkeme ve icra daireleri [şehir] mahkemeleridir. Tüketici işlemleri için emredici hükümler saklıdır.'
            ]
        }
    ]
};

export type LegalDocumentKey = 'privacy' | 'terms';

/** Rota `data.legalDocument` anahtarı → belge. */
export const LEGAL_DOCUMENTS: Readonly<Record<LegalDocumentKey, LegalDocumentDef>> = {
    privacy: PRIVACY_POLICY_DOCUMENT,
    terms: TERMS_OF_USE_DOCUMENT
};

/** Paragrafı satır içi parçalara çevirir (düz metin tek parça olur). */
export function legalParagraphParts(paragraph: LegalParagraph): readonly LegalInlinePart[] {
    const parts = typeof paragraph === 'string' ? [paragraph] : paragraph;

    return parts.map((part) => (typeof part === 'string' ? { text: part } : part));
}
