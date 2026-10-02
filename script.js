document.addEventListener('DOMContentLoaded', async function() {
    await hydrateSiteConfigForEvent();
    applySiteConfig();
    await InvitadoApp.init();
    MensajeFlota.init();
    MusicaPlayer.init();
    initPortada();
    initScrollAnimations();
    initCountdown();
    initAutoGallery();
    initRSVP();
    initGiftModal();
});

const externalConfig = window.config || {};

function resolveEventId() {
    const eventConfig = externalConfig.event || {};
    const eventIdParam = String(eventConfig.eventIdParam || 'eventId').trim() || 'eventId';
    const defaultEventId = String(eventConfig.defaultEventId || 'julissa-renato-2026').trim() || 'julissa-renato-2026';
    const params = new URLSearchParams(window.location.search || '');
    const paramValue = String(params.get(eventIdParam) || '').trim();
    const eventId = paramValue || defaultEventId;

    return {
        eventId,
        eventIdParam,
        defaultEventId
    };
}

const EventContext = resolveEventId();
window.EventContext = EventContext;
window.currentEventId = EventContext.eventId;

function normalizeRemoteEventConfig(rawConfig) {
    if (!rawConfig || typeof rawConfig !== 'object') return {};

    const remoteEvento = rawConfig.evento && typeof rawConfig.evento === 'object'
        ? rawConfig.evento
        : {};
    const remoteCeremonia = (remoteEvento.ceremonia && typeof remoteEvento.ceremonia === 'object'
        ? remoteEvento.ceremonia
        : rawConfig.ceremonia) || {};
    const remoteRecepcion = (remoteEvento.recepcion && typeof remoteEvento.recepcion === 'object'
        ? remoteEvento.recepcion
        : rawConfig.recepcion) || {};

    return {
        ...rawConfig,
        evento: {
            ...remoteEvento,
            ceremonia: {
                ...remoteCeremonia,
                ubicacionUrl: remoteCeremonia.ubicacionUrl || remoteCeremonia.ubicacion || ''
            },
            recepcion: {
                ...remoteRecepcion,
                ubicacionUrl: remoteRecepcion.ubicacionUrl || remoteRecepcion.ubicacion || ''
            }
        }
    };
}

function createSiteConfig(remoteConfig) {
    const normalizedRemoteConfig = normalizeRemoteEventConfig(remoteConfig);
    const localEvento = (externalConfig && externalConfig.evento) || {};
    const remoteEvento = normalizedRemoteConfig.evento || {};

    return {
        seo: {
            titulo: 'Julissa & Renato | Boda 2026',
            descripcion: 'Boda de Julissa y Renato - 21 de noviembre de 2026',
            autor: 'Two Design',
            ...externalConfig.seo,
            ...normalizedRemoteConfig.seo
        },
        pareja: {
            nombres: 'Julissa & Renato',
            fecha: '21-11-2026',
            fechaVisible: '21.11.2026',
            ...externalConfig.pareja,
            ...normalizedRemoteConfig.pareja
        },
        musica: {
            titulo: 'Nuestra Cancion',
            archivo: 'audio/nuestra-cancion.mp3',
            ...externalConfig.musica,
            ...normalizedRemoteConfig.musica
        },
        evento: {
            ceremonia: {
                titulo: 'Ceremonia',
                lugar: 'Capilla San Jose Obrero',
                hora: '3:00 PM',
                direccion: 'Av. Libertador 1234, San Jose',
                ubicacionUrl: 'https://maps.google.com/?q=Capilla+San+Jose+Obrero',
                ...(localEvento.ceremonia || {}),
                ...(remoteEvento.ceremonia || {})
            },
            recepcion: {
                titulo: 'Recepcion',
                lugar: 'Finca Los Rosales',
                hora: '6:00 PM',
                direccion: 'Km 15, Carretera al Mar',
                ubicacionUrl: 'https://maps.google.com/?q=Finca+Los+Rosales',
                ...(localEvento.recepcion || {}),
                ...(remoteEvento.recepcion || {})
            }
        },
        textos: {
            mensajeInvitado: 'Eres muy especial para nosotros',
            mensajePases: 'Hemos reservado para ti {pases} lugares especiales',
            ...externalConfig.textos,
            ...normalizedRemoteConfig.textos
        },
        footer: {
            hashtag: '#JulissaYRenato',
            instagramUrl: '',
            facebookUrl: '',
            marcaTexto: 'Diseño',
            marcaNombre: 'Two Design',
            marcaUrl: 'https://twodesign.com',
            ...externalConfig.footer,
            ...normalizedRemoteConfig.footer
        }
    };
}

