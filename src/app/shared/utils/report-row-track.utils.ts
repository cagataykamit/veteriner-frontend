/**
 * Rapor / liste mobil `@for` satırlarında NG0955 (duplicate track key) önlemi.
 * Backend `paymentId` / `appointmentId` vb. döndürüp `id` boş bıraktığında `row.id` çoğu satırda `""` olur; bu durumda satır indeksini yedek anahtar olarak kullanır.
 */
export function reportTableRowTrackKey(row: { id: string }, index: number): string | number {
    const t = row.id?.trim();
    return t ? t : index;
}
