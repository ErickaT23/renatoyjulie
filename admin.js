(function () {
    const ADMIN_KEY = "TD-ADMIN-2026";
    const BASE_URL = window.location.origin;
    const INCLUDE_INACTIVE_IN_BULK_COPY = false;

    const state = {
        eventId: "",
        db: null,
        invitadosMap: new Map(),
        confirmations: [],
        rows: [],
        editingGuestId: null,
        editDraft: null,
        qrGuest: null,
        resizeHandler: null,
        unsubscribers: []
    };

    function getEl(id) {
        return document.getElementById(id);
    }

    function getQueryParams() {
        const params = new URLSearchParams(window.location.search || "");
        return {
            adminKey: String(params.get("admin") || "").trim(),
            eventId: String(params.get("eventId") || "").trim()
        };
    }

    function resolveEventId(queryEventId) {
        const defaultEventId = String(
            window.config
            && window.config.event
            && window.config.event.defaultEventId
            || "rocio-fernando-2027"
        ).trim();

        return queryEventId || defaultEventId;
    }

    function showRestricted() {
        const restricted = getEl("restricted");
        const app = getEl("admin-app");
        if (restricted) restricted.classList.remove("hidden");
        if (app) app.classList.add("hidden");
    }

    function showApp(eventId) {
        const restricted = getEl("restricted");
        const app = getEl("admin-app");
        const eventEl = getEl("active-event-id");
        if (restricted) restricted.classList.add("hidden");
        if (app) app.classList.remove("hidden");
        if (eventEl) eventEl.textContent = eventId;
    }

    function setStatus(message, isError) {
        const statusEl = getEl("admin-status");
        if (!statusEl) return;
        statusEl.textContent = message;
        statusEl.style.color = isError ? "#8b1e1e" : "#6c6161";
    }

    function setInviteFormMessage(message, isError) {
        const msgEl = getEl("invite-form-msg");
        if (!msgEl) return;
        msgEl.textContent = message || "";
        msgEl.style.color = isError ? "#8b1e1e" : "#6c6161";
    }

    function toggleInviteForm(show) {
        const wrap = getEl("invite-form-wrap");
        if (!wrap) return;

        const shouldShow = typeof show === "boolean"
            ? show
            : wrap.classList.contains("hidden");

        wrap.classList.toggle("hidden", !shouldShow);

        if (shouldShow) {
            const nameInput = getEl("invite-name");
            if (nameInput) nameInput.focus();
        }
    }

    function resetInviteForm() {
        const form = getEl("invite-form");
        if (form) form.reset();

        const pasesInput = getEl("invite-pases");
        if (pasesInput) pasesInput.value = "1";

        const activeInput = getEl("invite-active");
        if (activeInput) activeInput.checked = true;

        setInviteFormMessage("");
    }

    function getNextNumericGuestId() {
        let maxId = 0;

        state.invitadosMap.forEach(function (_, id) {
            const idText = String(id || "").trim();
            if (!/^\d+$/.test(idText)) return;
            const idNumber = Number(idText);
            if (!Number.isFinite(idNumber)) return;
            if (idNumber > maxId) maxId = idNumber;
        });

        return maxId + 1;
    }

    function createGuestId() {
        return String(getNextNumericGuestId());
    }

    function getInvitePath() {
        const currentPath = String(window.location.pathname || "/");
        if (currentPath.endsWith("/admin.html")) {
            return currentPath.slice(0, -"admin.html".length);
        }
        return "/";
    }

    function buildGuestLink(guestId) {
        const safeGuestId = String(guestId || "").trim();
        const invitePath = getInvitePath();
        const eventIdParam = String(
            window.config
            && window.config.event
            && window.config.event.eventIdParam
            || "eventId"
        ).trim() || "eventId";

        const params = new URLSearchParams();
        if (state.eventId) {
            params.set(eventIdParam, state.eventId);
        }
        params.set("id", safeGuestId);

        return BASE_URL.replace(/\/$/, "") + invitePath + "?" + params.toString();
    }

    async function copyTextToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return;
        }

        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
    }

    async function copyGuestLink(row) {
        if (!row || !row.id) return;

        try {
            const link = buildGuestLink(row.id);
            await copyTextToClipboard(link);
            setStatus("Link copiado", false);
        } catch (error) {
            console.error("Error al copiar link:", error);
            setStatus("No se pudo copiar el link.", true);
        }
    }

    async function copyAllGuestLinks() {
        const rows = Array.isArray(state.rows) ? state.rows : [];
        const listRows = rows
            .filter(function (row) {
                if (!row || !row.id) return false;
                if (INCLUDE_INACTIVE_IN_BULK_COPY) return true;
                return row.activo !== false;
            })
            .map(function (row) {
                const name = String(row.nombre || "Invitado").trim() || "Invitado";
                return name + " - " + buildGuestLink(row.id);
            });

        if (listRows.length === 0) {
            setStatus("No hay invitados activos para copiar links.", true);
            return;
        }

        try {
            await copyTextToClipboard(listRows.join("\n"));
            setStatus("Todos los links fueron copiados", false);
        } catch (error) {
            console.error("Error al copiar todos los links:", error);
            setStatus("No se pudieron copiar todos los links.", true);
        }
    }

    function openQrModal() {
        const modal = getEl("qr-modal");
        if (!modal) return;
        modal.classList.remove("hidden");
    }

    function closeQrModal() {
        const modal = getEl("qr-modal");
        const container = getEl("qr-container");
        if (modal) modal.classList.add("hidden");
        if (container) container.replaceChildren();
        state.qrGuest = null;
    }

    function renderGuestQr(row) {
        const container = getEl("qr-container");
        const nameEl = getEl("qr-guest-name");
        if (!container || typeof window.QRCode === "undefined") {
            setStatus("No se pudo generar QR. Librería no disponible.", true);
            return;
        }

        const guestName = String(row && row.nombre || "Invitado").trim() || "Invitado";
        const guestLink = buildGuestLink(row && row.id);
        state.qrGuest = {
            id: row && row.id,
            nombre: guestName,
            link: guestLink
        };

        if (nameEl) nameEl.textContent = guestName;
        container.replaceChildren();

        new window.QRCode(container, {
            text: guestLink,
            width: 210,
            height: 210,
            colorDark: "#111111",
            colorLight: "#ffffff",
            correctLevel: window.QRCode.CorrectLevel.M
        });

        openQrModal();
    }

    function sanitizeFilePart(value) {
        return String(value || "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "invitado";
    }

    function downloadCurrentQr() {
        const container = getEl("qr-container");
        if (!container || !state.qrGuest) {
            setStatus("No hay QR para descargar.", true);
            return;
        }

        const canvas = container.querySelector("canvas");
        const image = container.querySelector("img");
        let href = "";

        if (canvas && typeof canvas.toDataURL === "function") {
            href = canvas.toDataURL("image/png");
        } else if (image && image.src) {
            href = image.src;
        }

        if (!href) {
            setStatus("No se pudo descargar el QR.", true);
            return;
        }

        const link = document.createElement("a");
        link.href = href;
        link.download = "qr-" + sanitizeFilePart(state.qrGuest.nombre) + "-" + sanitizeFilePart(state.qrGuest.id) + ".png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function dataUrlToBase64(dataUrl) {
        const parts = String(dataUrl || "").split(",");
        return parts.length > 1 ? parts[1] : "";
    }

    function waitForQrDataUrlFromContainer(container) {
        return new Promise(function (resolve, reject) {
            const maxAttempts = 20;
            let attempts = 0;

            function check() {
                const canvas = container.querySelector("canvas");
                if (canvas && typeof canvas.toDataURL === "function") {
                    resolve(canvas.toDataURL("image/png"));
                    return;
                }

                const image = container.querySelector("img");
                if (image && image.src) {
                    resolve(image.src);
                    return;
                }

                attempts += 1;
                if (attempts >= maxAttempts) {
                    reject(new Error("QR no disponible para exportar."));
                    return;
                }

                window.setTimeout(check, 50);
            }

            check();
        });
    }

    async function generateQrDataUrl(link) {
        if (typeof window.QRCode === "undefined") {
            throw new Error("QRCode library no disponible.");
        }

        const tempContainer = document.createElement("div");
        tempContainer.style.position = "fixed";
        tempContainer.style.left = "-9999px";
        tempContainer.style.top = "-9999px";
        tempContainer.style.width = "220px";
        tempContainer.style.height = "220px";
        document.body.appendChild(tempContainer);

        try {
            new window.QRCode(tempContainer, {
                text: link,
                width: 210,
                height: 210,
                colorDark: "#111111",
                colorLight: "#ffffff",
                correctLevel: window.QRCode.CorrectLevel.M
            });

            return await waitForQrDataUrlFromContainer(tempContainer);
        } finally {
            document.body.removeChild(tempContainer);
        }
    }

    async function downloadAllActiveQrs() {
        const rows = (Array.isArray(state.rows) ? state.rows : []).filter(function (row) {
            return row && row.id && row.activo !== false;
        });

        if (rows.length === 0) {
            setStatus("No hay invitados activos para generar QR.", true);
            return;
        }

        if (typeof window.JSZip === "undefined") {
            setStatus("No se pudo generar ZIP de QR. Librería no disponible.", true);
            return;
        }

        const zip = new window.JSZip();

        try {
            for (let i = 0; i < rows.length; i += 1) {
                const row = rows[i];
                setStatus("Generando QR " + (i + 1) + " de " + rows.length + "...", false);
                const link = buildGuestLink(row.id);
                const dataUrl = await generateQrDataUrl(link);
                const base64 = dataUrlToBase64(dataUrl);
                const fileName = "qr_" + sanitizeFilePart(row.nombre) + "-" + sanitizeFilePart(row.id) + ".png";
                zip.file(fileName, base64, { base64: true });
            }

            setStatus("Comprimiendo QR en ZIP...", false);
            const zipBlob = await zip.generateAsync({ type: "blob" });
            const zipUrl = URL.createObjectURL(zipBlob);
            const anchor = document.createElement("a");
            const dateStamp = new Date().toISOString().slice(0, 10);
            anchor.href = zipUrl;
            anchor.download = "qrs-" + sanitizeFilePart(state.eventId) + "-" + dateStamp + ".zip";
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            URL.revokeObjectURL(zipUrl);

            setStatus("Todos los QR activos fueron descargados.", false);
        } catch (error) {
            console.error("Error al generar todos los QR:", error);
            setStatus("No se pudieron generar todos los QR.", true);
        }
    }

    function beginInlineEdit(row) {
        if (!row || row.activo === false) return;
        state.editingGuestId = row.id;
        state.editDraft = {
            nombre: String(row.nombre || "").trim(),
            pases: Math.max(1, Number(row.pasesAsignados) || 1),
            activo: row.activo !== false
        };
        refreshView();
    }

    function cancelInlineEdit() {
        state.editingGuestId = null;
        state.editDraft = null;
        refreshView();
    }

    async function saveInlineEdit(row) {
        if (!state.db || typeof state.db.updateInvitado !== "function") {
            setStatus("No se pudo inicializar la edición de invitados.", true);
            return;
        }

        const draft = state.editDraft || {};
        const nombre = String(draft.nombre || "").trim();
        const pases = Number(draft.pases);
        const activo = Boolean(draft.activo);

        if (!nombre) {
            setStatus("El nombre es obligatorio para guardar cambios.", true);
            return;
        }

        if (!Number.isInteger(pases) || pases < 1) {
            setStatus("El número de pases debe ser mayor o igual a 1.", true);
            return;
        }

        try {
            await state.db.updateInvitado(state.eventId, row.id, {
                id: row.id,
                nombre,
                pases,
                activo
            });

            state.editingGuestId = null;
            state.editDraft = null;
            refreshView();
            setStatus("Invitado actualizado correctamente.", false);
        } catch (error) {
            console.error("Error al actualizar invitado:", error);
            setStatus("No se pudo actualizar el invitado.", true);
        }
    }

    async function deleteInvitadoFromRow(row) {
        if (!row || !row.id || !row.canEdit) return;

        if (!state.db || typeof state.db.deleteInvitado !== "function") {
            setStatus("No se pudo inicializar la eliminación de invitados.", true);
            return;
        }

        const confirmed = window.confirm("¿Seguro que deseas eliminar este invitado?");
        if (!confirmed) return;

        try {
            await state.db.deleteInvitado(state.eventId, row.id);

            if (state.editingGuestId === row.id) {
                state.editingGuestId = null;
                state.editDraft = null;
            }

            setStatus("Invitado desactivado correctamente.", false);
        } catch (error) {
            console.error("Error al eliminar invitado:", error);
            setStatus("No se pudo eliminar el invitado.", true);
        }
    }

    async function reactivateInvitadoFromRow(row) {
        if (!row || !row.id) return;

        if (!state.db || typeof state.db.updateInvitado !== "function") {
            setStatus("No se pudo inicializar la reactivación.", true);
            return;
        }

        const payload = {
            id: row.id,
            nombre: String(row.nombre || "Invitado").trim() || "Invitado",
            pases: Math.max(1, Number(row.pasesAsignados) || 1),
            activo: true
        };

        try {
            await state.db.updateInvitado(state.eventId, row.id, payload);
            setStatus("Invitado reactivado correctamente.", false);
        } catch (error) {
            console.error("Error al reactivar invitado:", error);
            setStatus("No se pudo reactivar el invitado.", true);
        }
    }

    function waitForDatabase(timeoutMs) {
        const maxTime = typeof timeoutMs === "number" ? timeoutMs : 8000;

        return new Promise(function (resolve, reject) {
            const start = Date.now();
            const timer = window.setInterval(function () {
                if (window.RSVPDatabase) {
                    window.clearInterval(timer);
                    resolve(window.RSVPDatabase);
                    return;
                }

                if (Date.now() - start > maxTime) {
                    window.clearInterval(timer);
                    reject(new Error("No se pudo inicializar RSVPDatabase."));
                }
            }, 50);
        });
    }

    function normalizeGuestId(value) {
        const text = String(value || "").trim();
        return text || "default";
    }

    function normalizeResponse(value) {
        const response = String(value || "").trim().toLowerCase();
        if (response === "si") return "si";
        if (response === "no") return "no";
        return "pendiente";
    }

    function normalizeConfirmation(record) {
        const response = normalizeResponse(record && record.respuesta);
        return {
            id: normalizeGuestId(record && (record.id || record._key)),
            nombre: String(record && record.nombre || "").trim(),
            pasesAsignados: Math.max(0, Number(record && record.pasesAsignados) || 0),
            respuesta: response,
            cantidadConfirmada: response === "si"
                ? Math.max(0, Number(record && record.cantidadConfirmada) || 0)
                : 0,
            fechaConfirmacion: Number(record && record.fechaConfirmacion) || null
        };
    }

    function getGuestCreationOrderHint(id, fallbackIndex) {
        const rawId = String(id || "").trim();
        const guestTimestampMatch = rawId.match(/^guest_(\d{10,})$/);
        if (guestTimestampMatch) {
            return Number(guestTimestampMatch[1]);
        }

        const numericId = Number(rawId);
        if (Number.isFinite(numericId) && rawId !== "") {
            return numericId;
        }

        return 1000000000000 + fallbackIndex;
    }

    function compareGuestIds(a, b) {
        const idA = String(a == null ? "" : a).trim();
        const idB = String(b == null ? "" : b).trim();
        const numericA = /^\d+$/.test(idA) ? Number(idA) : Number.POSITIVE_INFINITY;
        const numericB = /^\d+$/.test(idB) ? Number(idB) : Number.POSITIVE_INFINITY;

        if (numericA !== numericB) {
            return numericA - numericB;
        }

        return idA.localeCompare(idB, "es", { numeric: true, sensitivity: "base" });
    }

    function mapInvitados(invitados) {
        const map = new Map();

        const orderedInvitados = (Array.isArray(invitados) ? invitados : [])
            .map(function (invitado, index) {
                return {
                    invitado,
                    index,
                    orderHint: getGuestCreationOrderHint(invitado && (invitado.id || invitado._key), index)
                };
            })
            .sort(function (a, b) {
                if (a.orderHint !== b.orderHint) {
                    return a.orderHint - b.orderHint;
                }
                return a.index - b.index;
            })
            .map(function (entry) {
                return entry.invitado;
            });

        orderedInvitados.forEach(function (invitado) {
            if (!invitado || typeof invitado !== "object") return;
            const id = normalizeGuestId(invitado.id || invitado._key);

            map.set(id, {
                id,
                nombre: String(invitado.nombre || "").trim() || "Invitado",
                pases: Math.max(0, Number(invitado.pases) || 0),
                activo: typeof invitado.activo === "undefined" ? true : Boolean(invitado.activo)
            });
        });

        return map;
    }

    function mapConfirmations(confirmations) {
        const latestByGuest = new Map();

        (Array.isArray(confirmations) ? confirmations : []).forEach(function (record) {
            const normalized = normalizeConfirmation(record);
            const previous = latestByGuest.get(normalized.id);
            if (!previous || Number(normalized.fechaConfirmacion || 0) >= Number(previous.fechaConfirmacion || 0)) {
                latestByGuest.set(normalized.id, normalized);
            }
        });

        return latestByGuest;
    }

    function buildRows() {
        const rows = [];
        const confirmationsByGuest = mapConfirmations(state.confirmations);

        state.invitadosMap.forEach(function (guest, id) {
            const confirmation = confirmationsByGuest.get(id);

            if (!confirmation) {
                rows.push({
                    id,
                    nombre: guest.nombre,
                    pasesAsignados: guest.pases,
                    respuesta: "pendiente",
                    cantidadConfirmada: 0,
                    fechaConfirmacion: null,
                    activo: guest.activo,
                    canEdit: guest.activo !== false,
                    canReactivate: guest.activo === false
                });
                return;
            }

            rows.push({
                ...confirmation,
                nombre: confirmation.nombre || guest.nombre,
                pasesAsignados: confirmation.pasesAsignados || guest.pases,
                activo: guest.activo,
                canEdit: guest.activo !== false,
                canReactivate: guest.activo === false
            });
        });

        confirmationsByGuest.forEach(function (confirmation, id) {
            if (state.invitadosMap.has(id)) return;
            rows.push({
                ...confirmation,
                activo: false,
                canEdit: false,
                canReactivate: true
            });
        });

        rows.sort(function (a, b) {
            const byId = compareGuestIds(a && a.id, b && b.id);
            if (byId !== 0) return byId;
            return String(a && a.nombre || "").localeCompare(String(b && b.nombre || ""), "es");
        });

        state.rows = rows;
        return rows;
    }

    function calculateMetrics(rows) {
        const activeRows = rows.filter(function (row) { return row.activo !== false; });
        const totalInvitados = activeRows.length;
        const confirmadosSi = activeRows.filter(function (row) { return row.respuesta === "si"; }).length;
        const confirmadosNo = activeRows.filter(function (row) { return row.respuesta === "no"; }).length;
        const pendientes = totalInvitados - confirmadosSi - confirmadosNo;
        const personasConfirmadas = activeRows
            .filter(function (row) { return row.respuesta === "si"; })
            .reduce(function (acc, row) { return acc + (Number(row.cantidadConfirmada) || 0); }, 0);

        return {
            totalInvitados,
            confirmadosSi,
            confirmadosNo,
            pendientes,
            personasConfirmadas
        };
    }

    function renderMetrics(metrics) {
        getEl("metric-total").textContent = String(metrics.totalInvitados);
        getEl("metric-yes").textContent = String(metrics.confirmadosSi);
        getEl("metric-no").textContent = String(metrics.confirmadosNo);
        getEl("metric-pending").textContent = String(metrics.pendientes);
        getEl("metric-people").textContent = String(metrics.personasConfirmadas);
    }

    function formatDate(value) {
        if (!value) return "--";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "--";

        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = String(date.getFullYear()).slice(-2);

        let hour = date.getHours();
        const minute = String(date.getMinutes()).padStart(2, "0");
        const ampm = hour >= 12 ? "PM" : "AM";
        hour = hour % 12;
        hour = hour === 0 ? 12 : hour;

        return day + "/" + month + "/" + year + " " + hour + ":" + minute + " " + ampm;
    }

    function formatDateParts(value) {
        if (!value) {
            return { date: "--", time: "" };
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return { date: "--", time: "" };
        }

        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = String(date.getFullYear()).slice(-2);

        let hour = date.getHours();
        const minute = String(date.getMinutes()).padStart(2, "0");
        const ampm = hour >= 12 ? "PM" : "AM";
        hour = hour % 12;
        hour = hour === 0 ? 12 : hour;

        return {
            date: day + "/" + month + "/" + year,
            time: hour + ":" + minute + " " + ampm
        };
    }

    function labelResponse(response) {
        if (response === "si") return "SI";
        if (response === "no") return "NO";
        return "Pendiente";
    }

    function getStatusBadgeMeta(response) {
        if (response === "si") {
            return { text: "Confirmado", className: "status-badge status-badge--yes" };
        }
        if (response === "no") {
            return { text: "No asistira", className: "status-badge status-badge--no" };
        }
        return { text: "Pendiente", className: "status-badge status-badge--pending" };
    }

    function createActionsWrap(row, isEditing, mode) {
        const actionsWrap = document.createElement("div");
        actionsWrap.className = "row-actions";
        actionsWrap.classList.add(mode === "mobile" ? "row-actions-mobile" : "row-actions-desktop");
        actionsWrap.classList.add(row.canReactivate ? "row-actions--inactive" : "row-actions--active");

        const draft = state.editDraft || {};

        if (row.canEdit) {
            if (isEditing) {
                const checkWrap = document.createElement("label");
                checkWrap.className = "row-check";
                const activeInput = document.createElement("input");
                activeInput.type = "checkbox";
                activeInput.checked = draft.activo !== false;
                activeInput.addEventListener("change", function () {
                    if (!state.editDraft) return;
                    state.editDraft.activo = activeInput.checked;
                });
                checkWrap.append(activeInput, document.createTextNode("Activo"));

                const saveBtn = document.createElement("button");
                saveBtn.type = "button";
                saveBtn.className = "btn-mini btn-mini-primary";
                saveBtn.textContent = "Guardar";
                saveBtn.addEventListener("click", function () {
                    saveInlineEdit(row);
                });

                const cancelBtn = document.createElement("button");
                cancelBtn.type = "button";
                cancelBtn.className = "btn-mini btn-mini-secondary";
                cancelBtn.textContent = "Cancelar";
                cancelBtn.addEventListener("click", function () {
                    cancelInlineEdit();
                });

                actionsWrap.append(checkWrap, saveBtn, cancelBtn);
                return actionsWrap;
            }

            const copyBtn = document.createElement("button");
            copyBtn.type = "button";
            copyBtn.className = "btn-mini btn-mini-success";
            copyBtn.textContent = "Copiar link";
            copyBtn.addEventListener("click", function () {
                copyGuestLink(row);
            });

            const qrBtn = document.createElement("button");
            qrBtn.type = "button";
            qrBtn.className = "btn-mini btn-mini-action";
            qrBtn.textContent = "QR";
            qrBtn.addEventListener("click", function () {
                renderGuestQr(row);
            });

            const editBtn = document.createElement("button");
            editBtn.type = "button";
            editBtn.className = "btn-mini";
            editBtn.textContent = "Editar";
            editBtn.addEventListener("click", function () {
                beginInlineEdit(row);
            });

            const deleteBtn = document.createElement("button");
            deleteBtn.type = "button";
            deleteBtn.className = "btn-mini btn-mini-danger";
            deleteBtn.textContent = "Desactivar";
            deleteBtn.addEventListener("click", function () {
                deleteInvitadoFromRow(row);
            });

            actionsWrap.append(copyBtn, qrBtn, editBtn, deleteBtn);
            return actionsWrap;
        }

        if (row.canReactivate) {
            const inactiveLegend = document.createElement("div");
            inactiveLegend.className = "inactive-legend";
            inactiveLegend.textContent = "Invitado desactivado";

            const copyBtn = document.createElement("button");
            copyBtn.type = "button";
            copyBtn.className = "btn-mini btn-mini-success";
            copyBtn.textContent = "Copiar link";
            copyBtn.addEventListener("click", function () {
                copyGuestLink(row);
            });

            const qrBtn = document.createElement("button");
            qrBtn.type = "button";
            qrBtn.className = "btn-mini btn-mini-action";
            qrBtn.textContent = "QR";
            qrBtn.addEventListener("click", function () {
                renderGuestQr(row);
            });

            const reactivateBtn = document.createElement("button");
            reactivateBtn.type = "button";
            reactivateBtn.className = "btn-mini btn-mini-primary";
            reactivateBtn.textContent = "Reactivar";
            reactivateBtn.addEventListener("click", function () {
                reactivateInvitadoFromRow(row);
            });

            actionsWrap.append(inactiveLegend, copyBtn, qrBtn, reactivateBtn);
            return actionsWrap;
        }

        const copyBtn = document.createElement("button");
        copyBtn.type = "button";
        copyBtn.className = "btn-mini btn-mini-success";
        copyBtn.textContent = "Copiar link";
        copyBtn.addEventListener("click", function () {
            copyGuestLink(row);
        });

        const qrBtn = document.createElement("button");
        qrBtn.type = "button";
        qrBtn.className = "btn-mini btn-mini-action";
        qrBtn.textContent = "QR";
        qrBtn.addEventListener("click", function () {
            renderGuestQr(row);
        });

        actionsWrap.append(copyBtn, qrBtn);
        return actionsWrap;
    }

    function renderDesktopTable(rows) {
        const tbody = getEl("confirmations-body");
        if (!tbody) return;

        if (!Array.isArray(rows) || rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7">No hay datos para mostrar.</td></tr>';
            return;
        }

        tbody.replaceChildren();
        rows.forEach(function (row) {
            const tr = document.createElement("tr");
            tr.classList.add("guest-row");
            if (row.activo === false) tr.classList.add("row-inactive");

            const isEditing = row.canEdit && state.editingGuestId === row.id;
            const draft = isEditing ? (state.editDraft || {}) : null;

            const tdId = document.createElement("td");
            tdId.className = "id-cell id-col";
            tdId.textContent = String(row.id || "--");

            const tdNombre = document.createElement("td");
            tdNombre.className = "name-col";
            if (isEditing) {
                const nameInput = document.createElement("input");
                nameInput.type = "text";
                nameInput.className = "inline-input";
                nameInput.maxLength = 120;
                nameInput.value = String(draft.nombre || row.nombre || "");
                nameInput.addEventListener("input", function () {
                    if (!state.editDraft) return;
                    state.editDraft.nombre = nameInput.value;
                });
                tdNombre.appendChild(nameInput);
            } else {
                const nameMain = document.createElement("div");
                nameMain.className = "guest-name-main";
                nameMain.textContent = row.nombre || "--";
                tdNombre.appendChild(nameMain);

                if (row.activo === false) {
                    const inactiveBadge = document.createElement("span");
                    inactiveBadge.className = "guest-inactive-badge";
                    inactiveBadge.textContent = "Invitado desactivado";
                    tdNombre.appendChild(inactiveBadge);
                }
            }

            const tdPases = document.createElement("td");
            tdPases.className = "pases-col";
            if (isEditing) {
                const pasesInput = document.createElement("input");
                pasesInput.type = "number";
                pasesInput.className = "inline-input";
                pasesInput.min = "1";
                pasesInput.step = "1";
                pasesInput.value = String(Math.max(1, Number(draft.pases || row.pasesAsignados) || 1));
                pasesInput.addEventListener("input", function () {
                    if (!state.editDraft) return;
                    state.editDraft.pases = Number(pasesInput.value);
                });
                tdPases.appendChild(pasesInput);
            } else {
                tdPases.textContent = String(Number(row.pasesAsignados) || 0);
            }

            const tdEstado = document.createElement("td");
            tdEstado.className = "status-col";
            const badgeMeta = getStatusBadgeMeta(row.respuesta);
            const statusBadge = document.createElement("span");
            statusBadge.className = badgeMeta.className;
            statusBadge.textContent = badgeMeta.text;
            tdEstado.appendChild(statusBadge);

            const tdConfirmados = document.createElement("td");
            tdConfirmados.className = "confirmed-col";
            tdConfirmados.textContent = row.respuesta === "si"
                ? String(Number(row.cantidadConfirmada) || 0)
                : (row.respuesta === "no" ? "0" : "--");

            const tdFecha = document.createElement("td");
            tdFecha.className = "date-cell date-col";
            const dateParts = formatDateParts(row.fechaConfirmacion);
            const dateMain = document.createElement("span");
            dateMain.className = "date-main";
            dateMain.textContent = dateParts.date;
            const dateSub = document.createElement("span");
            dateSub.className = "date-sub";
            dateSub.textContent = dateParts.time;
            tdFecha.append(dateMain, dateSub);

            const tdActions = document.createElement("td");
            tdActions.className = "actions-cell";
            tdActions.appendChild(createActionsWrap(row, isEditing, "desktop"));

            tr.append(tdId, tdNombre, tdPases, tdEstado, tdConfirmados, tdFecha, tdActions);
            tbody.appendChild(tr);
        });
    }

    function renderMobileCards(rows) {
        const container = getEl("mobile-confirmations");
        if (!container) return;

        if (!Array.isArray(rows) || rows.length === 0) {
            container.innerHTML = '<div class="mobile-confirmations-empty">No hay datos para mostrar.</div>';
            return;
        }

        container.replaceChildren();
        rows.forEach(function (row) {
            const isEditing = row.canEdit && state.editingGuestId === row.id;
            const draft = isEditing ? (state.editDraft || {}) : null;
            const card = document.createElement("article");
            card.className = "guest-card" + (row.activo === false ? " inactive" : "");

            const idEl = document.createElement("div");
            idEl.className = "guest-card-id";
            idEl.textContent = "#" + String(row.id || "--");

            const nameEl = document.createElement("h3");
            nameEl.className = "guest-card-name";
            if (isEditing) {
                const nameInput = document.createElement("input");
                nameInput.type = "text";
                nameInput.className = "inline-input";
                nameInput.maxLength = 120;
                nameInput.value = String(draft.nombre || row.nombre || "");
                nameInput.addEventListener("input", function () {
                    if (!state.editDraft) return;
                    state.editDraft.nombre = nameInput.value;
                });
                nameEl.appendChild(nameInput);
            } else {
                nameEl.textContent = row.nombre || "--";
            }

            const stateWrap = document.createElement("div");
            stateWrap.className = "guest-card-state";
            const badgeMeta = getStatusBadgeMeta(row.respuesta);
            const badge = document.createElement("span");
            badge.className = badgeMeta.className;
            badge.textContent = badgeMeta.text;
            stateWrap.appendChild(badge);

            if (row.activo === false) {
                const inactiveBadge = document.createElement("span");
                inactiveBadge.className = "guest-inactive-badge";
                inactiveBadge.textContent = "Invitado desactivado";
                stateWrap.appendChild(inactiveBadge);
            }

            const meta = document.createElement("div");
            meta.className = "guest-card-meta";
            const dateParts = formatDateParts(row.fechaConfirmacion);

            const linePases = document.createElement("div");
            linePases.className = "guest-card-line";
            const passesValue = isEditing
                ? String(Math.max(1, Number(draft.pases || row.pasesAsignados) || 1))
                : String(Number(row.pasesAsignados) || 0);
            const pasesLabel = document.createElement("span");
            pasesLabel.textContent = "Pases";
            const pasesStrong = document.createElement("strong");
            pasesStrong.textContent = passesValue;
            linePases.append(pasesLabel, pasesStrong);

            if (isEditing) {
                const pasesInput = document.createElement("input");
                pasesInput.type = "number";
                pasesInput.className = "inline-input";
                pasesInput.min = "1";
                pasesInput.step = "1";
                pasesInput.value = passesValue;
                pasesInput.addEventListener("input", function () {
                    if (!state.editDraft) return;
                    state.editDraft.pases = Number(pasesInput.value);
                });
                linePases.replaceChildren(pasesLabel, pasesInput);
            }

            const lineConfirmed = document.createElement("div");
            lineConfirmed.className = "guest-card-line";
            const confirmedLabel = document.createElement("span");
            confirmedLabel.textContent = "Pases confirmados";
            const confirmedStrong = document.createElement("strong");
            confirmedStrong.textContent = row.respuesta === "si"
                ? String(Number(row.cantidadConfirmada) || 0)
                : (row.respuesta === "no" ? "0" : "--");
            lineConfirmed.append(confirmedLabel, confirmedStrong);

            const lineDate = document.createElement("div");
            lineDate.className = "guest-card-line";
            const dateLabel = document.createElement("span");
            dateLabel.textContent = "Fecha";
            const dateStrong = document.createElement("strong");
            dateStrong.textContent = dateParts.date;
            lineDate.append(dateLabel, dateStrong);

            const lineTime = document.createElement("div");
            lineTime.className = "guest-card-line";
            const timeLabel = document.createElement("span");
            timeLabel.textContent = "Hora";
            const timeStrong = document.createElement("strong");
            timeStrong.textContent = dateParts.time || "--";
            lineTime.append(timeLabel, timeStrong);

            meta.append(linePases, lineConfirmed, lineDate, lineTime);

            const actions = document.createElement("div");
            actions.className = "guest-card-actions";
            actions.appendChild(createActionsWrap(row, isEditing, "mobile"));

            card.append(idEl, nameEl, stateWrap, meta, actions);
            container.appendChild(card);
        });
    }

    function renderTable(rows) {
        renderDesktopTable(rows);
        renderMobileCards(rows);
    }

    function bindResponsiveRerender() {
        if (typeof state.resizeHandler === "function") {
            window.removeEventListener("resize", state.resizeHandler);
        }

        let resizeTick = null;
        state.resizeHandler = function () {
            if (resizeTick) {
                window.cancelAnimationFrame(resizeTick);
            }
            resizeTick = window.requestAnimationFrame(function () {
                resizeTick = null;
                refreshView();
            });
        };

        window.addEventListener("resize", state.resizeHandler);
    }

    function escapeCsvCell(value) {
        const text = String(value == null ? "" : value);
        return '"' + text.replace(/"/g, '""') + '"';
    }

    function exportCsv() {
        const rows = state.rows || [];
        if (rows.length === 0) return;

        const headers = ["Nombre", "Pases", "Respuesta", "Confirmados", "Fecha"];
        const lines = [headers.map(escapeCsvCell).join(",")];

        rows.forEach(function (row) {
            lines.push([
                row.nombre || "",
                String(Number(row.pasesAsignados) || 0),
                labelResponse(row.respuesta),
                row.respuesta === "si"
                    ? String(Number(row.cantidadConfirmada) || 0)
                    : (row.respuesta === "no" ? "0" : ""),
                formatDate(row.fechaConfirmacion)
            ].map(escapeCsvCell).join(","));
        });

        const content = "\uFEFF" + lines.join("\n");
        const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        const dateStamp = new Date().toISOString().slice(0, 10);

        link.href = url;
        link.download = "admin-rsvp-" + state.eventId + "-" + dateStamp + ".csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    async function saveInvitadoFromForm(event) {
        event.preventDefault();

        if (!state.db || typeof state.db.createInvitado !== "function") {
            setInviteFormMessage("No se pudo inicializar el guardado de invitados.", true);
            return;
        }

        const nameInput = getEl("invite-name");
        const pasesInput = getEl("invite-pases");
        const activeInput = getEl("invite-active");
        const saveBtn = getEl("btn-save-invite");

        const nombre = String(nameInput && nameInput.value || "").trim();
        const pases = Number(pasesInput && pasesInput.value);
        const activo = Boolean(activeInput && activeInput.checked);

        if (!nombre) {
            setInviteFormMessage("El nombre es obligatorio.", true);
            return;
        }

        if (!Number.isInteger(pases) || pases < 1) {
            setInviteFormMessage("El número de pases debe ser mayor o igual a 1.", true);
            return;
        }

        const payload = {
            id: createGuestId(),
            nombre,
            pases,
            activo
        };

        if (saveBtn) saveBtn.disabled = true;
        setInviteFormMessage("Guardando invitado...", false);

        try {
            await state.db.createInvitado(state.eventId, payload);
            resetInviteForm();
            toggleInviteForm(false);
            setStatus("Invitado creado correctamente.", false);
        } catch (error) {
            console.error("Error al guardar invitado:", error);
            setInviteFormMessage("No se pudo guardar el invitado.", true);
        } finally {
            if (saveBtn) saveBtn.disabled = false;
        }
    }

    function refreshView() {
        const rows = buildRows();
        const metrics = calculateMetrics(rows);
        renderMetrics(metrics);
        renderTable(rows);

        const exportBtn = getEl("btn-export-csv");
        if (exportBtn) exportBtn.disabled = rows.length === 0;

        setStatus("Sincronizado en tiempo real. Registros: " + rows.length, false);
    }

    function bindEvents() {
        const exportBtn = getEl("btn-export-csv");
        if (exportBtn) {
            exportBtn.addEventListener("click", exportCsv);
        }

        const copyAllLinksBtn = getEl("btn-copy-all-links");
        if (copyAllLinksBtn) {
            copyAllLinksBtn.addEventListener("click", copyAllGuestLinks);
        }

        const downloadAllQrsBtn = getEl("btn-download-all-qrs");
        if (downloadAllQrsBtn) {
            downloadAllQrsBtn.addEventListener("click", downloadAllActiveQrs);
        }

        const toggleInviteBtn = getEl("btn-toggle-invite-form");
        if (toggleInviteBtn) {
            toggleInviteBtn.addEventListener("click", function () {
                setInviteFormMessage("");
                toggleInviteForm();
            });
        }

        const cancelInviteBtn = getEl("btn-cancel-invite");
        if (cancelInviteBtn) {
            cancelInviteBtn.addEventListener("click", function () {
                resetInviteForm();
                toggleInviteForm(false);
            });
        }

        const inviteForm = getEl("invite-form");
        if (inviteForm) {
            inviteForm.addEventListener("submit", saveInvitadoFromForm);
        }

        const closeQrBtn = getEl("btn-close-qr");
        if (closeQrBtn) {
            closeQrBtn.addEventListener("click", closeQrModal);
        }

        const downloadQrBtn = getEl("btn-download-qr");
        if (downloadQrBtn) {
            downloadQrBtn.addEventListener("click", downloadCurrentQr);
        }

        const qrModal = getEl("qr-modal");
        if (qrModal) {
            qrModal.addEventListener("click", function (event) {
                if (event.target === qrModal) {
                    closeQrModal();
                }
            });
        }
    }

    function subscribeData(db) {
        const unsubscribeConfirmations = db.subscribeToConfirmations(
            state.eventId,
            function (confirmations) {
                state.confirmations = Array.isArray(confirmations) ? confirmations : [];
                refreshView();
            },
            function (error) {
                console.error("Error al sincronizar confirmaciones:", error);
                setStatus("Error sincronizando confirmaciones.", true);
            }
        );

        const unsubscribeInvitados = db.subscribeToInvitados(
            state.eventId,
            function (invitados) {
                state.invitadosMap = mapInvitados(invitados);
                refreshView();
            },
            function (error) {
                console.error("Error al sincronizar invitados:", error);
                setStatus("Error sincronizando invitados.", true);
            }
        );

        if (typeof unsubscribeConfirmations === "function") {
            state.unsubscribers.push(unsubscribeConfirmations);
        }
        if (typeof unsubscribeInvitados === "function") {
            state.unsubscribers.push(unsubscribeInvitados);
        }
    }

    async function init() {
        const query = getQueryParams();
        if (query.adminKey !== ADMIN_KEY) {
            showRestricted();
            return;
        }

        state.eventId = resolveEventId(query.eventId);
        showApp(state.eventId);
        bindEvents();
        bindResponsiveRerender();
        setStatus("Conectando con Firebase...", false);

        try {
            const db = await waitForDatabase();
            if (!db
                || typeof db.subscribeToConfirmations !== "function"
                || typeof db.subscribeToInvitados !== "function"
                || typeof db.createInvitado !== "function"
                || typeof db.updateInvitado !== "function"
                || typeof db.deleteInvitado !== "function") {
                throw new Error("RSVPDatabase incompleto para panel admin.");
            }

            state.db = db;
            subscribeData(db);
        } catch (error) {
            console.error(error);
            setStatus("No se pudo inicializar el panel.", true);
        }
    }

    window.addEventListener("beforeunload", function () {
        state.unsubscribers.forEach(function (unsubscribe) {
            if (typeof unsubscribe === "function") unsubscribe();
        });

        if (typeof state.resizeHandler === "function") {
            window.removeEventListener("resize", state.resizeHandler);
        }
    });

    document.addEventListener("DOMContentLoaded", init);
})();
