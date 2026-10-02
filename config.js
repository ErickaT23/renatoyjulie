const config = {
    event: {
        defaultEventId: "julissa-renato-2026",
        eventIdParam: "eventId",
        legacyFallback: {
            read: false,
            write: false,
            subscribe: false
        }
    },
    seo: {
        titulo: "Julissa & Renato | Boda 2026",
        descripcion: "Boda de Julissa y Renato - 21 de noviembre de 2026",
        autor: "Two Design"
    },

    pareja: {
        nombres: "Julissa & Renato",
        fecha: "21-11-2026",
        fechaVisible: "21.11.2026"
    },

    musica: {
        titulo: "Nuestra Canción",
        archivo: "audio/nuestra-cancion.mp3"
    },
    evento: {
        ceremonia: {
            titulo: "Ceremonia",
            lugar: "El Balcón, Jardín el Cerro",
            hora: "16:00",
            direccion: "Km 22.4 Carretera a Fraijanes",
            ubicacionUrl: "https://maps.app.goo.gl/rUnnXiSVKahaAigw5"
        },
        recepcion: {
            titulo: "Recepción",
            lugar: "Salón Colonia, Jardín el Cerro",
            hora: "17:00",
            direccion: "Km 22.4 Carretera a Fraijanes",
            ubicacionUrl: "https://maps.app.goo.gl/rUnnXiSVKahaAigw5",
            nota: "El Jardín cuenta con parqueo propio, costo de Q20 por todo el evento."
        }
    },

    textos: {
        mensajeInvitado: "Nos hace mucha ilusión contar contigo",
        mensajePases: "Hemos reservado para ti {pases} lugares especiales"
    },

    footer: {
        hashtag: "#JulissaYRenato",
        instagramUrl: "",
        facebookUrl: "",
        marcaTexto: "Diseño",
        marcaNombre: "Two Design",
        marcaUrl: "https://twodesign.com"
    }
};

window.config = config;