let SiteConfig = createSiteConfig();
window.SiteConfig = SiteConfig;

async function hydrateSiteConfigForEvent() {
    try {
        const rsvpDB = window.RSVPDatabase;
        if (!rsvpDB || typeof rsvpDB.getEventConfig !== 'function') return;

        const eventId = String(window.currentEventId || '').trim();
        const remoteConfig = await rsvpDB.getEventConfig(eventId);
        if (!remoteConfig || typeof remoteConfig !== 'object') return;

        SiteConfig = createSiteConfig(remoteConfig);
        window.SiteConfig = SiteConfig;
    } catch (error) {
        console.warn('No se pudo cargar configuración remota del evento. Se usará config local:', error);
    }
}

function splitPairNames(nombres) {
    const safeNombres = String(nombres || '').trim();
    const parts = safeNombres.split('&');
    const left = (parts[0] || '').trim();
    const right = (parts[1] || '').trim();
    return { left, right };
}

function setStyledWord(container, word) {
    if (!container) return;
    const initialEl = container.querySelector('.inicial, .musica-inicial, .event-inicial');
    const restEl = container.querySelector('.resto, .musica-resto, .event-resto');
    const safeWord = String(word || '').trim();

    if (!safeWord) return;
    if (initialEl) initialEl.textContent = safeWord.charAt(0);
    if (restEl) restEl.textContent = safeWord.slice(1);
}

function applySiteConfig() {
    applySeoConfig();
    const { left, right } = splitPairNames(SiteConfig.pareja.nombres);

    const portadaNames = document.querySelectorAll('.portada-nombres .nombre');
    if (portadaNames[0]) setStyledWord(portadaNames[0], left);
    if (portadaNames[1]) setStyledWord(portadaNames[1], right);

    const heroNames = document.querySelectorAll('.hero-invitado-nombres .nombre');
    if (heroNames[0]) setStyledWord(heroNames[0], left);
    if (heroNames[1]) setStyledWord(heroNames[1], right);

    const heroDate = document.querySelector('.hero-invitado-fecha');
    if (heroDate) heroDate.textContent = SiteConfig.pareja.fechaVisible;

    const musicaTitulo = String(SiteConfig.musica.titulo || '').trim().split(/\s+/);
    const musicaWords = document.querySelectorAll('.musica-titulo .musica-palabra');
    if (musicaWords[0] && musicaTitulo[0]) {
        const firstInitial = musicaWords[0].querySelector('.musica-inicial');
        const firstRest = musicaWords[0].querySelector('.musica-resto');
        if (firstInitial) firstInitial.textContent = musicaTitulo[0].charAt(0);
        if (firstRest) firstRest.textContent = musicaTitulo[0].slice(1);
    }
    if (musicaWords[1] && musicaTitulo[1]) {
        const secondInitial = musicaWords[1].querySelector('.musica-inicial');
        const secondRest = musicaWords[1].querySelector('.musica-resto');
        if (secondInitial) secondInitial.textContent = musicaTitulo[1].charAt(0);
        if (secondRest) secondRest.textContent = musicaTitulo[1].slice(1);
    }

    const audioSource = document.querySelector('#musica-audio source');
    const audioEl = document.getElementById('musica-audio');
    if (audioSource && SiteConfig.musica.archivo) {
        audioSource.setAttribute('src', SiteConfig.musica.archivo);
    }
    if (audioEl) audioEl.load();

    const invitadoMensaje = document.querySelector('.invitado-mensaje');
    if (invitadoMensaje) invitadoMensaje.textContent = SiteConfig.textos.mensajeInvitado;

    applyEventCard('.events-container .event-card:nth-child(1)', SiteConfig.evento.ceremonia);
    applyEventCard('.events-container .event-card:nth-child(2)', SiteConfig.evento.recepcion);
    applyFooterConfig();
}

function applySeoConfig() {
    if (SiteConfig.seo.titulo) {
        document.title = SiteConfig.seo.titulo;
    }

    setMetaContent('description', SiteConfig.seo.descripcion);
    setMetaContent('author', SiteConfig.seo.autor);
}

function setMetaContent(name, value) {
    if (!value) return;
    const meta = document.querySelector('meta[name="' + name + '"]');
    if (!meta) return;
    meta.setAttribute('content', value);
}

