import type { ImportColumnDto, ImportMappingRequestDto, ImportTable, ImportTableInfoDto } from '@/app/features/imports/models/import-api.model';

/** Sihirbazda gösterilen kanonik alanlar (sözleşme bölüm 4.3); öneri ve doğrulama kuralları backend'dedir. */
export interface ImportFieldDef {
    readonly key: string;
    readonly label: string;
    readonly hint?: string;
}

export const IMPORT_TABLE_LABELS: Readonly<Record<ImportTable, string>> = {
    customers: 'Müşteriler',
    pets: 'Hastalar',
    vaccinations: 'Aşılar',
    clinicalRecords: 'Klinik geçmiş',
    accountEntries: 'Hesap hareketleri',
    appointments: 'Randevular',
    products: 'Ürünler ve hizmetler'
};

/** Sayı yanında kullanılan tekil birim ("12 hasta"). */
export const IMPORT_TABLE_UNITS: Readonly<Record<ImportTable, string>> = {
    customers: 'müşteri',
    pets: 'hasta',
    vaccinations: 'aşı',
    clinicalRecords: 'klinik kayıt',
    accountEntries: 'hesap hareketi',
    appointments: 'randevu',
    products: 'ürün'
};

/** Sözleşme 12.1 sırası (doğrulama ve uygulama sırası). */
export const IMPORT_TABLES: readonly ImportTable[] = ['customers', 'pets', 'vaccinations', 'clinicalRecords', 'accountEntries', 'appointments', 'products'];

/** CSV yükleme alan adı (sözleşme 12.1). */
export const IMPORT_CSV_FIELD: Readonly<Record<ImportTable, string>> = {
    customers: 'customersFile',
    pets: 'petsFile',
    vaccinations: 'vaccinationsFile',
    clinicalRecords: 'clinicalRecordsFile',
    accountEntries: 'accountEntriesFile',
    appointments: 'appointmentsFile',
    products: 'productsFile'
};

/** İndirilen CSV şablonunun dosya adı (sözleşme 4.2, 12.1). */
export const IMPORT_CSV_TEMPLATE_FILE: Readonly<Record<ImportTable, string>> = {
    customers: 'vetinity-iceaktar-musteriler.csv',
    pets: 'vetinity-iceaktar-hastalar.csv',
    vaccinations: 'vetinity-iceaktar-asilar.csv',
    clinicalRecords: 'vetinity-iceaktar-klinik-gecmis.csv',
    accountEntries: 'vetinity-iceaktar-hesap-hareketleri.csv',
    appointments: 'vetinity-iceaktar-randevular.csv',
    products: 'vetinity-iceaktar-urunler.csv'
};

/** E-vet'ten yüklenen dosyalar; yedek zorunlu, raporlar yedeğe eklenir (yedeksiz `Imports.UnsupportedFile`). */
export type EVetUploadSlot = 'backup' | 'patientReport' | 'vaccineReport' | 'products';

export interface EVetUploadFileDef {
    readonly slot: EVetUploadSlot;
    /** Yükleme isteğindeki alan adı. */
    readonly field: string;
    readonly extension: '.xlsx' | '.csv';
    readonly requirement: 'zorunlu' | 'önerilir' | 'isteğe bağlı';
    /** E-vet'teki menü yolu. */
    readonly menu: string;
    readonly instruction: string;
    /** Kalın gösterilen uyarı. */
    readonly caution?: string;
    readonly label: string;
}

