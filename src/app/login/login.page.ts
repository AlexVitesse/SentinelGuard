import { Component, OnInit, ViewChild } from '@angular/core';
import { NavController, LoadingController, ToastController, AlertController, IonModal } from '@ionic/angular';
import { FirestoreService } from '../services/firebase.service';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  email: string = '';
  password: string = '';
  rememberMe: boolean = false;
  presentingElement = null;
  @ViewChild('modal') modal: IonModal;

  constructor(
    private navCtrl: NavController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private firestoreService: FirestoreService
  ) {}

  ngOnInit() {
    const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (authToken) {
      console.log('Aquí te dirige automáticamente al home');
      //COMENTADO PARA LAS PRUEBAS
      //this.navCtrl.navigateRoot('/home');
    }
    this.presentingElement = document.querySelector('.ion-page');
  }

  async showToast(message: string, duration: number = 3000) {
    const toast = await this.toastCtrl.create({
      message,
      duration,
      position: 'bottom'
    });
    toast.present();
  }

  async onSubmit(loginForm: NgForm) {
    if (!loginForm.valid) {
      return;
    }

    if (!this.email || !this.password) {
      this.showToast('Por favor, ingresa un correo y contraseña válidos.');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Iniciando sesión...',
    });
    await loading.present();

    try {
      console.log('Email:', this.email);
      console.log('Password:', this.password);

      await this.firestoreService.signInWithEmailAndPassword(this.email, this.password);

      const user = this.firestoreService.oAuth.currentUser;
      if (user) {
        const token = await user.getIdToken();

        if (this.rememberMe) {
          localStorage.setItem('authToken', token);
        } else {
          sessionStorage.setItem('authToken', token);
        }
      }

      await loading.dismiss();
      this.navCtrl.navigateRoot('/home');

    } catch (err) {
      await loading.dismiss();
      this.showToast('Error al iniciar sesión. Verifica tus credenciales.');
    }
  }

  async register() {
    const loading = await this.loadingCtrl.create({
      message: 'Creando cuenta...',
    });
    await loading.present();

    try {
      await this.firestoreService.createUserWithEmailAndPassword(this.email, this.password);
      this.showToast('Cuenta creada exitosamente. Por favor, inicia sesión.');
      await loading.dismiss();
      await this.modal.dismiss();
    } catch (err) {
      await loading.dismiss();
      this.showToast('Error al crear la cuenta.');
    }
  }

  async loginWithGoogle() {
    try {
      const loading = await this.loadingCtrl.create({
        message: 'Iniciando con Google...',
      });
      await loading.present();

      await this.firestoreService.signInWithGoogle();

      await loading.dismiss();
      this.navCtrl.navigateRoot('/home');

    } catch (err) {
      this.showToast('Error al iniciar sesión con Google.');
    }
  }

  async forgotPassword() {
    try {
      const alert = await this.alertCtrl.create({
        header: 'Ingrese su correo',
        inputs: [
          {
            name: 'email',
            type: 'email',
            placeholder: 'Correo electrónico',
          },
        ],
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel',
          },
          {
            text: 'Aceptar',
            handler: async (data) => {
              this.email = data.email;
              if (!this.email) {
                this.showToast('Por favor, ingresa un correo válido.');
                return false;
              }

              const loading = await this.loadingCtrl.create({
                message: 'Enviando correo de recuperación...',
              });
              await loading.present();

              try {
                await this.firestoreService.sendPasswordResetEmail(this.email);
                this.showToast('Correo de recuperación enviado.');

              } catch (err) {
                this.showToast('Error al enviar el correo de recuperación.');

              } finally {
                await loading.dismiss();
              }
              return true;
            },
          },
        ],
      });

      await alert.present();

    } catch (err) {
      this.showToast('Error al mostrar el diálogo de correo electrónico.');
    }
  }

  async logout() {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    await this.navCtrl.navigateRoot('/login');
    this.showToast('LOGOUT');
  }
}