function applyEventCard(selector, data) {
    const card = document.querySelector(selector);
    if (!card || !data) return;

    const initial = card.querySelector('.event-inicial');
    const rest = card.querySelector('.event-resto');
    const titulo = String(data.titulo || '').trim();
    if (titulo) {
        if (initial) initial.textContent = titulo.charAt(0);
        if (rest) rest.textContent = titulo.slice(1);
    }

    const timeEl = card.querySelector('.event-time');
    const lugarEl = card.querySelector('.event-lugar');
    const direccionEl = card.querySelector('.event-direccion');
    const linkEl = card.querySelector('.btn-location');

    if (timeEl) timeEl.textContent = data.hora || '';
    if (lugarEl) lugarEl.textContent = data.lugar || '';
    if (direccionEl) direccionEl.textContent = data.direccion || '';
    if (linkEl) linkEl.setAttribute('href', data.ubicacionUrl || '#');
}

function applyFooterConfig() {
    const instagramEl = document.querySelector('#social-icons a[aria-label="Instagram"]');
    if (instagramEl && SiteConfig.footer.instagramUrl) {
        instagramEl.setAttribute('href', SiteConfig.footer.instagramUrl);
    }

    const facebookEl = document.querySelector('#social-icons a[aria-label="Facebook"]');
    if (facebookEl && SiteConfig.footer.facebookUrl) {
        facebookEl.setAttribute('href', SiteConfig.footer.facebookUrl);
    }
}

// ============================================
// CONFIGURACIÓN - Editar aquí los invitados
// ============================================
const GuestConfig = {
    invitados: {},
    invitadoDefault: { nombre: "Invitado Especial", pases: 2 },
    paramId: 'id'
};

window.GuestConfig = GuestConfig;

// ============================================
// APP DE INVITADOS - Lógica reutilizable
// ============================================
const InvitadoApp = {
    data: null,

    async init() {
        const localGuest = this.getLocalFromURL();
        const remoteGuest = await this.getRemoteGuest(localGuest.id);
        this.data = remoteGuest || localGuest;
        this.renderSection();
        this.renderRSVP();
        return this.data;
    },

    getLocalFromURL() {
        const params = new URLSearchParams(window.location.search);
        const rawId = String(params.get(GuestConfig.paramId) || '').trim();
        const safeId = rawId || 'default';
        const invitado = GuestConfig.invitados[rawId];

        if (invitado) {
            return {
                id: safeId,
                nombre: String(invitado.nombre || ''),
                pases: Math.max(1, Number(invitado.pases) || 1),
                integrantes: Array.isArray(invitado.integrantes) ? invitado.integrantes : [],
                activo: true
            };
        }

        return {
            id: safeId,
            nombre: String(GuestConfig.invitadoDefault.nombre || ''),
            pases: Math.max(1, Number(GuestConfig.invitadoDefault.pases) || 1),
            activo: true
        };
    },

    async getRemoteGuest(guestId) {
        try {
            const rsvpDB = window.RSVPDatabase;
            if (!rsvpDB || typeof rsvpDB.getInvitadoById !== 'function') return null;

            const eventId = String(window.currentEventId || '').trim();
            const remoteGuest = await rsvpDB.getInvitadoById(eventId, guestId);
            if (!remoteGuest || typeof remoteGuest !== 'object') return null;

            return {
                id: String(remoteGuest.id || guestId || 'default'),
                nombre: String(remoteGuest.nombre || '').trim() || String(GuestConfig.invitadoDefault.nombre || ''),
                pases: Math.max(1, Number(remoteGuest.pases) || Number(GuestConfig.invitadoDefault.pases) || 1),
                activo: typeof remoteGuest.activo === 'undefined' ? true : Boolean(remoteGuest.activo)
            };
        } catch (error) {
            console.warn('No se pudo cargar invitado remoto. Se usará fallback local:', error);
            return null;
        }
    },

    renderSection() {
        const nombreEl = document.getElementById('nombre-invitado');

        if (nombreEl) {
            nombreEl.textContent = this.data.nombre;
            nombreEl.style.height = 'auto';
            nombreEl.style.height = nombreEl.scrollHeight + 'px';
        }
        this.renderPasesText(this.data.pases);
    },

    renderPasesText(pases) {
        const lugaresEl = document.querySelector('.invitado-lugares');
        if (!lugaresEl) return;

        const template = String(SiteConfig.textos.mensajePases || '');
        if (!template.includes('{pases}')) {
            lugaresEl.textContent = template;
            return;
        }

        const parts = template.split('{pases}');
        const numeroEl = document.createElement('span');
        numeroEl.id = 'numero-lugares';
        numeroEl.textContent = String(pases);

        const textoEl = document.createElement('span');
        textoEl.id = 'texto-lugares';
        textoEl.textContent = parts[1] || '';

        lugaresEl.replaceChildren(
            document.createTextNode(parts[0] || ''),
            document.createElement('br'),
            numeroEl,
            textoEl
        );
    },

    renderRSVP() {
        const nameInput = document.getElementById('rsvp-name');
        const guestsWrapper = document.getElementById('guest-count-wrapper');
        const guestsSelect = document.getElementById('guest-count');
        const responseYes = document.getElementById('rsvp-response-yes');
        const responseNo = document.getElementById('rsvp-response-no');
        const totalPases = Math.max(1, Number(this.data && this.data.pases) || 1);

        if (nameInput) {
            nameInput.value = this.data.nombre;
            nameInput.readOnly = true;
        }

        if (guestsSelect) {
            guestsSelect.replaceChildren();

            for (let i = 1; i <= totalPases; i += 1) {
                const option = document.createElement('option');
                option.value = String(i);
                option.textContent = i === 1 ? '1 invitado' : i + ' invitados';
                guestsSelect.appendChild(option);
            }

            guestsSelect.value = String(totalPases);
            guestsSelect.disabled = true;
            guestsSelect.required = false;
        }

        if (guestsWrapper) {
            guestsWrapper.style.display = 'none';
        }
        if (responseYes) responseYes.checked = false;
        if (responseNo) responseNo.checked = false;
    },

    getData() {
        return this.data;
    }
};

