/**
 * Rol adlarının panelde görünen Türkçe karşılığı (tek yer). API ve izin kontrolleri teknik adı (`Admin`, `ClinicAdmin`, `Veteriner`,
 * `Sekreter`) kullanmaya devam eder; yalnız gösterim çevrilir. Tanınmayan rol adı olduğu gibi gösterilir.
 */
const TENANT_ROLE_LABELS: Readonly<Record<string, string>> = {
    admin: 'İşletme yöneticisi',
    owner: 'İşletme sahibi',
    clinicadmin: 'Klinik yöneticisi',
    veteriner: 'Hekim',
    sekreter: 'Sekreter',
    platformadmin: 'Platform yöneticisi'
};

export function tenantRoleLabel(roleName: string | null | undefined): string {
    const raw = (roleName ?? '').trim();

    return TENANT_ROLE_LABELS[raw.toLowerCase().replace(/[\s_-]+/g, '')] ?? raw;
}