/** Yönerge ve yükleme alanları bu sırayla gösterilir. */
export const EVET_UPLOAD_FILES: readonly EVetUploadFileDef[] = [
    {
        slot: 'backup',
        field: 'file',
        extension: '.xlsx',
        requirement: 'zorunlu',
        menu: 'Genel > Yedek Al',
        instruction: "Müşteri Listesi, Hasta Listesi, Randevular ve Muayene Listesi'ni işaretleyip Excel olarak indirin.",
        caution: "Giriş Bilgileri'ni işaretlemeyin; kullanıcı ve parola bilgisi gerekmez.",
        label: 'Yedek (.xlsx)'
    },
    {
        slot: 'patientReport',
        field: 'evetPatientReportFile',
        extension: '.csv',
        requirement: 'önerilir',
        menu: 'Rapor > Hasta Listesi',
        instruction: 'Csv olarak indirin. Hastaları sahibine kesin bağlar; yüklemezseniz sahip adıyla bağlanır.',
        label: 'Hasta Listesi (.csv)'
    },
    {
        slot: 'vaccineReport',
        field: 'evetVaccineReportFile',
        extension: '.csv',
        requirement: 'isteğe bağlı',
        menu: 'Rapor > Resmi > Aşı Bilgi',
        instruction: "Tarih aralığını 01.01.2020'den bugüne seçip Csv olarak indirin. Aşıların seri numarasını ve ürün adını ekler.",
        label: 'Aşı Bilgi (.csv)'
    },
    {
        slot: 'products',
        field: IMPORT_CSV_FIELD.products,
        extension: '.csv',
        requirement: 'isteğe bağlı',
        menu: 'Rapor > Depo > Ürün Listesi',
        instruction: 'Csv olarak indirin. Pasif ürünler aktarılmaz.',
        label: 'Ürün Listesi (.csv)'
    }
];

/** Klinik seçimi gerektiren tablolar (sözleşme 12.1); yoksa yükleme `Imports.ClinicRequired` döner. */
export const IMPORT_CLINIC_TABLES: readonly ImportTable[] = ['vaccinations', 'clinicalRecords', 'accountEntries', 'appointments'];

export function needsClinic(tables: Iterable<ImportTable>): boolean {
    for (const t of tables) {
        if (IMPORT_CLINIC_TABLES.includes(t)) {
            return true;
        }
    }

    return false;
}

const PET_LINK_FIELDS: readonly ImportFieldDef[] = [
    { key: 'HayvanNo', label: 'Hasta no', hint: 'Hastaya bağlantı için tercih edilen alan.' },
    { key: 'SahipAdSoyad', label: 'Sahip ad soyad', hint: 'Hasta no yoksa sahip, hasta adı ve tür birlikte kullanılır.' },
    { key: 'SahipTelefon', label: 'Sahip telefon' },
    { key: 'HayvanAdi', label: 'Hasta adı' },
    { key: 'Tur', label: 'Tür' }
];

