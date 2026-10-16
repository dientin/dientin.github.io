# Dientin App

Sitio estático en GitHub Pages: github.com/dientin/dientin.github.io (rama main = producción).
Firebase (Auth Google + Firestore, plan gratis, sin Storage) y Cloudinary (fotos/videos, preset unsigned).

- Después de cada cambio pedido: commit y push directo a main (producción), sin preguntar.
- Versiones: el hook .git/hooks/pre-commit corre scripts/bump.sh (nueva versión en index.html y version.json); la app avisa "Hay una versión nueva". Si se clona de nuevo, reinstalar el hook.
- Sin build: index.html, css/app.css, js/app.js, js/config.js. Reglas en firestore.rules.
