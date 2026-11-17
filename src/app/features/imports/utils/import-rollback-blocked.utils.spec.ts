import type { ImportRollbackBlockedItemDto } from '@/app/features/imports/models/import-api.model';
import {
    rollbackBlockedDetail,
    rollbackBlockedGroups,
    rollbackBlockedLink,
    rollbackBlockedReasonText,
    rollbackBlockedTitle
} from '@/app/features/imports/utils/import-rollback-blocked.utils';

const item = (over: Partial<ImportRollbackBlockedItemDto>): ImportRollbackBlockedItemDto => ({
    entity: 'Pet',
    id: 'x',
    table: 'pets',
    rowNumber: 5,
    reasons: [],
    ...over
});

describe('geri almada kalan kayıtlar (sözleşme 7.11)', () => {
    it('aynı gruptaki öğeleri sırayı koruyarak toplar; grup bilgisi yoksa her öğe kendi grubudur', () => {
        const groups = rollbackBlockedGroups([
            item({ id: 'c1', entity: 'Client', groupId: 'g1' }),
            item({ id: 'p1', groupId: 'g1' }),
            item({ id: 'c2', entity: 'Client', groupId: 'g2' }),
            item({ id: 'o1' }),
            item({ id: 'o2' })
        ]);

        expect(groups.map((g) => g.items.map((i) => i.id))).toEqual([['c1', 'p1'], ['c2'], ['o1'], ['o2']]);
    });

    it('aşı, klinik kayıt ve hesap hareketini kendi bilgileriyle tanıtır ve ilgili sayfaya bağlar', () => {
        const record = { petId: 'p-1', petName: 'Pamuk', species: 'Kedi', clientId: 'c-1', ownerName: 'Ayşe Yılmaz' };
        const vaccine = item({ entity: 'Vaccination', id: 'v-1', table: 'vaccinations', record: { ...record, name: 'Kuduz', atUtc: '2024-04-10T09:00:00Z' } });
        const clinical = item({ entity: 'ClinicalRecord', id: 'r-1', table: 'clinicalRecords', record: { ...record, name: 'Muayene', on: '2024-04-10' } });
        const entry = item({ entity: 'AccountEntry', id: 'e-1', table: 'accountEntries', record: { clientId: 'c-1', ownerName: 'Ayşe Yılmaz', on: '2024-04-10', kind: 'Credit' } });

        expect(rollbackBlockedTitle(vaccine)).toBe('Kuduz');
        expect(rollbackBlockedDetail(vaccine)).toBe('10.04.2024 · Pamuk (Kedi) · sahibi Ayşe Yılmaz');
        expect(rollbackBlockedLink(vaccine)).toEqual(['/panel/vaccinations', 'v-1']);
        expect(rollbackBlockedDetail(clinical)).toBe('10.04.2024 · Pamuk (Kedi) · sahibi Ayşe Yılmaz');
        expect(rollbackBlockedLink(clinical)).toEqual(['/panel/pets', 'p-1']);
        expect(rollbackBlockedTitle(entry)).toBe('Tahsilat');
        expect(rollbackBlockedLink(entry)).toEqual(['/panel/clients', 'c-1']);
    });

    it('kayıt bilgisi yoksa dosyadaki satıra düşer ve bağlantı vermez', () => {
        const bare = item({ entity: 'Appointment', table: 'appointments', rowNumber: 20655 });

        expect(rollbackBlockedTitle(bare)).toBe('Randevu · Randevular, 20655. satır');
        expect(rollbackBlockedDetail(bare)).toBeNull();
        expect(rollbackBlockedLink(bare)).toBeNull();
    });

    it('neden metni kayıt türüne göre yapılacak şeyi söyler; özel metin yoksa genel etikete düşer', () => {
        expect(rollbackBlockedReasonText('Appointment', 'HasVisits')).toBe('Bu randevuya geliş kaydedilmiş. Geliş silinirse randevu da geri alınabilir.');
        expect(rollbackBlockedReasonText('Client', 'HasKeptPets')).toBe('Bu müşteri, kalan hastası yüzünden duruyor.');
        expect(rollbackBlockedReasonText('Product', 'HasStock')).toBe('Üründe stok veya stok hareketi var');
    });
});
