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
  // Define customCounterFormatter
  customCounterFormatter(current: number, max: number): string {
    return `${current} de ${max} caracteres permitidos`;
  }
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
    this.firestoreService.handleRedirectResult();
    if (authToken) {
      console.log('Aquí te dirige automáticamente al home');
      //COMENTADO PARA LAS PRUEBAS
      this.navCtrl.navigateRoot('/divices');
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

  async checkDevices(path: string): Promise<void> {
    const userPath = 'Usuarios/' + path;
    console.log(userPath);
  
    try {
      const readData = await this.firestoreService.readData(userPath);
  
      // Verificar si la propiedad "Dispositivos" existe y si contiene elementos
      if (readData.Dispositivos && readData.Dispositivos.length > 0) {
        console.log('Dispositivos encontrados:', readData.Dispositivos);
        localStorage.setItem('uid', path ); // Guardar UID en localStorage
        // Redirigir a la página correspondiente si existen dispositivos
        this.navCtrl.navigateRoot('/divices'); 
      } else {
        console.log('No se encontraron dispositivos registrados');
        localStorage.setItem('uid', path ); // Guardar UID en localStorage
        // Redirigir a otra página si no existen dispositivos
        this.navCtrl.navigateRoot('/home');
      }
    } catch (error) {
      console.error('Error reading data:', error);
    }
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
      const token = await user.getIdToken();
      const id = await user.uid;
      if (user) {
        

        if (this.rememberMe) {
          localStorage.setItem('authToken', token);
        } else {
          sessionStorage.setItem('authToken', token);
        }
      }

      await loading.dismiss();
      console.log('Id:', id);
      this.checkDevices(id);

    } catch (err) {
      await loading.dismiss();
      this.showToast('Error al iniciar sesión. Verifica tus credenciales.');
    }
  }
/*
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
    }*/
      async register() {
        const loading = await this.loadingCtrl.create({
          message: 'Creando cuenta...',
        });
        await loading.present();
      
        try {
          // Llama al servicio para crear el usuario
          await this.firestoreService.createUserWithEmailAndPassword(this.email, this.password);
      
          // Si tiene éxito, muestra el mensaje y cierra el modal
          this.showToast('Cuenta creada exitosamente. Por favor, inicia sesión.');
          await loading.dismiss();
          await this.modal.dismiss();
        } catch (error) {
          await loading.dismiss();
      
          // Manejo de errores según el código de error de Firebase
          if (error.code === 'auth/email-already-in-use') {
            this.showToast('El correo ya está en uso. Por favor, usa otro correo.');
          } else if (error.code === 'auth/invalid-email') {
            this.showToast('El correo electrónico no es válido.');
          } else if (error.code === 'auth/weak-password') {
            this.showToast('La contraseña es muy débil. Por favor, usa una más segura.');
          } else {
            this.showToast('Error al crear la cuenta. Intenta de nuevo.');
          }
        }
      }
      

  async loginWithGoogle() {
    try {
      const loading = await this.loadingCtrl.create({
        message: 'Iniciando con Google...',
      });
      await loading.present();

      await this.firestoreService.signInWithGoogle();
      const user = this.firestoreService.oAuth.currentUser;
      const id = await user.uid;

      await loading.dismiss();
      console.log('Id:', id);
      this.checkDevices(id);

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
    this.firestoreService.logOut();
    await this.navCtrl.navigateRoot('/login');
    this.showToast('LOGOUT');
  }
}