function initPortada() {
    const portada = document.getElementById('portada');
    const btnAbrir = document.getElementById('btn-abrir');
    const invitacion = document.getElementById('invitacion');
    
    if (!portada || !btnAbrir || !invitacion) return;
    
    btnAbrir.addEventListener('click', function() {
        MusicaPlayer.play();
        MusicaPlayer.showControl();
        
        portada.classList.add('abrir');
        invitacion.classList.add('revelar');
        MensajeFlota.mostrar();
        
        setTimeout(function() {
            portada.style.display = 'none';
        }, 1200);
    });
}

// ============================================
// REPRODUCTOR DE MÚSICA
// ============================================
const MusicaPlayer = {
    audio: null,
    btn: null,
    fab: null,
    progressFill: null,
    status: null,
    isPlaying: false,

    init() {
        this.audio = document.getElementById('musica-audio');
        this.btn = document.getElementById('musica-btn');
        this.fab = document.getElementById('music-fab');
        this.progressFill = document.querySelector('.musica-progress-fill');
        this.status = document.querySelector('.musica-status');

        const invitation = document.getElementById('invitacion');
        if (invitation && invitation.classList.contains('revelar')) {
            this.showControl();
        }
        
        if (this.audio) {
            this.audio.volume = 0.4;
            
            this.audio.addEventListener('timeupdate', () => {
                this.updateProgress();
            });
            
            this.audio.addEventListener('ended', () => {
                this.audio.play();
            });
        }
        
        if (this.btn && this.audio) {
            this.btn.addEventListener('click', () => {
                this.toggle();
            });
        }
    },

    updateProgress() {
        if (!this.audio || !this.progressFill) return;
        
        const percent = (this.audio.currentTime / this.audio.duration) * 100;
        this.progressFill.style.width = percent + '%';
    },

    play() {
        if (!this.audio) return;
        
        this.audio.volume = 0.4;
        const playPromise = this.audio.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                this.isPlaying = true;
                this.updateUI();
            }).catch(() => {
                this.isPlaying = false;
            });
        }
    },

    pause() {
        if (!this.audio) return;
        this.audio.pause();
        this.isPlaying = false;
        this.updateUI();
    },

    toggle() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    },

    showControl() {
        if (!this.fab) return;
        this.fab.classList.add('is-visible');
    },

    updateUI() {
        if (!this.btn) return;
        this.btn.classList.toggle('playing', this.isPlaying);
        this.btn.setAttribute('aria-pressed', this.isPlaying ? 'true' : 'false');
        this.btn.setAttribute('aria-label', this.isPlaying ? 'Pausar música' : 'Reanudar música');

        if (this.fab) {
            this.fab.classList.toggle('playing', this.isPlaying);
        }
        
        if (this.status) {
            this.status.classList.toggle('active', this.isPlaying);
            this.status.textContent = this.isPlaying ? 'Reproduciendo' : 'Pausado';
        }
    }
};

