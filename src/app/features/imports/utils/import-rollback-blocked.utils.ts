import { appointmentTypeLabel } from '@/app/entities/appointment/utils/appointment-type.utils';
import type { ImportRollbackBlockedItemDto, ImportRollbackEntity } from '@/app/features/imports/models/import-api.model';
import { IMPORT_TABLE_LABELS, ROLLBACK_ENTITY_LABELS, rollbackReasonLabel } from '@/app/features/imports/utils/import-labels.utils';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';

/** Geri almada kalan kayıtların bir geri alma birimi (müşteri ve zinciri ya da ürün); sıra sunucudan gelir (§7.11). */
export interface RollbackBlockedGroup {
    key: string;
    items: ImportRollbackBlockedItemDto[];
}

/** Ardışık aynı `groupId`'li öğeleri bir araya toplar; eski sunucuda (grup yok) her öğe kendi grubudur. */
export function rollbackBlockedGroups(items: readonly ImportRollbackBlockedItemDto[]): RollbackBlockedGroup[] {
    const groups: RollbackBlockedGroup[] = [];
    const byKey = new Map<string, RollbackBlockedGroup>();

    for (const item of items) {
        const key = item.groupId ?? `${item.entity}:${item.id}:${item.rowNumber}`;
        let group = byKey.get(key);

        if (!group) {
            group = { key, items: [] };
            byKey.set(key, group);
            groups.push(group);
        }

        group.items.push(item);
    }

    return groups;
}

/**
 * Kaydın başlığı: müşteri adı, hasta adı, randevu tarihi ve türü, aşı adı… Kayıt bilgisi yoksa (izin yok ya da kayıt
 * silinmiş) dosyadaki satıra düşer.
 */
export function rollbackBlockedTitle(item: ImportRollbackBlockedItemDto): string {
    const r = item.record;
    const fallback = `${ROLLBACK_ENTITY_LABELS[item.entity] ?? item.entity} · ${rollbackBlockedSource(item)}`;

    if (!r) {
        return fallback;
    }

    switch (item.entity) {
        case 'Appointment':
            return r.atUtc ? `${formatUtcIsoAsLocalDateTimeDisplay(r.atUtc)} · ${appointmentTypeLabel(r.kind)} randevusu` : fallback;
        case 'ClinicalRecord':
            return r.name || 'Klinik geçmiş kaydı';
        case 'AccountEntry':
            return r.name || (r.kind === 'Credit' ? 'Tahsilat' : 'Borç kaydı');
        default:
            return r.name || fallback;
    }
}

/** Başlığın altındaki tanıtım: hasta için tür ve sahip; hastaya bağlı kayıtlar için tarih, hasta ve sahip. */
export function rollbackBlockedDetail(item: ImportRollbackBlockedItemDto): string | null {
    const r = item.record;

    if (!r) {
        return null;
    }

    const pet = r.petName ? `${r.petName}${r.species ? ` (${r.species})` : ''}` : null;
    const owner = r.ownerName ? `sahibi ${r.ownerName}` : null;
    let parts: (string | null | undefined)[];

    switch (item.entity) {
        case 'Pet':
            parts = [r.species, owner];
            break;
        case 'Appointment':
            parts = [pet, owner];
            break;
        case 'Vaccination':
            parts = [r.atUtc ? formatUtcIsoAsLocalDateTimeDisplay(r.atUtc).split(' ')[0] : null, pet, owner];
            break;
        case 'ClinicalRecord':
            parts = [dateOnlyText(r.on), pet, owner];
            break;
        case 'AccountEntry':
            parts = [dateOnlyText(r.on), r.ownerName];
            break;
        default:
            parts = [];
    }

    const text = parts.filter(Boolean).join(' · ');

    return text || null;
}

/** Dosyadaki yer (ikincil bilgi): "Randevular, 20655. satır". */
export function rollbackBlockedSource(item: ImportRollbackBlockedItemDto): string {
    return `${IMPORT_TABLE_LABELS[item.table] ?? item.table}, ${item.rowNumber}. satır`;
}

