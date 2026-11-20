/**
 * Panel ürün dili — sabit metinler (i18n altyapısı olmadan tek dil).
 * Listelerde tekrarlayan boş/hint metinleri buradan kullanın.
 *
 * Terim sözlüğü (H10): kayıt düğmesi "Kaydet" ("Güncelle" yok); formdan ve diyalogdan çıkış "Vazgeç", kaydın iptali
 * "… iptal et"; "Ödeme al"; hayvan kaydı "Hasta", sahibi "Müşteri" (portal hasta sahibine kendi diliyle konuşur);
 * düğme ve başlıklar cümle düzeninde ("Yeni müşteri"); "(isteğe bağlı)"; para birimi "₺"; "Pasife al".
 */
export const PANEL_COPY = {
    listEmptyMessage: 'Kayıt bulunamadı.',
    listEmptyHint: 'Arama veya filtreleri değiştirerek tekrar deneyin.',
    /** Liste boş ve filtre/arama uygulanmış (`app-list-empty-state`) */
    listFilteredEmptyMessage: 'Bu aramaya uyan kayıt yok.',
    listFilteredEmptyHint: 'Filtreleri temizleyerek tüm kayıtları görebilirsiniz.',
    buttonClearFilters: 'Filtreleri temizle',
    /** `settings/clinics` — API scope’a göre liste boş olabilir */
    clinicsListEmptyMessage: 'Görüntüleme yetkiniz olan klinik bulunmuyor.',
    clinicsListEmptyHint: 'Atama veya ek yetki için kurum yöneticinize başvurun.',
    loadingDefault: 'Yükleniyor…',
    filterPlaceholderAll: 'Tümü',
    buttonSearch: 'Ara',
    buttonClear: 'Temizle',
    buttonSave: 'Kaydet',
    buttonCancel: 'Vazgeç',
    buttonDetail: 'Detay',
    buttonRefresh: 'Yenile',
    labelClient: 'Müşteri',
    labelPet: 'Hasta',
    /** Ara sekmesi ve global arama — müşteri ve hastayı birlikte açan kayıt */
    newClientPetRegistration: 'Yeni kayıt: müşteri ve hasta',
    cancelledAppointmentExamCreateBlocked: 'İptal edilmiş randevu için muayene oluşturulamaz.',
    noShowAppointmentExamCreateBlocked: 'Gelmedi işaretli randevu için muayene oluşturulamaz. Hasta geldiyse önce geliş kaydı açın veya gelmedi işaretini geri alın.',
    cancelledAppointmentExamCreateHint: 'Bu işlem sadece aktif randevu akışlarında kullanılabilir.',
    /** Raporlar — panel */
    reportsFilterDateFrom: 'Başlangıç tarihi',
    reportsFilterDateTo: 'Bitiş tarihi',
    reportsFilterClinic: 'Klinik',
    reportsFilterSearch: 'Arama',
    /** Rapor filtreleri — tarih aralığı uyarısı */
    reportsDateRangeBothRequired: 'Başlangıç ve bitiş tarihi birlikte seçilmelidir.',
    reportsClinicPanelDefault: 'Panel seçili klinik',
    reportsLoadingMessage: 'Rapor yükleniyor…',
    reportsLoadErrorFallback: 'Rapor verileri yüklenemedi.',
    /** Tüm raporlarda süzgeç değişince sonuç kendiliğinden yenilenir (kayıt defterleri ve gün sonundaki Filtrele düğmesi isteğe bağlıdır). */
    reportsFixFilterHint: 'Filtreleri (ör. tarih aralığını) düzeltin; sonuç kendiliğinden yenilenir.',
    /** Kayıt defterleri */
    registerPeriodHint: 'Tarih aralığını seçip Filtrele düğmesine basın. Defterler en çok 366 günlük aralıkla okunur.',
    registerFormatUnverified: 'Resmî defter biçimine uygunluk doğrulanmamıştır; yasal gereklilikler için mevzuatı kontrol edin.',
    registerPrint: 'Yazdır',
    registerRecordCount: 'kayıt',
    registerSignature: 'Veteriner Hekim imza/kaşe',
    registerDateRange: 'Tarih aralığı',
    registerPrintedAt: 'Yazdırma',
    registerEmptyMessage: 'Bu aralıkta kayıt bulunamadı.',
    registerEmptyHint: 'Tarih aralığını veya kliniği değiştirip tekrar deneyin.',
    registerFilterProduct: 'Ürün',
    registerFilterVeterinarian: 'Veteriner',
    reportsApplyFilter: 'Filtrele',
    reportsExportCsv: 'CSV indir',
    reportsExportXlsx: 'Excel indir',
    reportsExportPdf: 'PDF indir',
    /** Rapor Merkezi favorileri (REPORT-003) */
    reportsFavoritesSection: 'Favoriler',
    reportsFavoriteAdd: 'Favorilere ekle',
    reportsFavoriteRemove: 'Favorilerden çıkar',
    reportsFavoriteSaveFailed: 'Favori kaydedilemedi; tekrar deneyin.',
    /** Kayıtlı filtreler (REPORT-004) */
    reportsSavedFilters: 'Kayıtlı filtreler',
    reportsSavedFiltersPlaceholder: 'Kayıtlı filtre seçin',
    reportsSavedFilterSave: 'Filtreyi kaydet',
    reportsSavedFilterDelete: 'Kayıtlı filtreyi sil',
    reportsSavedFilterNameLabel: 'Filtre adı',
    reportsSavedFilterNamePlaceholder: 'Ör. Nakit tahsilatlar',
    reportsSavedFilterDialogHint: 'Klinik, arama ve rapora özgü filtreler kaydedilir; tarih aralığı kaydedilmez, uygulandığında ekrandaki dönem korunur.',
    reportsSavedFilterEmptySet: 'Kaydedilecek filtre yok; önce klinik, arama veya rapora özgü bir filtre seçin.',
    reportsSavedFilterFailed: 'Kayıtlı filtre işlemi tamamlanamadı.',
    reportsSavedFilterDeleteConfirm: 'kayıtlı filtresi silinsin mi?',
    /** Randevu takviminde kayıtlı filtreler (APPT-026; rapor kayıtlı filtreleriyle aynı depo) */
    calendarSavedFilterNamePlaceholder: 'Ör. Gecikmiş aşılar',
    calendarSavedFilterDialogHint: 'Hekim, tür ve durum filtreleri kaydedilir; gün ve görünüm kaydedilmez, uygulandığında ekrandaki tarih korunur.',
    calendarSavedFilterEmptySet: 'Kaydedilecek filtre yok; önce hekim, tür veya durum filtresi seçin.',
    /** Randevu talepleri listesinde kayıtlı filtreler (APPT-026) */
    appointmentRequestsSavedFilterNamePlaceholder: 'Ör. Reddedilenler',
    appointmentRequestsSavedFilterDialogHint: 'Durum filtresi kaydedilir; uygulandığında liste ilk sayfadan açılır.',
    reportsExportResponseEmpty: 'İndirilecek dosya oluşturulamadı.',
    reportsExportFailedFallback: 'Dışa aktarma işlemi tamamlanamadı.',
    reportsTotalRecords: 'Toplam kayıt',
    reportsColClinic: 'Klinik',
    reportsColNotes: 'Not',
    reportsColPrimaryLocalTime: 'Zaman',
    paymentsReportTitle: 'Ödeme hareketleri',
    paymentsReportDescription: 'Tahsilat hareketlerini tarih, klinik ve ödeme yöntemine göre inceleyin.',
    paymentsReportDefaultPeriodHint:
        'Başlangıç ve bitiş tarihi seçmezseniz ayın başından bugüne kadar olan tahsilatlar gösterilir.',
    paymentsReportTotalAmount: 'Toplam tahsilat',
    paymentsReportColMethod: 'Ödeme yöntemi',
    paymentsReportSearchPlaceholder: 'Müşteri, hasta, not veya para birimi ile ara…',
    paymentsReportEmptyMessage: 'Rapor kaydı bulunamadı.',
    paymentsReportEmptyHint: 'Seçili filtrelere uygun kayıt yok. Tarih aralığını veya diğer filtreleri değiştirip tekrar deneyin.',
    appointmentsReportTitle: 'Randevu hareketleri',
    appointmentsReportDescription: 'Randevuları tarih, durum ve klinik bilgisine göre takip edin.',
    appointmentsReportDefaultPeriodHint:
        'Başlangıç ve bitiş tarihi seçmezseniz ayın başından bugüne kadar olan randevular gösterilir. Klinik seçmezseniz panelde seçili klinik kullanılır.',
    appointmentsReportColStatus: 'Durum',
    appointmentsReportSearchPlaceholder: 'Not; müşteri, hasta, tür veya ırk metni…',
    appointmentsReportEmptyMessage: 'Rapor kaydı bulunamadı.',
    appointmentsReportEmptyHint: 'Seçili filtrelere uygun kayıt yok. Tarih aralığını veya diğer filtreleri değiştirip tekrar deneyin.',
    examinationsReportTitle: 'Muayene raporu',
    examinationsReportDescription: 'Muayene kayıtlarını tarih, klinik ve arama kriterlerine göre görüntüleyin.',
    examinationsReportDefaultPeriodHint:
        'Başlangıç ve bitiş tarihi seçmezseniz ayın başından bugüne kadar olan muayeneler gösterilir. Klinik seçmezseniz panelde seçili klinik kullanılır.',
    examinationsReportColLinkedAppointment: 'Bağlı randevu',
    examinationsReportColVisitReason: 'Geliş nedeni',
    examinationsReportColAssessment: 'Değerlendirme',
    examinationsReportLinkedAppointment: 'Randevu detayı',
    examinationsReportNoAppointment: 'Bağlı değil',
    examinationsReportSearchPlaceholder: 'Sebep, bulgu, değerlendirme, not; müşteri, hasta, tür veya ırk metni…',
    examinationsReportEmptyMessage: 'Rapor kaydı bulunamadı.',
    examinationsReportEmptyHint: 'Seçili filtrelere uygun kayıt yok. Tarih aralığını veya diğer filtreleri değiştirip tekrar deneyin.',
    vaccinationsReportTitle: 'Aşı raporu',
    vaccinationsReportDescription: 'Uygulanan ve planlanan aşı kayıtlarını tarih, durum ve klinik bilgisine göre takip edin.',
    vaccinationsReportDefaultPeriodHint:
        'Başlangıç ve bitiş tarihi seçmezseniz ayın başından bugüne kadar olan kayıtlar gösterilir. Klinik seçmezseniz panelde seçili klinik kullanılır. Planlanan aşılar plan tarihine, uygulanan aşılar uygulama tarihine göre raporlanır.',
    vaccinationsReportColVaccinationDate: 'Rapor tarihi',
    vaccinationsReportColVaccineName: 'Aşı adı',
    vaccinationsReportColStatus: 'Durum',
    vaccinationsReportColAppliedAt: 'Uygulama zamanı',
    vaccinationsReportColNextDue: 'Sonraki doz',
    vaccinationsReportSearchPlaceholder: 'Aşı adı, not; müşteri, hasta, tür veya ırk metni…',
    vaccinationsReportEmptyMessage: 'Rapor kaydı bulunamadı.',
    vaccinationsReportEmptyHint: 'Seçili filtrelere uygun kayıt yok. Tarih aralığını veya diğer filtreleri değiştirip tekrar deneyin.',
    outstandingBalancesReportTitle: 'Borç raporu',
    outstandingBalancesReportDescription: 'Müşterilerin şu anki kalan borcunu, en yüksek tutardan başlayarak inceleyin.',
    outstandingBalancesReportPeriodHint:
        'Şu anki kalan tutarı gösterir; geçmiş bir tarihe göre borç gösterilmez. Eski ödemeler ücretlere bağlanmadıkça borçtan düşülmez.',
    outstandingBalancesReportTotalAmount: 'Toplam borç',
    outstandingBalancesReportTotalCount: 'Borçlu müşteri',
    outstandingBalancesReportMinAmount: 'En az tutar (₺)',
    outstandingBalancesReportColOutstanding: 'Kalan tutar',
    outstandingBalancesReportColOpenCharges: 'Açık ücret',
    outstandingBalancesReportColOldest: 'En eski açık ücret',
    outstandingBalancesReportCharges: 'Ücretler',
    outstandingBalancesReportSearchPlaceholder: 'Müşteri adı, telefon veya e-posta ile ara…',
    outstandingBalancesReportEmptyMessage: 'Borçlu müşteri bulunamadı.',
    outstandingBalancesReportEmptyHint: 'Seçili filtrelere uygun açık bakiye yok. En az tutarı veya aramayı değiştirip tekrar deneyin.',
    /** Kiracı — rol yetki matrisi (salt okunur) */
    tenantRoleMatrixTitle: 'Rol Yetki Özeti',
    tenantRoleMatrixDescription:
        'Bu ekran salt okunur bir özet görünümüdür. Rollerin hangi işlere izin verdiğini gösterir; buradan değiştirilemez.',
    tenantRoleMatrixLoading: 'Rol Yetki Özeti yükleniyor…',
    tenantRoleMatrixLoadError: 'Rol Yetki Özeti yüklenemedi.',
    tenantRoleMatrixEmptyMessage: 'Bu rol için ayrı yetki bağı tanımlı değil.',
    tenantRoleMatrixEmptyHint: 'Bu ortamda rol yetki bağları tanımlı değil veya henüz uygulanmamış olabilir.',
    tenantRoleMatrixGlobalInfo:
        'Bu ekran yalnızca bilgilendirme amaçlıdır. Rollerin izinleri Vetinity tarafından tanımlanır ve buradan değiştirilemez.',
    tenantRoleMatrixTotalPrefix: 'Toplam',
    tenantRoleMatrixTotalSuffix: 'yetki',
    tenantRoleMatrixGroupOther: 'Diğer',
    tenantRoleMatrixColRole: 'Rol',
    tenantRoleMatrixColPermissions: 'Yetkiler',
    tenantRoleMatrixBackMembers: 'Üye listesine dön',
    /** Üye detayı — roller ve birleşik yetki özeti (salt okunur) */
    tenantMemberRolesSectionTitle: 'Roller ve yetki özeti',
    tenantMemberSummaryRolesPart: 'rol atanmış',
    tenantMemberSummaryUniquePermsPart: 'benzersiz yetki',
    tenantMemberSummaryGroupsPart: 'yetki grubu',
    tenantMemberViewPermissionSummaryButton: 'Yetki özetini görüntüle',
    tenantMemberMatrixForSummaryError:
        'Yetki özeti için rol matrisi yüklenemedi; özet sayıları eksik veya boş olabilir.',
    tenantMemberPermissionDialogTitle: 'Yetki Özeti',
    tenantMemberPermissionDialogHint:
        'Aşağıda bu kullanıcıya atanmış tüm rollerden gelen etkili yetkiler birleştirilmiş ve tekilleştirilmiş olarak gösterilir.',
    tenantMemberPermissionDialogAssignedRoles: 'Bu kullanıcıya atanmış roller',
    tenantMemberPermissionDialogGroupsTitle: 'Yetki grupları',
    tenantMemberPermissionDialogAccordionHint: 'Gruplar varsayılan kapalıdır; görmek istediğiniz grubu açın.',
    tenantMemberPermissionDialogEmpty:
        'Bu üyenin rolleri için tanımlı yetki bulunamadı veya matriste eşleşen satır yok.',
    tenantMemberSelfProfileHint:
        'Bu kayıt sizin hesabınıza ait. Rol ve klinik değişiklikleri bu ekrandan yapılamaz; başka bir yönetici ilgili işlemleri yapmalıdır.',
    /** Kurum daveti — `tenant-invite-status.utils` lifecycle etiketleri (ham status / enum sayısı yerine). */
    tenantInviteStatusPending: 'Bekliyor',
    tenantInviteStatusSent: 'Gönderildi',
    tenantInviteStatusAccepted: 'Kabul edildi',
    tenantInviteStatusAcceptedMembershipRemoved: 'Kabul edildi — Üyelikten çıkarıldı',
    tenantInviteStatusCancelled: 'İptal edildi',
    tenantInviteStatusExpired: 'Süresi doldu',
    tenantInviteStatusDeclined: 'Reddedildi',
    /** Backend `Revoked` (2) — panelde “iptal edilmiş davet” anlamıyla. */
    tenantInviteStatusRevoked: 'İptal edildi',
    tenantInviteStatusUnknown: 'Bilinmeyen durum',
    /** Aşı formu — katalog seçimi (FAZ 14C) */
    vaccinationFieldVaccine: 'Aşı',
    vaccinationVaccinePlaceholder: 'Aşı seçin',
    vaccinationVaccineDefinitionsLoadError: 'Aşı listesi yüklenemedi. Yetkinizi kontrol edin.',
    vaccinationVaccineDefinitionRequired: 'Aşı seçimi zorunludur.',
    vaccinationLegacyVaccineDefinitionHint:
        'Bu eski kayıt katalogla eşleşmemiş olabilir. Güncellemek için aşı seçiniz.'
} as const;

