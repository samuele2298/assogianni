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
                + "<p class=\"event-date\"><i class=\"far fa-calendar-alt me-2\"></i>" + escapeHtml(eventItem.datetime || "Data da definire") + "</p>"
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

    function readGlobalFallback() {
        if (window.__EVENTS_DATA__) {
            return normalizePayload(window.__EVENTS_DATA__);
        }

        return [];
    }

    function fetchAndRender() {
        fetch("data/events.json", { cache: "no-store" })
            .then(function (res) {
                return res.json();
            })
            .then(function (payload) {
                render(normalizePayload(payload));
            })
            .catch(function () {
                render(readGlobalFallback());
            });
    }

    fetchAndRender();
})();
