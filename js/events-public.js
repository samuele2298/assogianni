(function () {
    "use strict";

    var listEl = document.getElementById("upcoming-events-list");
    var emptyEl = document.getElementById("upcoming-events-empty");

    if (!listEl || !emptyEl) {
        return;
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatItDateTime(isoString) {
        var date = new Date(isoString);

        if (Number.isNaN(date.getTime())) {
            return "Data non valida";
        }

        return new Intl.DateTimeFormat("it-IT", {
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(date);
    }

    function render(events) {
        listEl.innerHTML = "";

        if (!Array.isArray(events) || events.length === 0) {
            emptyEl.classList.remove("d-none");
            return;
        }

        emptyEl.classList.add("d-none");

        events.forEach(function (eventItem) {
            var col = document.createElement("div");
            col.className = "col-12 col-md-6 col-lg-4 wow fadeInUp";

            col.innerHTML = ""
                + "<article class=\"event-card\">"
                + "<p class=\"event-date\"><i class=\"far fa-calendar-alt me-2\"></i>" + escapeHtml(formatItDateTime(eventItem.datetime)) + "</p>"
                + "<h4 class=\"event-title\">" + escapeHtml(eventItem.title || "Evento") + "</h4>"
                + "<p class=\"event-location\"><i class=\"fas fa-map-marker-alt me-2\" style=\"color: #E97451;\"></i>" + escapeHtml(eventItem.location || "Luogo da definire") + "</p>"
                + "</article>";

            listEl.appendChild(col);
        });
    }

    function normalizePayload(payload) {
        if (!payload) {
            return [];
        }

        if (Array.isArray(payload.events)) {
            return payload.events;
        }

        if (Array.isArray(payload)) {
            return payload;
        }

        return [];
    }

    function fetchAndRender() {
        fetch("api/events.php", { cache: "no-store" })
            .then(function (res) {
                return res.json();
            })
            .then(function (payload) {
                render(normalizePayload(payload));
            })
            .catch(function () {
                render([]);
            });
    }

    function setupLiveUpdates() {
        if (typeof window.EventSource === "undefined") {
            setInterval(fetchAndRender, 15000);
            return;
        }

        var source = new EventSource("api/events-stream.php");

        source.addEventListener("events", function (event) {
            try {
                var payload = JSON.parse(event.data);
                render(normalizePayload(payload));
            } catch (error) {
                fetchAndRender();
            }
        });

        source.onerror = function () {
            source.close();
            setTimeout(setupLiveUpdates, 3000);
        };
    }

    fetchAndRender();
    setupLiveUpdates();
})();
