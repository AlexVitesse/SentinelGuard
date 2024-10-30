import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CongifuracionPage } from './congifuracion.page';

const routes: Routes = [
  {
    path: '',
    component: CongifuracionPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CongifuracionPageRoutingModule {}
