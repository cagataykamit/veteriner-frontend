/**
 * Backend ile hizalı operation claim sabitleri (tenant yönetim yüzeyi).
 * @see Tenants.InviteCreate — davet + üye yönetimi guard/menü/CTA
 */
export const TENANT_MANAGEMENT_CLAIM = 'Tenants.InviteCreate' as const;

/** Abonelik özeti (okuma) */
export const SUBSCRIPTIONS_READ_CLAIM = 'Subscriptions.Read' as const;

/** Paket değişimi, checkout, bekleyen plan — yazma */
export const SUBSCRIPTIONS_MANAGE_CLAIM = 'Subscriptions.Manage' as const;