// ============================================
// MENSAJE FLOTANTE
// ============================================
const MensajeFlota = {
    el: null,

    init() {
        this.el = document.getElementById('scroll-hint');
    },

    mostrar() {
        if (!this.el) return;
        
        this.el.classList.add('mostrar');
        
        setTimeout(() => {
            this.el.classList.remove('mostrar');
        }, 10000);
    }
};

function initScrollAnimations() {
    const elements = document.querySelectorAll('.section, .separator, .footer');

    elements.forEach((element, index) => {
        const revealOrder = index % 4;
        element.style.setProperty('--reveal-order', String(revealOrder));
    });
    
    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -8% 0px',
        threshold: 0.14
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    elements.forEach(element => {
        observer.observe(element);
    });
}

function initCountdown() {
    const eventDate = getEventDateFromConfig();
    
    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');
    
    function updateCountdown() {
        const now = new Date().getTime();
        const distance = eventDate - now;
        
        if (distance < 0) {
            daysEl.textContent = '00';
            hoursEl.textContent = '00';
            minutesEl.textContent = '00';
            secondsEl.textContent = '00';
            return;
        }
        
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        daysEl.textContent = String(days).padStart(2, '0');
        hoursEl.textContent = String(hours).padStart(2, '0');
        minutesEl.textContent = String(minutes).padStart(2, '0');
        secondsEl.textContent = String(seconds).padStart(2, '0');
    }
    
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

function getEventDateFromConfig() {
    const fallback = new Date('November 21, 2026 16:00:00').getTime();
    const dateParts = String(SiteConfig.pareja.fecha || '').split('-');
    if (dateParts.length !== 3) return fallback;

    const day = Number(dateParts[0]);
    const month = Number(dateParts[1]);
    const year = Number(dateParts[2]);

    if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) {
        return fallback;
    }

    let hour = 15;
    let minute = 0;
    const hourMatch = String(SiteConfig.evento.ceremonia.hora || '').match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (hourMatch) {
        const rawHour = Number(hourMatch[1]);
        minute = Number(hourMatch[2]);
        const period = hourMatch[3].toUpperCase();
        hour = rawHour % 12;
        if (period === 'PM') hour += 12;
    }

    return new Date(year, month - 1, day, hour, minute, 0).getTime();
}

function initAutoGallery() {
    const section = document.getElementById('gallery-auto');
    if (!section) return;

    const slides = Array.from(section.querySelectorAll('.gallery-auto-slide'));
    if (slides.length === 0) return;

    let currentIndex = Math.max(0, slides.findIndex(slide => slide.classList.contains('is-active')));
    if (currentIndex < 0 || currentIndex >= slides.length) currentIndex = 0;

    const intervalMs = 4000;
    let timerId = null;

    function render(index) {
        slides.forEach((slide, slideIndex) => {
            slide.classList.toggle('is-active', slideIndex === index);
        });
    }

    function goTo(index) {
        currentIndex = (index + slides.length) % slides.length;
        render(currentIndex);
    }

    function next() {
        goTo(currentIndex + 1);
    }

    function startAutoplay() {
        stopAutoplay();
        timerId = window.setInterval(next, intervalMs);
    }

    function stopAutoplay() {
        if (timerId) {
            window.clearInterval(timerId);
            timerId = null;
        }
    }

    section.addEventListener('mouseenter', stopAutoplay);
    section.addEventListener('mouseleave', startAutoplay);

    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            stopAutoplay();
        } else {
            startAutoplay();
        }
    });

    render(currentIndex);
    startAutoplay();
}

