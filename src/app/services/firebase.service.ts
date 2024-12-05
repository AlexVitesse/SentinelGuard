import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup,GoogleAuthProvider, 
  sendPasswordResetEmail, signOut,signInWithRedirect, getRedirectResult,
} from 'firebase/auth';
import { getDatabase, ref, set, onValue, get, onChildAdded, onChildChanged, onChildRemoved,
  update
} from "firebase/database";
import { environment } from 'src/environments/environment';
import { Subject } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private dataChanges = new Subject<any>(); // Subject para emitir datos en tiempo real
  dataChanges$ = this.dataChanges.asObservable(); // Observable que el componente puede suscribirse

  oApp = initializeApp(environment.firestore);

  odatabase = getDatabase(this.oApp);

  oAuth = getAuth(this.oApp);
  constructor() {}

  async createUserWithEmailAndPassword(email: string, password: string): Promise<void> {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.oAuth, email, password);
      const user = userCredential.user;
  
      // Datos del usuario para guardar en la base de datos
      const userData = {
        email: email,
        Dispositivos: []
      };
  
      // Guardar los datos en la base de datos
      const userRef = ref(this.odatabase, 'Usuarios/' + user.uid);
      await set(userRef, userData);
  
      console.log('User creado y datos guardados:', user.uid);
    } catch (error) {
      console.error('Error creando usuario o guardando datos:', error.code, error.message);
      // Lanza el error para manejarlo en el componente
      throw error;
    }
  }
  
  
  
  signInWithEmailAndPassword(email: string, password: string): Promise<any> {
    return signInWithEmailAndPassword(this.oAuth, email, password)
      .then((userCredential) => {
        // Retornar el objeto de credencial del usuario
        const user = userCredential.user;
        console.log('User signed in:', user.uid);
        return userCredential; // Asegúrate de devolver esto
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error('Error signing in:', errorCode, errorMessage);
        // Retornar el error para manejarlo en el componente
        throw new Error(errorMessage);
      });
  }
  
/*
  async signInWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    try {
      // Esperamos a que el usuario se autentique con Google
      const result = await signInWithPopup(this.oAuth, provider);
  
      // Usuario autenticado exitosamente
      const user = result.user;
      console.log('User signed in with Google:', user.uid);
  
      // Ruta para el usuario en la base de datos
      const userPath = 'Usuarios/' + user.uid;
  
      // Verificar si el usuario ya existe en la base de datos
      try {
        const existingUserData = await this.readData(userPath);
  
        // Si el usuario ya existe, omitir la creación y solo loguear el mensaje
        console.log('User already exists in database:', user.uid, existingUserData);
  
      } catch (error) {
        // Si ocurre un error, significa que el usuario no existe, por lo que lo creamos
        console.log('User not found in database, creating new entry.');
  
        const userData = {
          email: user.email,
          Dispositivos: []
        };
  
        // Escribir los datos en la base de datos de Realtime Database
        const userRef = ref(this.odatabase, userPath);
        await set(userRef, userData);
        console.log('User data written:', user.uid);
      }
  
    } catch (error) {
      console.error('Error signing in with Google:', error.code, error.message);
      // Manejo del error de autenticación o escritura
    }
  }*/
  // Método de inicio de sesión con Google usando signInWithRedirect
  async signInWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    try {
      // Iniciar la redirección para autenticación con Google
      await signInWithRedirect(this.oAuth, provider);
    } catch (error) {
      console.error('Error initiating Google sign-in redirect:', error.code, error.message);
    }
  }

  // Método para obtener el resultado de autenticación después de la redirección
  async handleRedirectResult(): Promise<void> {
    try {
      const result = await getRedirectResult(this.oAuth);
      
      if (result) {
        // Usuario autenticado exitosamente
        const user = result.user;
        console.log('User signed in with Google:', user.uid);

        const userPath = 'Usuarios/' + user.uid;

        // Verificar si el usuario ya existe en la base de datos
        try {
          const existingUserData = await this.readData(userPath);
          console.log('User already exists in database:', user.uid, existingUserData);
        } catch (error) {
          console.log('User not found in database, creating new entry.');
          const userData = {
            email: user.email,
            Dispositivos: []
          };
          
          const userRef = ref(this.odatabase, userPath);
          await set(userRef, userData);
          console.log('User data written:', user.uid);
        }
      }
    } catch (error) {
      console.error('Error handling Google sign-in redirect result:', error.code, error.message);
    }
  }
  
  sendPasswordResetEmail(email: string): Promise<void> {
    return sendPasswordResetEmail(this.oAuth, email)
      .then(() => {
        console.log('Password reset email sent successfully');
        // Perform additional actions, such as displaying a success message
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error('Error sending password reset email:', errorCode, errorMessage);
        // Handle error gracefully, e.g., display an error message to the user
      });
  }

  logOut(): Promise<void> {
    return signOut(this.oAuth)
      .then(() => {
        console.log('Sign-out successful');
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
        // Perform additional actions, such as displaying a success message
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error('Error sending password reset email:', errorCode, errorMessage);
        // Handle error gracefully, e.g., display an error message to the user
      });
  }

  // Método genérico para escribir datos
  writeData(path: string, data: any): Promise<void> {
    const dbRef = ref(this.odatabase, path); // Crea la referencia a la ruta especificada
    return set(dbRef, data)
      .then(() => {
        console.log('Data written successfully at', path);
      })
      .catch((error) => {
        console.error('Error writing data:', error.message);
        throw error;
      });
  }

  // Lectura única mejorada
