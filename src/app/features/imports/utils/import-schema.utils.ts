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
    vaccinations: 'Aşılar'
};

export const IMPORT_TABLES: readonly ImportTable[] = ['customers', 'pets', 'vaccinations'];

export const IMPORT_FIELDS: Readonly<Record<ImportTable, readonly ImportFieldDef[]>> = {
    customers: [
        { key: 'MusteriNo', label: 'Müşteri no', hint: 'Eski sistemdeki müşteri numarası; hastaları müşteriye bağlamak için kullanılır.' },
        { key: 'AdSoyad', label: 'Ad soyad' },
        { key: 'Telefon', label: 'Telefon' },
        { key: 'Eposta', label: 'E-posta' },
        { key: 'Adres', label: 'Adres' }
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
        { key: 'HayvanNo', label: 'Hasta no', hint: 'Hastaya bağlantı için tercih edilen alan.' },
        { key: 'SahipAdSoyad', label: 'Sahip ad soyad', hint: 'Hasta no yoksa sahip, hasta adı ve tür birlikte kullanılır.' },
        { key: 'SahipTelefon', label: 'Sahip telefon' },
        { key: 'HayvanAdi', label: 'Hasta adı' },
        { key: 'Tur', label: 'Tür' },
        { key: 'AsiAdi', label: 'Aşı adı' },
        { key: 'UygulamaTarihi', label: 'Uygulama tarihi' },
        { key: 'SonrakiAsiTarihi', label: 'Sonraki aşı tarihi' },
        { key: 'Seri', label: 'Seri no' },
        { key: 'Uygulayan', label: 'Uygulayan' },
        { key: 'Not', label: 'Not' }
    ]
};

/** Tek başına zorunlu alanlar; bağlantı koşulları `missingRequired` içindedir. */
const REQUIRED: Readonly<Record<ImportTable, readonly string[]>> = {
    customers: ['AdSoyad'],
    pets: ['HayvanAdi', 'Tur'],
    vaccinations: ['AsiAdi', 'UygulamaTarihi']
};

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

    if (table === 'pets' && !has('MusteriNo') && !OWNER_NAME_AND_PHONE.every(has)) {
        missing.push('Müşteri no (veya sahip ad soyad + telefon)');
    }

    if (table === 'vaccinations' && !has('HayvanNo') && !PET_IDENTITY.every(has)) {
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

/** Seçilen kaynak sütunun eşleme güveni: önerilenle aynıysa Kesin/Benzer, değilse elle. */
export function mappingConfidence(columns: readonly ImportColumnDto[], source: string | null, key: string): 'Exact' | 'Alias' | 'Manual' | null {
    if (!source) {
        return null;
    }

    const col = columns.find((c) => c.source === source);

    return !col || col.suggested !== key || col.confidence === 'None' ? 'Manual' : col.confidence;
}
