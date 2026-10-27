import type { ClientDataExportDto } from '@/app/entities/client/models/client-data-export-api.model';
import { clientDataExportBalanceFacts, clientDataExportClientFacts, clientDataExportFileName, clientDataExportJson, clientDataExportKvkkFacts, clientDataExportTables } from '@/app/features/clients/utils/client-data-export.utils';

const section = <T>(items: T[], isTruncated = false) => ({ items, isTruncated });

const sampleClientDataExport = (over: Partial<ClientDataExportDto> = {}): ClientDataExportDto => ({
    generatedAtUtc: '2026-10-16T09:30:00Z',
    clinicId: null,
    maxRowsPerSection: 1000,
    client: {
        id: 'c1',
        fullName: 'Ayşe Yılmaz',
        phone: '905551112233',
        email: 'ayse@example.com',
        address: null,
        createdAtUtc: '2025-03-01T10:00:00Z',
        preferredContactChannel: 'Phone',
        remindersOptedOut: true
    },
    kvkkConsent: { status: 'Accepted', recordedOn: '2026-01-02', recordedByName: 'Mehmet Kaya' },
    pets: section([
        {
            id: 'p1',
            name: 'Pamuk',
            speciesName: 'Kedi',
            breed: null,
            gender: 'Female',
            birthDate: '2021-05-01',
            isNeutered: true,
            microchipNumber: null,
            passportOrTagNumber: null,
            status: 'Deceased',
            deceasedOn: '2026-09-01'
        }
    ]),
    appointments: section([{ scheduledAtUtc: '2026-10-01T07:00:00Z', durationMinutes: 30, petId: 'p1', petName: 'Pamuk', appointmentType: 'Vaccination', status: 'Cancelled' }]),
    examinations: section([{ examinedAtUtc: '2026-09-01T07:00:00Z', petId: 'p1', petName: 'Pamuk', complaint: 'Kusma', assessment: null, status: 'Finalized' }]),
    vaccinations: section([], true),
    treatments: section([]),
    prescriptions: section([{ prescribedAtUtc: '2026-09-01T07:00:00Z', title: 'Reçete', itemNames: ['İlaç A', 'İlaç B'], petId: 'p1', petName: 'Pamuk' }]),
    charges: section([
        {
            createdAtUtc: '2026-09-01T07:00:00Z',
            description: 'Muayene',
            petId: null,
            petName: null,
            amount: 500,
            allocatedAmount: 200,
            outstandingAmount: 300,
            currency: 'TRY',
            isVoided: true,
            voidedAtUtc: '2026-09-02T07:00:00Z'
        }
    ]),
    payments: section([
        {
            paidAtUtc: '2026-09-01T07:00:00Z',
            amount: 200,
            allocatedAmount: 200,
            unallocatedAmount: 0,
            currency: 'TRY',
            method: 'Cash',
            petId: null,
            petName: null,
            isVoided: false,
            voidedAtUtc: null
        }
    ]),
    balance: { currency: 'TRY', chargedAmount: 500, allocatedAmount: 200, outstandingAmount: 300, unallocatedPaymentAmount: 0 },
    ...over
});

describe('client-data-export.utils', () => {
    const value = (
        facts: {
            label: string;
            value: string;
        }[],
        label: string
    ) => facts.find((f) => f.label === label)?.value;

    it('müşteri ve rıza bilgileri etiketlenir; boş alan tire', () => {
        const dto = sampleClientDataExport();
        const client = clientDataExportClientFacts(dto);

        expect(value(client, 'Ad soyad')).toBe('Ayşe Yılmaz');
        expect(value(client, 'Adres')).toBe('—');
        expect(value(client, 'Tercih edilen iletişim kanalı')).toBe('Telefon');
        expect(value(client, 'Otomatik hatırlatma')).toBe('İstemiyor');

        const kvkk = clientDataExportKvkkFacts(dto);

        expect(value(kvkk, 'Açık rıza durumu')).toBe('Kabul');
        expect(value(kvkk, 'İşaretleyen')).toBe('Mehmet Kaya');
        expect(value(clientDataExportBalanceFacts(dto), 'Kalan')).toContain('300');
    });

    it('tablolar sözleşme sırasıyla; hasta dili, iptaller işaretli, kesilme bayrağı taşınır', () => {
        const tables = clientDataExportTables(sampleClientDataExport());

        expect(tables.map((t) => t.title)).toEqual(['Hastalar', 'Randevular', 'Muayene özetleri', 'Aşılar', 'Tedaviler', 'Reçeteler', 'Ücretler', 'Ödemeler']);
        const byKey = (k: string) => tables.find((t) => t.key === k)!;

        expect(byKey('pets').rows[0][0]).toBe('Pamuk');
        expect(byKey('pets').rows[0].at(-1)).toContain('Vefat');
        expect(byKey('appointments').columns).toContain('Hasta');
        expect(byKey('appointments').rows[0]).toContain('İptal');
        expect(byKey('examinations').rows[0]).toEqual(expect.arrayContaining(['Kusma', '—']));
        expect(byKey('prescriptions').rows[0]).toContain('İlaç A, İlaç B');
        expect(byKey('charges').rows[0].at(-1)).toContain('İptal edildi');
        expect(byKey('payments').rows[0].at(-1)).toBe('Geçerli');
        expect(byKey('vaccinations').isTruncated).toBe(true);
        expect(byKey('treatments').rows).toEqual([]);
    });

    it('JSON sunucu yanıtının aynısıdır; dosya adında kişisel veri yok', () => {
        const dto = sampleClientDataExport();

        expect(JSON.parse(clientDataExportJson(dto))).toEqual(dto);
        expect(clientDataExportFileName(new Date(2026, 9, 16, 9, 5))).toBe('veri-kopyasi-20261016-0905.json');
    });
});
