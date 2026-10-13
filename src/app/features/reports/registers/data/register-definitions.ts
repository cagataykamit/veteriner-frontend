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
        { header: 'Sıra No', cell: (r) => String(r.rowNumber) },
        { header: 'Muayene Tarihi', cell: (r) => formatDateDisplay(r.examinedAtUtc) },
        { header: 'Hasta Sahibinin Adı Soyadı', cell: (r) => r.ownerName },
        { header: 'Telefonu', cell: (r) => r.ownerPhone ?? '' },
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
    ]
};

/** Sayfa bileşeni satır tipini bilmez; rota verisindeki `register` anahtarı → defter tanımı. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyRegisterDefinition = RegisterDefinition<any>;

export const REGISTER_DEFINITIONS: Readonly<Record<string, AnyRegisterDefinition>> = {
    examinations: EXAMINATION_REGISTER,
    prescriptions: PRESCRIPTION_REGISTER
};
