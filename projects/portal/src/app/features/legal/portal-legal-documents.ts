import type { PortalLegalDocumentType } from './portal-legal.api';

/**
 * Hasta sahibi portalı hukuki metinleri — TEK veri dosyası. Kaynak: ürün deposu `legal/portal-kullanim-sartlari.md` ve
 * `legal/portal-gizlilik-politikasi.md` v0.1 (2026-10-16). Metin aynen aktarılır; köşeli parantezli alanlar ve hukuki
 * görüş notları doldurulmadan bırakılır. İç belge bağlantıları (ADR, şablon dosyaları) müşteriye gösterilmez; portal
 * belgeleri arası bağlantılar uygulama içi rotaya çevrilir. Sürüm numarası backend'den gelir (`GET /legal-documents`).
 */

/** Taslak uyarısı — tek yer. Hukuki onay gelince `null` yapılır; tüm portal belgelerindeki bant birlikte kalkar. */
export const PORTAL_LEGAL_DRAFT_NOTICE: string | null = 'Bu metin taslaktır, hukuki onaydan geçmemiştir.';

export const PORTAL_TERMS_PATH = '/legal/terms';
export const PORTAL_PRIVACY_PATH = '/legal/privacy';

export interface PortalLegalInline {
    readonly text: string;
    readonly strong?: boolean;
    readonly routerLink?: string;
}

export type PortalLegalParagraph = string | readonly (string | PortalLegalInline)[];

export interface PortalLegalSection {
    readonly heading?: string;
    readonly paragraphs?: readonly PortalLegalParagraph[];
    readonly items?: readonly PortalLegalParagraph[];
    /** Listeden sonra gelen paragraflar. */
    readonly closing?: readonly PortalLegalParagraph[];
}

export interface PortalLegalDocument {
    readonly documentType: PortalLegalDocumentType;
    readonly path: string;
    readonly title: string;
    readonly shortTitle: string;
    /** Sürüm satırının sürümden sonraki kısmı. */
    readonly statusLine: string;
    readonly intro: readonly PortalLegalParagraph[];
    readonly sections: readonly PortalLegalSection[];
}