export const IMPORT_FIELDS: Readonly<Record<ImportTable, readonly ImportFieldDef[]>> = {
    customers: [
        { key: 'MusteriNo', label: 'Müşteri no', hint: 'Eski sistemdeki müşteri numarası; hastaları müşteriye bağlamak için kullanılır.' },
        { key: 'AdSoyad', label: 'Ad soyad' },
        { key: 'Telefon', label: 'Telefon' },
        { key: 'Eposta', label: 'E-posta' },
        { key: 'Adres', label: 'Adres' },
        { key: 'AcikBakiye', label: 'Açık bakiye (borç)', hint: 'Eski programdaki borç (TL). Yeni müşteri için tek bir devir ücreti açılır; alacak (eksi) tutar aktarılmaz.' },
        { key: 'BakiyeTarihi', label: 'Bakiye tarihi', hint: 'Bakiyenin hangi tarihteki durum olduğu; yalnız devir ücretinin açıklamasına yazılır.' }
    ],
    pets: [
        { key: 'MusteriNo', label: 'Müşteri no', hint: 'Sahibe bağlantı için tercih edilen alan.' },
        { key: 'SahipAdSoyad', label: 'Sahip ad soyad', hint: 'Müşteri no yoksa sahibi bulmak için sahip telefonuyla birlikte kullanılır.' },
        { key: 'SahipTelefon', label: 'Sahip telefon' },
        { key: 'HayvanNo', label: 'Hasta no', hint: 'Aşıları hastaya bağlamak için tercih edilen alan.' },
        { key: 'HayvanAdi', label: 'Hasta adı' },
        { key: 'Tur', label: 'Tür' },
        { key: 'Irk', label: 'Irk' },
        { key: 'Cinsiyet', label: 'Cinsiyet' },
        { key: 'DogumTarihi', label: 'Doğum tarihi' },
        { key: 'Kisir', label: 'Kısır' },
        { key: 'Mikrocip', label: 'Mikroçip' },
        { key: 'Renk', label: 'Renk' },
        { key: 'Agirlik', label: 'Ağırlık' },
        { key: 'KarneNo', label: 'Karne no' },
        { key: 'Not', label: 'Not' }
    ],
    vaccinations: [
        ...PET_LINK_FIELDS,
        { key: 'AsiAdi', label: 'Aşı adı' },
        { key: 'UygulamaTarihi', label: 'Uygulama tarihi' },
        { key: 'SonrakiAsiTarihi', label: 'Sonraki aşı tarihi' },
        { key: 'Seri', label: 'Seri no' },
        { key: 'Uygulayan', label: 'Uygulayan' },
        { key: 'Not', label: 'Not' }
    ],
    clinicalRecords: [
        ...PET_LINK_FIELDS,
        { key: 'Tarih', label: 'Tarih' },
        { key: 'KayitTuru', label: 'Kayıt türü', hint: 'Muayene, kontrol, ameliyat gibi; boşsa "Muayene" görünür.' },
        { key: 'Sikayet', label: 'Şikâyet' },
        { key: 'Anamnez', label: 'Anamnez' },
        { key: 'Bulgular', label: 'Bulgular' },
        { key: 'Tani', label: 'Tanı' },
        { key: 'Tedavi', label: 'Tedavi' },
        { key: 'Recete', label: 'Reçete', hint: 'Metin olarak saklanır; reçete kaydı, stok hareketi ve defter kaydı oluşmaz.' },
        { key: 'LabSonuc', label: 'Laboratuvar sonucu', hint: 'Metin olarak saklanır.' },
        { key: 'Not', label: 'Not' },
        { key: 'Hekim', label: 'Hekim' },
        { key: 'Kilo', label: 'Kilo' },
        { key: 'Ates', label: 'Ateş' }
    ],
    accountEntries: [
        { key: 'MusteriNo', label: 'Müşteri no', hint: 'Müşteriye bağlantı için tercih edilen alan.' },
        { key: 'SahipAdSoyad', label: 'Müşteri ad soyad', hint: 'Müşteri no yoksa telefonla birlikte kullanılır.' },
        { key: 'SahipTelefon', label: 'Müşteri telefon' },
        { key: 'Tarih', label: 'Tarih' },
        { key: 'IslemTuru', label: 'İşlem türü', hint: 'Borç (ücret, fatura) veya tahsilat (ödeme, makbuz).' },
        { key: 'Tutar', label: 'Tutar' },
        { key: 'Aciklama', label: 'Açıklama' },
        { key: 'OdemeSekli', label: 'Ödeme şekli' },
        { key: 'BelgeNo', label: 'Belge no' },
        { key: 'HastaAdi', label: 'Hasta adı' }
    ],
    appointments: [
        ...PET_LINK_FIELDS,
        { key: 'Tarih', label: 'Tarih' },
        { key: 'Saat', label: 'Saat', hint: 'Tarih sütununda saat yoksa zorunlu (SS:dd).' },
        { key: 'Sure', label: 'Süre (dk)' },
        { key: 'Hekim', label: 'Hekim' },
        { key: 'Neden', label: 'Neden' },
        { key: 'RandevuTuru', label: 'Randevu türü' },
        { key: 'Not', label: 'Not' }
    ],
    products: [
        { key: 'Ad', label: 'Ad' },
        { key: 'UrunTuru', label: 'Tür', hint: 'Hizmet, ilaç, aşı veya diğer; boşsa diğer.' },
        { key: 'Kategori', label: 'Kategori' },
        { key: 'Birim', label: 'Birim' },
        { key: 'SatisFiyati', label: 'Satış fiyatı' },
        { key: 'Barkod', label: 'Barkod' },
        { key: 'StokKodu', label: 'Stok kodu' },
        { key: 'Uretici', label: 'Üretici' },
        { key: 'Aciklama', label: 'Açıklama' }
    ]
};

