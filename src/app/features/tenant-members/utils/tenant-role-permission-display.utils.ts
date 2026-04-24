import type { TenantRoleMatrixPermissionVm } from '@/app/features/tenant-members/models/tenant-members-vm.model';

/** İngilizce grup adı → Türkçe panel etiketi (normalize anahtar: küçük harf, boşluksuz). */
const PERMISSION_GROUP_TR: Readonly<Record<string, string>> = {
    appointments: 'Randevular',
    breeds: 'Irklar',
    clients: 'Müşteriler',
    clinics: 'Klinikler',
    dashboard: 'Panel özeti',
    diagnostics: 'Tanılama',
    examinations: 'Muayeneler',
    hospitalizations: 'Yatışlar',
    labresults: 'Laboratuvar',
    outbox: 'Gönderim kuyruğu',
    payments: 'Ödemeler',
    permissions: 'Yetkiler',
    pets: 'Hayvanlar',
    prescriptions: 'Reçeteler',
    roles: 'Roller',
    species: 'Türler',
    subscriptions: 'Abonelik',
    tenants: 'Kurum',
    test: 'Test',
    treatments: 'Tedaviler',
    users: 'Kullanıcılar',
    vaccinations: 'Aşılar'
};

function normGroupKey(raw: string): string {
    return raw
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, '');
}

/**
 * Üye “Yetki Özeti” gibi tenant-facing görünümlerde izin verilen `group` anahtarları (normalize edilmiş).
 * Outbox, Test, Diagnostics ve diğer teknik gruplar burada yok; allowlist dışındakiler gösterilmez.
 */
const TENANT_FACING_PERMISSION_GROUP_KEYS: ReadonlySet<string> = new Set([
    'appointments',
    'breeds',
    'clients',
    'clinics',
    'dashboard',
    'examinations',
    'hospitalizations',
    'labresults',
    'payments',
    'pets',
    'prescriptions',
    'roles',
    'species',
    'subscriptions',
    'tenants',
    'treatments',
    'users',
    'vaccinations'
]);

/** Tenant paneli yetki özetinde gösterilecek matrix permission satırları (grup allowlist). */
export function filterTenantFacingMatrixPermissions(
    permissions: TenantRoleMatrixPermissionVm[]
): TenantRoleMatrixPermissionVm[] {
    return permissions.filter((p) => {
        const raw = p.group?.trim() ?? '';
        if (!raw) {
            return false;
        }
        return TENANT_FACING_PERMISSION_GROUP_KEYS.has(normGroupKey(raw));
    });
}

/**
 * Matrix `group` alanını Türkçe başlığa çevirir.
 * `otherLabel` ile aynı string (ör. “Diğer”) gelirse aynen döner.
 */
export function translatePermissionGroup(raw: string, otherLabel: string): string {
    const t = raw.trim();
    if (!t || t === otherLabel) {
        return otherLabel;
    }
    const k = normGroupKey(t);
    return PERMISSION_GROUP_TR[k] ?? t;
}

function normCodeKey(code: string): string {
    return code.trim().toLowerCase();
}

/**
 * Backend `code` tam eşleşmesi → kullanıcıya gösterilecek Türkçe etiket.
 * Anahtarlar küçük harf normalize edilmiştir.
 */
