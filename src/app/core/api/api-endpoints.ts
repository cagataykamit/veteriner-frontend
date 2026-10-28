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
        clinics: () => `/api/v1/me/clinics`,
        accountSummary: () => `/api/v1/me/account-summary`,
        changePassword: () => `/api/v1/me/change-password`,
        /** PUT; gövde `{ displayName: string | null }`, boş değer adı temizler, `204`. */
        displayName: () => `/api/v1/me/display-name`,
        /** GET bekleyen hukuki kabuller, POST kabul (Veteriner `docs/LEGAL_ACCEPTANCE_API_CONTRACT.md` §4–5). */
        legalAcceptances: () => `/api/v1/me/legal-acceptances`
    },
    /** Kiracı firma / fatura profili — panel JWT kiracı bağlamında. */
    organization: {
        billingProfile: () => `/api/v1/organization/billing-profile`
    },
    password: {
        requestReset: () => `/api/v1/password/request-reset`,
        confirmReset: () => `/api/v1/password/confirm`
    },
    /** Panel JWT kiracı bağlamında klinik rehberi; `me.clinics` kişisel üyelik listesidir. */
    clinics: {
        list: () => `/api/v1/clinics`,
        byId: (id: string) => `/api/v1/clinics/${encodeURIComponent(id)}`,
        activate: (id: string) => `/api/v1/clinics/${encodeURIComponent(id)}/activate`,
        deactivate: (id: string) => `/api/v1/clinics/${encodeURIComponent(id)}/deactivate`,
        workingHours: (id: string) => `/api/v1/clinics/${encodeURIComponent(id)}/working-hours`,
        appointmentSettings: (id: string) => `/api/v1/clinics/${encodeURIComponent(id)}/appointment-settings`,
        /** KVKK açık rıza formu şablonu; GET `Clinics.Read` | `Clinics.Update` | `Clients.Read`, PUT `Clinics.Update` (`KVKK_CONSENT_API_CONTRACT.md` §2). */
        kvkkFormTemplate: (id: string) => `/api/v1/clinics/${encodeURIComponent(id)}/kvkk-form-template`,
        /** KVKK aydınlatma metni şablonu; açık rıza şablonuyla aynı sözleşme ve izinler (`KVKK_CONSENT_API_CONTRACT.md` §2b). */
        kvkkDisclosureTemplate: (id: string) => `/api/v1/clinics/${encodeURIComponent(id)}/kvkk-disclosure-template`,
        /** Mükellef ayarları; GET `Clinics.Read`, PUT `Clinics.Update` (`INVOICING_IDENTITY_API_CONTRACT.md` §3). */
        taxpayerSettings: (id: string) => `/api/v1/clinics/${encodeURIComponent(id)}/taxpayer-settings`,
        /** Geliş formundaki sorumlu hekim seçimi (`Visits.Create`). */
        veterinarians: (id: string) => `/api/v1/clinics/${encodeURIComponent(id)}/veterinarians`
    },
    visits: {
        /** Geliş kaydı (POST). */
        create: () => `/api/v1/visits`,
        /** Query: `clinicId`, `localDate` (İstanbul günü, `yyyy-MM-dd`), `voided`. */
        today: () => `/api/v1/visits/today`,
        byId: (id: string) => `/api/v1/visits/${encodeURIComponent(id)}`,
        start: (id: string) => `/api/v1/visits/${encodeURIComponent(id)}/start`,
        complete: (id: string) => `/api/v1/visits/${encodeURIComponent(id)}/complete`,
        corrections: (id: string) => `/api/v1/visits/${encodeURIComponent(id)}/corrections`,
        restore: (id: string) => `/api/v1/visits/${encodeURIComponent(id)}/restore`,
        urgency: (id: string) => `/api/v1/visits/${encodeURIComponent(id)}/urgency`
    },
    charges: {
        /** GET (Query: `page`, `pageSize`, `clinicId`, `clientId`, `petId`, `visitId`, `examinationId`) ve POST. */
        list: () => `/api/v1/charges`,
        /** GET; PUT = düzeltme (`Charges.Correct`, gerekçe zorunlu). */
        byId: (id: string) => `/api/v1/charges/${encodeURIComponent(id)}`,
        /** POST `{ reason }`; 204. */
        void: (id: string) => `/api/v1/charges/${encodeURIComponent(id)}/void`
    },
    /** Ücret bekleyen kalemler (ADR-018). */
    chargeSuggestions: {
        /** GET (`Charges.Read`; query: `page`, `pageSize`, `clinicId`, `petId`, `examinationId`, `visitId`; yalnız `Pending`). */
        list: () => `/api/v1/charge-suggestions`,
        /** POST (`Charges.Create`); gövde opsiyonel `{ description, quantity, unitPrice, requestId }`; 201 yeni ücret, 200 aynı `requestId`. */
        convert: (id: string) => `/api/v1/charge-suggestions/${encodeURIComponent(id)}/convert`,
        /** POST (`Charges.Create`) `{ reason }` (5–500); 200 kalem. */
        waive: (id: string) => `/api/v1/charge-suggestions/${encodeURIComponent(id)}/waive`
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
        /** POST: müşteri + hayvan tek işlemde (`Clients.Create` ve `Pets.Create`); Visit açmaz. */
        quickRegister: () => `/api/v1/clients/quick-register`,
        recentSummary: (id: string) => `/api/v1/clients/${encodeURIComponent(id)}/recent-summary`,
        paymentSummary: (id: string) => `/api/v1/clients/${encodeURIComponent(id)}/payment-summary`,
        /** `Charges.Read`; yalnız açık ücretler, hayvan ve ziyaret kırılımıyla (`CLIENT_BALANCE_API_CONTRACT.md`). */
        balance: (id: string) => `/api/v1/clients/${encodeURIComponent(id)}/balance`,
        /** PUT; `Clients.Update`, `rowVersion` zorunlu (`KVKK_CONSENT_API_CONTRACT.md` §1). */
        kvkkConsent: (id: string) => `/api/v1/clients/${encodeURIComponent(id)}/kvkk-consent`,
        /** GET; `Clients.Read`, salt okunur KVKK veri kopyası; her çağrı audit'e yazılır (`CLIENT_DATA_EXPORT_API_CONTRACT.md`). */
        dataExport: (id: string) => `/api/v1/clients/${encodeURIComponent(id)}/data-export`,
        /** GET; `Clients.Update`, düzenleme formu için tam TCKN/VKN (`INVOICING_IDENTITY_API_CONTRACT.md` §2); audit'e yazılır. */
        invoicingIdentity: (id: string) => `/api/v1/clients/${encodeURIComponent(id)}/invoicing-identity`,
        /** GET; `OwnerPortal.Manage`, bağ durumu + son 20 davet (`PORTAL_API_CONTRACT.md` §4.1). */
        portalAccess: (id: string) => `/api/v1/clients/${encodeURIComponent(id)}/portal-access`,
        /** POST; gövde opsiyonel `{ clinicId }`, klinik context-first (§4.2). */
        portalInvites: (id: string) => `/api/v1/clients/${encodeURIComponent(id)}/portal-invites`,
        /** POST; 204, yalnız bekleyen davet (§4.3). */
        portalInviteRevoke: (id: string, inviteId: string) => `/api/v1/clients/${encodeURIComponent(id)}/portal-invites/${encodeURIComponent(inviteId)}/revoke`,
        /** POST; 204, bağ `Closed` olur, silinmez (§4.4). */
        portalLinkClose: (id: string, linkId: string) => `/api/v1/clients/${encodeURIComponent(id)}/portal-links/${encodeURIComponent(linkId)}/close`
    },
    pets: {
        /** Query: `Page`, `PageSize`, `Search`, `Sort`, `Order`, `SpeciesId`, `ClientId`, `Status` (+ opsiyonel legacy `Species` — @see docs/BACKEND-INTEGRATION.md). */
        list: () => `/api/v1/pets`,
        byId: (id: string) => `/api/v1/pets/${encodeURIComponent(id)}`,
        /** PUT: aktif/vefat (`rowVersion` zorunlu; `PET_STATUS_CLIENT_CONTACT_API_CONTRACT.md` §1). */
        status: (id: string) => `/api/v1/pets/${encodeURIComponent(id)}/status`,
        historySummary: (id: string) => `/api/v1/pets/${encodeURIComponent(id)}/history-summary`,
        /** Bölüm bazlı durumlu özet kartı (`docs/PET_TIMELINE_API_CONTRACT.md`). */
        summary: (id: string) => `/api/v1/pets/${encodeURIComponent(id)}/summary`,
        /** Hasta kartı "Yapılacaklar" (`docs/PET_OPEN_ITEMS_API_CONTRACT.md`); bölüm bazlı durumlu. */
        openItems: (id: string) => `/api/v1/pets/${encodeURIComponent(id)}/open-items`,
        /** Query: `types` (tekrarlı), `fromUtc`, `toUtc`, `clinicId`, `includeVoided`, `limit` (≤50), `cursor` (opak). */
        timeline: (id: string) => `/api/v1/pets/${encodeURIComponent(id)}/timeline`
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
        /** Query: `Page`, `PageSize`, `Search`, `Status`, `dateFromUtc`, `dateToUtc` (iki uç dahil), `Sort`, `Order` (+ `clinicId`, `PetId`, `ClientId`). */
        list: () => `/api/v1/appointments`,
        calendar: () => `/api/v1/appointments/calendar`,
        byId: (id: string) => `/api/v1/appointments/${encodeURIComponent(id)}`,
        cancel: (id: string) => `/api/v1/appointments/${encodeURIComponent(id)}/cancel`,
        complete: (id: string) => `/api/v1/appointments/${encodeURIComponent(id)}/complete`,
        noShow: (id: string) => `/api/v1/appointments/${encodeURIComponent(id)}/no-show`,
        noShowRevert: (id: string) => `/api/v1/appointments/${encodeURIComponent(id)}/no-show/revert`
    },
    reminders: {
        settings: () => `/api/v1/reminders/settings`,
        logs: () => `/api/v1/reminders/logs`
    },
    examinations: {
        /** Query: `Page`, `PageSize`, `Search`, `dateFromUtc`, `dateToUtc`, `Sort`, `Order` (+ `clinicId`, `PetId`, `ClientId`, `appointmentId`); `FromDate`/`ToDate` yok. */
        list: () => `/api/v1/examinations`,
        byId: (id: string) => `/api/v1/examinations/${encodeURIComponent(id)}`,
        relatedSummary: (id: string) => `/api/v1/examinations/${encodeURIComponent(id)}/related-summary`,
        finalize: (id: string) => `/api/v1/examinations/${encodeURIComponent(id)}/finalize`,
        addenda: (id: string) => `/api/v1/examinations/${encodeURIComponent(id)}/addenda`,
        /** POST `{ templateId, rowVersion }` (muayenenin sürümü). */
        applyTemplate: (id: string) => `/api/v1/examinations/${encodeURIComponent(id)}/apply-template`
    },
    vaccinations: {
        /** Query: `Page`, `PageSize`, `Search`, `Status`, `dateFromUtc`, `dateToUtc` (iki uç dahil), `OnlyOverdue`, `Sort` (`dueAtUtc` | `appliedAtUtc`), `Order` (+ `clinicId`, `PetId`, `ClientId`). */
        list: () => `/api/v1/vaccinations`,
        byId: (id: string) => `/api/v1/vaccinations/${encodeURIComponent(id)}`,
        /** GET HBS ATS hazır verisi (`Vaccinations.Read`; `HBS_ASSISTANT_API_CONTRACT.md` §4). */
        hbsData: (id: string) => `/api/v1/vaccinations/${encodeURIComponent(id)}/hbs-data`,
        /** PATCH ATS geri kaydı `{ status, referenceNumber, notRequiredReason }` (`Vaccinations.Update`; §5). */
        hbs: (id: string) => `/api/v1/vaccinations/${encodeURIComponent(id)}/hbs`
    },
    /** FAZ 14C — aşı kataloğu; query: `Page`, `PageSize`, `search`, `speciesId`, `includeInactive`. */
    /** Veri içe aktarma (ADR-019); sözleşme: Veteriner `docs/IMPORT_API_CONTRACT.md`. */
    imports: {
        /** GET: `format=xlsx` veya `format=csv&table=customers|pets|vaccinations`. */
        template: () => `/api/v1/imports/template`,
        /** GET (liste: `page`, `pageSize`, `status`) ve POST (multipart yükleme). */
        batches: () => `/api/v1/imports/batches`,
        /** GET ayrıntı; DELETE taslağı siler. */
        batchById: (id: string) => `/api/v1/imports/batches/${encodeURIComponent(id)}`,
        mapping: (id: string) => `/api/v1/imports/batches/${encodeURIComponent(id)}/mapping`,
        validate: (id: string) => `/api/v1/imports/batches/${encodeURIComponent(id)}/validate`,
        preview: (id: string) => `/api/v1/imports/batches/${encodeURIComponent(id)}/preview`,
        /** GET: `table`, `status`, `code`, `page`, `pageSize`. */
        rows: (id: string) => `/api/v1/imports/batches/${encodeURIComponent(id)}/rows`,
        /** GET: `format=xlsx|csv` hata raporu dosyası. */
        errors: (id: string) => `/api/v1/imports/batches/${encodeURIComponent(id)}/errors`,
        /** POST (B4): uygulamayı başlatır; 202 yeni iş, 200 tekrar. */
        commit: (id: string) => `/api/v1/imports/batches/${encodeURIComponent(id)}/commit`,
        /** GET (B4): uygulama ilerlemesi (hafif yoklama, no-store). */
        progress: (id: string) => `/api/v1/imports/batches/${encodeURIComponent(id)}/progress`,
        /** POST (B4): içe aktarılan aşıların hatırlatmalarını açar (geri alınamaz). */
        releaseReminders: (id: string) => `/api/v1/imports/batches/${encodeURIComponent(id)}/release-reminders`,
        /** GET (B5): geri alma önizlemesi (silinebilir/engelli kayıt sayıları, no-store). */
        rollbackPreview: (id: string) => `/api/v1/imports/batches/${encodeURIComponent(id)}/rollback-preview`,
        /** POST (B5): geri almayı başlatır; 202 yeni iş, 200 tekrar. */
        rollback: (id: string) => `/api/v1/imports/batches/${encodeURIComponent(id)}/rollback`
    },
    vaccineDefinitions: {
        list: () => `/api/v1/vaccine-definitions`
    },
    payments: {
        /** Query: `Page`, `PageSize`, `Search`, `Method`, `paidFromUtc`, `paidToUtc` (iki uç dahil) (+ `ClientId`, `PetId`, `clinicId`). */
        list: () => `/api/v1/payments`,
        byId: (id: string) => `/api/v1/payments/${encodeURIComponent(id)}`,
        /** POST `{ reason }`; 204 (`Payments.Correct`). */
        void: (id: string) => `/api/v1/payments/${encodeURIComponent(id)}/void`
    },
    sales: {
        /** GET: `page`, `pageSize`, `clientId`, `productId`, `fromUtc`, `toUtc`, `includeVoided`, `clinicId` (`Sales.Read`); POST: satış oluştur (`Sales.Create`). */
        list: () => `/api/v1/sales`,
        byId: (id: string) => `/api/v1/sales/${encodeURIComponent(id)}`,
        /** POST `{ reason, stockOutcome }`; 200 `SaleDto` (`Sales.Correct`). */
        void: (id: string) => `/api/v1/sales/${encodeURIComponent(id)}/void`,
        /** POST (`Sales.Create`); Peşin müşteriyi getirir, yoksa oluşturur. */
        walkInClient: () => `/api/v1/sales/walk-in-client`
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
        vaccinationsExportXlsx: () => `/api/v1/reports/vaccinations/export-xlsx`,
        /** Borç raporu — şu anki kalan (`clinicId`, `minAmount`, `search`, `page`, `pageSize`); izin `Charges.Read`. */
        outstandingBalances: () => `/api/v1/reports/outstanding-balances`,
        outstandingBalancesExport: () => `/api/v1/reports/outstanding-balances/export`,
        outstandingBalancesExportXlsx: () => `/api/v1/reports/outstanding-balances/export-xlsx`,
        /** Kayıt defterleri (`examinations` | `prescriptions`): liste, `/export` (CSV), `/export-xlsx`; `from`, `to` (yyyy-MM-dd), `clinicId`, `page`, `pageSize`. */
        register: (book: string) => `/api/v1/reports/registers/${book}`,
        /** Gün sonu (D6): günlük işlem dökümü (`Payments.Read` + `Charges.Read`), liste, `/export`, `/export-xlsx`; `from`, `to` (yyyy-MM-dd), `clinicId`, `kind`, `paymentMethod`, `performedByUserId`, `page`, `pageSize`. */
        dailyTransactions: () => `/api/v1/reports/daily-transactions`,
        /** Tahsilat/kasa özeti (`Payments.Read`); `from`, `to`, `clinicId`. */
        cashSummary: () => `/api/v1/reports/cash-summary`,
        /** Gün sonu açık işler (`Visits.Read`); `from`, `to`, tek klinik zorunlu. */
        endOfDayOpenItems: () => `/api/v1/reports/end-of-day/open-items`
    },
    treatments: {
        /** Query: `Page`, `PageSize`, `Search`, `dateFromUtc`, `dateToUtc` (iki uç dahil), `Sort`, `Order` (+ `clinicId`, `PetId`). */
        list: () => `/api/v1/treatments`,
        byId: (id: string) => `/api/v1/treatments/${encodeURIComponent(id)}`
    },
    prescriptions: {
        /** Query: `Page`, `PageSize`, `Search`, `dateFromUtc`, `dateToUtc` (iki uç dahil), `Sort`, `Order` (+ `clinicId`, `PetId`). */
        list: () => `/api/v1/prescriptions`,
        byId: (id: string) => `/api/v1/prescriptions/${encodeURIComponent(id)}`,
        /** GET HBS e-Reçete hazır verisi (`Prescriptions.Read`; `HBS_ASSISTANT_API_CONTRACT.md` §4). */
        hbsData: (id: string) => `/api/v1/prescriptions/${encodeURIComponent(id)}/hbs-data`,
        /** PATCH e-Reçete geri kaydı `{ status, referenceNumber, notRequiredReason }` (`Prescriptions.Update`; §5). */
        hbs: (id: string) => `/api/v1/prescriptions/${encodeURIComponent(id)}/hbs`
    },
    administrations: {
        /** GET (`Administrations.Read`; query: `Page`, `PageSize`, `clinicId`, `petId`, `examinationId`, `treatmentId`, `productId`, `includeVoided`), POST (`Administrations.Create`). */
        list: () => `/api/v1/administrations`,
        byId: (id: string) => `/api/v1/administrations/${encodeURIComponent(id)}`,
        /** POST (`Administrations.Correct`, gerekçe zorunlu); stok ters hareketle geri verilir. */
        void: (id: string) => `/api/v1/administrations/${encodeURIComponent(id)}/void`
    },
    labResults: {
        /** Query: `Page`, `PageSize`, `Search`, `Status`, `dateFromUtc`, `dateToUtc` (iki uç dahil, istem zamanı), `Sort`, `Order` (+ `clinicId`, `PetId`). */
        list: () => `/api/v1/lab-results`,
        byId: (id: string) => `/api/v1/lab-results/${encodeURIComponent(id)}`,
        cancel: (id: string) => `/api/v1/lab-results/${encodeURIComponent(id)}/cancel`,
        /** Dosya uçlarının sahip kökü (`/files`, `/files/{fileId}/content`, `/files/{fileId}/access-url`; IMAGING_API_CONTRACT.md §5). */
        filesOwner: (id: string) => `/api/v1/lab-results/${encodeURIComponent(id)}`
    },
    imagingRecords: {
        /** Query: `Page`, `PageSize`, `Search`, `clinicId`, `PetId`, `ExaminationId`, `Modality`, `Status`, `dateFromUtc`, `dateToUtc` (iki uç dahil, görüntüleme zamanı), `Sort`, `Order`. */
        list: () => `/api/v1/imaging-records`,
        byId: (id: string) => `/api/v1/imaging-records/${encodeURIComponent(id)}`,
        cancel: (id: string) => `/api/v1/imaging-records/${encodeURIComponent(id)}/cancel`,
        /** Dosya uçlarının sahip kökü (IMAGING_API_CONTRACT.md §5). */
        filesOwner: (id: string) => `/api/v1/imaging-records/${encodeURIComponent(id)}`
    },
    /** Sahip köküne göre dosya uçları (görüntüleme ve lab aynı biçim). */
    storedFiles: {
        list: (ownerPath: string) => `${ownerPath}/files`,
        upload: (ownerPath: string) => `${ownerPath}/files`,
        content: (ownerPath: string, fileId: string) => `${ownerPath}/files/${encodeURIComponent(fileId)}/content`,
        accessUrl: (ownerPath: string, fileId: string) => `${ownerPath}/files/${encodeURIComponent(fileId)}/access-url`
    },
    hospitalizations: {
        /** Query: `Page`, `PageSize`, `Search`, `dateFromUtc`, `dateToUtc` (iki uç dahil, yatış zamanı), `Sort`, `Order` (+ `clinicId`, `PetId`, `ActiveOnly`). */
        list: () => `/api/v1/hospitalizations`,
        byId: (id: string) => `/api/v1/hospitalizations/${encodeURIComponent(id)}`,
        discharge: (id: string) => `/api/v1/hospitalizations/${encodeURIComponent(id)}/discharge`
    },
    /** Klinik tanımlı yatış bölümleri ve altındaki oda/kafesler (HOSPITALIZATION_MODEL_API_CONTRACT.md §10.2). */
    hospitalizationWards: {
        /** GET: aktif/pasif tüm bölümler odalarıyla (`Clinics_HospitalizationWardsRead`); POST `{ name, sortOrder }` (`Clinics.Update`). */
        list: (clinicId: string) => `/api/v1/clinics/${encodeURIComponent(clinicId)}/hospitalization-wards`,
        /** PUT `{ name, sortOrder }`; aktif/pasif bu uçla değişmez. */
        byId: (clinicId: string, wardId: string) =>
            `/api/v1/clinics/${encodeURIComponent(clinicId)}/hospitalization-wards/${encodeURIComponent(wardId)}`,
        activate: (clinicId: string, wardId: string) =>
            `/api/v1/clinics/${encodeURIComponent(clinicId)}/hospitalization-wards/${encodeURIComponent(wardId)}/activate`,
        deactivate: (clinicId: string, wardId: string) =>
            `/api/v1/clinics/${encodeURIComponent(clinicId)}/hospitalization-wards/${encodeURIComponent(wardId)}/deactivate`,
        /** POST `{ name, sortOrder }`: bölüme oda ekler. */
        rooms: (clinicId: string, wardId: string) =>
            `/api/v1/clinics/${encodeURIComponent(clinicId)}/hospitalization-wards/${encodeURIComponent(wardId)}/rooms`,
        roomById: (clinicId: string, wardId: string, roomId: string) =>
            `/api/v1/clinics/${encodeURIComponent(clinicId)}/hospitalization-wards/${encodeURIComponent(wardId)}/rooms/${encodeURIComponent(roomId)}`,
        roomActivate: (clinicId: string, wardId: string, roomId: string) =>
            `/api/v1/clinics/${encodeURIComponent(clinicId)}/hospitalization-wards/${encodeURIComponent(wardId)}/rooms/${encodeURIComponent(roomId)}/activate`,
        roomDeactivate: (clinicId: string, wardId: string, roomId: string) =>
            `/api/v1/clinics/${encodeURIComponent(clinicId)}/hospitalization-wards/${encodeURIComponent(wardId)}/rooms/${encodeURIComponent(roomId)}/deactivate`
    },
    careInstructions: {
        /** GET (Query: `Page`, `PageSize`, `clinicId`, `petId`, `hospitalizationId`, `examinationId`, `visitId`; en yeni üstte) ve POST. */
        list: () => `/api/v1/care-instructions`,
        /** GET; PUT = metin düzeltme (`rowVersion` zorunlu). */
        byId: (id: string) => `/api/v1/care-instructions/${encodeURIComponent(id)}`
    },
    clinicalTerms: {
        /** GET (Query: `kind`, `search`, `includeInactive`, `page`, `pageSize`) ve POST `{ kind, name }`. */
        list: () => `/api/v1/clinical-terms`,
        /** PUT = ad düzeltme (`rowVersion` zorunlu). */
        byId: (id: string) => `/api/v1/clinical-terms/${encodeURIComponent(id)}`,
        activate: (id: string) => `/api/v1/clinical-terms/${encodeURIComponent(id)}/activate`,
        deactivate: (id: string) => `/api/v1/clinical-terms/${encodeURIComponent(id)}/deactivate`
    },
    examinationTemplates: {
        /** GET (Query: `search`, `includeInactive`, `page`, `pageSize`) ve POST. */
        list: () => `/api/v1/examination-templates`,
        /** GET; PUT = tam güncelleme (`lines` ve `rowVersion` zorunlu). */
        byId: (id: string) => `/api/v1/examination-templates/${encodeURIComponent(id)}`,
        activate: (id: string) => `/api/v1/examination-templates/${encodeURIComponent(id)}/activate`,
        deactivate: (id: string) => `/api/v1/examination-templates/${encodeURIComponent(id)}/deactivate`
    },
    productCategories: {
        list: () => `/api/v1/product-categories`,
        byId: (id: string) => `/api/v1/product-categories/${encodeURIComponent(id)}`,
        create: () => `/api/v1/product-categories`,
        update: (id: string) => `/api/v1/product-categories/${encodeURIComponent(id)}`,
        activate: (id: string) => `/api/v1/product-categories/${encodeURIComponent(id)}/activate`,
        deactivate: (id: string) => `/api/v1/product-categories/${encodeURIComponent(id)}/deactivate`
    },
    products: {
        /** Query: `Page`, `PageSize`, `Search` (+ `ProductCategoryId`, `IsActive` — backend ile uyumlu). */
        list: () => `/api/v1/products`,
        byId: (id: string) => `/api/v1/products/${encodeURIComponent(id)}`,
        create: () => `/api/v1/products`,
        update: (id: string) => `/api/v1/products/${encodeURIComponent(id)}`,
        activate: (id: string) => `/api/v1/products/${encodeURIComponent(id)}/activate`,
        deactivate: (id: string) => `/api/v1/products/${encodeURIComponent(id)}/deactivate`,
        stocks: (id: string) => `/api/v1/products/${encodeURIComponent(id)}/stocks`,
        stockMovements: (id: string) => `/api/v1/products/${encodeURIComponent(id)}/stock-movements`,
        /** GET `?clinicId=` — parti bakiyesi (FEFO sıralı) + partisiz bakiye (`StockMovements.Read`). */
        stockBatches: (id: string) => `/api/v1/products/${encodeURIComponent(id)}/stock-batches`
    },
    productStocks: {
        list: () => `/api/v1/product-stocks`,
        updateMinimumStockLevel: (id: string) =>
            `/api/v1/product-stocks/${encodeURIComponent(id)}/minimum-stock-level`
    },
    stockMovements: {
        list: () => `/api/v1/stock-movements`,
        create: () => `/api/v1/stock-movements`
    },
    goodsReceipts: {
        /** POST — çok satırlı mal kabul, hepsi ya da hiçbiri; 201 yeni, 200 aynı `requestId` tekrarı (`GOODS_RECEIPT_API_CONTRACT.md`). */
        create: () => `/api/v1/goods-receipts`
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
        cancelSubscriptionCheckout: (tenantId: string, checkoutSessionId: string) =>
            `/api/v1/tenants/${encodeURIComponent(tenantId)}/subscription-checkout/${encodeURIComponent(checkoutSessionId)}/cancel`,
        scheduleSubscriptionDowngrade: (tenantId: string) =>
            `/api/v1/tenants/${encodeURIComponent(tenantId)}/subscription-plan-change/downgrade`,
        pendingSubscriptionPlanChange: (tenantId: string) =>
            `/api/v1/tenants/${encodeURIComponent(tenantId)}/subscription-plan-change/pending`,
        /** Query: `Page`, `PageSize`, `Search` — kiracı kullanıcı üyeleri (salt liste). */
        members: (tenantId: string) => `/api/v1/tenants/${encodeURIComponent(tenantId)}/members`,
        /** GET: tek kiracı üyesi detayı (rol/claim ve klinik üyelikleri backend gönderirse). */
        memberById: (tenantId: string, memberId: string) =>
            `/api/v1/tenants/${encodeURIComponent(tenantId)}/members/${encodeURIComponent(memberId)}`,
        /** DELETE: kiracı üyeliğini kaldırır (`/members/{memberId}`). */
        memberRemove: (tenantId: string, memberId: string) =>
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
            `/api/v1/tenants/${encodeURIComponent(tenantId)}/assignable-role-permission-matrix`,
        /** GET: panel salt okunur / yazma kilit durumu (abonelik özetinden bağımsız). */
        accessState: (tenantId: string) => `/api/v1/tenants/${encodeURIComponent(tenantId)}/access-state`,
        /** GET (`Subscriptions.Read`) ve POST `{ code }` (`Subscriptions.Manage`): satış ortağı kodu (`SALES_PARTNER_DISCOUNT_API_CONTRACT.md` §4). */
        subscriptionDiscount: (tenantId: string) => `/api/v1/tenants/${encodeURIComponent(tenantId)}/subscription-discount`,
        /** POST gövdesiz (`Subscriptions.Manage`): boş deneme kiracısına Örnek Veteriner Kliniğini yükler (`EXAMPLE_CLINIC_API_CONTRACT.md` §4). */
        exampleClinic: (tenantId: string) => `/api/v1/tenants/${encodeURIComponent(tenantId)}/example-clinic`
    },
    /** Platform yöneticisi: satış ortakları ve indirim kodları (`SALES_PARTNER_DISCOUNT_API_CONTRACT.md` §5). */
    salesPartners: {
        list: () => `/api/v1/admin/sales-partners`,
        byId: (id: string) => `/api/v1/admin/sales-partners/${encodeURIComponent(id)}`,
        codes: (id: string) => `/api/v1/admin/sales-partners/${encodeURIComponent(id)}/codes`,
        codeById: (id: string, codeId: string) =>
            `/api/v1/admin/sales-partners/${encodeURIComponent(id)}/codes/${encodeURIComponent(codeId)}`,
        codeDeactivate: (id: string, codeId: string) =>
            `/api/v1/admin/sales-partners/${encodeURIComponent(id)}/codes/${encodeURIComponent(codeId)}/deactivate`,
        codeActivate: (id: string, codeId: string) =>
            `/api/v1/admin/sales-partners/${encodeURIComponent(id)}/codes/${encodeURIComponent(codeId)}/activate`,
        redemptions: (id: string) => `/api/v1/admin/sales-partners/${encodeURIComponent(id)}/redemptions`,
        markPaid: (id: string) => `/api/v1/admin/sales-partners/${encodeURIComponent(id)}/commissions/mark-paid`,
        cancelCollection: (id: string, collectionId: string) =>
            `/api/v1/admin/sales-partners/${encodeURIComponent(id)}/collections/${encodeURIComponent(collectionId)}/cancel`,
        /** GET CSV; Query `partnerId` (yoksa tüm ortaklar). */
        exportCsv: () => `/api/v1/admin/sales-partners/export.csv`
    },
    /** Platform yöneticisi: deneme aktivasyon özeti (`TRIAL_ACTIVATION_METRICS_API_CONTRACT.md` §3); Query `fromUtc`/`toUtc`. */
    trialMetrics: {
        summary: () => `/api/v1/admin/trial-metrics`
    },
    public: {
        ownerSignup: () => `/api/v1/public/owner-signup`,
        /** Anonim, hız sınırlı: satış ortağı kodu doğrulama; geçersizde tek tip yanıt. */
        validateDiscountCode: () => `/api/v1/public/discount-codes/validate`,
        /** Anonim: hukuki belgelerin güncel sürümleri (`LEGAL_ACCEPTANCE_API_CONTRACT.md` §3). */
        legalDocuments: () => `/api/v1/public/legal-documents`,
        /** Anonim, hız sınırlı (IP başına 10 dakikada 3): canlı demo talebi, 204 (`TRIAL_DEMO_REQUEST_API_CONTRACT.md`). */
        demoRequests: () => `/api/v1/public/demo-requests`,
        inviteByToken: (token: string) => `/api/v1/public/invites/${encodeURIComponent(token)}`,
        inviteAccept: (token: string) => `/api/v1/public/invites/${encodeURIComponent(token)}/accept`,
        inviteSignupAndAccept: (token: string) => `/api/v1/public/invites/${encodeURIComponent(token)}/signup-and-accept`
    }
} as const;
