import type {
    ControlledSubstanceRegisterRowDto,
    ExaminationRegisterRowDto,
    MedicationRegisterRowDto,
    PrescriptionRegisterRowDto,
    VaccineInfoRegisterRowDto,
    VaccineRegisterRowDto
} from '@/app/features/reports/registers/models/register.model';
import { registerHeaderLayout } from './register-definition';
import {
    CONTROLLED_SUBSTANCE_REGISTER,
    EXAMINATION_REGISTER,
    MEDICATION_REGISTER,
    PRESCRIPTION_REGISTER,
    REGISTER_DEFINITIONS,
    VACCINE_INFO_REGISTER,
    VACCINE_REGISTER
} from './register-definitions';

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

    it('muayene ekran sütunları: sahip ve hasta birleşik, tedavi/reçete/satış tek hücrede', () => {
        expect(EXAMINATION_REGISTER.screenColumns.map((c) => c.header)).toEqual([
            'Sıra No',
            'Tarih',
            'Hasta Sahibi',
            'Hasta',
            'Şikâyet',
            'Teşhis',
            'Tedavi Şekli, Reçete Bilgileri, Satışa Eklenen İlaçlar',
            'Veteriner Hekim'
        ]);
        const lines = (header: string, row = exam) => EXAMINATION_REGISTER.screenColumns.find((c) => c.header === header)!.lines(row).map((l) => l.text ?? l.items!.join(' · ')).filter(Boolean);
        expect(lines('Hasta Sahibi')).toEqual(['Ayşe Yılmaz']);
        expect(lines('Hasta Sahibi', { ...exam, ownerPhone: '0555', ownerAddress: 'Kadıköy' })).toEqual(['Ayşe Yılmaz', '0555', 'Kadıköy']);
        expect(lines('Hasta')).toEqual(['Pamuk', 'Kedi']);
        expect(lines('Hasta', { ...exam, breed: 'Van', age: '2', cardNumber: 'K1', protocolNumber: 'P9' })).toEqual(['Pamuk', 'Kedi · Van · 2', 'Kart: K1 · Protokol: P9']);
        expect(lines('Tedavi Şekli, Reçete Bilgileri, Satışa Eklenen İlaçlar')).toEqual([
            'Serum; Enjeksiyon',
            'Reçete: Reçete 1: Dectomax ×2, Vitamin',
            'Satış: Aşı X 1 doz (sonradan eklendi)',
            'Satış: Y 2 ml (iptal)'
        ]);
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
        expect(EXAMINATION_REGISTER.readClaims).toEqual(['Examinations.Read']);
        expect(PRESCRIPTION_REGISTER.readClaims).toEqual(['Prescriptions.Read']);
    });

    it('aşı defteri: sütunlar sözleşme sırasında; takvim günü kaymadan, iptal girişte ek, boş alan boş', () => {
        const row: VaccineRegisterRowDto = {
            rowNumber: 3,
            movementId: 'm1',
            productId: 'p1',
            tradeName: 'Nobivac',
            lotNumber: 'L-1',
            expiryDate: '2027-01-31',
            totalQuantity: 10,
            supplierName: 'Vet Depo',
            deliveredDate: '2026-10-01',
            invoiceNumber: 'F-9',
            isBatched: true,
            isReversed: true
        };
        expect(VACCINE_REGISTER.columns.map((c) => c.header)).toEqual([
            'Sıra No',
            'Ticari Adı',
            'Seri No',
            'Son Kullanma Tarihi',
            'Toplam Miktar (Doz)',
            'Satın Alınan Firma',
            'Nakil Şekli (Soğuk Zincir)',
            'Nakilde Kullanılan İzleme Cihazı (Soğuk Zincir İndikatörü)',
            'Depo Çıkış Tarihi',
            'Teslim Tarihi',
            'Fatura Tarihi',
            'Fatura No'
        ]);
        expect(VACCINE_REGISTER.columns.map((c) => c.cell(row))).toEqual(['3', 'Nobivac (iptal)', 'L-1', '31.01.2027', '10', 'Vet Depo', '', '', '', '01.10.2026', '', 'F-9']);
    });

    it('ilaç defteri: sütunlar sözleşme sırasında, miktar ve birim ayrı', () => {
        const row: MedicationRegisterRowDto = {
            rowNumber: 1,
            movementId: 'm1',
            productId: 'p1',
            productName: 'Amoksilin',
            pharmacologicalForm: 'Tablet',
            quantity: 2.5,
            unit: 'kutu',
            receivedDate: '2026-09-30',
            isBatched: false,
            isReversed: false
        };
        expect(MEDICATION_REGISTER.columns.map((c) => c.header)).toEqual([
            'Sıra No',
            'Ürün',
            'Farmakolojik Şekli',
            'Takdim Şekli',
            'Adet',
            'Birim',
            'Firma Adı',
            'Geldiği Tarih',
            'Fatura Tarihi',
            'Fatura No',
            'Seri No'
        ]);
        expect(MEDICATION_REGISTER.columns.map((c) => c.cell(row))).toEqual(['1', 'Amoksilin', 'Tablet', '', '2,5', 'kutu', '', '30.09.2026', '', '', '']);
    });

    it('narkotik defteri: iki gruplu başlık (Alınan / Çıkış), ürün tek hücrede, boş taraf boş; bakiye sütunu yok', () => {
        const layout = registerHeaderLayout(CONTROLLED_SUBSTANCE_REGISTER.columns);
        expect(layout.top.map((c) => `${c.label}:${c.colSpan}`)).toEqual([
            'Sıra No:1',
            'Ürün Adı, Ticari Adı ve Farmakolojik Şekli:1',
            'Ticari Takdim Şekli:1',
            'Miktar:1',
            'Seri No:1',
            'SATIN/İADE/DEVİR ALINAN ÜRÜNÜN:3',
            'SATILAN/İADE VEYA DEVREDİLEN ÜRÜNÜN:3'
        ]);
        expect(layout.sub).toEqual(['Alındığı Yer', 'Tarih', 'Belge No', 'Çıkış Yapılan Yer', 'Tarih', 'Reçete/Belge No']);
        const issued: ControlledSubstanceRegisterRowDto = {
            rowNumber: 2,
            movementId: 'm2',
            productId: 'p1',
            movementType: 'Out',
            direction: 'Issued',
            productName: 'Ketamin',
            pharmacologicalForm: 'Enjeksiyonluk',
            commercialPresentation: 'Flakon, 10 ml',
            quantity: 1,
            lotNumber: 'K-7',
            issuedTo: 'Uygulama: Pamuk (Ayşe)',
            issuedDate: '2026-10-05',
            isBatched: true
        };
        expect(CONTROLLED_SUBSTANCE_REGISTER.columns.map((c) => c.cell(issued))).toEqual([
            '2',
            'Ketamin (Enjeksiyonluk)',
            'Flakon, 10 ml',
            '1',
            'K-7',
            '',
            '',
            '',
            'Uygulama: Pamuk (Ayşe)',
            '05.10.2026',
            ''
        ]);
    });

    it('narkotik defteri: yönü belirlenemeyen satır ekranda belirtilir', () => {
        const row = { rowNumber: 1, direction: 'Undetermined', productName: 'X', quantity: 1 } as ControlledSubstanceRegisterRowDto;
        const lines = CONTROLLED_SUBSTANCE_REGISTER.screenColumns[1].lines(row).map((l) => l.text);
        expect(lines).toContain('Yön belirlenemedi');
    });

    it('aşı bilgi raporu: fiyat/toplam para biçimli, T.C. boş, sonradan eklenen ürün hücresinde', () => {
        const row: VaccineInfoRegisterRowDto = {
            rowNumber: 1,
            administrationId: 'a1',
            administeredAtUtc: '2026-10-05T09:00:00Z',
            ownerName: 'Ayşe',
            petName: 'Pamuk',
            species: 'Kedi',
            productName: 'Karma Aşı',
            lotNumber: 'L-2',
            expiryDate: '2027-03-01',
            unit: 'doz',
            quantity: 2,
            unitPrice: 150,
            totalPrice: 300,
            currency: 'TRY',
            addedAfterFinalization: true,
            isVoided: false
        };
        expect(VACCINE_INFO_REGISTER.columns.map((c) => c.header)).toEqual([
            '#', 'Tarih', 'Hasta Sahibi', 'T.C.', 'Hasta', 'Tür', 'Çip No', 'Ürün', 'Seri No', 'S.K.T', 'Birim', 'Miktar', 'Fiyat', 'Toplam'
        ]);
        const cells = VACCINE_INFO_REGISTER.columns.map((c) => c.cell(row));
        expect(cells[3]).toBe('');
        expect(cells[7]).toBe('Karma Aşı (sonradan eklendi)');
        expect(cells[9]).toBe('01.03.2027');
        expect(cells[12]).toContain('150');
        expect(cells[13]).toContain('300');
        expect(VACCINE_INFO_REGISTER.screenHint).toContain('katalog fiyatı');
    });

    it('yeni defterler yetki birleşimiyle tanımlıdır; kayıt anahtarı uç adıdır', () => {
        expect(VACCINE_REGISTER.readClaims).toEqual(['StockMovements.Read']);
        expect(MEDICATION_REGISTER.readClaims).toEqual(['StockMovements.Read']);
        expect(CONTROLLED_SUBSTANCE_REGISTER.readClaims).toEqual(['StockMovements.Read', 'Administrations.Read']);
        expect(VACCINE_INFO_REGISTER.readClaims).toEqual(['Administrations.Read', 'Vaccinations.Read', 'Products.Read']);
        for (const [key, def] of Object.entries(REGISTER_DEFINITIONS)) {
            expect(def.book).toBe(key);
        }
    });
});
