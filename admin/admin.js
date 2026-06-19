(function () {
    "use strict";

    var eventForm = document.getElementById("event-form");
    var eventIdInput = document.getElementById("event-id");
    var eventTitleInput = document.getElementById("event-title");
    var eventLocationInput = document.getElementById("event-location");
    var eventDatetimeInput = document.getElementById("event-datetime");
    var cancelEditBtn = document.getElementById("cancel-edit-btn");
    var saveBtn = document.getElementById("save-btn");
    var downloadJsonBtn = document.getElementById("download-json-btn");
    var uploadJsonInput = document.getElementById("upload-json-input");

    var tableBody = document.getElementById("events-table-body");
    var emptyText = document.getElementById("events-empty");
    var panelMessage = document.getElementById("panel-message");

    var events = [];

    function showPanelMessage(message) {
        panelMessage.textContent = message;
        panelMessage.classList.remove("d-none");
        window.setTimeout(function () {
            panelMessage.classList.add("d-none");
        }, 2500);
    }

    function isoToInputValue(isoString) {
        var date = new Date(isoString);
        if (Number.isNaN(date.getTime())) {
            return "";
        }

        var pad = function (num) {
            return String(num).padStart(2, "0");
        };

        return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + "T" + pad(date.getHours()) + ":" + pad(date.getMinutes());
    }

    function formatItDateTime(isoString) {
        var date = new Date(isoString);
        if (Number.isNaN(date.getTime())) {
            return "Data non valida";
        }

        return new Intl.DateTimeFormat("it-IT", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(date);
    }

    function resetForm() {
        eventIdInput.value = "";
        eventTitleInput.value = "";
        eventLocationInput.value = "";
        eventDatetimeInput.value = "";
        saveBtn.textContent = "Aggiungi evento";
        cancelEditBtn.classList.add("d-none");
    }

    function toPayload() {
        return { events: events };
    }

    function renderEvents() {
        tableBody.innerHTML = "";

        if (!events.length) {
            emptyText.classList.remove("d-none");
            return;
        }

        emptyText.classList.add("d-none");

        events.forEach(function (eventItem, index) {
            var tr = document.createElement("tr");

            var titleCell = document.createElement("td");
            titleCell.textContent = eventItem.title;

            var locationCell = document.createElement("td");
            locationCell.textContent = eventItem.location;

            var datetimeCell = document.createElement("td");
            datetimeCell.textContent = formatItDateTime(eventItem.datetime);

            var actionsCell = document.createElement("td");
            actionsCell.className = "text-end";
            actionsCell.innerHTML = ""
                + "<div class=\"action-buttons\">"
                + "<button class=\"btn btn-sm btn-outline-secondary\" data-action=\"up\" data-index=\"" + index + "\"><i class=\"fas fa-arrow-up\"></i></button>"
                + "<button class=\"btn btn-sm btn-outline-secondary\" data-action=\"down\" data-index=\"" + index + "\"><i class=\"fas fa-arrow-down\"></i></button>"
                + "<button class=\"btn btn-sm btn-outline-primary\" data-action=\"edit\" data-id=\"" + eventItem.id + "\">Modifica</button>"
                + "<button class=\"btn btn-sm btn-outline-danger\" data-action=\"delete\" data-id=\"" + eventItem.id + "\">Elimina</button>"
                + "</div>";

            tr.appendChild(titleCell);
            tr.appendChild(locationCell);
            tr.appendChild(datetimeCell);
            tr.appendChild(actionsCell);
            tableBody.appendChild(tr);
        });
    }

    function moveEvent(currentIndex, nextIndex) {
        if (nextIndex < 0 || nextIndex >= events.length) {
            return;
        }

        var temp = events[currentIndex];
        events[currentIndex] = events[nextIndex];
        events[nextIndex] = temp;
        renderEvents();
        showPanelMessage("Ordine aggiornato");
    }

    function downloadJson() {
        var content = JSON.stringify(toPayload(), null, 4) + "\n";
        var blob = new Blob([content], { type: "application/json;charset=utf-8" });
        var url = URL.createObjectURL(blob);
        var link = document.createElement("a");

        link.href = url;
        link.download = "events.json";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    function normalizeEvents(input) {
        if (!input || !Array.isArray(input.events)) {
            return [];
        }

        return input.events
            .filter(function (item) {
                return item && typeof item === "object";
            })
            .map(function (item) {
                return {
                    id: String(item.id || ("evt-" + Date.now() + "-" + Math.random().toString(16).slice(2))),
                    title: String(item.title || "").trim(),
                    location: String(item.location || "").trim(),
                    datetime: String(item.datetime || "")
                };
            })
            .filter(function (item) {
                return item.title && item.location && item.datetime;
            });
    }

    function loadInitialEvents() {
        fetch("../data/events.json", { cache: "no-store" })
            .then(function (res) {
                return res.json();
            })
            .then(function (payload) {
                events = normalizeEvents(payload);
                renderEvents();
            })
            .catch(function () {
                events = [];
                renderEvents();
                showPanelMessage("Impossibile leggere data/events.json");
            });
    }

    eventForm.addEventListener("submit", function (event) {
        event.preventDefault();

        var id = eventIdInput.value;
        var title = eventTitleInput.value.trim();
        var location = eventLocationInput.value.trim();
        var datetimeRaw = eventDatetimeInput.value;
        var normalizedDatetime = new Date(datetimeRaw).toISOString();

        if (!title || !location || !datetimeRaw || Number.isNaN(new Date(datetimeRaw).getTime())) {
            showPanelMessage("Compila correttamente titolo, luogo e data/ora");
            return;
        }

        if (id) {
            events = events.map(function (item) {
                if (item.id !== id) {
                    return item;
                }

                return {
                    id: item.id,
                    title: title,
                    location: location,
                    datetime: normalizedDatetime
                };
            });
            showPanelMessage("Evento aggiornato");
        } else {
            events.push({
                id: "evt-" + Date.now(),
                title: title,
                location: location,
                datetime: normalizedDatetime
            });
            showPanelMessage("Evento aggiunto");
        }

        renderEvents();
        resetForm();
    });

    cancelEditBtn.addEventListener("click", function () {
        resetForm();
    });

    downloadJsonBtn.addEventListener("click", function () {
        downloadJson();
        showPanelMessage("File events.json scaricato");
    });

    uploadJsonInput.addEventListener("change", function () {
        var file = uploadJsonInput.files && uploadJsonInput.files[0];
        if (!file) {
            return;
        }

        var reader = new FileReader();
        reader.onload = function () {
            try {
                var payload = JSON.parse(String(reader.result || "{}"));
                var parsed = normalizeEvents(payload);
                events = parsed;
                renderEvents();
                resetForm();
                showPanelMessage("JSON importato");
            } catch (error) {
                showPanelMessage("File JSON non valido");
            }
            uploadJsonInput.value = "";
        };
        reader.readAsText(file);
    });

    tableBody.addEventListener("click", function (event) {
        var button = event.target.closest("button");
        if (!button) {
            return;
        }

        var action = button.getAttribute("data-action");

        if (action === "edit") {
            var editId = button.getAttribute("data-id");
            var row = events.find(function (item) {
                return item.id === editId;
            });

            if (!row) {
                return;
            }

            eventIdInput.value = row.id;
            eventTitleInput.value = row.title;
            eventLocationInput.value = row.location;
            eventDatetimeInput.value = isoToInputValue(row.datetime);
            saveBtn.textContent = "Salva modifica";
            cancelEditBtn.classList.remove("d-none");
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }

        if (action === "delete") {
            var deleteId = button.getAttribute("data-id");
            if (!window.confirm("Vuoi eliminare questo evento?")) {
                return;
            }

            events = events.filter(function (item) {
                return item.id !== deleteId;
            });
            renderEvents();
            showPanelMessage("Evento eliminato");
            return;
        }

        if (action === "up" || action === "down") {
            var index = Number(button.getAttribute("data-index"));
            if (Number.isNaN(index)) {
                return;
            }

            moveEvent(index, action === "up" ? index - 1 : index + 1);
        }
    });

    loadInitialEvents();
})();
