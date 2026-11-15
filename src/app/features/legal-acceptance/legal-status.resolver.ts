import { inject } from '@angular/core';
import type { ResolveFn } from '@angular/router';
import { LegalAcceptanceService } from '@/app/features/legal-acceptance/services/legal-acceptance.service';

/**
 * Panel kabuğu çizilmeden önce hukuki kabul durumu okunur (H18): bekleyen kabul varsa pencere sayfa açılırken çıkar,
 * kullanıcı işe başladıktan sonra araya girmez. Koruyuculardan (oturum) sonra çalışır; hata ya da gecikmede panel açılır.
 */
export const legalStatusResolver: ResolveFn<true> = () => inject(LegalAcceptanceService).prefetchMyStatus();
