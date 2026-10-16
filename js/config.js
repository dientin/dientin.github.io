// Pegá acá la config web de Firebase (Consola > Configuración del proyecto > Tus apps > Web).
// Estos valores son públicos por diseño; la seguridad está en firestore.rules.
// Si apiKey queda vacío, la app corre en "modo demo" con datos solo en este navegador.
export const firebaseConfig = {
  apiKey: "AIzaSyCQ_XH6ys1xbCCR-AEnz9RdGThMltwzddk",
  authDomain: "dientin-web.firebaseapp.com",
  projectId: "dientin-web",
  appId: "1:257035389969:web:0f4a48cad9b360c9f3f5b0",
};

// Cloudinary: nombre de la cuenta y un upload preset UNSIGNED. Nunca pongas el API secret acá.
export const cloudinary = {
  cloudName: "ousk7jny",
  uploadPreset: "dientin",
};

// Horario de la agenda (minutos desde 00:00) y largo de cada bloque.
export const agenda = { start: 9 * 60, end: 20 * 60, step: 30 };
