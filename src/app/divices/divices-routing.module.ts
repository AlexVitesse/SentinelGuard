import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DivicesPage } from './divices.page';

const routes: Routes = [
  {
    path: '',
    component: DivicesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DivicesPageRoutingModule {}
