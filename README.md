# 🏈 RIVERS App - Sistema de Gestión y Asistencia

Rivers App es una Progressive Web App (PWA) de alto rendimiento diseñada específicamente para el control táctico, operativo y de asistencia del equipo Rivers Tochito Club. Desarrollada con un enfoque "Mobile-First", optimizada para hardware estándar y trabajo de campo sin conexión.

## 🚀 Características Principales

* **Offline-First (Modo Supervivencia):** El trabajo de campo exige soluciones sin internet. La app utiliza un Service Worker avanzado e IndexedDB para almacenar registros de asistencia localmente cuando se pierde la señal, sincronizando automáticamente con la base de datos al recuperar la conexión.
* **Check-In por Geolocalización:** Validación estricta de asistencia mediante escaneo QR acoplado a coordenadas GPS (Haversine Formula) para evitar registros remotos no autorizados.
* **Panel Táctico (Coach Panel):** Acceso encriptado mediante PIN para métricas globales, configuración de parámetros de sesión (tolerancia, horarios, ubicaciones) y emisión de avisos oficiales al equipo.
* **Exportación de Datos:** Generación inmediata de reportes de asistencia en formato `.csv` para análisis de rendimiento y métricas del jugador.
* **UI/UX Glassmorphism:** Interfaz inmersiva, oscura y de alto contraste diseñada para reducir la fatiga visual y mantener legibilidad bajo luz solar directa.

## 🛠 Arquitectura Tecnológica

* **Frontend:** HTML5, Tailwind CSS (vía CDN), Vanilla JavaScript.
* **Backend / DB:** API RESTful conectada a Google Sheets (vía SheetBest) para almacenamiento persistente y análisis estadístico.
* **Despliegue:** CI/CD gestionado mediante GitHub y Vercel.
* **Hardware Objetivo:** Optimizado para dispositivos móviles (probado en Redmi 13C y similares).

## ⚙️ Instalación y Uso Local

Al ser una PWA, la instalación no requiere tiendas de aplicaciones.

1. Ingresa al dominio de producción desde un navegador móvil (Chrome/Safari).
2. Selecciona "Agregar a la pantalla principal" o "Instalar Aplicación".
3. La aplicación configurará su entorno local, caché estático y bases de datos IndexedDB automáticamente.

---
*C.E.R.C. (Contexto, Enfoque, Resultado, Colaboración) - Metodología aplicada al desarrollo deportivo y operativo.*
