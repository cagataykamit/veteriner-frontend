/**
 * Backend ile hizalı operation claim sabitleri (tenant yönetim yüzeyi).
 * @see Tenants.InviteCreate — davet + üye yönetimi guard/menü/CTA
 */
export const TENANT_MANAGEMENT_CLAIM = 'Tenants.InviteCreate' as const;

/** Abonelik özeti (okuma) */
export const SUBSCRIPTIONS_READ_CLAIM = 'Subscriptions.Read' as const;

/** Paket değişimi, checkout, bekleyen plan — yazma */
export const SUBSCRIPTIONS_MANAGE_CLAIM = 'Subscriptions.Manage' as const;

/** Yeni klinik oluşturma (panel `settings/clinics/new`) */
export const CLINICS_CREATE_CLAIM = 'Clinics.Create' as const;

/** Klinik okuma (çalışma saatleri GET vb.) */
export const CLINICS_READ_CLAIM = 'Clinics.Read' as const;

/** Klinik güncelleme (profil PUT, çalışma saatleri PUT) */
export const CLINICS_UPDATE_CLAIM = 'Clinics.Update' as const;
