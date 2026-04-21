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
    cancelledAppointmentExamCreateHint: 'Bu işlem sadece aktif randevu akışlarında kullanılabilir.'
} as const;
