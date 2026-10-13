/** Defter sütunu: `group` aynıysa bitişik sütunlar tek üst başlık altında toplanır; `cell` hücre metnini üretir (boş alan → ''). */
export interface RegisterColumn<T> {
    readonly group?: string;
    readonly header: string;
    readonly cell: (row: T) => string;
}

/** Ekran hücresindeki tek satır: `tone` vurguyu belirler; metni boş satır çizilmez. */
export interface RegisterCellLine {
    readonly text: string;
    readonly tone?: 'strong' | 'muted';
}

/** Ekran sütunu: birkaç veri sütunu çok satırlı tek hücrede birleşir; çıktı (yazdırma) `columns` ile tam ve ayrı kalır. */
export interface RegisterScreenColumn<T> {
    readonly header: string;
    /** Kelime ortasında kırılmaması için sütunun en küçük genişliği. */
    readonly minWidth: string;
    readonly lines: (row: T) => readonly RegisterCellLine[];
}

/** Bir kayıt defterinin tek tanımı: uç, izin, başlık ve sütunlar. Yeni defter = yeni tanım + rota + Rapor Merkezi kartı. */
export interface RegisterDefinition<T> {
    /** Rota verisi ve API ucu: `/api/v1/reports/registers/<book>`. */
    readonly book: string;
    readonly title: string;
    readonly description: string;
    readonly readClaim: string;
    readonly exportFilePrefix: string;
    readonly stateKey: string;
    /** Çıktı sütunları: yazdırma görünümü ve dışa aktarma ile aynı tam, ayrı sütun listesi. */
    readonly columns: readonly RegisterColumn<T>[];
    /** Ekran sütunları: hangi alanların tek hücrede birleşeceği. */
    readonly screenColumns: readonly RegisterScreenColumn<T>[];
}

export interface RegisterHeaderCell {
    readonly label: string;
    readonly colSpan: number;
    readonly rowSpan: number;
}

export interface RegisterHeaderLayout {
    /** Üst satır: gruplar ve grupsuz sütunlar (grupsuz sütun iki satırı kaplar). */
    readonly top: readonly RegisterHeaderCell[];
    /** Alt satır: yalnız gruplu sütunların başlıkları; grup yoksa boştur. */
    readonly sub: readonly string[];
}

export function registerHeaderLayout(columns: readonly Pick<RegisterColumn<never>, 'group' | 'header'>[]): RegisterHeaderLayout {
    const hasGroups = columns.some((c) => c.group);
    const top: RegisterHeaderCell[] = [];
    const sub: string[] = [];
    for (const col of columns) {
        const last = top[top.length - 1];
        if (!col.group) {
            top.push({ label: col.header, colSpan: 1, rowSpan: hasGroups ? 2 : 1 });
        } else if (last && last.label === col.group && last.rowSpan === 1) {
            top[top.length - 1] = { ...last, colSpan: last.colSpan + 1 };
            sub.push(col.header);
        } else {
            top.push({ label: col.group, colSpan: 1, rowSpan: 1 });
            sub.push(col.header);
        }
    }
    return { top, sub };
}
