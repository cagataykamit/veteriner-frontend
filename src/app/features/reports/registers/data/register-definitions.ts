import { EXAMINATIONS_READ_CLAIM, PRESCRIPTIONS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import type { RegisterDefinition } from '@/app/features/reports/registers/data/register-definition';
import type {
    ExaminationRegisterRowDto,
    PrescriptionRegisterItemDto,
    PrescriptionRegisterRowDto,
    RegisterAdministrationDto,
    RegisterPrescriptionDto
} from '@/app/features/reports/registers/models/register.model';
import { formatDateDisplay } from '@/app/shared/utils/date.utils';

const quantityText = (q: number | null | undefined) => (q == null ? '' : q.toLocaleString('tr-TR', { maximumFractionDigits: 3 }));

/** Hücre biçimleri sözleşmedeki dışa aktarma biçimiyle aynıdır (REGISTERS_API_CONTRACT bölüm 2 ve 5). */
const prescriptionText = (p: RegisterPrescriptionDto) => {
    const items = p.items.map((i) => (i.quantity == null ? i.name : `${i.name} ×${quantityText(i.quantity)}`)).join(', ');
    return items ? `${p.title}: ${items}` : p.title;
};

const administrationText = (a: RegisterAdministrationDto) =>
    `${a.productName} ${quantityText(a.quantity)} ${a.unit}`.trim() + (a.addedAfterFinalization ? ' (sonradan eklendi)' : '') + (a.isVoided ? ' (iptal)' : '');

const SECTION_SEPARATOR = ' | ';

/** Tedavi, ardından "Reçete: ..." ve "Satış: ..." bölümleri; boş bölümler atlanır. */
const treatmentPrescriptionSaleText = (r: ExaminationRegisterRowDto) =>
    [
        r.treatments.join('; '),
        r.prescriptions.length > 0 && `Reçete: ${r.prescriptions.map(prescriptionText).join('; ')}`,
        r.administrations.length > 0 && `Satış: ${r.administrations.map(administrationText).join('; ')}`
    ]
        .filter(Boolean)
        .join(SECTION_SEPARATOR);

const prescribedItemText = (i: PrescriptionRegisterItemDto) => {
    const detail = [i.pharmacologicalForm, i.packaging].filter(Boolean).join(', ');
    return [i.name, detail && `(${detail})`, i.quantity != null && `×${quantityText(i.quantity)}`].filter(Boolean).join(' ');
};

const PATIENT = 'Hasta';

export const EXAMINATION_REGISTER: RegisterDefinition<ExaminationRegisterRowDto> = {
    book: 'examinations',
    title: 'Hayvan Muayene Kayıt Defteri',
    description: 'Seçilen tarih aralığındaki muayeneler: hasta, şikâyet, teşhis, tedavi, reçete ve satışa eklenen ilaçlar.',
    readClaim: EXAMINATIONS_READ_CLAIM,
    exportFilePrefix: 'muayene-defteri',
    stateKey: 'panel:reports:registers:examinations:listState',
    columns: [
        { header: 'Sıra No', minWidth: '4.5rem', nowrap: true, cell: (r) => String(r.rowNumber) },
        { header: 'Muayene Tarihi', minWidth: '7rem', nowrap: true, cell: (r) => formatDateDisplay(r.examinedAtUtc) },
        { header: 'Hasta Sahibinin Adı Soyadı', minWidth: '11rem', cell: (r) => r.ownerName },
        { header: 'Telefonu', minWidth: '8.5rem', nowrap: true, cell: (r) => r.ownerPhone ?? '' },
        { header: 'Adresi', minWidth: '16rem', cell: (r) => r.ownerAddress ?? '' },
        { group: PATIENT, header: 'Ad', minWidth: '6rem', cell: (r) => r.petName },
        { group: PATIENT, header: 'Tür', minWidth: '5rem', nowrap: true, cell: (r) => r.species },
        { group: PATIENT, header: 'Irk', minWidth: '7rem', cell: (r) => r.breed ?? '' },
        { group: PATIENT, header: 'Cinsiyet', minWidth: '5.5rem', nowrap: true, cell: (r) => r.gender ?? '' },
        { group: PATIENT, header: 'Yaş', minWidth: '4rem', nowrap: true, cell: (r) => r.age ?? '' },
        { group: PATIENT, header: 'Kart No', minWidth: '6rem', nowrap: true, cell: (r) => r.cardNumber ?? '' },
        { group: PATIENT, header: 'Çip No', minWidth: '9.5rem', nowrap: true, cell: (r) => r.microchipNumber ?? '' },
        { group: PATIENT, header: 'Protokol No', minWidth: '6.5rem', nowrap: true, cell: (r) => r.protocolNumber ?? '' },
        { group: PATIENT, header: 'e-Reçete Kimlik', minWidth: '8rem', nowrap: true, cell: (r) => r.ePrescriptionId ?? '' },
        { header: 'Hastanın Şikayeti', minWidth: '14rem', cell: (r) => r.complaint },
        { header: 'Teşhis Edilen Hastalık', minWidth: '14rem', cell: (r) => r.diagnosis ?? '' },
        { header: 'Tedavi Şekli, Reçete Bilgileri, Satışa Eklenen İlaçlar', minWidth: '26rem', cell: treatmentPrescriptionSaleText },
        { header: 'Veteriner Hekimin Adı Soyadı', minWidth: '11rem', cell: (r) => r.veterinarianName ?? '' }
    ]
};

export const PRESCRIPTION_REGISTER: RegisterDefinition<PrescriptionRegisterRowDto> = {
    book: 'prescriptions',
    title: 'Reçete Kayıt Defteri',
    description: 'Seçilen tarih aralığındaki reçeteler; her reçete bir satırdır, ilaçlar tek hücrede listelenir.',
    readClaim: PRESCRIPTIONS_READ_CLAIM,
    exportFilePrefix: 'recete-defteri',
    stateKey: 'panel:reports:registers:prescriptions:listState',
    columns: [
        { header: 'Sıra No', minWidth: '4.5rem', nowrap: true, cell: (r) => String(r.rowNumber) },
        { group: 'REÇETENİN', header: 'Tarihi', minWidth: '6.5rem', nowrap: true, cell: (r) => formatDateDisplay(r.prescribedAtUtc) },
        { group: 'REÇETENİN', header: 'Sınıfı', minWidth: '4.5rem', nowrap: true, cell: (r) => r.prescriptionClass ?? '' },
        { group: 'REÇETENİN', header: 'Cilt/Sıra No', minWidth: '6rem', nowrap: true, cell: (r) => r.volumeSequenceNumber ?? '' },
        { group: 'VETERİNER HEKİMİN', header: 'Adı Soyadı', minWidth: '11rem', cell: (r) => r.veterinarianName ?? '' },
        { group: 'VETERİNER HEKİMİN', header: 'Adresi', minWidth: '16rem', cell: (r) => r.veterinarianAddress ?? '' },
        { group: 'HAYVAN SAHİBİNİN', header: 'Adı Soyadı', minWidth: '11rem', cell: (r) => r.ownerName },
        { group: 'HAYVAN SAHİBİNİN', header: 'Adresi', minWidth: '16rem', cell: (r) => r.ownerAddress ?? '' },
        { group: 'HAYVANIN', header: 'Türü', minWidth: '5rem', nowrap: true, cell: (r) => r.species },
        { group: 'HAYVANIN', header: 'Kulak/İşletme No', minWidth: '8rem', nowrap: true, cell: (r) => r.earTagNumber ?? '' },
        { group: 'HAYVANIN', header: 'Sayısı', minWidth: '4.5rem', nowrap: true, cell: (r) => String(r.animalCount) },
        { header: 'İlacın Adı, Farmakolojik Şekli, Ambalajı, Adedi', minWidth: '24rem', cell: (r) => r.items.map(prescribedItemText).join('; ') }
    ]
};

/** Sayfa bileşeni satır tipini bilmez; rota verisindeki `register` anahtarı → defter tanımı. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyRegisterDefinition = RegisterDefinition<any>;

export const REGISTER_DEFINITIONS: Readonly<Record<string, AnyRegisterDefinition>> = {
    examinations: EXAMINATION_REGISTER,
    prescriptions: PRESCRIPTION_REGISTER
};
