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
