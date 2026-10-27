import { ADMINISTRATION_PANEL_PROBLEM_MESSAGES } from '@/app/entities/administration/utils/administration-error.utils';
import { CHARGE_PANEL_PROBLEM_MESSAGES } from '@/app/entities/charge/utils/charge-error.utils';
import { CLINIC_PANEL_PROBLEM_MESSAGES } from '@/app/entities/clinic/utils/clinic-error.utils';
import { EXAMINATION_FINALIZE_PROBLEM_MESSAGES } from '@/app/entities/examination/utils/examination-error.utils';
import { HOSPITALIZATION_PANEL_PROBLEM_MESSAGES } from '@/app/entities/hospitalization/utils/hospitalization-error.utils';
import { LAB_RESULT_PANEL_PROBLEM_MESSAGES } from '@/app/entities/lab-result/utils/lab-result-error.utils';
import { VACCINATION_PANEL_PROBLEM_MESSAGES } from '@/app/entities/vaccination/utils/vaccination-error.utils';
import { VISIT_PANEL_PROBLEM_MESSAGES } from '@/app/entities/visit/utils/visit-error.utils';
import { OWNER_PORTAL_PROBLEM_MESSAGES } from '@/app/features/clients/utils/owner-portal-error.utils';
import { REMINDER_PANEL_PROBLEM_MESSAGES } from '@/app/features/reminders/utils/reminder-error.utils';
import { SALE_PANEL_PROBLEM_MESSAGES } from '@/app/features/sales/utils/sale-error.utils';
import { registerProblemMessages } from '@/app/shared/utils/api-error.utils';

/**
 * Panelin her yerinde geçerli alan tabloları; `messageFromHttpError` bunlara bu sırayla bakar. Sıra anlamlıdır: aynı kod
 * birden çok tabloda varsa (ör. `StockBatches.NotFound` uygulama ve satışta) ilk tablonun metni gösterilir.
 */
export function registerPanelProblemMessages(): void {
    registerProblemMessages([
        REMINDER_PANEL_PROBLEM_MESSAGES,
        VACCINATION_PANEL_PROBLEM_MESSAGES,
        CLINIC_PANEL_PROBLEM_MESSAGES,
        VISIT_PANEL_PROBLEM_MESSAGES,
        CHARGE_PANEL_PROBLEM_MESSAGES,
        ADMINISTRATION_PANEL_PROBLEM_MESSAGES,
        SALE_PANEL_PROBLEM_MESSAGES,
        LAB_RESULT_PANEL_PROBLEM_MESSAGES,
        HOSPITALIZATION_PANEL_PROBLEM_MESSAGES,
        EXAMINATION_FINALIZE_PROBLEM_MESSAGES,
        OWNER_PORTAL_PROBLEM_MESSAGES
    ]);
}
