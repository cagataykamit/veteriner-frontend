import type { WritableSignal } from '@angular/core';
import { map } from 'rxjs';
import type { HospitalizationWardVm } from '@/app/entities/hospitalization-ward/models/hospitalization-ward-vm.model';
import type { HospitalizationWardsService } from '@/app/entities/hospitalization-ward/services/hospitalization-wards.service';
import type { InlineCreateConfig } from '@/app/shared/forms/inline-create/inline-create.directive';

/** Yatış formunda bölüm yerinde ekleme (O1): adla oluşur, listenin sonuna girer ve seçilir. */
export function hospitalizationWardInlineCreate(service: HospitalizationWardsService, clinicId: string, wards: WritableSignal<HospitalizationWardVm[]>, canCreate: boolean): InlineCreateConfig {
    return {
        canCreate: canCreate && !!clinicId,
        create: (name) => {
            const sortOrder = wards().length;

            return service.createWard(clinicId, { name: name.trim(), sortOrder }).pipe(
                map((id) => {
                    wards.update((w) => [...w, { id, clinicId, name: name.trim(), sortOrder, isActive: true, rooms: [] }]);

                    return id;
                })
            );
        }
    };
}

/** Seçili bölüme oda / kafes yerinde ekleme (O1). Bölüm seçilmeden oda eklenmez. */
export function hospitalizationRoomInlineCreate(
    service: HospitalizationWardsService,
    clinicId: string,
    wardId: string,
    wards: WritableSignal<HospitalizationWardVm[]>,
    canCreate: boolean
): InlineCreateConfig {
    return {
        canCreate: canCreate && !!clinicId && !!wardId,
        create: (name) => {
            const sortOrder = wards().find((w) => w.id === wardId)?.rooms.length ?? 0;

            return service.createRoom(clinicId, wardId, { name: name.trim(), sortOrder }).pipe(
                map((id) => {
                    wards.update((list) => list.map((w) => (w.id === wardId ? { ...w, rooms: [...w.rooms, { id, wardId, name: name.trim(), sortOrder, isActive: true }] } : w)));

                    return id;
                })
            );
        }
    };
}
