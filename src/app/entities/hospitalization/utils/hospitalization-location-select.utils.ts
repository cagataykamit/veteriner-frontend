import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import type { HospitalizationWardVm } from '@/app/entities/hospitalization-ward/models/hospitalization-ward-vm.model';
import type { HospitalizationUpsertFormAdapterInput } from '@/app/entities/hospitalization/data/hospitalization.mapper';
import type { SelectOption } from '@/app/shared/forms/client-pet-selection.utils';

/** Bölüm seçicisinin ilk seçeneği: konum atanmaz (düzenlemede mevcut oda bağı kaldırılır). */
export const NO_LOCATION_OPTION: SelectOption = { value: '', label: 'Konum yok' };

/** Pasif tanım yalnız mevcut yatışın odası/bölümüyse listelenir; etiketle ayrışır (sözleşme §10.6). */
export const INACTIVE_LOCATION_OPTION_HINT = 'pasif';

export const HOSPITALIZATION_ROOM_REQUIRED_ERROR_KEY = 'hospitalizationRoomRequired';

function optionLabel(name: string, isActive: boolean): string {
    return isActive ? name : `${name} (${INACTIVE_LOCATION_OPTION_HINT})`;
}

/** Mevcut odanın bölümü; oda tanımlarda yoksa `''`. */
export function hospitalizationWardIdForRoom(wards: readonly HospitalizationWardVm[], roomId: string): string {
    const id = roomId.trim();

    return (id && wards.find((w) => w.rooms.some((r) => r.id === id))?.id) || '';
}

/** "Konum yok" + aktif bölümler; mevcut odanın bölümü pasifleşmiş olsa da listelenir. */
export function hospitalizationWardOptions(wards: readonly HospitalizationWardVm[], currentRoomId = ''): SelectOption[] {
    const currentWardId = hospitalizationWardIdForRoom(wards, currentRoomId);

    return [
        NO_LOCATION_OPTION,
        ...wards.filter((w) => w.isActive || w.id === currentWardId).map((w) => ({ value: w.id, label: optionLabel(w.name, w.isActive) }))
    ];
}

/** Seçili bölümün aktif odaları; mevcut yatışın odası pasifleşmiş olsa da listelenir (aynı `roomId` geri gönderilebilir). */
export function hospitalizationRoomOptions(wards: readonly HospitalizationWardVm[], wardId: string, currentRoomId = ''): SelectOption[] {
    const ward = wards.find((w) => w.id === wardId.trim());

    if (!ward) {
        return [];
    }

    const current = currentRoomId.trim();

    return ward.rooms.filter((r) => r.isActive || r.id === current).map((r) => ({ value: r.id, label: optionLabel(r.name, r.isActive) }));
}

/** Bölüm seçildiyse oda da seçilmelidir: yatış odaya bağlanır, bölüm odadan türetilir. Grup doğrulayıcısı (`wardId`, `roomId`). */
export function roomRequiredWhenWardSelectedValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
        const wardId = String(group.get('wardId')?.value ?? '').trim();
        const roomId = String(group.get('roomId')?.value ?? '').trim();

        return wardId && !roomId ? { [HOSPITALIZATION_ROOM_REQUIRED_ERROR_KEY]: true } : null;
    };
}

/**
 * PUT için oda alanları (sözleşme §10.4): seçim değişmediyse hiçbir şey gönderilmez (oda bağı ve konum metni korunur);
 * yeni oda seçildiyse `roomId` (konum metnini sunucu türetir); oda kaldırıldıysa `clearRoom` ve türetilmiş konum metni temizlenir.
 */
export function hospitalizationRoomWriteFields(selectedRoomId: string, loadedRoomId: string): Pick<HospitalizationUpsertFormAdapterInput, 'roomId' | 'clearRoom' | 'location'> {
    const selected = selectedRoomId.trim();
    const loaded = loadedRoomId.trim();

    if (selected === loaded) {
        return { roomId: null, clearRoom: false, location: null };
    }

    if (selected) {
        return { roomId: selected, clearRoom: false, location: null };
    }

    return { roomId: null, clearRoom: true, location: '' };
}
