import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { CongifuracionPageRoutingModule } from './congifuracion-routing.module';

import { CongifuracionPage } from './congifuracion.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CongifuracionPageRoutingModule
  ],
  declarations: [CongifuracionPage]
})
export class CongifuracionPageModule {}
