import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then(m => m.HomePageModule)
  },
  {
    path: 'divices',
    loadChildren: () => import('./divices/divices.module').then(m => m.DivicesPageModule)
  },
  {
    path: 'congifuracion',
    loadChildren: () => import('./congifuracion/congifuracion.module').then(m => m.CongifuracionPageModule)
  },
  {
    path: '',
    redirectTo: 'home',  // Cambia 'home' a 'login'
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./login/login.module').then(m => m.LoginPageModule)
  },
];



@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
