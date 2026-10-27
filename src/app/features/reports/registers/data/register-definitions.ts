import {
    ADMINISTRATIONS_READ_CLAIM,
    EXAMINATIONS_READ_CLAIM,
    PRESCRIPTIONS_READ_CLAIM,
    PRODUCTS_READ_CLAIM,
    STOCK_MOVEMENTS_READ_CLAIM,
    VACCINATIONS_READ_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import { HBS_STATUS_SHORT_LABEL } from '@/app/entities/hbs/utils/hbs-status.utils';
import { dayText, type RegisterCellLine, type RegisterDefinition } from '@/app/features/reports/registers/data/register-definition';
import type {
    ControlledSubstanceRegisterRowDto,
    ExaminationRegisterRowDto,
    HbsPrescriptionRegisterRowDto,
    HbsVaccinationRegisterRowDto,
    MedicationRegisterRowDto,
    PrescriptionRegisterItemDto,
    PrescriptionRegisterRowDto,
    RegisterAdministrationDto,
    RegisterPrescriptionDto,
    VaccineInfoRegisterRowDto,
    VaccineRegisterRowDto
} from '@/app/features/reports/registers/models/register.model';
import { formatDateDisplay } from '@/app/shared/utils/date.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';
import { formatClientPhoneForDisplay } from '@/app/shared/utils/phone-display.utils';

/** Telefon ekranda ve yazdırmada müşteri ekranlarıyla aynı okunur biçimdedir (+90 532 111 00 01); boşsa hücre boş kalır. CSV/Excel backend'den gelir. */
const phoneText = (phone: string | null | undefined) => (phone?.trim() ? formatClientPhoneForDisplay(phone) : '');

const quantityText = (q: number | null | undefined) => (q == null ? '' : q.toLocaleString('tr-TR', { maximumFractionDigits: 3 }));

/** Hücre biçimleri sözleşmedeki dışa aktarma biçimiyle aynıdır (REGISTERS_API_CONTRACT bölüm 2 ve 5). */
const prescriptionText = (p: RegisterPrescriptionDto) => {
    const items = p.items.map((i) => (i.quantity == null ? i.name : `${i.name} ×${quantityText(i.quantity)}`)).join(', ');

    return items ? `${p.title}: ${items}` : p.title;
};

const administrationText = (a: RegisterAdministrationDto) =>
    `${a.productName} ${quantityText(a.quantity)} ${a.unit}`.trim() + (a.addedAfterFinalization ? ' (sonradan eklendi)' : '') + (a.isVoided ? ' (iptal)' : '');

const prescribedItemText = (i: PrescriptionRegisterItemDto) => {
    const detail = [i.pharmacologicalForm, i.packaging].filter(Boolean).join(', ');

    return [i.name, detail && `(${detail})`, i.quantity != null && `×${quantityText(i.quantity)}`].filter(Boolean).join(' ');
};

const strong = (text: string): RegisterCellLine => ({ text, tone: 'strong' });
const muted = (text: string): RegisterCellLine => ({ text, tone: 'muted' });
const plain = (text: string | null | undefined): RegisterCellLine => ({ text: text ?? '' });

/** Dolu parçalar yan yana; boş alan hiç görünmez. */
const items = (parts: readonly (string | null | undefined | false)[], tone?: RegisterCellLine['tone']): RegisterCellLine => ({ items: parts.filter(Boolean) as string[], tone });

const PATIENT = 'Hasta';

export const EXAMINATION_REGISTER: RegisterDefinition<ExaminationRegisterRowDto> = {
    book: 'examinations',
    title: 'Hayvan Muayene Kayıt Defteri',
    description: 'Seçilen tarih aralığındaki muayeneler: hasta, şikâyet, teşhis, tedavi, reçete ve satışa eklenen ilaçlar.',
    readClaims: [EXAMINATIONS_READ_CLAIM],
    exportFilePrefix: 'muayene-defteri',
    stateKey: 'panel:reports:registers:examinations:listState',
    columns: [
        { header: 'Sıra No', cell: (r) => String(r.rowNumber) },
        { header: 'Muayene Tarihi', cell: (r) => formatDateDisplay(r.examinedAtUtc) },
        { header: 'Hasta Sahibinin Adı Soyadı', cell: (r) => r.ownerName },
        { header: 'Telefonu', cell: (r) => phoneText(r.ownerPhone) },
        { header: 'Adresi', cell: (r) => r.ownerAddress ?? '' },
        { group: PATIENT, header: 'Ad', cell: (r) => r.petName },
        { group: PATIENT, header: 'Tür', cell: (r) => r.species },
        { group: PATIENT, header: 'Irk', cell: (r) => r.breed ?? '' },
        { group: PATIENT, header: 'Cinsiyet', cell: (r) => r.gender ?? '' },
        { group: PATIENT, header: 'Yaş', cell: (r) => r.age ?? '' },
        { group: PATIENT, header: 'Kart No', cell: (r) => r.cardNumber ?? '' },
        { group: PATIENT, header: 'Çip No', cell: (r) => r.microchipNumber ?? '' },
        { group: PATIENT, header: 'Protokol No', cell: (r) => r.protocolNumber ?? '' },
        { group: PATIENT, header: 'e-Reçete Kimlik', cell: (r) => r.ePrescriptionId ?? '' },
        { header: 'Hastanın Şikayeti', cell: (r) => r.complaint },
        { header: 'Teşhis Edilen Hastalık', cell: (r) => r.diagnosis ?? '' },
        { header: 'Tedavi Şekli', cell: (r) => r.treatments.join('; ') },
        { header: 'Reçete Bilgileri', cell: (r) => r.prescriptions.map(prescriptionText).join('; ') },
        { header: 'Satışa Eklenen İlaçlar', cell: (r) => r.administrations.map(administrationText).join('; ') },
        { header: 'Veteriner Hekimin Adı Soyadı', cell: (r) => r.veterinarianName ?? '' }
    ],
    screenColumns: [
        { header: 'Sıra No', minWidth: '4.5rem', nowrap: true, lines: (r) => [plain(String(r.rowNumber))] },
        { header: 'Tarih', minWidth: '6.5rem', nowrap: true, lines: (r) => [plain(formatDateDisplay(r.examinedAtUtc))] },
        { header: 'Hasta Sahibi', minWidth: '12rem', lines: (r) => [strong(r.ownerName), plain(phoneText(r.ownerPhone)), muted(r.ownerAddress ?? '')] },
        {
            header: 'Hasta',
            minWidth: '13rem',
            lines: (r) => [
                strong(r.petName),
                items([r.species, r.breed, r.gender, r.age]),
                items(
                    [
                            r.cardNumber && `Kart: ${r.cardNumber}`,
                            r.microchipNumber && `Çip: ${r.microchipNumber}`,
                            r.protocolNumber && `Protokol: ${r.protocolNumber}`,
                            r.ePrescriptionId && `e-Reçete: ${r.ePrescriptionId}`
                    ],
                    'muted'
                )
            ]
        },
        { header: 'Şikâyet', minWidth: '10rem', lines: (r) => [plain(r.complaint)] },
        { header: 'Teşhis', minWidth: '10rem', lines: (r) => [plain(r.diagnosis)] },
        {
            header: 'Tedavi Şekli, Reçete Bilgileri, Satışa Eklenen İlaçlar',
            minWidth: '14rem',
            lines: (r) => [
                plain(r.treatments.join('; ')),
                ...r.prescriptions.map((p) => plain(`Reçete: ${prescriptionText(p)}`)),
                ...r.administrations.map((a) => plain(`Satış: ${administrationText(a)}`))
            ]
        },
        { header: 'Veteriner Hekim', minWidth: '7rem', clip: true, lines: (r) => [plain(r.veterinarianName)] }
    ]
};

export const PRESCRIPTION_REGISTER: RegisterDefinition<PrescriptionRegisterRowDto> = {
    book: 'prescriptions',
    title: 'Reçete Kayıt Defteri',
    description: 'Seçilen tarih aralığındaki reçeteler; her reçete bir satırdır, ilaçlar tek hücrede listelenir.',
    readClaims: [PRESCRIPTIONS_READ_CLAIM],
    exportFilePrefix: 'recete-defteri',
    stateKey: 'panel:reports:registers:prescriptions:listState',
    columns: [
        { header: 'Sıra No', cell: (r) => String(r.rowNumber) },
        { group: 'REÇETENİN', header: 'Tarihi', cell: (r) => formatDateDisplay(r.prescribedAtUtc) },
        { group: 'REÇETENİN', header: 'Sınıfı', cell: (r) => r.prescriptionClass ?? '' },
        { group: 'REÇETENİN', header: 'Cilt/Sıra No', cell: (r) => r.volumeSequenceNumber ?? '' },
        { group: 'VETERİNER HEKİMİN', header: 'Adı Soyadı', cell: (r) => r.veterinarianName ?? '' },
        { group: 'VETERİNER HEKİMİN', header: 'Adresi', cell: (r) => r.veterinarianAddress ?? '' },
        { group: 'HAYVAN SAHİBİNİN', header: 'Adı Soyadı', cell: (r) => r.ownerName },
        { group: 'HAYVAN SAHİBİNİN', header: 'Adresi', cell: (r) => r.ownerAddress ?? '' },
        { group: 'HAYVANIN', header: 'Türü', cell: (r) => r.species },
        { group: 'HAYVANIN', header: 'Kulak/İşletme No', cell: (r) => r.earTagNumber ?? '' },
        { group: 'HAYVANIN', header: 'Sayısı', cell: (r) => String(r.animalCount) },
        { header: 'İlacın Adı, Farmakolojik Şekli, Ambalajı, Adedi', cell: (r) => r.items.map(prescribedItemText).join('; ') }
    ],
    screenColumns: [
        { header: 'Sıra No', minWidth: '4.5rem', nowrap: true, lines: (r) => [plain(String(r.rowNumber))] },
        {
            header: 'Reçete',
            minWidth: '8rem',
            lines: (r) => [strong(formatDateDisplay(r.prescribedAtUtc)), items([r.prescriptionClass && `Sınıf: ${r.prescriptionClass}`, r.volumeSequenceNumber && `Cilt/Sıra: ${r.volumeSequenceNumber}`], 'muted')]
        },
        { header: 'Veteriner Hekim', minWidth: '12rem', lines: (r) => [strong(r.veterinarianName ?? ''), muted(r.veterinarianAddress ?? '')] },
        { header: 'Hasta Sahibi', minWidth: '12rem', lines: (r) => [strong(r.ownerName), muted(r.ownerAddress ?? '')] },
        {
            header: 'Hasta',
            minWidth: '9rem',
            lines: (r) => [strong(r.species), items([r.earTagNumber && `Kulak/İşletme No: ${r.earTagNumber}`, `Sayı: ${r.animalCount}`], 'muted')]
        },
        { header: 'İlacın Adı, Farmakolojik Şekli, Ambalajı, Adedi', minWidth: '18rem', lines: (r) => r.items.map((i) => plain(prescribedItemText(i))) }
    ]
};

const reversedSuffix = (isReversed: boolean) => (isReversed ? ' (iptal)' : '');
const quantityUnit = (quantity: number, unit: string) => `${quantityText(quantity)} ${unit}`.trim();

const VOIDED_LABEL = 'İptal edilen girişleri göster';

export const VACCINE_REGISTER: RegisterDefinition<VaccineRegisterRowDto> = {
    book: 'vaccines',
    title: 'Aşı Kayıt Defteri',
    description: 'Seçilen tarih aralığındaki aşı stok girişleri: seri no, son kullanma tarihi, firma, soğuk zincir ve fatura bilgileri.',
    readClaims: [STOCK_MOVEMENTS_READ_CLAIM],
    exportFilePrefix: 'asi-kayit-defteri',
    stateKey: 'panel:reports:registers:vaccines:listState',
    extraFilters: { includeVoidedLabel: VOIDED_LABEL },
    columns: [
        { header: 'Sıra No', cell: (r) => String(r.rowNumber) },
        { header: 'Ticari Adı', cell: (r) => r.tradeName + reversedSuffix(r.isReversed) },
        { header: 'Seri No', cell: (r) => r.lotNumber ?? '' },
        { header: 'Son Kullanma Tarihi', cell: (r) => dayText(r.expiryDate) },
        { header: 'Toplam Miktar (Doz)', cell: (r) => quantityText(r.totalQuantity) },
        { header: 'Satın Alınan Firma', cell: (r) => r.supplierName ?? '' },
        { header: 'Nakil Şekli (Soğuk Zincir)', cell: (r) => r.transportMethod ?? '' },
        { header: 'Nakilde Kullanılan İzleme Cihazı (Soğuk Zincir İndikatörü)', cell: (r) => r.coldChainMonitor ?? '' },
        { header: 'Depo Çıkış Tarihi', cell: (r) => dayText(r.dispatchedDate) },
        { header: 'Teslim Tarihi', cell: (r) => dayText(r.deliveredDate) },
        { header: 'Fatura Tarihi', cell: (r) => dayText(r.invoiceDate) },
        { header: 'Fatura No', cell: (r) => r.invoiceNumber ?? '' }
    ],
    screenColumns: [
        { header: 'Sıra No', minWidth: '4.5rem', nowrap: true, lines: (r) => [plain(String(r.rowNumber))] },
        {
            header: 'Aşı',
            minWidth: '13rem',
            lines: (r) => [
                strong(r.tradeName),
                items([r.lotNumber && `Seri No: ${r.lotNumber}`, r.expiryDate && `SKT: ${dayText(r.expiryDate)}`], 'muted'),
                r.isReversed ? muted('İptal edildi') : plain('')
            ]
        },
        { header: 'Doz', minWidth: '5rem', nowrap: true, lines: (r) => [plain(quantityText(r.totalQuantity))] },
        { header: 'Firma', minWidth: '11rem', lines: (r) => [strong(r.supplierName ?? ''), items([r.invoiceNumber && `Fatura: ${r.invoiceNumber}`, r.invoiceDate && dayText(r.invoiceDate)], 'muted')] },
        { header: 'Soğuk Zincir', minWidth: '12rem', lines: (r) => [plain(r.transportMethod), muted(r.coldChainMonitor ?? '')] },
        {
            header: 'Tarihler',
            minWidth: '9rem',
            lines: (r) => [plain(`Teslim: ${dayText(r.deliveredDate)}`), muted(r.dispatchedDate ? `Depo çıkış: ${dayText(r.dispatchedDate)}` : '')]
        }
    ]
};

export const MEDICATION_REGISTER: RegisterDefinition<MedicationRegisterRowDto> = {
    book: 'medications',
    title: 'İlaç Kayıt Defteri',
    description: 'Seçilen tarih aralığındaki ilaç stok girişleri: firma, fatura ve seri no bilgileri.',
    readClaims: [STOCK_MOVEMENTS_READ_CLAIM],
    exportFilePrefix: 'ilac-kayit-defteri',
    stateKey: 'panel:reports:registers:medications:listState',
    extraFilters: { includeVoidedLabel: VOIDED_LABEL },
    columns: [
        { header: 'Sıra No', cell: (r) => String(r.rowNumber) },
        { header: 'Ürün', cell: (r) => r.productName + reversedSuffix(r.isReversed) },
        { header: 'Farmakolojik Şekli', cell: (r) => r.pharmacologicalForm ?? '' },
        { header: 'Takdim Şekli', cell: (r) => r.presentationForm ?? '' },
        { header: 'Adet', cell: (r) => quantityText(r.quantity) },
        { header: 'Birim', cell: (r) => r.unit },
        { header: 'Firma Adı', cell: (r) => r.supplierName ?? '' },
        { header: 'Geldiği Tarih', cell: (r) => dayText(r.receivedDate) },
        { header: 'Fatura Tarihi', cell: (r) => dayText(r.invoiceDate) },
        { header: 'Fatura No', cell: (r) => r.invoiceNumber ?? '' },
        { header: 'Seri No', cell: (r) => r.lotNumber ?? '' }
    ],
    screenColumns: [
        { header: 'Sıra No', minWidth: '4.5rem', nowrap: true, lines: (r) => [plain(String(r.rowNumber))] },
        {
            header: 'Ürün',
            minWidth: '14rem',
            lines: (r) => [strong(r.productName), items([r.pharmacologicalForm, r.presentationForm], 'muted'), r.isReversed ? muted('İptal edildi') : plain('')]
        },
        { header: 'Miktar', minWidth: '6rem', nowrap: true, lines: (r) => [plain(quantityUnit(r.quantity, r.unit))] },
        { header: 'Seri No', minWidth: '7rem', lines: (r) => [plain(r.lotNumber)] },
        { header: 'Firma', minWidth: '11rem', lines: (r) => [strong(r.supplierName ?? ''), items([r.invoiceNumber && `Fatura: ${r.invoiceNumber}`, r.invoiceDate && dayText(r.invoiceDate)], 'muted')] },
        { header: 'Geldiği Tarih', minWidth: '7rem', nowrap: true, lines: (r) => [plain(dayText(r.receivedDate))] }
    ]
};

const RECEIVED = 'SATIN/İADE/DEVİR ALINAN ÜRÜNÜN';
const ISSUED = 'SATILAN/İADE VEYA DEVREDİLEN ÜRÜNÜN';

const controlledProductText = (r: ControlledSubstanceRegisterRowDto) => (r.pharmacologicalForm ? `${r.productName} (${r.pharmacologicalForm})` : r.productName);

export const CONTROLLED_SUBSTANCE_REGISTER: RegisterDefinition<ControlledSubstanceRegisterRowDto> = {
    book: 'controlled-substances',
    title: 'Narkotik ve Psikotropik Ürünler Stok ve Sarf Defteri',
    description: 'Seçilen tarih aralığındaki kontrollü ürün hareketleri; her hareket bir satırdır, alınan veya çıkış tarafı dolar.',
    readClaims: [STOCK_MOVEMENTS_READ_CLAIM, ADMINISTRATIONS_READ_CLAIM],
    exportFilePrefix: 'narkotik-psikotropik-defteri',
    stateKey: 'panel:reports:registers:controlled-substances:listState',
    columns: [
        { header: 'Sıra No', cell: (r) => String(r.rowNumber) },
        { header: 'Ürün Adı, Ticari Adı ve Farmakolojik Şekli', cell: controlledProductText },
        { header: 'Ticari Takdim Şekli', cell: (r) => r.commercialPresentation ?? '' },
        { header: 'Miktar', cell: (r) => quantityText(r.quantity) },
        { header: 'Seri No', cell: (r) => r.lotNumber ?? '' },
        { group: RECEIVED, header: 'Alındığı Yer', cell: (r) => r.receivedFrom ?? '' },
        { group: RECEIVED, header: 'Tarih', cell: (r) => dayText(r.receivedDate) },
        { group: RECEIVED, header: 'Belge No', cell: (r) => r.receivedDocumentNumber ?? '' },
        { group: ISSUED, header: 'Çıkış Yapılan Yer', cell: (r) => r.issuedTo ?? '' },
        { group: ISSUED, header: 'Tarih', cell: (r) => dayText(r.issuedDate) },
        { group: ISSUED, header: 'Reçete/Belge No', cell: (r) => r.issuedDocumentNumber ?? '' }
    ],
    screenColumns: [
        { header: 'Sıra No', minWidth: '4.5rem', nowrap: true, lines: (r) => [plain(String(r.rowNumber))] },
        {
            header: 'Ürün',
            minWidth: '14rem',
            lines: (r) => [strong(controlledProductText(r)), muted(r.commercialPresentation ?? ''), r.direction === 'Undetermined' ? muted('Yön belirlenemedi') : plain('')]
        },
        { header: 'Miktar', minWidth: '5rem', nowrap: true, lines: (r) => [plain(quantityText(r.quantity))] },
        { header: 'Seri No', minWidth: '7rem', lines: (r) => [plain(r.lotNumber)] },
        {
            header: 'Alınan',
            minWidth: '13rem',
            lines: (r) => [strong(r.receivedFrom ?? ''), items([r.receivedDate && dayText(r.receivedDate), r.receivedDocumentNumber && `Belge: ${r.receivedDocumentNumber}`], 'muted')]
        },
        {
            header: 'Çıkış',
            minWidth: '13rem',
            lines: (r) => [strong(r.issuedTo ?? ''), items([r.issuedDate && dayText(r.issuedDate), r.issuedDocumentNumber && `Belge: ${r.issuedDocumentNumber}`], 'muted')]
        }
    ]
};

const vaccineInfoProductText = (r: VaccineInfoRegisterRowDto) => r.productName + (r.addedAfterFinalization ? ' (sonradan eklendi)' : '') + (r.isVoided ? ' (iptal)' : '');

export const VACCINE_INFO_REGISTER: RegisterDefinition<VaccineInfoRegisterRowDto> = {
    book: 'vaccine-info',
    title: 'Aşı Bilgi Raporu',
    description: 'Seçilen tarih aralığında uygulanan aşılar: hasta, ürün, seri no ve tutar.',
    readClaims: [ADMINISTRATIONS_READ_CLAIM, VACCINATIONS_READ_CLAIM, PRODUCTS_READ_CLAIM],
    exportFilePrefix: 'asi-bilgi-raporu',
    stateKey: 'panel:reports:registers:vaccine-info:listState',
    extraFilters: { includeVoidedLabel: 'İptal edilenleri göster', product: true, veterinarian: true },
    screenHint:
        'Fiyat ve toplam, ürünün güncel katalog fiyatıdır; uygulama anında tahsil edilen tutar değildir. Ürünle kaydedilen aşı tek satırdır (aşı kaydı ve stoktan düşen uygulama ayrı sayılmaz); ürünsüz girilen takvim/geçmiş aşılar bu raporda yer almaz.',
    columns: [
        { header: '#', cell: (r) => String(r.rowNumber) },
        { header: 'Tarih', cell: (r) => formatDateDisplay(r.administeredAtUtc) },
        { header: 'Hasta Sahibi', cell: (r) => r.ownerName },
        { header: 'T.C.', cell: (r) => r.clientIdentityNumber ?? '' },
        { header: 'Hasta', cell: (r) => r.petName },
        { header: 'Tür', cell: (r) => r.species },
        { header: 'Çip No', cell: (r) => r.microchipNumber ?? '' },
        { header: 'Ürün', cell: vaccineInfoProductText },
        { header: 'Seri No', cell: (r) => r.lotNumber ?? '' },
        { header: 'S.K.T', cell: (r) => dayText(r.expiryDate) },
        { header: 'Birim', cell: (r) => r.unit },
        { header: 'Miktar', cell: (r) => quantityText(r.quantity) },
        { header: 'Fiyat', cell: (r) => formatMoney(r.unitPrice, r.currency) },
        { header: 'Toplam', cell: (r) => formatMoney(r.totalPrice, r.currency) }
    ],
    screenColumns: [
        { header: '#', minWidth: '3.5rem', nowrap: true, lines: (r) => [plain(String(r.rowNumber))] },
        { header: 'Tarih', minWidth: '6.5rem', nowrap: true, lines: (r) => [plain(formatDateDisplay(r.administeredAtUtc))] },
        { header: 'Hasta Sahibi', minWidth: '11rem', lines: (r) => [strong(r.ownerName), muted(r.clientIdentityNumber ?? '')] },
        { header: 'Hasta', minWidth: '11rem', lines: (r) => [strong(r.petName), items([r.species, r.microchipNumber && `Çip: ${r.microchipNumber}`], 'muted')] },
        {
            header: 'Ürün',
            minWidth: '13rem',
            lines: (r) => [
                strong(r.productName),
                items([r.lotNumber && `Seri No: ${r.lotNumber}`, r.expiryDate && `SKT: ${dayText(r.expiryDate)}`], 'muted'),
                items([r.addedAfterFinalization && 'Sonradan eklendi', r.isVoided && 'İptal edildi'], 'muted')
            ]
        },
        { header: 'Miktar', minWidth: '6rem', nowrap: true, lines: (r) => [plain(quantityUnit(r.quantity, r.unit))] },
        { header: 'Fiyat / Toplam', minWidth: '9rem', nowrap: true, lines: (r) => [plain(formatMoney(r.unitPrice, r.currency)), muted(`Toplam: ${formatMoney(r.totalPrice, r.currency)}`)] }
    ]
};

const hbsMarked = (r: { readonly markedAtUtc?: string | null }) => (r.markedAtUtc ? formatDateDisplay(r.markedAtUtc) : '');

/** HBS takibi (ADR-036 Dilim 2): resmî defter değildir; varsayılan görünüm "HBS'e girilmedi" iş listesidir. */
export const HBS_PRESCRIPTION_REGISTER: RegisterDefinition<HbsPrescriptionRegisterRowDto> = {
    book: 'hbs-prescriptions',
    title: 'HBS takibi — reçeteler',
    description: "Seçilen tarih aralığındaki reçetelerin HBS (e-Reçete) durumu; varsayılan olarak HBS'e girilmemiş olanlar.",
    readClaims: [PRESCRIPTIONS_READ_CLAIM],
    exportFilePrefix: 'hbs-receteler',
    stateKey: 'panel:reports:registers:hbs-prescriptions:listState',
    extraFilters: { hbsStatus: true, veterinarian: true },
    notOfficialRegister: true,
    screenHint: "HBS'e girdiğiniz reçeteyi reçete detayındaki HBS bölümünden işaretleyin; gerekmeyen reçeteyi gerekçeyle \"Gerekmiyor\" olarak işaretleyebilirsiniz.",
    columns: [
        { header: 'Sıra No', cell: (r) => String(r.rowNumber) },
        { header: 'Reçete Tarihi', cell: (r) => formatDateDisplay(r.prescribedAtUtc) },
        { header: 'Hasta Sahibi', cell: (r) => r.ownerName },
        { header: 'Telefon', cell: (r) => phoneText(r.ownerPhone) },
        { header: 'Hasta', cell: (r) => r.petName },
        { header: 'Tür', cell: (r) => r.species },
        { header: 'Çip No', cell: (r) => r.microchipNumber ?? '' },
        { header: 'HBS Hayvan Kimlik No', cell: (r) => r.hbsAnimalId ?? '' },
        { header: 'Reçete', cell: (r) => r.title },
        { header: 'İlaçlar', cell: (r) => r.medications },
        { header: 'Veteriner Hekim', cell: (r) => r.veterinarianName ?? '' },
        { header: 'HBS Durumu', cell: (r) => HBS_STATUS_SHORT_LABEL[r.hbsStatus] ?? '' },
        { header: 'e-Reçete No', cell: (r) => r.referenceNumber ?? '' },
        { header: 'HBS İşaret Tarihi', cell: hbsMarked }
    ],
    screenColumns: [
        { header: 'Sıra No', minWidth: '4.5rem', nowrap: true, lines: (r) => [plain(String(r.rowNumber))] },
        { header: 'Tarih', minWidth: '6.5rem', nowrap: true, lines: (r) => [plain(formatDateDisplay(r.prescribedAtUtc))] },
        { header: 'Hasta Sahibi', minWidth: '11rem', lines: (r) => [strong(r.ownerName), muted(phoneText(r.ownerPhone))] },
        {
            header: 'Hasta',
            minWidth: '11rem',
            lines: (r) => [strong(r.petName), items([r.species, r.microchipNumber && `Çip: ${r.microchipNumber}`, r.hbsAnimalId && `HBS: ${r.hbsAnimalId}`], 'muted')]
        },
        { header: 'Reçete', minWidth: '14rem', lines: (r) => [strong(r.title), muted(r.medications)] },
        { header: 'Veteriner Hekim', minWidth: '8rem', clip: true, lines: (r) => [plain(r.veterinarianName)] },
        {
            header: 'HBS',
            minWidth: '9rem',
            lines: (r) => [strong(HBS_STATUS_SHORT_LABEL[r.hbsStatus] ?? ''), items([r.referenceNumber && `No: ${r.referenceNumber}`, hbsMarked(r)], 'muted')]
        }
    ]
};

export const HBS_VACCINATION_REGISTER: RegisterDefinition<HbsVaccinationRegisterRowDto> = {
    book: 'hbs-vaccinations',
    title: 'HBS takibi — aşılar',
    description: "Seçilen tarih aralığında uygulanan aşıların HBS (ATS) durumu; varsayılan olarak HBS'e girilmemiş olanlar.",
    readClaims: [VACCINATIONS_READ_CLAIM],
    exportFilePrefix: 'hbs-asilar',
    stateKey: 'panel:reports:registers:hbs-vaccinations:listState',
    extraFilters: { hbsStatus: true, veterinarian: true },
    notOfficialRegister: true,
    screenHint: "HBS'e girdiğiniz aşıyı aşı detayındaki HBS bölümünden işaretleyin. Eski sistemden aktarılan geçmiş aşılar bu listede yer almaz.",
    columns: [
        { header: 'Sıra No', cell: (r) => String(r.rowNumber) },
        { header: 'Uygulama Tarihi', cell: (r) => formatDateDisplay(r.appliedAtUtc) },
        { header: 'Hasta Sahibi', cell: (r) => r.ownerName },
        { header: 'Telefon', cell: (r) => phoneText(r.ownerPhone) },
        { header: 'Hasta', cell: (r) => r.petName },
        { header: 'Tür', cell: (r) => r.species },
        { header: 'Çip No', cell: (r) => r.microchipNumber ?? '' },
        { header: 'HBS Hayvan Kimlik No', cell: (r) => r.hbsAnimalId ?? '' },
        { header: 'Aşı', cell: (r) => r.vaccineName },
        { header: 'Seri No', cell: (r) => r.lotNumber ?? '' },
        { header: 'S.K.T', cell: (r) => dayText(r.expiryDate) },
        { header: 'Veteriner Hekim', cell: (r) => r.veterinarianName ?? '' },
        { header: 'HBS Durumu', cell: (r) => HBS_STATUS_SHORT_LABEL[r.hbsStatus] ?? '' },
        { header: 'ATS Belge Seri No', cell: (r) => r.referenceNumber ?? '' },
        { header: 'HBS İşaret Tarihi', cell: hbsMarked }
    ],
    screenColumns: [
        { header: 'Sıra No', minWidth: '4.5rem', nowrap: true, lines: (r) => [plain(String(r.rowNumber))] },
        { header: 'Tarih', minWidth: '6.5rem', nowrap: true, lines: (r) => [plain(formatDateDisplay(r.appliedAtUtc))] },
        { header: 'Hasta Sahibi', minWidth: '11rem', lines: (r) => [strong(r.ownerName), muted(phoneText(r.ownerPhone))] },
        {
            header: 'Hasta',
            minWidth: '11rem',
            lines: (r) => [strong(r.petName), items([r.species, r.microchipNumber && `Çip: ${r.microchipNumber}`, r.hbsAnimalId && `HBS: ${r.hbsAnimalId}`], 'muted')]
        },
        {
            header: 'Aşı',
            minWidth: '13rem',
            lines: (r) => [strong(r.vaccineName), items([r.lotNumber && `Seri No: ${r.lotNumber}`, r.expiryDate && `SKT: ${dayText(r.expiryDate)}`], 'muted')]
        },
        { header: 'Veteriner Hekim', minWidth: '8rem', clip: true, lines: (r) => [plain(r.veterinarianName)] },
        {
            header: 'HBS',
            minWidth: '9rem',
            lines: (r) => [strong(HBS_STATUS_SHORT_LABEL[r.hbsStatus] ?? ''), items([r.referenceNumber && `No: ${r.referenceNumber}`, hbsMarked(r)], 'muted')]
        }
    ]
};

/** Sayfa bileşeni satır tipini bilmez; rota verisindeki `register` anahtarı → defter tanımı. */
export type AnyRegisterDefinition = RegisterDefinition<any>;

export const REGISTER_DEFINITIONS: Readonly<Record<string, AnyRegisterDefinition>> = {
    examinations: EXAMINATION_REGISTER,
    prescriptions: PRESCRIPTION_REGISTER,
    vaccines: VACCINE_REGISTER,
    medications: MEDICATION_REGISTER,
    'controlled-substances': CONTROLLED_SUBSTANCE_REGISTER,
    'vaccine-info': VACCINE_INFO_REGISTER,
    'hbs-prescriptions': HBS_PRESCRIPTION_REGISTER,
    'hbs-vaccinations': HBS_VACCINATION_REGISTER
};
