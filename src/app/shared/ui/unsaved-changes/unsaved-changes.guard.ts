import { inject } from '@angular/core';
import type { CanDeactivateFn } from '@angular/router';
import { hasPendingUnsavedChanges } from '@/app/shared/ui/unsaved-changes/unsaved-changes';
import { UnsavedChangesService } from '@/app/shared/ui/unsaved-changes/unsaved-changes.service';

/** Oluştur/düzenle sayfalarından çıkarken kaydedilmemiş değişiklik varsa sorar (O2). Sayfa `HasUnsavedChanges` uygular. */
export const unsavedChangesGuard: CanDeactivateFn<unknown> = (component) =>
    hasPendingUnsavedChanges(component) ? inject(UnsavedChangesService).confirmLeave() : true;
