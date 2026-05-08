import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    PAYMENTS_CREATE_CLAIM,
    PAYMENTS_READ_CLAIM,
    PAYMENTS_UPDATE_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import { PaymentDetailPageComponent } from '@/app/features/payments/pages/payment-detail-page/payment-detail-page.component';
import { PaymentEditPageComponent } from '@/app/features/payments/pages/payment-edit-page/payment-edit-page.component';
import { PaymentNewPageComponent } from '@/app/features/payments/pages/payment-new-page/payment-new-page.component';
import { PaymentsListPageComponent } from '@/app/features/payments/pages/payments-list-page/payments-list-page.component';

export default [
    {
        path: '',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(PAYMENTS_READ_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: PaymentsListPageComponent
    },
    {
        path: 'new',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(PAYMENTS_CREATE_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: PaymentNewPageComponent
    },
    {
        path: ':id/edit',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(PAYMENTS_UPDATE_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: PaymentEditPageComponent
    },
    {
        path: ':id',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(PAYMENTS_READ_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: PaymentDetailPageComponent
    }
] as Routes;