/**
 * Rapor Merkezi ana ekranı (ADR-052, tasarım B · Sorular): soru başlıkları, sıklık etiketleri, kart ve "Bakmanız gerekenler" metinleri.
 * Soru ve sıklık metinleri ürün sahibinin onayladığı taslaktaki gibidir (`design/raporlar/B.html`).
 */
export const REPORT_HUB_COPY = {
    pageDescription: 'Ne öğrenmek istiyorsunuz? Soruyu bulun; cevabı veren rapor ve özet sayısı yanında.',
    periodGroupLabel: 'Dönem',
    periods: { today: 'Bugün', week: 'Bu hafta', month: 'Bu ay' },
    /** Kart sayısının yanında dönemin adı (küçük harf). */
    periodWhen: { today: 'bugün', week: 'bu hafta', month: 'bu ay' },
    now: 'şu an',
    compareWith: { today: 'dün aynı saate göre', week: 'geçen haftaya göre', month: 'geçen aya göre' },
    searchPlaceholder: 'Rapor adıyla bul',
    favoritesLabel: 'Favoriler:',
    favoritesEmpty: 'Bir raporu ☆ ile işaretleyin; burada kısayol olarak durur.',
    loadError: 'Özet sayılar yüklenemedi; raporlar yine açılabilir.',
    questions: {
        cash: { title: 'Bugünün kasası tuttu mu?', cadence: 'Her akşam' },
        period: { title: 'Bu dönem nasıl geçti?', cadence: 'Ay sonu' },
        collections: { title: 'Para hangi yolla geldi?', cadence: 'Haftalık' },
        outstanding: { title: 'Kimin bize borcu var?', cadence: 'Haftalık' },
        appointments: { title: 'Randevular boşa gidiyor mu?', cadence: 'Haftalık' },
        clinical: { title: 'Klinikte ne kadar iş yaptık?', cadence: 'Haftalık' },
        hbs: { title: "HBS'e girilmemiş kayıt kaldı mı?", cadence: 'Haftalık' },
        registers: { title: 'Denetim gelse defterler hazır mı?', cadence: 'Denetimde' }
    },
    units: {
        collected: 'tahsilat',
        turnover: 'ciro',
        outstanding: 'açık alacak',
        appointments: 'randevu',
        examinations: 'muayene',
        vaccinesApplied: 'aşı uygulandı',
        hbsPending: 'kayıt bekliyor',
        registers: 'yasal defter'
    },
    figures: {
        unchargedWork: (n: number) => `${n} iş`,
        unchargedWorkTail: ' ücreti kapanmadı',
        mainRegister: (amount: string) => `Ana kasa ${amount}`,
        payments: (n: number) => `${n} ödeme`,
        clients: (n: number) => `${n} müşteri`,
        highest: (amount: string) => `en yüksek ${amount}`,
        noShow: (n: number) => `${n} Gelmedi`,
        share: (percent: number) => `(%${percent})`,
        vaccinesApplied: (n: number) => `${n} aşı uygulandı`,
        vaccinesPlanned: (n: number) => `${n} planlı`,
        hbsSplit: (prescriptions: number, vaccinations: number) => `${prescriptions} reçete · ${vaccinations} aşı`,
        registersHint: 'Tarih aralığı seçip yazdırın ya da Excel/PDF alın',
        trend: 'Eğilim',
        split: 'Ödeme yollarına göre dağılım'
    },
    paymentMethods: { Card: 'Kart', Cash: 'Nakit', Transfer: 'Havale' },
    attention: {
        title: 'Bakmanız gerekenler',
        openList: 'Listeyi aç',
        hbsPrescriptions: (n: number) => `${n} reçete HBS'e (e-Reçete) girilmemiş`,
        hbsPrescriptionsSource: 'HBS takibi — reçeteler',
        hbsVaccinations: (n: number) => `${n} aşı HBS'e (ATS) girilmemiş`,
        hbsVaccinationsSource: 'HBS takibi — aşılar',
        oldest: (days: number) => (days === 0 ? 'En eskisi bugün' : `En eskisi ${days} gün önce`),
        endOfDay: (n: number) => `${n} işin ücreti bugün kapanmadı`,
        endOfDayHint: 'Gün kapanmadan bakın · Gün sonu',
        endOfDayAction: 'Gün sonunu aç',
        overdueVaccinations: (n: number) => `${n} aşının zamanı geçti`,
        overdueVaccinationsHint: 'Sahiplerine hatırlatın · Aşılar',
        lowStock: (n: number) => `${n} üründe stok asgari seviyenin altında`,
        lowStockHint: 'Sipariş zamanı · Stok durumu'
    },
    /** Rapor adıyla aramada ad ve açıklamaya ek anahtar kelimeler (rapor anahtarına göre). */
    keywords: {
        performance: 'ciro gelir kâr hacim karşılaştırma yönetici',
        'clinics-overview': 'şube karşılaştırma zincir',
        appointments: 'gelmedi iptal doluluk randevu',
        examinations: 'muayene hekim veteriner tanı',
        vaccinations: 'aşı karma kuduz hatırlatma planlanan geciken',
        'end-of-day': 'kapanış kasa sayım günlük tahsilat',
        'cash-registers': 'kasa nakit aktarım giriş çıkış',
        payments: 'tahsilat pos kart nakit havale mutabakat',
        'outstanding-balances': 'borç alacak veresiye açık hesap',
        'registers.examinations': 'defter yasal denetim yazdır',
        'registers.prescriptions': 'reçete defter yasal denetim',
        'registers.vaccines': 'aşı stok seri son kullanma fatura firma',
        'registers.medications': 'ilaç stok fatura firma seri',
        'registers.controlled-substances': 'narkotik psikotropik ketamin sarf yeşil reçete',
        'registers.vaccine-info': 'aşı seri hasta ürün tutar',
        'registers.hbs-prescriptions': 'hbs e-reçete erecete bakanlık girilmemiş',
        'registers.hbs-vaccinations': 'hbs ats aşı belge seri bakanlık girilmemiş'
    } as Readonly<Record<string, string>>
} as const;
