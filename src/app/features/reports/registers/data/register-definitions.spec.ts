import type { ExaminationRegisterRowDto, PrescriptionRegisterRowDto } from '@/app/features/reports/registers/models/register.model';
import { registerHeaderLayout } from './register-definition';
import { EXAMINATION_REGISTER, PRESCRIPTION_REGISTER } from './register-definitions';

const exam: ExaminationRegisterRowDto = {
    rowNumber: 7,
    examinationId: 'e1',
    examinedAtUtc: '2026-10-05T09:00:00Z',
    isFinalized: true,
    ownerName: 'Ayşe Yılmaz',
    petName: 'Pamuk',
    species: 'Kedi',
    complaint: 'İştahsızlık',
    treatments: ['Serum', 'Enjeksiyon'],
    prescriptions: [{ title: 'Reçete 1', items: [{ name: 'Dectomax', quantity: 2 }, { name: 'Vitamin' }] }],
    administrations: [
        { productName: 'Aşı X', quantity: 1, unit: 'doz', addedAfterFinalization: true, isVoided: false },
        { productName: 'Y', quantity: 2, unit: 'ml', addedAfterFinalization: false, isVoided: true }
    ]
};

describe('kayıt defteri tanımları', () => {
    it('muayene defteri sütunları sözleşmedeki sırada; Hasta grubu bitişik', () => {
        const layout = registerHeaderLayout(EXAMINATION_REGISTER.columns);
        expect(layout.top.map((c) => c.label)).toEqual([
            'Sıra No',
            'Muayene Tarihi',
            'Hasta Sahibinin Adı Soyadı',
            'Telefonu',
            'Adresi',
            'Hasta',
            'Hastanın Şikayeti',
            'Teşhis Edilen Hastalık',
            'Tedavi Şekli',
            'Reçete Bilgileri',
            'Satışa Eklenen İlaçlar',
            'Veteriner Hekimin Adı Soyadı'
        ]);
        expect(layout.top.find((c) => c.label === 'Hasta')!.colSpan).toBe(9);
        expect(layout.sub).toEqual(['Ad', 'Tür', 'Irk', 'Cinsiyet', 'Yaş', 'Kart No', 'Çip No', 'Protokol No', 'e-Reçete Kimlik']);
    });

    it('reçete defteri dört gruplu üst başlık ve tek ilaç sütunu taşır', () => {
        const layout = registerHeaderLayout(PRESCRIPTION_REGISTER.columns);
        expect(layout.top.map((c) => [c.label, c.colSpan, c.rowSpan])).toEqual([
            ['Sıra No', 1, 2],
            ['REÇETENİN', 3, 1],
            ['VETERİNER HEKİMİN', 2, 1],
            ['HAYVAN SAHİBİNİN', 2, 1],
            ['HAYVANIN', 3, 1],
            ['İlacın Adı, Farmakolojik Şekli, Ambalajı, Adedi', 1, 2]
        ]);
        expect(layout.sub).toEqual(['Tarihi', 'Sınıfı', 'Cilt/Sıra No', 'Adı Soyadı', 'Adresi', 'Adı Soyadı', 'Adresi', 'Türü', 'Kulak/İşletme No', 'Sayısı']);
    });

    it('muayene satırı: eksik alanlar boş hücre, tedavi/reçete/uygulama sözleşme biçiminde', () => {
        const cells = EXAMINATION_REGISTER.columns.map((c) => c.cell(exam));
        expect(cells).toEqual([
            '7',
            '05.10.2026',
            'Ayşe Yılmaz',
            '',
            '',
            'Pamuk',
            'Kedi',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            'İştahsızlık',
            '',
            'Serum; Enjeksiyon',
            'Reçete 1: Dectomax ×2, Vitamin',
            'Aşı X 1 doz (sonradan eklendi); Y 2 ml (iptal)',
            ''
        ]);
    });

    it('reçete satırı: ilaçlar tek hücrede; şekil/ambalaj yoksa parantez yok, eksik sütunlar boş', () => {
        const row: PrescriptionRegisterRowDto = {
            rowNumber: 1,
            prescriptionId: 'p1',
            prescribedAtUtc: '2026-10-05T09:00:00Z',
            ownerName: 'Ali',
            species: 'İnek',
            animalCount: 1,
            items: [
                { name: 'Dectomax', quantity: 1 },
                { name: 'Serum', pharmacologicalForm: 'Enjeksiyonluk', packaging: '100 ml', quantity: 2 }
            ]
        };
        const cells = PRESCRIPTION_REGISTER.columns.map((c) => c.cell(row));
        expect(cells).toEqual(['1', '05.10.2026', '', '', '', '', 'Ali', '', 'İnek', '', '1', 'Dectomax ×1; Serum (Enjeksiyonluk, 100 ml) ×2']);
    });

    it('her defter ilgili okuma iznine bağlıdır', () => {
        expect(EXAMINATION_REGISTER.readClaim).toBe('Examinations.Read');
        expect(PRESCRIPTION_REGISTER.readClaim).toBe('Prescriptions.Read');
    });
});
