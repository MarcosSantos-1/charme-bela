/** Compatível com firebase/auth ApplicationVerifier */
export interface FirebaseAuthApplicationVerifier {
  readonly type: string;
  verify(): Promise<string>;
}

export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
};
