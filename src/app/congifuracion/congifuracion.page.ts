import { Component, OnInit } from '@angular/core'; // Importa Component y OnInit desde Angular core para crear componentes y manejar el ciclo de vida.
import { ToastController } from '@ionic/angular'; // Importa ToastController desde Ionic para mostrar notificaciones tipo toast.
import { FirestoreService } from '../services/firebase.service'; // Importa el servicio FirestoreService para interactuar con Firebase.

@Component({
  selector: 'app-congifuracion', // Selector del componente para usarlo en plantillas HTML.
  templateUrl: './congifuracion.page.html', // Ruta al archivo de plantilla HTML del componente.
  styleUrls: ['./congifuracion.page.scss'], // Ruta al archivo de estilos SCSS del componente.
})
export class CongifuracionPage implements OnInit {
  exitTime: number = 60; // Tiempo de salida, valor por defecto 60.
  prealarmTime: number = 60; // Tiempo de prealarma, valor por defecto 60.
  nombre: string = ''; // Nombre, valor por defecto vacío.
  telegramId: string = ''; // ID de Telegram, valor por defecto vacío.
  groupId: string = ''; // ID de grupo, valor por defecto vacío.
  mac: string = ''; // Dirección MAC, valor por defecto vacío.

  constructor(
    private toastController: ToastController, // Inyecta ToastController para mostrar notificaciones.
    private firestoreService: FirestoreService // Inyecta FirestoreService para interactuar con Firebase.
  ) {}

  ngOnInit() {
    this.mac = localStorage.getItem('mac') || ''; // Obtiene la dirección MAC del almacenamiento local o usa una cadena vacía si no existe.
    console.log('MAC cargada:', this.mac); // Imprime la MAC en la consola para depuración.
    this.loadConfig(); // Llama al método para cargar la configuración.
  }

  async loadConfig() {
    const path = `ESP32/${this.mac}`; // Construye la ruta en Firebase usando la dirección MAC.
    console.log('Ruta en Firebase:', path); // Imprime la ruta en la consola para depuración.

    try {
      const firebaseData = await this.firestoreService.readData(path); // Intenta leer los datos desde Firebase.
      if (firebaseData) {
        this.assignConfigValues(firebaseData); // Si hay datos, los asigna a las propiedades del componente.
        console.log('Datos cargados desde Firebase:', firebaseData); // Imprime los datos cargados en la consola.
      } else {
        this.loadLocalConfig(); // Si no hay datos en Firebase, carga la configuración local.
        console.log('No se encontraron datos en Firebase, usando valores locales.');
      }
    } catch (error) {
      console.error('Error al leer los datos desde Firebase:', error); // Maneja errores al leer desde Firebase.
      this.loadLocalConfig(); // Carga la configuración local en caso de error.
      await this.presentToast('Error al cargar configuración desde Firebase', 'danger'); // Muestra un toast de error.
    }
  }

  loadLocalConfig() {
    const configKeys = ['exitTime', 'prealarmTime', 'nombre', 'telegramId', 'groupId']; // Lista de claves de configuración.
    configKeys.forEach(key => {
      const savedValue = localStorage.getItem(key); // Obtiene el valor almacenado en localStorage para cada clave.
      if (savedValue) {
        this[key] = key.includes('Time') ? parseInt(savedValue, 10) : savedValue; // Asigna el valor, convirtiendo a número si es un campo de tiempo.
      }
    });
    console.log('Datos cargados desde almacenamiento local.'); // Imprime un mensaje en la consola.
  }

  async saveConfig() {
    if (!this.validateConfig()) {
      await this.presentToast('Error: Valores fuera de rango o campos vacíos', 'danger'); // Valida la configuración y muestra un toast si es inválida.
      return;
    }

    const configData = {
      exitTime: this.exitTime.toString(), // Convierte el tiempo de salida a cadena.
      prealarmTime: this.prealarmTime.toString(), // Convierte el tiempo de prealarma a cadena.
      nombre: this.nombre, // Nombre.
      telegramId: this.telegramId, // ID de Telegram.
      groupId: this.groupId, // ID de grupo.
    };

    // Guardar en localStorage
    Object.entries(configData).forEach(([key, value]) => localStorage.setItem(key, value)); // Guarda cada valor en localStorage.

    // Guardar en Firebase
    const firebaseData = {
      Group_ID: this.groupId, // ID de grupo.
      Nombre: this.nombre, // Nombre.
      Telegram_ID: this.telegramId, // ID de Telegram.
      Tiempo_Bomba: this.exitTime, // Tiempo de salida.
      Tiempo_pre: this.prealarmTime, // Tiempo de prealarma.
    };

    const path = `ESP32/${this.mac}`; // Ruta en Firebase.

    try {
      await this.firestoreService.updateData(path, firebaseData); // Intenta guardar los datos en Firebase.
      console.log('Configuración guardada exitosamente en Firebase'); // Imprime un mensaje de éxito en la consola.
      await this.presentToast('Configuración guardada exitosamente', 'success'); // Muestra un toast de éxito.
    } catch (error) {
      console.error('Error al guardar configuración en Firebase:', error); // Maneja errores al guardar en Firebase.
      await this.presentToast('Error al guardar configuración en Firebase', 'danger'); // Muestra un toast de error.
    }
  }

  validateConfig(): boolean {
    const isValidNumber = (value: number, min: number, max: number) => value >= min && value <= max; // Función para validar números dentro de un rango.
    const isValidString = (value: string) => value.trim() !== ''; // Función para validar cadenas no vacías.

    return (
      isValidNumber(this.exitTime, 0, 180) && // Valida el tiempo de salida.
      isValidNumber(this.prealarmTime, 10, 600) && // Valida el tiempo de prealarma.
      isValidString(this.nombre) && // Valida el nombre.
      isValidString(this.telegramId) && // Valida el ID de Telegram.
      isValidString(this.groupId) // Valida el ID de grupo.
    );
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message: message, // Mensaje a mostrar.
      duration: 2000, // Duración del toast en milisegundos.
      color: color, // Color del toast (success, danger, etc.).
      position: 'bottom', // Posición del toast en la pantalla.
    });
    toast.present(); // Muestra el toast.
  }

  private assignConfigValues(data: any) {
    this.exitTime = data.Tiempo_Bomba || this.exitTime; // Asigna el tiempo de salida desde Firebase o usa el valor por defecto.
    this.prealarmTime = data.Tiempo_pre || this.prealarmTime; // Asigna el tiempo de prealarma desde Firebase o usa el valor por defecto.
    this.nombre = data.Nombre || this.nombre; // Asigna el nombre desde Firebase o usa el valor por defecto.
    this.telegramId = data.Telegram_ID || this.telegramId; // Asigna el ID de Telegram desde Firebase o usa el valor por defecto.
    this.groupId = data.Group_ID || this.groupId; // Asigna el ID de grupo desde Firebase o usa el valor por defecto.
  }
}