function initRSVP() {
    const form = document.getElementById('rsvp-form');
    const successMessage = document.getElementById('rsvp-success');
    const finalMessage = document.getElementById('rsvp-final-message');
    const introMessage = document.querySelector('#rsvp-section .rsvp-intro');
    const submitBtn = document.getElementById('rsvp-submit');
    const responseYes = document.getElementById('rsvp-response-yes');
    const responseNo = document.getElementById('rsvp-response-no');
    const guestCountWrapper = document.getElementById('guest-count-wrapper');
    const guestCountSelect = document.getElementById('guest-count');
    const confirmationMessages = {
        si: 'Gracias por confirmar tu asistencia. Te vemos pronto.',
        no: 'Lamentamos que no puedas acompañarnos, te extrañaremos.'
    };
    const activeEventId = String(window.currentEventId || '').trim();
    let formLocked = false;
    let isCheckingStatus = false;
    let popupTimer = null;
    const defaultIntroText = introMessage ? introMessage.textContent : '';
    const confirmedIntroText = 'Gracias por haber completado el formulario de asistencia.';
    
    if (!form) return;

    function getSelectedResponse() {
        const selectedChoices = Array.from(document.querySelectorAll('.rsvp-member-choice.is-selected'));
        if (selectedChoices.some(function(choice) { return choice.dataset.response === 'si'; })) return 'si';
        if (selectedChoices.some(function(choice) { return choice.dataset.response === 'no'; })) return 'no';
        if (responseYes && responseYes.checked) return 'si';
        if (responseNo && responseNo.checked) return 'no';
        return '';
    }

    function showPopup(message, isError = false) {
        let overlay = document.getElementById('rsvp-popup-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'rsvp-popup-overlay';
            overlay.className = 'rsvp-popup-overlay';
            overlay.innerHTML = [
                '<div class="rsvp-popup" role="status" aria-live="polite">',
                '<p class="rsvp-popup-message"></p>',
                '<button type="button" class="rsvp-popup-close" aria-label="Cerrar mensaje">Aceptar</button>',
                '</div>'
            ].join('');
            document.body.appendChild(overlay);

            const closeBtn = overlay.querySelector('.rsvp-popup-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', function() {
                    overlay.classList.remove('active');
                });
            }

            overlay.addEventListener('click', function(event) {
                if (event.target === overlay) {
                    overlay.classList.remove('active');
                }
            });
        }

        const popup = overlay.querySelector('.rsvp-popup');
        const messageEl = overlay.querySelector('.rsvp-popup-message');
        if (messageEl) {
            messageEl.textContent = message;
        }
        if (popup) {
            popup.classList.toggle('is-error', Boolean(isError));
        }

        overlay.classList.add('active');
        if (popupTimer) clearTimeout(popupTimer);
        popupTimer = setTimeout(function() {
            overlay.classList.remove('active');
        }, 3600);
    }

    function setConfirmedFormVisibility(confirmed) {
        form.hidden = confirmed;
        form.setAttribute('aria-hidden', confirmed ? 'true' : 'false');
        form.style.display = confirmed ? 'none' : '';
    }

    function setIntroMessageForConfirmed(confirmed) {
        if (!introMessage) return;
        introMessage.textContent = confirmed ? confirmedIntroText : defaultIntroText;
    }

    function setFormLocked(locked) {
        formLocked = locked;
        form.classList.toggle('is-locked', locked);

        const controls = form.querySelectorAll('input, select, textarea, button');
        controls.forEach(function(control) {
            if (control.id === 'rsvp-name') {
                control.readOnly = true;
                control.disabled = locked;
                return;
            }
            control.disabled = locked;
        });

        if (submitBtn) {
            submitBtn.disabled = locked;
            submitBtn.style.display = locked ? 'none' : '';
        }
    }

    function toggleGuestCountField() {
        if (!guestCountWrapper || !guestCountSelect) return;

        const shouldShow = getSelectedResponse() === 'si';
        guestCountWrapper.style.display = shouldShow ? 'block' : 'none';
        guestCountSelect.disabled = !shouldShow || formLocked;
        guestCountSelect.required = shouldShow && !formLocked;

        if (!shouldShow) {
            const firstOption = guestCountSelect.options[0];
            if (firstOption) guestCountSelect.value = firstOption.value;
        }
    }

    function showPermanentMessage(respuesta) {
        const message = confirmationMessages[respuesta] || confirmationMessages.no;
        if (finalMessage) {
            finalMessage.textContent = message;
        }
        if (successMessage) {
            successMessage.style.display = 'block';
        }
    }

    function applyConfirmedState(record) {
        const respuesta = String(record && record.respuesta || '').toLowerCase() === 'si' ? 'si' : 'no';
        const confirmedCount = Math.max(0, Number(record && record.cantidadConfirmada) || 0);

        if (responseYes) responseYes.checked = respuesta === 'si';
        if (responseNo) responseNo.checked = respuesta === 'no';

        if (guestCountSelect && respuesta === 'si') {
            const fallbackValue = guestCountSelect.options.length > 0 ? guestCountSelect.options[guestCountSelect.options.length - 1].value : '1';
            const desiredValue = confirmedCount > 0 ? String(confirmedCount) : fallbackValue;
            const hasDesiredOption = Array.from(guestCountSelect.options).some(function(option) {
                return option.value === desiredValue;
            });
            const safeValue = hasDesiredOption ? desiredValue : fallbackValue;
            guestCountSelect.value = safeValue;
        }

        toggleGuestCountField();
        const memberResponses = record && record.memberResponses ? record.memberResponses : {};
        document.querySelectorAll('.rsvp-member-item').forEach(function(member) {
            const response = memberResponses[member.dataset.memberId];
            member.querySelectorAll('.rsvp-member-choice').forEach(function(choice) {
                choice.classList.toggle('is-selected', choice.dataset.response === response);
            });
            const status = member.querySelector('.rsvp-member-status');
            if (status) {
                status.textContent = response === 'si' ? 'Asistencia confirmada' : response === 'no' ? 'No asistirá' : '';
                status.className = 'rsvp-member-status' + (response === 'si' ? ' is-confirmed' : response === 'no' ? ' is-declined' : '');
            }
        });
    }

    async function getExistingConfirmation(guestId) {
        const rsvpDB = window.RSVPDatabase;
        if (!rsvpDB || typeof rsvpDB.getConfirmationByGuestId !== 'function') return null;
        return rsvpDB.getConfirmationByGuestId(activeEventId, guestId);
    }

    async function saveConfirmation(payload) {
        const rsvpDB = window.RSVPDatabase;
        if (!rsvpDB || typeof rsvpDB.saveConfirmation !== 'function') {
            throw new Error('RSVPDatabase no disponible');
        }
        return rsvpDB.saveConfirmation(activeEventId, payload);
    }

    if (responseYes) {
        responseYes.addEventListener('change', toggleGuestCountField);
    }
    if (responseNo) {
        responseNo.addEventListener('change', toggleGuestCountField);
    }

    document.querySelectorAll('.rsvp-member-choice').forEach(function(choice) {
        choice.addEventListener('click', function() {
            const response = choice.dataset.response;
            if (response === 'si' && responseYes) responseYes.checked = true;
            if (response === 'no' && responseNo) responseNo.checked = true;
            choice.closest('.rsvp-member-item').querySelectorAll('.rsvp-member-choice').forEach(function(button) {
                button.classList.toggle('is-selected', button === choice);
            });
            const status = choice.closest('.rsvp-member-item').querySelector('.rsvp-member-status');
            if (status) {
                status.textContent = response === 'si' ? 'Asistencia confirmada' : 'No asistirá';
                status.className = 'rsvp-member-status ' + (response === 'si' ? 'is-confirmed' : 'is-declined');
            }
            toggleGuestCountField();
            if (!formLocked) form.requestSubmit();
        });
    });

    toggleGuestCountField();

    const guestData = InvitadoApp.getData() || {};
    const guestId = String(guestData.id || 'default');

    const membersContainer = document.querySelector('.rsvp-members');
    const memberNames = Array.isArray(guestData.integrantes) && guestData.integrantes.length
        ? guestData.integrantes
        : [guestData.nombre || 'Invitado'];
    if (membersContainer) {
        membersContainer.replaceChildren(...memberNames.map(function(name, index) {
            const item = document.createElement('div');
            item.className = 'rsvp-member-item';
            item.dataset.memberId = 'member-' + (index + 1);
            item.innerHTML = '<div class="rsvp-member-copy"><strong></strong><span>1 pase asignado</span></div>'
                + '<div class="rsvp-member-actions"><button type="button" class="rsvp-member-choice" data-response="si">Asistiré</button><button type="button" class="rsvp-member-choice" data-response="no">No asistiré</button></div>'
                + '<span class="rsvp-member-status"></span>';
            item.querySelector('strong').textContent = name;
            return item;
        }));
    }

    form.addEventListener('click', function(event) {
        const choice = event.target.closest('.rsvp-member-choice');
        if (!choice || formLocked) return;
        const member = choice.closest('.rsvp-member-item');
        member.querySelectorAll('.rsvp-member-choice').forEach(function(button) {
            button.classList.toggle('is-selected', button === choice);
        });
        const status = member.querySelector('.rsvp-member-status');
        const response = choice.dataset.response;
        status.textContent = response === 'si' ? 'Asistencia confirmada' : 'No asistirá';
        status.className = 'rsvp-member-status ' + (response === 'si' ? 'is-confirmed' : 'is-declined');
        form.requestSubmit();
    });

    async function checkConfirmedStatusOnLoad() {
        isCheckingStatus = true;
        if (submitBtn) submitBtn.disabled = true;

        try {
            const existing = await getExistingConfirmation(guestId);
            if (existing && existing.confirmado) {
                applyConfirmedState(existing);
            } else if (submitBtn && !formLocked) {
                submitBtn.disabled = false;
            }
        } catch (error) {
            console.error('No se pudo verificar estado RSVP:', error);
            if (submitBtn && !formLocked) submitBtn.disabled = false;
        } finally {
            isCheckingStatus = false;
        }
    }

    checkConfirmedStatusOnLoad();
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (formLocked) return;

        if (isCheckingStatus) {
            showPopup('Estamos validando tu estado de confirmación. Intenta de nuevo en un momento.', true);
            return;
        }

        toggleGuestCountField();

        const respuesta = getSelectedResponse();
        if (!respuesta) {
            showPopup('Por favor selecciona si asistirás.', true);
            return;
        }

        if (respuesta === 'si') {
            const selectedCount = guestCountSelect ? String(guestCountSelect.value || '').trim() : '';
            const requestedCount = Number(selectedCount);
            const maxAllowedCount = Math.max(1, Number(guestData.pases) || 1);
            const isValidCount = selectedCount
                && Number.isInteger(requestedCount)
                && requestedCount >= 1
                && requestedCount <= maxAllowedCount;

            if (!isValidCount) {
                showPopup('Selecciona la cantidad de invitados para confirmar.', true);
                return;
            }
        }

        const confirmedCount = respuesta === 'si'
            ? Math.max(1, Number(guestCountSelect && guestCountSelect.value) || 0)
            : 0;

        const payload = {
            id: guestId,
            nombre: String(guestData.nombre || ''),
            pasesAsignados: Math.max(1, Number(guestData.pases) || 1),
            respuesta,
            cantidadConfirmada: confirmedCount,
            memberResponses: Object.fromEntries(Array.from(document.querySelectorAll('.rsvp-member-item')).map(function(member) {
                const selected = member.querySelector('.rsvp-member-choice.is-selected');
                return [member.dataset.memberId, selected ? selected.dataset.response : ''];
            })),
            integrantes: Array.from(document.querySelectorAll('.rsvp-member-copy strong')).map(function(member) {
                return member.textContent.trim();
            }),
            confirmado: true,
            fechaConfirmacion: Date.now()
        };

        if (submitBtn) submitBtn.disabled = true;
        
        try {
            const savedRecord = await saveConfirmation(payload);
            applyConfirmedState(savedRecord);
            showPopup(confirmationMessages[respuesta]);
        } catch (error) {
            if (error && error.code === 'RSVP_ALREADY_CONFIRMED') {
                const existingRecord = (error.existingData && error.existingData.confirmado)
                    ? error.existingData
                    : await getExistingConfirmation(guestId);

                if (existingRecord && existingRecord.confirmado) {
                    applyConfirmedState(existingRecord);
                    const existingResponse = String(existingRecord.respuesta || '').toLowerCase() === 'si' ? 'si' : 'no';
                    showPopup(confirmationMessages[existingResponse]);
                    return;
                }
            }

            console.error('Error al guardar RSVP:', error);
            if (submitBtn && !formLocked) submitBtn.disabled = false;
            showPopup('No pudimos guardar tu confirmación. Intenta nuevamente.', true);
        }
    });
}

function initGiftModal() {
    const openBtn = document.getElementById('btn-account-modal');
    const modal = document.getElementById('gift-modal');
    const closeBtn = document.getElementById('gift-modal-close');
    const copyBtn = document.getElementById('btn-copy-account');
    const feedbackEl = document.getElementById('gift-copy-feedback');
    const dataEl = document.getElementById('gift-account-data');

    if (!openBtn || !modal || !closeBtn || !copyBtn || !dataEl) return;

    function openModal() {
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    async function copyAccountData() {
        const data = dataEl.innerText.trim();
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(data);
            } else {
                const textarea = document.createElement('textarea');
                textarea.value = data;
                textarea.setAttribute('readonly', '');
                textarea.style.position = 'absolute';
                textarea.style.left = '-9999px';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }
            if (feedbackEl) feedbackEl.textContent = 'Datos copiados al portapapeles.';
        } catch {
            if (feedbackEl) feedbackEl.textContent = 'No se pudo copiar. Intenta de nuevo.';
        }
    }

    openBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', function(event) {
        if (event.target.dataset.modalClose === 'true') {
            closeModal();
        }
    });

    copyBtn.addEventListener('click', copyAccountData);

    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });
}