export const PORTAL_TERMS_DOCUMENT: PortalLegalDocument = {
    documentType: 'PortalTerms',
    path: PORTAL_TERMS_PATH,
    title: 'Vetinity Hasta Sahibi Portalı Kullanım Şartları',
    shortTitle: 'Kullanım Şartları',
    statusLine: 'Taslak tarihi: 2026-10-16 · Durum: hukuki onay bekliyor',
    intro: [
        'Bu şartlar, veteriner kliniğinin müşterisi olarak hasta sahibi portalını (web ve mobil uygulama) kullanan kişilere ilişkindir. Kliniklerin Vetinity\'yi kullanma koşulları ayrı belgededir.'
    ],
    sections: [
        {
            heading: '1. Taraflar ve kapsam',
            paragraphs: [
                'Bu şartlar, [Şirket unvanı] ("Vetinity") ile portal hesabı açan hasta sahibi ("Kullanıcı") arasındadır. Portal, Kullanıcı\'nın hizmet aldığı ve kendisini davet eden veteriner kliniğinin ("Klinik") kayıtlarından türetilen bilgileri Kullanıcı\'ya gösteren bir yazılım hizmetidir ("Portal"). Hesap açarken veya şartların yeni sürümünü onaylarken bu şartları kabul etmiş olursunuz. Portal ücretsizdir; Klinik\'in veteriner hizmetlerinin ücreti Klinik ile Kullanıcı arasındadır. [AK-5: sözleşmenin tarafı yalnız Vetinity mi, Klinik de taraf mı — hukuki görüş bekliyor.]'
            ]
        },
        {
            heading: '2. Hizmetin niteliği',
            paragraphs: [
                [
                    'Portal ',
                    { text: 'bilgilendirme amaçlıdır; veteriner hekim muayenesi, teşhis veya tedavi tavsiyesi değildir.', strong: true },
                    ' Portalda gösterilen aşı, randevu, bakiye, reçete ve tedavi özeti bilgileri Klinik\'in kaydından aktarılır; tedavi kararları için Klinik\'inize danışın. ',
                    { text: 'Acil bir durumda Portal\'a güvenmeyin; Klinik\'i telefonla arayın veya en yakın veteriner acil servisine başvurun.', strong: true },
                    ' Portal üzerinden gönderilen bir bildirim ya da talebin Klinik tarafından anında görüleceği garanti edilmez.'
                ]
            ]
        },
        {
            heading: '3. Hesap ve giriş güvenliği',
            paragraphs: [
                'Hesap yalnız Klinik\'in gönderdiği tek kullanımlık, süreli davetle açılır. Giriş, e-postanıza gelen tek kullanımlık kodla veya e-posta ve parolanızla yapılır. Kod ve parolanızı kimseyle paylaşmayın; Vetinity veya Klinik çalışanları kodunuzu ya da parolanızı sizden istemez. Cihazınızın ve e-posta hesabınızın güvenliğinden siz sorumlusunuz. Hesabınızın izinsiz kullanıldığından şüphelenirseniz parolanızı değiştirin, "tüm cihazlardan çıkış" yapın ve [destek e-postası] adresine bildirin. Güvenlik için çok sayıda hatalı denemeden sonra giriş geçici olarak kilitlenebilir. Hesap kişiseldir; başkası adına açılamaz ve devredilemez. [AK-5: yaş sınırı ve vekâlet/ortak sahiplik — hukuki görüş bekliyor; şimdilik Klinik\'in müşteri kaydındaki kişi tek sahip kabul edilir.]'
            ]
        },
        {
            heading: '4. Klinik ile Vetinity\'nin ilişkisi',
            paragraphs: [
                [
                    'Hayvanınıza ve size ilişkin klinik kayıtlarının (hasta kaydı, aşı, randevu, bakiye, reçete ve tedavi özeti) ',
                    { text: 'veri sorumlusu Klinik\'tir', strong: true },
                    '; Vetinity bu kayıtları Klinik adına veri işleyen olarak barındırır ve Portal\'da gösterir. Kayıtların içeriği, düzeltilmesi ve silinmesi Klinik\'in kararıdır; bu konudaki talepleriniz Klinik\'e iletilir. Birden çok Vetinity kliniğinden hizmet alıyorsanız tek hesabınız her kliniğe ayrı ayrı bağlanır; her klinik yalnız kendi kayıtlarından sorumludur ve bir klinik diğerinin kayıtlarını görmez. Portal hesabının kendisine ilişkin veriler (giriş bilgileri, cihaz ve oturum, bildirim tercihi) ',
                    { text: 'portal gizlilik politikası', routerLink: PORTAL_PRIVACY_PATH },
                    ' kapsamındadır. [AK-5: portal hesabı verileri için Vetinity\'nin veri sorumlusu mu, Klinik adına veri işleyen mi olduğu hukuki görüş bekliyor.]'
                ]
            ]
        },
        {
            heading: '5. Kullanım kuralları',
            paragraphs: [
                'Portal yalnız kendi ve sahibi olduğunuz hayvanların bilgilerine erişmek için kullanılabilir. Başkasının hesabına girmeye çalışmak, güvenlik önlemlerini aşmak, otomatik araçlarla toplu veri çekmek, Portal\'ı aksatmak veya hukuka aykırı amaçla kullanmak yasaktır.'
            ]
        },
        {
            heading: '6. Erişimin kapatılması ve hesabın silinmesi',
            paragraphs: [
                'Klinik, sizinle ilişkisi sona erdiğinde veya kayıt düzeltmesi gerektiğinde kendi kayıtlarına erişiminizi kapatabilir; bu durumda diğer kliniklere bağınız etkilenmez. Klinik Portal\'ı tümüyle kullanmamaya karar verirse erişim durur. Vetinity, bu şartların ağır ihlali veya güvenlik riski halinde hesabı askıya alabilir. Hesabınızı istediğiniz zaman silebilirsiniz; hesap silinince oturumlarınız, cihaz bilgileriniz ve bildirim tercihleriniz silinir, ancak Klinik\'teki kayıtlarınız Klinik\'in sorumluluğunda ve mevzuattaki saklama sürelerine göre kalır. Erişimin kapanması Klinik\'ten hizmet almanıza engel olmaz.'
            ]
        },
        {
            heading: '7. Doğruluk ve sorumluluk sınırı',
            paragraphs: [
                'Portal\'daki bilgiler Klinik\'in girdiği kayıtları yansıtır; Vetinity bu kayıtların doğruluğunu, eksiksizliğini veya güncelliğini garanti etmez. Yanlış ya da eksik bir bilgi görürseniz Klinik\'e bildirin. Vetinity makul çabayla kesintisiz hizmet hedefler; bakım, bağlantı sorunları ve mücbir sebepler nedeniyle kesinti olabilir. Kasıt ve ağır kusur hariç, Vetinity Portal bilgisine dayanılarak verilen kararlardan, kaçırılan randevu veya aşıdan ve dolaylı zararlardan sorumlu değildir. [Hukuk: tüketici mevzuatının emredici hükümleri karşısında bu sınırın geçerliliği gözden geçirilecek.]'
            ]
        },
        {
            heading: '8. Bildirimler',
            paragraphs: [
                'Hesap ve güvenlik iletileri (giriş kodu, parola sıfırlama, şartların değişmesi) hesabın işleyişi için gönderilir. Randevu ve aşı hatırlatmaları bildirim tercihinize bağlıdır ve uygulamadan kapatılabilir; Klinik size hatırlatma göndermeme kaydı tuttuysa Portal\'dan da hatırlatma gitmez. Tanıtım/kampanya iletisi yalnız ayrı onayınızla gönderilir. [AK-5: hatırlatmaların ticari elektronik ileti sayılıp sayılmadığı (İYS) hukuki görüş bekliyor.]'
            ]
        },
        {
            heading: '9. Fikri mülkiyet',
            paragraphs: [
                'Portal yazılımı, arayüzü ve Vetinity markası Vetinity\'ye; Klinik adı ve logosu Klinik\'e aittir. Kullanıcı\'ya Portal\'ı kişisel amaçla kullanmak için devredilemez, münhasır olmayan bir kullanım hakkı verilir.'
            ]
        },
        {
            heading: '10. Değişiklikler ve yeniden kabul',
            paragraphs: [
                'Portal ve bu şartlar değiştirilebilir. Şartların yeni sürümü yayımlandığında bir sonraki girişinizde gösterilir; Portal\'ı kullanmaya devam etmek için yeni sürümü onaylamanız gerekir. Her onay, sürüm numarası ve zamanıyla kaydedilir. Onaylamazsanız hesabınızı silebilirsiniz.'
            ]
        },
        {
            heading: '11. Uygulanacak hukuk',
            paragraphs: [
                'Türkiye Cumhuriyeti hukuku uygulanır. Tüketici sıfatıyla yasal haklarınız ve tüketici hakem heyeti ile tüketici mahkemelerine başvuru hakkınız saklıdır; diğer uyuşmazlıklarda [şehir] mahkemeleri ve icra daireleri yetkilidir. İletişim: [Şirket unvanı], [adres], [iletişim e-postası].'
            ]
        }
    ]
};

