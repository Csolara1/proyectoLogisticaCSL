// js/cookie-consent-init.js

// 1. Configuramos el objeto CookieConsent
// (Asegúrate de que este script se cargue como type="module" en el HTML)

import 'https://cdn.jsdelivr.net/gh/orestbida/cookieconsent@v3.0.0/dist/cookieconsent.umd.js';

CookieConsent.run({
    // Configuración visual
    guiOptions: {
        consentModal: {
            layout: "box",
            position: "bottom left",
            equalWeightButtons: true,
            flipButtons: false
        },
        preferencesModal: {
            layout: "box",
            position: "right",
            equalWeightButtons: true,
            flipButtons: false
        }
    },

    // Configuración de categorías
    categories: {
        necessary: {
            readOnly: true,
            enabled: true // Estas siempre están activas (cookies técnicas)
        },
        analytics: {
            enabled: false // IMPORTANTE: Desactivadas por defecto (bloquea Chart.js)
        }
    },

    // Textos e Idioma
    language: {
        default: "es",
        translations: {
            es: {
                consentModal: {
                    title: "Usamos cookies 🍪",
                    description: "Hola, necesitamos tu permiso para cargar servicios externos como gráficos y estilos. Si no aceptas, no se conectará con ningún servidor externo.",
                    acceptAllBtn: "Aceptar todo",
                    acceptNecessaryBtn: "Rechazar todo",
                    showPreferencesBtn: "Gestionar preferencias"
                },
                preferencesModal: {
                    title: "Centro de Preferencias",
                    acceptAllBtn: "Aceptar todo",
                    acceptNecessaryBtn: "Rechazar todo",
                    savePreferencesBtn: "Guardar preferencias",
                    closeIconLabel: "Cerrar",
                    sections: [
                        {
                            title: "Cookies Estrictamente Necesarias",
                            description: "Necesarias para que la web funcione.",
                            linkedCategory: "necessary"
                        },
                        {
                            title: "Analíticas y Funcionalidad",
                            description: "Estas cookies permiten cargar librerías externas como Chart.js o Bootstrap JS.",
                            linkedCategory: "analytics"
                        }
                    ]
                }
            }
        }
    }
});