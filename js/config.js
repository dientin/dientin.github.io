// Pegá acá la config web de Firebase (Consola > Configuración del proyecto > Tus apps > Web).
// Estos valores son públicos por diseño; la seguridad está en firestore.rules.
// Si apiKey queda vacío, la app corre en "modo demo" con datos solo en este navegador.
export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  appId: "",
};

// Cloudinary: nombre de la cuenta y un upload preset UNSIGNED. Nunca pongas el API secret acá.
export const cloudinary = {
  cloudName: "",
  uploadPreset: "",
};

// Horario de la agenda (minutos desde 00:00) y largo de cada bloque.
export const agenda = { start: 9 * 60, end: 20 * 60, step: 30 };