/** Kaydın panel sayfası; klinik kayıt hastada, hesap hareketi müşteride görünür. Kayıt bilgisi yoksa bağlantı yok. */
export function rollbackBlockedLink(item: ImportRollbackBlockedItemDto): string[] | null {
    const r = item.record;

    if (!r) {
        return null;
    }

    switch (item.entity) {
        case 'Client':
            return ['/panel/clients', item.id];
        case 'Pet':
            return ['/panel/pets', item.id];
        case 'Appointment':
            return ['/panel/appointments', item.id];
        case 'Vaccination':
            return ['/panel/vaccinations', item.id];
        case 'Product':
            return ['/panel/products', item.id];
        case 'ClinicalRecord':
            return r.petId ? ['/panel/pets', r.petId] : null;
        case 'AccountEntry':
            return r.clientId ? ['/panel/clients', r.clientId] : null;
        default:
            return null;
    }
}

/**
 * Kalma nedeni, kullanıcının ne yapabileceğini söyleyen cümleyle. Zincir nedenleri ("kalan randevusu yüzünden") aynı
 * gruptaki kayda işaret eder. Kayıt türüne özgü metin yoksa genel etiket.
 */
const REASON_TEXTS: Readonly<Partial<Record<ImportRollbackEntity, Readonly<Record<string, string>>>>> = {
    Appointment: {
        HasVisits: 'Bu randevuya geliş kaydedilmiş. Geliş silinirse randevu da geri alınabilir.',
        HasExaminations: 'Bu randevudan muayene açılmış. Muayene kaldıkça randevu da kalır.',
        AppointmentChanged: 'Randevu aktarmadan sonra değiştirilmiş ya da tamamlanmış; klinikte kullanıldığı için kalır.'
    },
    Pet: {
        HasKeptAppointments: 'Bu hasta, kalan randevusu yüzünden duruyor.',
        HasKeptVaccinations: 'Bu hasta, kalan aşı kaydı yüzünden duruyor.',
        HasVisits: 'Bu hastaya geliş kaydedilmiş; hasta klinikte kullanılıyor.',
        HasExaminations: 'Bu hastanın muayenesi var; hasta klinikte kullanılıyor.',
        HasAppointments: 'Bu hastaya aktarma dışında randevu açılmış.',
        HasOtherVaccinations: 'Bu hastaya aktarma dışında (elle ya da başka aktarmayla) aşı eklenmiş.',
        HasOtherClinicalRecords: 'Bu hastanın başka aktarmadan gelen klinik geçmişi var. Önce o aktarma geri alınmalı.',
        HasCharges: 'Bu hastaya ücret yazılmış.',
        HasPayments: 'Bu hasta için tahsilat alınmış.'
    },
    Client: {
        HasKeptPets: 'Bu müşteri, kalan hastası yüzünden duruyor.',
        ClientModified: 'Müşteri bilgileri aktarmadan sonra düzenlenmiş.',
        HasOtherPets: 'Bu müşteriye aktarma dışında hasta eklenmiş.',
        HasCharges: 'Bu müşteriye ücret yazılmış.',
        HasPayments: 'Bu müşteriden tahsilat alınmış.',
        HasSales: 'Bu müşteriye satış yapılmış.',
        HasOtherAccountEntries: 'Bu müşterinin başka aktarmadan gelen hesap hareketi var. Önce o aktarma geri alınmalı.',
        OpeningBalanceChanged: 'Devir bakiyesine tahsilat bağlanmış ya da ücret iptal edilmiş.'
    },
    Vaccination: {
        LinkedToExamination: 'Bu aşı bir muayeneye bağlanmış.',
        HasAdministration: 'Bu aşıya uygulama kaydı bağlanmış.',
        VaccinationModified: 'Aşı kaydı aktarmadan sonra düzenlenmiş.'
    }
};

export function rollbackBlockedReasonText(entity: ImportRollbackEntity, code: string): string {
    return REASON_TEXTS[entity]?.[code] ?? rollbackReasonLabel(code);
}

function dateOnlyText(value: string | null | undefined): string | null {
    const m = value ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;

    return m ? `${m[3]}.${m[2]}.${m[1]}` : null;
}