async readData(path: string): Promise<any | null> {
  const dbRef = ref(this.odatabase, path);
  try {
    const snapshot = await get(dbRef);
    if (snapshot.exists()) {
      console.log('Datos leídos exitosamente:', snapshot.val());
      return snapshot.val();
    } else {
      console.log('El nodo no existe:', path);
      return null; // Retornar null si el nodo no existe
    }
  } catch (error) {
    console.error('Error al leer los datos una vez:', error);
    throw error;
  }
}


  // Suscripción a los cambios en tiempo real usando diferentes eventos
  readDataAndSubscribe(path: string) {
    const dbRef = ref(this.odatabase, path);

    // `onChildAdded` se activa cuando se agrega un nuevo hijo
    onChildAdded(dbRef, (snapshot) => {
      const data = snapshot.val();
      console.log('Nuevo dato agregado:', data);
      // Lógica para manejar el nuevo dato
    });

    // `onChildChanged` se activa cuando un hijo existente cambia
    onChildChanged(dbRef, (snapshot) => {
      const data = snapshot.val();
      console.log('Dato modificado:', data);
      // Lógica para manejar el cambio de datos
    });

    // `onChildRemoved` se activa cuando un hijo es eliminado
    onChildRemoved(dbRef, (snapshot) => {
      console.log('Dato eliminado:', snapshot.key);
      // Lógica para manejar la eliminación del dato
    });

    // `onValue` para monitorizar cambios en el nodo completo
    onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      console.log('Cambio en el nodo completo:', data);
      this.dataChanges.next(data); // Emitir el dato cambiado al observable
      // Lógica para manejar el cambio en el nodo completo
    }, (error) => {
      console.error('Error al suscribirse a los cambios del nodo completo:', error);
    });
  }

  // Método para actualizar datos en Firebase
updateData(path: string, data: any): Promise<void> {
  const dbRef = ref(this.odatabase, path); // Crea la referencia a la ruta especificada
  return update(dbRef, data)
    .then(() => {
      console.log('Data updated successfully at', path);
    })
    .catch((error) => {
      console.error('Error updating data:', error.message);
      throw error;
    });
}

// Método para borrar datos en Firebase
deleteData(path: string): Promise<void> {
  const dbRef = ref(this.odatabase, path); // Crea la referencia a la ruta especificada
  return set(dbRef, null) // Establece el valor como null para borrar
    .then(() => {
      console.log('Data deleted successfully at', path);
    })
    .catch((error) => {
      console.error('Error deleting data:', error.message);
      throw error;
    });
}

}