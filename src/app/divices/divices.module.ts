import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DivicesPageRoutingModule } from './divices-routing.module';

import { DivicesPage } from './divices.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DivicesPageRoutingModule
  ],
  declarations: [DivicesPage]
})
export class DivicesPageModule {}
