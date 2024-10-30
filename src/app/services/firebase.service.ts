import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup,GoogleAuthProvider, 
  sendPasswordResetEmail, signOut
} from 'firebase/auth';
import { environment } from 'src/environments/environment';


@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  oApp = initializeApp(environment.firestore);

  oAuth = getAuth(this.oApp)
  constructor() {}

  createUserWithEmailAndPassword(email: string, password: string): Promise<void> {
    return createUserWithEmailAndPassword(this.oAuth, email, password)
      .then((userCredential) => {
        // Signed in
        const user = userCredential.user;
        console.log('User created:', user.uid);
        // Perform additional actions, such as setting user data or navigating
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error('Error creating user:', errorCode, errorMessage);
        // Handle error gracefully, e.g., display an error message to the user
      });
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
  

  signInWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(this.oAuth, provider)
      .then((result) => {
        // Signed in successfully
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential.accessToken;
        const user = result.user;
        console.log('User signed in with Google:', user.uid);
        // Perform additional actions, such as storing user data or routing
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error('Error signing in with Google:', errorCode, errorMessage);   

        // Handle error gracefully, e.g., display an error message to the user
      });
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
        // Perform additional actions, such as displaying a success message
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error('Error sending password reset email:', errorCode, errorMessage);
        // Handle error gracefully, e.g., display an error message to the user
      });
  }
}