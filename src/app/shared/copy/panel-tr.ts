/**
 * Panel ürün dili — sabit metinler (i18n altyapısı olmadan tek dil).
 * Listelerde tekrarlayan boş/hint metinleri buradan kullanın.
 */
export const PANEL_COPY = {
    listEmptyMessage: 'Kayıt bulunamadı.',
    listEmptyHint: 'Arama veya filtreleri değiştirerek tekrar deneyin.',
    loadingDefault: 'Yükleniyor…',
    filterPlaceholderAll: 'Tümü',
    buttonSearch: 'Ara',
    buttonClear: 'Temizle',
    buttonSave: 'Kaydet',
    buttonCancel: 'İptal',
    buttonDetail: 'Detay',
    buttonRefresh: 'Yenile',
    labelClient: 'Müşteri',
    labelPet: 'Hayvan',
    /** Dashboard — klinik bağlamı yokken */
    dashboardNeedClinicMessage: 'Önce bir klinik seçmelisiniz.',
    dashboardNeedClinicHint:
        'Özet, randevu, finans ve listeler seçili klinik üzerinden yüklenir. Devam etmek için bir klinik seçin.',
    dashboardQuickActionsTitle: 'Hızlı işlemler',
    dashboardContextFootnote: 'Veriler seçili klinik bağlamındadır; bugünkü randevular yerel güne göredir.',
    cancelledAppointmentExamCreateBlocked: 'İptal edilmiş randevu için muayene oluşturulamaz.',
    cancelledAppointmentExamCreateHint: 'Bu işlem sadece aktif randevu akışlarında kullanılabilir.',
    /** Raporlar — Faz 6C + 6D */
    reportsNavGroup: 'Raporlar',
    /** Ortak rapor araç çubuğu / tablo / dışa aktarma (Faz 6D) */
    reportsFilterDateFrom: 'Tarih (Başlangıç)',
    reportsFilterDateTo: 'Tarih (Bitiş)',
    reportsFilterClinic: 'Klinik',
    reportsFilterSearch: 'Arama',
    reportsClinicPanelDefault: 'Panel seçili klinik',
    reportsLoadingMessage: 'Rapor yükleniyor…',
    reportsLoadErrorFallback: 'Yükleme hatası',
    reportsExportCsv: 'CSV Dışa Aktar',
    reportsExportXlsx: 'Excel Dışa Aktar',
    reportsTotalRecords: 'Toplam kayıt',
    reportsColClinic: 'Klinik',
    reportsColNotes: 'Not',
    reportsColPrimaryLocalTime: 'Zaman (yerel)',
    paymentsReportTitle: 'Ödeme Hareketleri',
    paymentsReportDescription: 'Klinik içi ödeme hareketlerini izleyin ve raporu dışa aktarın.',
    paymentsReportDefaultPeriodHint:
        'Tarih seçmezseniz ayın başından bugüne kadar olan ödeme hareketleri gösterilir.',
    paymentsReportTotalAmount: 'Toplam tahsilat',
    paymentsReportColMethod: 'Ödeme Yöntemi',
    paymentsReportSearchPlaceholder: 'Müşteri, hayvan, not veya para birimi ile ara…',
    paymentsReportEmptyMessage: 'Bu filtrelerde tahsilat hareketi bulunamadı.',
    paymentsReportEmptyHint: 'Tarih aralığını veya diğer filtreleri genişletip tekrar deneyin.',
    /** Raporlar — Faz 6C.2 */
    appointmentsReportTitle: 'Randevu Raporu',
    appointmentsReportDescription: 'Filtreli randevu listesini görüntüleyin; okunur alanlarla CSV/Excel olarak dışa aktarın.',
    appointmentsReportDefaultPeriodHint:
        'Tarih seçmezseniz ayın başından bugüne kadar olan randevular gösterilir; klinik filtresi boşsa panelde seçili klinik kullanılır.',
    appointmentsReportColStatus: 'Durum',
    appointmentsReportSearchPlaceholder: 'Not; müşteri, hayvan, tür veya ırk metni…',
    appointmentsReportEmptyMessage: 'Bu filtrelerde randevu bulunamadı.',
    appointmentsReportEmptyHint: 'Tarih aralığını veya diğer filtreleri genişletip tekrar deneyin.',
    /** Raporlar — Faz 6C.3 */
    examinationsReportTitle: 'Muayene Raporu',
    examinationsReportDescription: 'Filtreli muayene listesini görüntüleyin; CSV veya Excel ile dışa aktarın.',
    examinationsReportDefaultPeriodHint:
        'Tarih seçmezseniz ayın başından bugüne kadar olan muayeneler gösterilir; klinik filtresi boşsa panelde seçili klinik kullanılır.',
    examinationsReportColLinkedAppointment: 'Bağlı randevu',
    examinationsReportColVisitReason: 'Geliş nedeni',
    examinationsReportColAssessment: 'Değerlendirme',
    examinationsReportLinkedAppointment: 'Randevu detayı',
    examinationsReportNoAppointment: 'Bağlı değil',
    examinationsReportSearchPlaceholder: 'Sebep, bulgu, değerlendirme, not; müşteri, hayvan, tür veya ırk metni…',
    examinationsReportEmptyMessage: 'Bu filtrelerde muayene bulunamadı.',
    examinationsReportEmptyHint: 'Tarih aralığını veya diğer filtreleri genişletip tekrar deneyin.',
    /** Raporlar — Faz 6C.4 */
    vaccinationsReportTitle: 'Aşı Raporu',
    vaccinationsReportDescription: 'Filtreli aşı listesini görüntüleyin; CSV veya Excel ile dışa aktarın.',
    vaccinationsReportDefaultPeriodHint:
        'Tarih seçmezseniz ayın başından bugüne kadar olan aşı kayıtları gösterilir; klinik filtresi boşsa panelde seçili klinik kullanılır. Rapor tarihi sütunu, backend’in belirlediği etkin kayıt anını yerel saatle gösterir.',
    vaccinationsReportColVaccinationDate: 'Rapor tarihi',
    vaccinationsReportColVaccineName: 'Aşı adı',
    vaccinationsReportColStatus: 'Durum',
    vaccinationsReportColAppliedAt: 'Uygulama (yerel)',
    vaccinationsReportColNextDue: 'Sonraki (yerel)',
    vaccinationsReportSearchPlaceholder: 'Aşı adı, not; müşteri, hayvan, tür veya ırk metni…',
    vaccinationsReportEmptyMessage: 'Bu filtrelerde aşı kaydı bulunamadı.',
    vaccinationsReportEmptyHint: 'Tarih aralığını veya diğer filtreleri genişletip tekrar deneyin.',
    /** Kiracı — rol yetki matrisi (salt okunur) */
    tenantRoleMatrixNavTitle: 'Hesap',
    tenantRoleMatrixTitle: 'Rol yetki matrisi',
    tenantRoleMatrixDescription:
        'Kurumda atanabilen rollere bağlı permission’ların özeti; salt okunur. Değişiklikler sunucu kurallarıyla yapılır.',
    tenantRoleMatrixLoading: 'Rol yetki matrisi yükleniyor…',
    tenantRoleMatrixLoadError: 'Rol yetki matrisi yüklenemedi.',
    tenantRoleMatrixEmptyMessage: 'Gösterilecek rol veya yetki satırı yok.',
    tenantRoleMatrixEmptyHint: 'Backend boş yanıt döndürdü veya bu kurum için tanım yok.',
    tenantRoleMatrixColRole: 'Rol',
    tenantRoleMatrixColPermissions: 'Yetkiler',
    tenantRoleMatrixBackMembers: 'Üye listesine dön',
    tenantMemberSelfProfileHint:
        'Bu kayıt sizin hesabınıza ait. Rol ve klinik değişiklikleri bu ekrandan yapılamaz; başka bir yönetici ilgili işlemleri yapmalıdır.',
    /** Kurum daveti — `tenant-invite-status.utils` lifecycle etiketleri (ham status / enum sayısı yerine). */
    tenantInviteStatusPending: 'Bekliyor',
    tenantInviteStatusSent: 'Gönderildi',
    tenantInviteStatusAccepted: 'Kabul edildi',
    tenantInviteStatusCancelled: 'İptal edildi',
    tenantInviteStatusExpired: 'Süresi doldu',
    tenantInviteStatusDeclined: 'Reddedildi',
    /** Backend `Revoked` (2) — panelde “iptal edilmiş davet” anlamıyla. */
    tenantInviteStatusRevoked: 'İptal edildi',
    tenantInviteStatusUnknown: 'Bilinmeyen durum'
} as const;
