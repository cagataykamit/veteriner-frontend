import { Routes } from '@angular/router';
import { PetDetailPageComponent } from '@/app/features/pets/pages/pet-detail-page/pet-detail-page.component';
import { PetEditPageComponent } from '@/app/features/pets/pages/pet-edit-page/pet-edit-page.component';
import { PetNewPageComponent } from '@/app/features/pets/pages/pet-new-page/pet-new-page.component';
import { PetsListPageComponent } from '@/app/features/pets/pages/pets-list-page/pets-list-page.component';

export default [
    { path: '', component: PetsListPageComponent },
    { path: 'new', component: PetNewPageComponent },
    { path: ':id/edit', component: PetEditPageComponent },
    { path: ':id', component: PetDetailPageComponent }
] as Routes;
