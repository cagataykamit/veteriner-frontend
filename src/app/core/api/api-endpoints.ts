/**
 * Backend Veteriner API (OpenAPI 3) — Swagger ile uyumlu tam path'ler.
 * @see https://localhost:7173/swagger/index.html
 * @see ../../../../docs/BACKEND-INTEGRATION.md — query/create varsayımları ve notlar.
 */
export const ApiEndpoints = {
    auth: {
        login: () => `/api/v1/Auth/login`,
        refresh: () => `/api/v1/Auth/refresh`,
        selectClinic: () => `/api/v1/auth/select-clinic`,
        logout: () => `/api/v1/Auth/logout`,
        logoutAll: () => `/api/v1/Auth/logout-all`
    },
    me: {
        clinics: () => `/api/v1/me/clinics`
    },
    /** Panel JWT kiracı bağlamında klinik rehberi; `me.clinics` kişisel üyelik listesidir. */
    clinics: {
        list: () => `/api/v1/clinics`,
        byId: (id: string) => `/api/v1/clinics/${encodeURIComponent(id)}`,
        activate: (id: string) => `/api/v1/clinics/${encodeURIComponent(id)}/activate`,
        deactivate: (id: string) => `/api/v1/clinics/${encodeURIComponent(id)}/deactivate`
    },
    dashboard: {
        summary: () => `/api/v1/dashboard/summary`,
        financeSummary: () => `/api/v1/dashboard/finance-summary`,
        capabilities: () => `/api/v1/dashboard/capabilities`,
        operationalAlerts: () => `/api/v1/dashboard/operational-alerts`
    },
    clients: {
        /** Query: `Page`, `PageSize`, `Search`, `Sort`, `Order` (canonical — @see docs/BACKEND-INTEGRATION.md). */
        list: () => `/api/v1/clients`,
        byId: (id: string) => `/api/v1/clients/${encodeURIComponent(id)}`,
        recentSummary: (id: string) => `/api/v1/clients/${encodeURIComponent(id)}/recent-summary`,
        paymentSummary: (id: string) => `/api/v1/clients/${encodeURIComponent(id)}/payment-summary`
    },
    pets: {
        /** Query: `Page`, `PageSize`, `Search`, `Sort`, `Order`, `SpeciesId`, `ClientId` (+ opsiyonel legacy `Species` — @see docs/BACKEND-INTEGRATION.md). */
        list: () => `/api/v1/pets`,
        byId: (id: string) => `/api/v1/pets/${encodeURIComponent(id)}`,
        historySummary: (id: string) => `/api/v1/pets/${encodeURIComponent(id)}/history-summary`
    },
    species: {
        /** Query: opsiyonel `isActive` (`true` → yalnız aktif türler; lookup). Parametre yok → tümü. */
        list: () => `/api/v1/species`,
        byId: (id: string) => `/api/v1/species/${encodeURIComponent(id)}`
    },
    breeds: {
        /** Query: isteğe bağlı `isActive` (`true` → aktif ırklar), `speciesId`, `search`. */
        list: () => `/api/v1/breeds`,
        byId: (id: string) => `/api/v1/breeds/${encodeURIComponent(id)}`
    },
    /** Ref-data — PetColors; path Swagger ile teyit edilmeli. */
    petColors: {
        list: () => `/api/v1/pet-colors`
    },
    appointments: {
        /** Query: `Page`, `PageSize`, `Search`, `Status`, `FromDate`, `ToDate`, `Sort`, `Order` (+ `clinicId`, `PetId`, `ClientId`). */
        list: () => `/api/v1/appointments`,
        calendar: () => `/api/v1/appointments/calendar`,
        byId: (id: string) => `/api/v1/appointments/${encodeURIComponent(id)}`
    },
    examinations: {
        /** Query: `Page`, `PageSize`, `Search`, `FromDate`, `ToDate`, `Sort`, `Order` (+ `clinicId`, `PetId`, `ClientId`, `appointmentId`). */
        list: () => `/api/v1/examinations`,
        byId: (id: string) => `/api/v1/examinations/${encodeURIComponent(id)}`,
        relatedSummary: (id: string) => `/api/v1/examinations/${encodeURIComponent(id)}/related-summary`
    },
    vaccinations: {
        /** Query: `Page`, `PageSize`, `Search`, `Status`, `FromDate`, `ToDate`, `Sort`, `Order` (+ `clinicId`, `PetId`, `ClientId`). */
        list: () => `/api/v1/vaccinations`,
        byId: (id: string) => `/api/v1/vaccinations/${encodeURIComponent(id)}`
    },
    payments: {
        /** Query: `Page`, `PageSize`, `Search`, `Method`, `FromDate`, `ToDate` (+ `ClientId`, `PetId`, `clinicId`). */
        list: () => `/api/v1/payments`,
        byId: (id: string) => `/api/v1/payments/${encodeURIComponent(id)}`
    },
    reports: {
        /** Faz 6C.1 — Payments reporting contract (`from`, `to`, `clinicId`, `method`, `clientId`, `petId`, `search`, `page`, `pageSize`). */
        payments: () => `/api/v1/reports/payments`,
        paymentsExport: () => `/api/v1/reports/payments/export`,
        paymentsExportXlsx: () => `/api/v1/reports/payments/export-xlsx`,
        /** Faz 6C.2 — Appointments reporting (`from`, `to`, `clinicId`, `status`, `clientId`, `petId`, `search`, `page`, `pageSize`). */
        appointments: () => `/api/v1/reports/appointments`,
        appointmentsExport: () => `/api/v1/reports/appointments/export`,
        appointmentsExportXlsx: () => `/api/v1/reports/appointments/export-xlsx`,
        /** Faz 6C.3 — Examinations reporting (`from`, `to`, `clinicId`, `search`, `clientId`, `petId`, `appointmentId`, `page`, `pageSize`). */
        examinations: () => `/api/v1/reports/examinations`,
        examinationsExport: () => `/api/v1/reports/examinations/export`,
        examinationsExportXlsx: () => `/api/v1/reports/examinations/export-xlsx`,
        /** Faz 6C.4 — Vaccinations reporting (`from`, `to`, `clinicId`, `status`, `search`, `clientId`, `petId`, `page`, `pageSize`). */
        vaccinations: () => `/api/v1/reports/vaccinations`,
        vaccinationsExport: () => `/api/v1/reports/vaccinations/export`,
        vaccinationsExportXlsx: () => `/api/v1/reports/vaccinations/export-xlsx`
    },
    treatments: {
        /** Query: `Page`, `PageSize`, `Search`, `FromDate`, `ToDate`, `Sort`, `Order` (+ `clinicId`, `PetId`). */
        list: () => `/api/v1/treatments`,
        byId: (id: string) => `/api/v1/treatments/${encodeURIComponent(id)}`
    },
    prescriptions: {
        /** Query: `Page`, `PageSize`, `Search`, `FromDate`, `ToDate`, `Sort`, `Order` (+ `clinicId`, `PetId`). */
        list: () => `/api/v1/prescriptions`,
        byId: (id: string) => `/api/v1/prescriptions/${encodeURIComponent(id)}`
    },
    labResults: {
        /** Query: `Page`, `PageSize`, `Search`, `FromDate`, `ToDate`, `Sort`, `Order` (+ `clinicId`, `PetId`). */
        list: () => `/api/v1/lab-results`,
        byId: (id: string) => `/api/v1/lab-results/${encodeURIComponent(id)}`
    },
    hospitalizations: {
        /** Query: `Page`, `PageSize`, `Search`, `FromDate`, `ToDate`, `Sort`, `Order` (+ `clinicId`, `PetId`, `ActiveOnly`). */
        list: () => `/api/v1/hospitalizations`,
        byId: (id: string) => `/api/v1/hospitalizations/${encodeURIComponent(id)}`,
        discharge: (id: string) => `/api/v1/hospitalizations/${encodeURIComponent(id)}/discharge`
    },
    tenants: {
        /** PUT: kiracı paneli — kurum adı vb. (Faz 5B); gövde backend sözleşmesine uyar. */
        settings: (tenantId: string) => `/api/v1/tenants/${encodeURIComponent(tenantId)}/settings`,
        subscriptionSummary: (tenantId: string) => `/api/v1/tenants/${encodeURIComponent(tenantId)}/subscription-summary`,
        subscriptionCheckout: (tenantId: string) => `/api/v1/tenants/${encodeURIComponent(tenantId)}/subscription-checkout`,
        subscriptionCheckoutById: (tenantId: string, checkoutSessionId: string) =>
            `/api/v1/tenants/${encodeURIComponent(tenantId)}/subscription-checkout/${encodeURIComponent(checkoutSessionId)}`,
        finalizeSubscriptionCheckout: (tenantId: string, checkoutSessionId: string) =>
            `/api/v1/tenants/${encodeURIComponent(tenantId)}/subscription-checkout/${encodeURIComponent(checkoutSessionId)}/finalize`,
        scheduleSubscriptionDowngrade: (tenantId: string) =>
            `/api/v1/tenants/${encodeURIComponent(tenantId)}/subscription-plan-change/downgrade`,
        pendingSubscriptionPlanChange: (tenantId: string) =>
            `/api/v1/tenants/${encodeURIComponent(tenantId)}/subscription-plan-change/pending`,
        /** Query: `Page`, `PageSize`, `Search` — kiracı kullanıcı üyeleri (salt liste). */
        members: (tenantId: string) => `/api/v1/tenants/${encodeURIComponent(tenantId)}/members`,
        /** GET: tek kiracı üyesi detayı (rol/claim ve klinik üyelikleri backend gönderirse). */
        memberById: (tenantId: string, memberId: string) =>
            `/api/v1/tenants/${encodeURIComponent(tenantId)}/members/${encodeURIComponent(memberId)}`,
        /** POST: gövde genelde `{}`; `operationClaimId` yol parametresinde — üyeye whitelist rol atanır. */
        memberAssignClaim: (tenantId: string, memberId: string, operationClaimId: string) =>
            `/api/v1/tenants/${encodeURIComponent(tenantId)}/members/${encodeURIComponent(memberId)}/roles/${encodeURIComponent(operationClaimId)}`,
        /** DELETE: üyeden ilgili `operationClaimId` rolünü kaldırır. */
        memberRemoveClaim: (tenantId: string, memberId: string, operationClaimId: string) =>
            `/api/v1/tenants/${encodeURIComponent(tenantId)}/members/${encodeURIComponent(memberId)}/roles/${encodeURIComponent(operationClaimId)}`,
        /** POST: üyeye klinik üyeliği ekler; gövde `{}`, `clinicId` yol parametresinde. */
        memberAssignClinic: (tenantId: string, memberId: string, clinicId: string) =>
            `/api/v1/tenants/${encodeURIComponent(tenantId)}/members/${encodeURIComponent(memberId)}/clinics/${encodeURIComponent(clinicId)}`,
        /** DELETE: üyeden klinik üyeliğini kaldırır. */
        memberRemoveClinic: (tenantId: string, memberId: string, clinicId: string) =>
            `/api/v1/tenants/${encodeURIComponent(tenantId)}/members/${encodeURIComponent(memberId)}/clinics/${encodeURIComponent(clinicId)}`,
        /** GET: Query `Page`, `PageSize`, `Search` (davet listesi). POST: davet oluşturur. */
        invites: (tenantId: string) => `/api/v1/tenants/${encodeURIComponent(tenantId)}/invites`,
        /** GET: tek davet detayı. */
        inviteById: (tenantId: string, inviteId: string) =>
            `/api/v1/tenants/${encodeURIComponent(tenantId)}/invites/${encodeURIComponent(inviteId)}`,
        /** POST: gövde genelde boş; bekleyen daveti iptal eder. */
        inviteCancel: (tenantId: string, inviteId: string) =>
            `/api/v1/tenants/${encodeURIComponent(tenantId)}/invites/${encodeURIComponent(inviteId)}/cancel`,
        /** POST: davet e-postasını yeniden gönderir. */
        inviteResend: (tenantId: string, inviteId: string) =>
            `/api/v1/tenants/${encodeURIComponent(tenantId)}/invites/${encodeURIComponent(inviteId)}/resend`,
        /** Davet formu: atanabilir operation claim listesi (`operationClaimId`, `operationClaimName`). */
        assignableOperationClaims: (tenantId: string) =>
            `/api/v1/tenants/${encodeURIComponent(tenantId)}/assignable-operation-claims`,
        /** GET: rol → atanabilir permission matrisi (salt okunur; panel bilgilendirme). */
        assignableRolePermissionMatrix: (tenantId: string) =>
            `/api/v1/tenants/${encodeURIComponent(tenantId)}/assignable-role-permission-matrix`
    },
    public: {
        ownerSignup: () => `/api/v1/public/owner-signup`,
        inviteByToken: (token: string) => `/api/v1/public/invites/${encodeURIComponent(token)}`,
        inviteAccept: (token: string) => `/api/v1/public/invites/${encodeURIComponent(token)}/accept`,
        inviteSignupAndAccept: (token: string) => `/api/v1/public/invites/${encodeURIComponent(token)}/signup-and-accept`
    }
} as const;