/** Tek başına zorunlu alanlar; bağlantı koşulları `missingRequired` içindedir. */
const REQUIRED: Readonly<Record<ImportTable, readonly string[]>> = {
    customers: ['AdSoyad'],
    pets: ['HayvanAdi', 'Tur'],
    vaccinations: ['AsiAdi', 'UygulamaTarihi'],
    clinicalRecords: ['Tarih'],
    accountEntries: ['Tarih', 'IslemTuru', 'Tutar'],
    appointments: ['Tarih'],
    products: ['Ad']
};

const PET_LINKED: readonly ImportTable[] = ['vaccinations', 'clinicalRecords', 'appointments'];
const OWNER_LINKED: readonly ImportTable[] = ['pets', 'accountEntries'];

const OWNER_NAME_AND_PHONE = ['SahipAdSoyad', 'SahipTelefon'];
const PET_IDENTITY = ['SahipAdSoyad', 'SahipTelefon', 'HayvanAdi', 'Tur'];

/** Kanonik alan → kaynak sütun. */
export type ImportColumnMap = Record<string, string | null>;
export type ImportColumnMaps = Partial<Record<ImportTable, ImportColumnMap>>;

export function isRequiredField(table: ImportTable, key: string): boolean {
    return REQUIRED[table].includes(key);
}

export function fieldLabel(table: ImportTable, key: string): string {
    return IMPORT_FIELDS[table].find((f) => f.key === key)?.label ?? key;
}

/** Kayıtlı eşleme varsa onu, yoksa güvenilir önerileri başlangıç eşlemesi yapar. */
export function initialColumnMaps(tables: readonly ImportTableInfoDto[]): ImportColumnMaps {
    const maps: ImportColumnMaps = {};

    for (const info of tables) {
        const hasSaved = info.columns.some((c) => c.mapped);
        const map: ImportColumnMap = {};

        for (const col of info.columns) {
            const key = hasSaved ? col.mapped : col.confidence !== 'None' ? col.suggested : null;

            if (key && !map[key]) {
                map[key] = col.source;
            }
        }

        maps[info.table] = map;
    }

    return maps;
}

/** Eşlemede eksik kalan zorunlu alanlar (sözleşme 7.3 ile aynı kurallar; kesin denetim backend'dedir). */
export function missingRequired(table: ImportTable, map: ImportColumnMap): string[] {
    const has = (key: string) => !!map[key];
    const missing = REQUIRED[table].filter((k) => !has(k)).map((k) => fieldLabel(table, k));

    if (OWNER_LINKED.includes(table) && !has('MusteriNo') && !OWNER_NAME_AND_PHONE.every(has)) {
        missing.push('Müşteri no (veya sahip ad soyad + telefon)');
    }

    if (PET_LINKED.includes(table) && !has('HayvanNo') && !PET_IDENTITY.every(has)) {
        missing.push('Hasta no (veya sahip ad soyad + telefon + hasta adı + tür)');
    }

    return missing;
}

export function columnMapsToRequest(maps: ImportColumnMaps, tables: readonly ImportTableInfoDto[]): ImportMappingRequestDto['columns'] {
    const columns: ImportMappingRequestDto['columns'] = {};

    for (const info of tables) {
        const map = maps[info.table] ?? {};

        columns[info.table] = Object.fromEntries(Object.entries(map).filter((e): e is [string, string] => !!e[1]));
    }

    return columns;
}

/** Seçilen kaynak sütunun eşleme güveni: önerilenle aynıysa Kesin/Hazır/Benzer, değilse elle. */
export function mappingConfidence(columns: readonly ImportColumnDto[], source: string | null, key: string): 'Exact' | 'Profile' | 'Alias' | 'Manual' | null {
    if (!source) {
        return null;
    }

    const col = columns.find((c) => c.source === source);

    return !col || col.suggested !== key || col.confidence === 'None' ? 'Manual' : col.confidence;
}