export const PORTAL_PRIVACY_DOCUMENT: PortalLegalDocument = {
    documentType: 'PortalPrivacy',
    path: PORTAL_PRIVACY_PATH,
    title: 'Vetinity Hasta Sahibi Portalı Gizlilik Politikası',
    shortTitle: 'Gizlilik Politikası',
    statusLine: 'Taslak tarihi: 2026-10-16 · Durum: hukuki onay bekliyor',
    intro: [
        [
            'Bu politika, hasta sahibi portalını (web ve mobil uygulama) kullanan kişilerin ',
            { text: 'portal hesabına', strong: true },
            ' ilişkin verilerinin nasıl işlendiğini anlatır. Portal\'da gördüğünüz klinik kayıtlarının veri sorumlusu ilgili kliniktir; o kayıtlar için kliniğinizin aydınlatma metni geçerlidir. Klinik çalışanları ve site ziyaretçileri için ayrı gizlilik politikası geçerlidir.'
        ]
    ],
    sections: [
        {
            heading: '1. Veri sorumlusu',
            paragraphs: [
                '[Şirket unvanı], [adres], [MERSİS/ticaret sicil no], [iletişim e-postası]. [AK-5: portal hesabı verileri (bölüm 2a) için Vetinity\'nin veri sorumlusu mu, bağlı klinik adına veri işleyen mi olduğu hukuki görüş bekliyor. Bu taslak, Vetinity\'nin kendi kullanıcı hesaplarındaki varsayımla (veri sorumlusu) yazılmıştır; görüş farklı çıkarsa 1, 3 ve 4. bölümler değişir.] Klinik kayıtları (bölüm 2b) bakımından Vetinity, kliniğin talimatıyla veri işleyendir.'
            ]
        },
        {
            heading: '2. Hangi verileri işleriz',
            paragraphs: [[{ text: 'a) Portal hesabı verileri', strong: true }]],
            items: [
                'Hesap: e-posta adresi, görünen ad, parola (yalnız geri döndürülemez özet olarak; parolasız girişte hiç tutulmaz).',
                'Giriş ve güvenlik: giriş kayıtları (zaman, başarılı/başarısız deneme, kullanılan yöntem), tek kullanımlık kodların geçerlilik ve deneme bilgisi, kilitleme durumu, IP adresi [hukuk: güvenlik kaydında IP tutulmalı mı, süresi], Portal\'da hangi kaydın görüntülendiğine ilişkin erişim kaydı (kim, ne zaman, hangi kayıt; içerik değil).',
                'Cihaz ve oturum: oturum ve yenileme jetonları, cihaz/tarayıcı türü, "tüm cihazlardan çıkış" için oturum listesi; bildirim izni verirseniz bildirim cihaz jetonu (v1).',
                'Bildirim tercihi: hangi bildirim türünü hangi kanaldan almak istediğiniz.',
                [
                    'Kabul kayıtları: bu politikanın ve ',
                    { text: 'portal kullanım şartlarının', routerLink: PORTAL_TERMS_PATH },
                    ' kabul ettiğiniz sürümü ve zamanı.'
                ],
                'Klinik bağları: hesabınızın hangi klinikteki müşteri kaydına bağlı olduğu, davet ve bağ durumu.'
            ]
        },
        {
            paragraphs: [
                [{ text: 'b) Portal\'da gösterilen klinik kayıtları (veri sorumlusu klinik)', strong: true }],
                [
                    'Hayvanlarınızın temel bilgileri (ad, tür, ırk, doğum tarihi, mikroçip, kilo), randevularınız, aşı geçmişi ve yaklaşan aşı/kontrol, bakiye ve ödeme durumu, reçete ve tedavi özeti (sade dilde, kliniğin açtığı ölçüde), kliniğin iletişim bilgileri. ',
                    { text: 'Muayene notları, laboratuvar sonuçları ve görüntüler Portal\'da gösterilmez.', strong: true },
                    ' Bu kayıtlar Portal için ayrıca toplanmaz; kliniğin mevcut kaydından salt okunur gösterilir.'
                ]
            ]
        },
        {
            heading: '3. Amaçlar ve hukuki sebepler',
            paragraphs: [
                'Hesabın açılması, girişin sağlanması ve klinik kayıtlarının size gösterilmesi (Kanun m.5/2-c, sözleşmenin ifası); hesap güvenliği, yetkisiz erişimin ve kötüye kullanımın önlenmesi, erişim kaydı (m.5/2-f meşru menfaat; [hukuk: m.5/2-ç kapsamında saklama yükümlülüğü var mı]); şartların ve politikanın sürümlü kabulünün ispatı (m.5/2-e hakkın tesisi ve korunması); işlemsel bildirimler — giriş kodu, parola sıfırlama, randevu ve aşı hatırlatması (m.5/2-c; tercihinizle kapatılabilir); tanıtım/kampanya iletileri yalnız açık rızanızla [AK-5: İYS/ETK ayrımı hukuki görüş bekliyor].'
            ]
        },
        {
            heading: '4. Aktarım',
            items: [
                [
                    { text: 'Bağlı klinik:', strong: true },
                    ' hesabınızın o klinikteki bağ durumu (davet, bağlı, erişim kapatıldı) ve Portal\'dan ilettiğiniz talepler yalnız ilgili kliniğe görünür. Parolanız, oturum ve cihaz bilgileriniz kliniğe aktarılmaz.'
                ],
                [
                    { text: 'Hizmet sağlayıcılar:', strong: true },
                    ' barındırma ve altyapı, e-posta gönderim sağlayıcısı [sağlayıcı belirlenmedi], bildirim (push) hizmeti — v1\'de, uygulama mağazası platformlarının bildirim altyapısı [yurt dışına aktarım: sağlayıcı, ülke ve Kanun m.9 mekanizması buraya yazılır].'
                ],
                [{ text: 'Yetkili kurumlar:', strong: true }, ' mevzuatın zorunlu kıldığı hallerde.']
            ],
            closing: ['Verileriniz satılmaz ve reklam amacıyla paylaşılmaz.']
        },
        {
            heading: '5. Birden çok klinik ve ayrı veri sorumluları',
            paragraphs: [
                [
                    'Birden fazla Vetinity kliniğinden hizmet alıyorsanız tek portal hesabınız her kliniğe ayrı ayrı ve yalnız o kliniğin davetiyle bağlanır. Her klinik kendi kayıtlarının ',
                    { text: 'ayrı veri sorumlusudur', strong: true },
                    '; bir klinik diğer kliniğin kayıtlarını, sizin diğer kliniklerle bağınızı veya o kliniklerdeki hayvan bilgilerinizi göremez. Bir kliniğin erişiminizi kapatması diğer bağları etkilemez.'
                ]
            ]
        },
        {
            heading: '6. Saklama',
            items: [
                'Hesap verileri, oturumlar, cihaz jetonları ve bildirim tercihleri: hesap açık olduğu sürece; hesap silinince silinir.',
                'Giriş ve erişim kayıtları: [süre — hukuk belirler], sonra silinir veya anonimleştirilir.',
                'Kabul kayıtları: hesap silinse de ispat amacıyla [süre — hukuk belirler] saklanır.',
                'Klinik kayıtları: kliniğin saklama ve imha politikasına ve mevzuattaki sürelere bağlıdır; portal hesabının silinmesi bu kayıtları silmez.'
            ]
        },
        {
            heading: '7. Güvenlik',
            paragraphs: [
                'Tek kullanımlık ve süreli kodlar, deneme sınırı ve geçici kilitleme, parolanın geri döndürülemez özetle saklanması, kısa ömürlü oturum jetonları, iletişimde şifreleme, yalnız kendi kayıtlarınıza erişim kontrolü ve erişim kaydı uygulanır. Hiçbir sistem tamamen risksizdir; ihlal halinde Kanun m.12 uyarınca ilgili kişilere ve Kurul\'a bildirim yapılır.'
            ]
        },
        {
            heading: '8. Çerezler ve yerel depolama',
            paragraphs: [
                'Portal, oturumunuzu sürdürmek için tarayıcı veya uygulama içi yerel depolamada oturum bilgisi ve dil/görünüm gibi zorunlu ayarları tutar. Analitik veya reklam çerezi kullanılmaz; kullanılması gerekirse önceden açık rızanız alınır [çerez politikası eklenecek]. Çıkış yaptığınızda oturum bilgisi cihazdan silinir.'
            ]
        },
        {
            heading: '9. Haklarınız (Kanun m.11)',
            paragraphs: [
                'Kişisel verilerinizin işlenip işlenmediğini öğrenme; işlenmişse bilgi talep etme; işlenme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme; aktarıldığı üçüncü kişileri bilme; eksik veya yanlış işlenmişse düzeltilmesini isteme; Kanun\'daki şartlarla silinmesini veya yok edilmesini ve bunun aktarılanlara bildirilmesini isteme; münhasıran otomatik sistemlerle analiz sonucu aleyhinize bir sonuca itiraz etme; kanuna aykırı işleme nedeniyle zararın giderilmesini isteme haklarına sahipsiniz.'
            ]
        },
        {
            heading: '10. Başvuru yolu',
            items: [
                'Portal hesabı verileri için: [başvuru e-postası/adresi]. Hesabınızı ve bildirim tercihlerinizi Portal\'dan kendiniz de silebilir veya değiştirebilirsiniz.',
                'Klinik kayıtları için: doğrudan ilgili kliniğe veya Portal\'daki "Verilerimle ilgili talep" bölümünden (v1) başvurabilirsiniz; talep kliniğin KVKK talep sürecine iletilir ve klinik yanıtlar. Vetinity\'ye gelen klinik kaydı talepleri ilgili kliniğe yönlendirilir.'
            ],
            closing: [
                'Başvurular en geç 30 gün içinde ücretsiz yanıtlanır; ayrıca maliyet gerekirse Kurul tarifesi uygulanabilir. Yanıtı yetersiz bulursanız veya süresinde yanıt verilmezse Kanun m.14 uyarınca Kişisel Verileri Koruma Kurulu\'na şikâyet hakkınız saklıdır.'
            ]
        },
        {
            heading: '11. Değişiklikler',
            paragraphs: [
                'Politika güncellendiğinde yeni sürüm yayımlanır ve bir sonraki girişinizde onayınıza sunulur; kabul ettiğiniz sürüm kaydedilir.'
            ]
        }
    ]
};

export const PORTAL_LEGAL_DOCUMENTS: Readonly<Record<PortalLegalDocumentType, PortalLegalDocument>> = {
    PortalTerms: PORTAL_TERMS_DOCUMENT,
    PortalPrivacy: PORTAL_PRIVACY_DOCUMENT
};

/** Belgeler sayfada bu sırayla gösterilir (kabul adımı ve alt bilgi bağlantıları). */
export const PORTAL_LEGAL_DOCUMENT_ORDER: readonly PortalLegalDocumentType[] = ['PortalTerms', 'PortalPrivacy'];

/** "0.x" sürüm taslaktır (ADR-029 madde 2). */
export function isDraftPortalLegalVersion(version: string): boolean {
    return version.trim().startsWith('0.');
}

/** Sürüm satırı; sürüm backend'den gelir, yüklenmediyse yalnız durum kısmı. */
export function portalLegalVersionLine(doc: PortalLegalDocument, version: string | null): string {
    if (!version) {
        return doc.statusLine;
    }

    return `Sürüm: ${version}${isDraftPortalLegalVersion(version) ? ' (taslak)' : ''} · ${doc.statusLine}`;
}
