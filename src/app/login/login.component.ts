import { Component, OnInit } from '@angular/core';
import { NavController, LoadingController, ToastController } from '@ionic/angular';
// import { AngularFireAuth } from '@angular/fire/compat/auth'; // Descomentar si usas AngularFire para autenticación

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',  // Cambia el nombre del template a login.component.html
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  email: string = '';
  password: string = '';

  constructor(
    private navCtrl: NavController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    // private afAuth: AngularFireAuth // Descomentar si usas Firebase
  ) {}

  ngOnInit() {}

  async onSubmit() {
    const loading = await this.loadingCtrl.create({
      message: 'Iniciando sesión...',
    });
    await loading.present();

    try {
      // Aquí iría el código para autenticar con Firebase si lo usas
      // const result = await this.afAuth.signInWithEmailAndPassword(this.email, this.password);
      await loading.dismiss();

      // Simulación de inicio de sesión exitoso
      this.navCtrl.navigateRoot('/home');

    } catch (err) {
      await loading.dismiss();
      const toast = await this.toastCtrl.create({
        message: 'Error al iniciar sesión. Por favor, verifica tus credenciales.',
        duration: 3000,
        position: 'bottom'
      });
      toast.present();
    }
  }
}
