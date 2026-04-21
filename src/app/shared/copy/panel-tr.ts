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
    /** Raporlar — Faz 6C.1 */
    reportsNavGroup: 'Raporlar',
    paymentsReportTitle: 'Tahsilat Hareketleri',
    paymentsReportDescription: 'Klinik içi tahsilat hareketlerini izleyin ve raporu dışa aktarın.',
    paymentsReportDefaultPeriodHint:
        'Tarih seçmezseniz ayın başından bugüne kadar olan tahsilat hareketleri gösterilir.',
    paymentsReportTotalRecords: 'Toplam kayıt',
    paymentsReportTotalAmount: 'Toplam tahsilat',
    paymentsReportExportCsv: 'Tahsilat raporunu indir (CSV)',
    paymentsReportExportXlsx: 'Excel Dışa Aktar',
    paymentsReportClinicPanelDefault: 'Panel seçili klinik',
    paymentsReportColPaidAt: 'Tarih',
    paymentsReportColClinic: 'Klinik',
    paymentsReportColMethod: 'Ödeme Yöntemi',
    paymentsReportColNotes: 'Not',
    paymentsReportSearchPlaceholder: 'Müşteri, hayvan, not veya para birimi ile ara…',
    paymentsReportEmptyMessage: 'Bu filtrelerde tahsilat hareketi bulunamadı.',
    paymentsReportEmptyHint: 'Tarih aralığını veya diğer filtreleri genişletip tekrar deneyin.'
} as const;