const PERMISSION_CODE_EXACT_TR: Readonly<Record<string, string>> = {
    'admin.diagnostics': 'Yönetim tanılama',
    'appointments.cancel': 'Randevuyu iptal et',
    'appointments.complete': 'Randevuyu tamamla',
    'appointments.create': 'Randevu oluştur',
    'appointments.read': 'Randevuları görüntüle',
    'appointments.reschedule': 'Randevuyu yeniden planla',
    'breeds.create': 'Irk oluştur',
    'breeds.read': 'Irkları görüntüle',
    'breeds.update': 'Irk bilgilerini güncelle',
    'clients.create': 'Müşteri oluştur',
    'clients.read': 'Müşterileri görüntüle',
    'clinics.create': 'Klinik oluştur',
    'clinics.read': 'Klinikleri görüntüle',
    'clinics.update': 'Klinik bilgilerini güncelle',
    'dashboard.read': 'Panel özetini görüntüle',
    'examinations.create': 'Muayene oluştur',
    'examinations.read': 'Muayeneleri görüntüle',
    'examinations.update': 'Muayene bilgilerini güncelle',
    'hospitalizations.create': 'Yatış oluştur',
    'hospitalizations.discharge': 'Yatışı taburcu et',
    'hospitalizations.read': 'Yatışları görüntüle',
    'hospitalizations.update': 'Yatış bilgilerini güncelle',
    'labresults.create': 'Laboratuvar sonucu oluştur',
    'labresults.read': 'Laboratuvar sonuçlarını görüntüle',
    'labresults.update': 'Laboratuvar sonucunu güncelle',
    'outbox.read': 'Gönderim kuyruğunu görüntüle',
    'outbox.write': 'Gönderim kuyruğunu yönet',
    'payments.create': 'Ödeme oluştur',
    'payments.read': 'Ödemeleri görüntüle',
    'payments.update': 'Ödeme bilgilerini güncelle',
    'permissions.read': 'Yetkileri görüntüle',
    'permissions.write': 'Yetkileri yapılandır',
    'pets.create': 'Hayvan oluştur',
    'pets.read': 'Hayvanları görüntüle',
    'prescriptions.create': 'Reçete oluştur',
    'prescriptions.read': 'Reçeteleri görüntüle',
    'prescriptions.update': 'Reçete bilgilerini güncelle',
    'roles.read': 'Rolleri görüntüle',
    'roles.write': 'Rolleri yapılandır',
    'species.create': 'Tür oluştur',
    'species.read': 'Türleri görüntüle',
    'species.update': 'Tür bilgilerini güncelle',
    'subscriptions.manage': 'Aboneliği yönet',
    'subscriptions.read': 'Aboneliği görüntüle',
    'tenants.create': 'Kurum oluştur',
    'tenants.invitecreate': 'Kuruma kullanıcı daveti oluştur',
    'tenants.read': 'Kurum bilgilerini görüntüle',
    'test.feature.run': 'Test özelliğini çalıştır',
    'test.forbidden.probe': 'Yetkisiz erişim denemesi testi',
    'treatments.create': 'Tedavi oluştur',
    'treatments.read': 'Tedavileri görüntüle',
    'treatments.update': 'Tedavi bilgilerini güncelle',
    'users.read': 'Kullanıcıları görüntüle',
    'users.write': 'Kullanıcıları yönet',
    'vaccinations.create': 'Aşı kaydı oluştur',
    'vaccinations.read': 'Aşıları görüntüle',
    'vaccinations.update': 'Aşı bilgilerini güncelle'
};

/**
 * Chip metni önceliği:
 * 1) Tam `code` → Türkçe tablo
 * 2) Backend `description`
 * 3) Son çare: ham `code`
 * 4) Kod yoksa: `name`
 */
export function permissionDisplayLabel(p: TenantRoleMatrixPermissionVm): string {
    const code = (p.code?.trim() || p.id?.trim() || '').trim();
    if (code) {
        const mapped = PERMISSION_CODE_EXACT_TR[normCodeKey(code)];
        if (mapped) {
            return mapped;
        }
    }
    if (p.description?.trim()) {
        return p.description.trim();
    }
    if (code) {
        return code;
    }
    return p.name?.trim() || '—';
}

/** Tooltip: kullanıcı etiketi + isteğe bağlı açıklama ve teknik kod. */
export function permissionTooltipText(p: TenantRoleMatrixPermissionVm): string {
    const label = permissionDisplayLabel(p);
    const parts: string[] = [label];
    const desc = p.description?.trim();
    if (desc && desc !== label) {
        parts.push(desc);
    }
    const c = p.code?.trim();
    if (c && c !== label) {
        parts.push(`Teknik kod: ${c}`);
    }
    return parts.join('\n\n');
}

/** Matrix ve üye yetki özeti diyaloglarında ortak grup paneli. */
export interface PermissionGroupPanelVm {
    rawKey: string;
    title: string;
    items: TenantRoleMatrixPermissionVm[];
}

export function buildPermissionGroupPanels(
    permissions: TenantRoleMatrixPermissionVm[],
    otherGroupLabel: string
): PermissionGroupPanelVm[] {
    const by = new Map<string, TenantRoleMatrixPermissionVm[]>();
    for (const p of permissions) {
        const rawKey = p.group?.trim() || otherGroupLabel;
        const list = by.get(rawKey) ?? [];
        list.push(p);
        by.set(rawKey, list);
    }
    const displayTitle = (rawKey: string): string =>
        rawKey === otherGroupLabel ? otherGroupLabel : translatePermissionGroup(rawKey, otherGroupLabel);
    const keys = [...by.keys()].sort((a, b) => {
        if (a === otherGroupLabel) {
            return 1;
        }
        if (b === otherGroupLabel) {
            return -1;
        }
        return displayTitle(a).localeCompare(displayTitle(b), 'tr', { sensitivity: 'base' });
    });
    return keys.map((rawKey) => ({
        rawKey,
        title: displayTitle(rawKey),
        items: (by.get(rawKey) ?? [])
            .slice()
            .sort((a, b) =>
                permissionDisplayLabel(a).localeCompare(permissionDisplayLabel(b), 'tr', { sensitivity: 'base' })
            )
    }));
}
