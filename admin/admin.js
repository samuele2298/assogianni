(function () {
    "use strict";

    var HARDCODED_PASSWORD = "gianniasso";

    var loginCard = document.getElementById("login-card");
    var panelCard = document.getElementById("panel-card");
    var loginForm = document.getElementById("login-form");
    var loginError = document.getElementById("login-error");
    var passwordInput = document.getElementById("admin-password");
    var logoutBtn = document.getElementById("logout-btn");

    var eventForm = document.getElementById("event-form");
    var eventIdInput = document.getElementById("event-id");
    var eventTitleInput = document.getElementById("event-title");
    var eventLocationInput = document.getElementById("event-location");
    var eventDatetimeInput = document.getElementById("event-datetime");
    var cancelEditBtn = document.getElementById("cancel-edit-btn");
    var saveBtn = document.getElementById("save-btn");

    var tableBody = document.getElementById("events-table-body");
    var emptyText = document.getElementById("events-empty");
    var panelMessage = document.getElementById("panel-message");

    var password = "";
    var events = [];

    function showLoginError(message) {
        loginError.textContent = message;
        loginError.classList.remove("d-none");
    }

    function clearLoginError() {
        loginError.classList.add("d-none");
        loginError.textContent = "";
    }

    function showPanelMessage(message) {
        panelMessage.textContent = message;
        panelMessage.classList.remove("d-none");
        window.setTimeout(function () {
            panelMessage.classList.add("d-none");
        }, 2200);
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

    function apiCall(body) {
        return fetch("../api/events.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        }).then(function (res) {
            return res.json().then(function (payload) {
                if (!res.ok) {
                    var message = payload && payload.error ? payload.error : "Errore API";
                    throw new Error(message);
                }
                return payload;
            });
        });
    }

    function loadEvents() {
        fetch("../api/events.php", { cache: "no-store" })
            .then(function (res) {
                return res.json();
            })
            .then(function (payload) {
                events = Array.isArray(payload.events) ? payload.events : [];
                renderEvents();
            });
    }

    function setAuthenticated(newPassword) {
        password = newPassword;
        sessionStorage.setItem("events_admin_password", password);
        loginCard.classList.add("d-none");
        panelCard.classList.remove("d-none");
        loadEvents();
    }

    function moveEvent(currentIndex, nextIndex) {
        if (nextIndex < 0 || nextIndex >= events.length) {
            return;
        }

        var temp = events[currentIndex];
        events[currentIndex] = events[nextIndex];
        events[nextIndex] = temp;

        var ids = events.map(function (item) {
            return item.id;
        });

        apiCall({ action: "reorder", ids: ids, password: password })
            .then(function (payload) {
                events = payload.events || [];
                renderEvents();
                showPanelMessage("Ordine aggiornato");
            })
            .catch(function (error) {
                showPanelMessage(error.message);
                loadEvents();
            });
    }

    loginForm.addEventListener("submit", function (event) {
        event.preventDefault();
        clearLoginError();

        var value = passwordInput.value.trim();
        if (value !== HARDCODED_PASSWORD) {
            showLoginError("Password errata");
            return;
        }

        setAuthenticated(value);
    });

    logoutBtn.addEventListener("click", function () {
        sessionStorage.removeItem("events_admin_password");
        password = "";
        loginCard.classList.remove("d-none");
        panelCard.classList.add("d-none");
        passwordInput.value = "";
    });

    cancelEditBtn.addEventListener("click", function () {
        resetForm();
    });

    eventForm.addEventListener("submit", function (event) {
        event.preventDefault();

        var id = eventIdInput.value;
        var payload = {
            password: password,
            title: eventTitleInput.value.trim(),
            location: eventLocationInput.value.trim(),
            datetime: eventDatetimeInput.value
        };

        var request = id
            ? apiCall(Object.assign({ action: "update", id: id }, payload))
            : apiCall(Object.assign({ action: "create" }, payload));

        request
            .then(function (response) {
                events = response.events || [];
                renderEvents();
                resetForm();
                showPanelMessage(id ? "Evento aggiornato" : "Evento aggiunto");
            })
            .catch(function (error) {
                showPanelMessage(error.message);
            });
    });

    tableBody.addEventListener("click", function (event) {
        var target = event.target;
        var button = target.closest("button");
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

            apiCall({ action: "delete", id: deleteId, password: password })
                .then(function (payload) {
                    events = payload.events || [];
                    renderEvents();
                    showPanelMessage("Evento eliminato");
                })
                .catch(function (error) {
                    showPanelMessage(error.message);
                });
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

    var remembered = sessionStorage.getItem("events_admin_password") || "";
    if (remembered === HARDCODED_PASSWORD) {
        setAuthenticated(remembered);
    }
})();
