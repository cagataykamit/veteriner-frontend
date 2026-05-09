/**
 * Backend ile hizalı operation claim sabitleri (tenant yönetim yüzeyi).
 * @see Tenants.InviteCreate — davet + üye yönetimi guard/menü/CTA
 */
export const TENANT_MANAGEMENT_CLAIM = 'Tenants.InviteCreate' as const;

/** Abonelik özeti (okuma) */
export const SUBSCRIPTIONS_READ_CLAIM = 'Subscriptions.Read' as const;

/** Paket değişimi, checkout, bekleyen plan — yazma */
export const SUBSCRIPTIONS_MANAGE_CLAIM = 'Subscriptions.Manage' as const;

/** Hatırlatma geçmişi ve ayarlar görüntüleme */
export const REMINDERS_READ_CLAIM = 'Reminders.Read' as const;

/** Hatırlatma ayarları güncelleme */
export const REMINDERS_MANAGE_CLAIM = 'Reminders.Manage' as const;

/** Yeni klinik oluşturma (panel `settings/clinics/new`) */
export const CLINICS_CREATE_CLAIM = 'Clinics.Create' as const;

/** Klinik okuma (çalışma saatleri GET vb.) */
export const CLINICS_READ_CLAIM = 'Clinics.Read' as const;

/** Klinik güncelleme (profil PUT, çalışma saatleri PUT) */
export const CLINICS_UPDATE_CLAIM = 'Clinics.Update' as const;

/** Müşteri modülü okuma/list/detail */
export const CLIENTS_READ_CLAIM = 'Clients.Read' as const;

/** Müşteri oluşturma */
export const CLIENTS_CREATE_CLAIM = 'Clients.Create' as const;

/** Müşteri güncelleme */
export const CLIENTS_UPDATE_CLAIM = 'Clients.Update' as const;

/** Hayvan modülü okuma/list/detail/history */
export const PETS_READ_CLAIM = 'Pets.Read' as const;

/** Hayvan oluşturma */
export const PETS_CREATE_CLAIM = 'Pets.Create' as const;

/** Hayvan güncelleme */
export const PETS_UPDATE_CLAIM = 'Pets.Update' as const;

export const APPOINTMENTS_READ_CLAIM = 'Appointments.Read' as const;
export const APPOINTMENTS_CREATE_CLAIM = 'Appointments.Create' as const;
export const APPOINTMENTS_CANCEL_CLAIM = 'Appointments.Cancel' as const;
export const APPOINTMENTS_COMPLETE_CLAIM = 'Appointments.Complete' as const;
export const APPOINTMENTS_RESCHEDULE_CLAIM = 'Appointments.Reschedule' as const;

export const EXAMINATIONS_READ_CLAIM = 'Examinations.Read' as const;
export const EXAMINATIONS_CREATE_CLAIM = 'Examinations.Create' as const;
export const EXAMINATIONS_UPDATE_CLAIM = 'Examinations.Update' as const;

export const VACCINATIONS_READ_CLAIM = 'Vaccinations.Read' as const;
export const VACCINATIONS_CREATE_CLAIM = 'Vaccinations.Create' as const;
export const VACCINATIONS_UPDATE_CLAIM = 'Vaccinations.Update' as const;

export const PAYMENTS_READ_CLAIM = 'Payments.Read' as const;
export const PAYMENTS_CREATE_CLAIM = 'Payments.Create' as const;
export const PAYMENTS_UPDATE_CLAIM = 'Payments.Update' as const;

export const TREATMENTS_READ_CLAIM = 'Treatments.Read' as const;
export const TREATMENTS_CREATE_CLAIM = 'Treatments.Create' as const;
export const TREATMENTS_UPDATE_CLAIM = 'Treatments.Update' as const;

export const PRESCRIPTIONS_READ_CLAIM = 'Prescriptions.Read' as const;
export const PRESCRIPTIONS_CREATE_CLAIM = 'Prescriptions.Create' as const;
export const PRESCRIPTIONS_UPDATE_CLAIM = 'Prescriptions.Update' as const;

export const LAB_RESULTS_READ_CLAIM = 'LabResults.Read' as const;
export const LAB_RESULTS_CREATE_CLAIM = 'LabResults.Create' as const;
export const LAB_RESULTS_UPDATE_CLAIM = 'LabResults.Update' as const;

export const HOSPITALIZATIONS_READ_CLAIM = 'Hospitalizations.Read' as const;
export const HOSPITALIZATIONS_CREATE_CLAIM = 'Hospitalizations.Create' as const;
export const HOSPITALIZATIONS_UPDATE_CLAIM = 'Hospitalizations.Update' as const;
export const HOSPITALIZATIONS_DISCHARGE_CLAIM = 'Hospitalizations.Discharge' as const;

/** Ürün kategorileri — liste/detay */
export const PRODUCT_CATEGORIES_READ_CLAIM = 'ProductCategories.Read' as const;

/** Ürün kategorisi oluşturma */
export const PRODUCT_CATEGORIES_CREATE_CLAIM = 'ProductCategories.Create' as const;

/** Ürün kategorisi güncelleme */
export const PRODUCT_CATEGORIES_UPDATE_CLAIM = 'ProductCategories.Update' as const;

/** Ürün kategorisi pasifleştirme */
export const PRODUCT_CATEGORIES_DEACTIVATE_CLAIM = 'ProductCategories.Deactivate' as const;

/** Ürün modülü okuma/liste/detay */
export const PRODUCTS_READ_CLAIM = 'Products.Read' as const;

/** Ürün oluşturma */
export const PRODUCTS_CREATE_CLAIM = 'Products.Create' as const;

/** Ürün güncelleme */
export const PRODUCTS_UPDATE_CLAIM = 'Products.Update' as const;

/** Ürün pasifleştirme */
export const PRODUCTS_DEACTIVATE_CLAIM = 'Products.Deactivate' as const;

/** Stok hareketleri okuma */
export const STOCK_MOVEMENTS_READ_CLAIM = 'StockMovements.Read' as const;

/** Stok hareketi oluşturma */
export const STOCK_MOVEMENTS_CREATE_CLAIM = 'StockMovements.Create' as const;
