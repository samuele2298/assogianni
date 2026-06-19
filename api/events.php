<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

const ADMIN_PASSWORD = 'gianniasso';
const EVENTS_FILE = __DIR__ . '/../data/events.json';

function send_json(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function read_events(): array
{
    if (!file_exists(EVENTS_FILE)) {
        return ['events' => []];
    }

    $raw = file_get_contents(EVENTS_FILE);
    if ($raw === false || trim($raw) === '') {
        return ['events' => []];
    }

    $decoded = json_decode($raw, true);

    if (!is_array($decoded) || !isset($decoded['events']) || !is_array($decoded['events'])) {
        return ['events' => []];
    }

    return ['events' => array_values($decoded['events'])];
}

function write_events(array $events): bool
{
    $payload = ['events' => array_values($events)];
    $json = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    if ($json === false) {
        return false;
    }

    return file_put_contents(EVENTS_FILE, $json . PHP_EOL, LOCK_EX) !== false;
}

function clean_text($value): string
{
    if (!is_string($value)) {
        return '';
    }

    return trim($value);
}

function normalize_datetime(string $value): ?string
{
    if ($value === '') {
        return null;
    }

    try {
        $dt = new DateTime($value, new DateTimeZone('Europe/Rome'));
        return $dt->format('c');
    } catch (Exception $e) {
        return null;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    send_json(read_events());
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_json(['error' => 'Metodo non supportato'], 405);
}

$input = json_decode(file_get_contents('php://input') ?: '{}', true);
if (!is_array($input)) {
    send_json(['error' => 'Payload non valido'], 400);
}

$password = $input['password'] ?? '';
if (!is_string($password) || $password !== ADMIN_PASSWORD) {
    send_json(['error' => 'Password non valida'], 401);
}

$action = $input['action'] ?? '';
if (!is_string($action) || $action === '') {
    send_json(['error' => 'Azione mancante'], 400);
}

$store = read_events();
$events = $store['events'];

if ($action === 'create') {
    $title = clean_text($input['title'] ?? '');
    $location = clean_text($input['location'] ?? '');
    $datetime = normalize_datetime(clean_text($input['datetime'] ?? ''));

    if ($title === '' || $location === '' || $datetime === null) {
        send_json(['error' => 'Compila titolo, luogo e data/ora correttamente'], 422);
    }

    $events[] = [
        'id' => uniqid('evt-', true),
        'title' => $title,
        'location' => $location,
        'datetime' => $datetime,
    ];

    if (!write_events($events)) {
        send_json(['error' => 'Errore durante il salvataggio'], 500);
    }

    send_json(['ok' => true, 'events' => $events]);
}

if ($action === 'update') {
    $id = clean_text($input['id'] ?? '');
    $title = clean_text($input['title'] ?? '');
    $location = clean_text($input['location'] ?? '');
    $datetime = normalize_datetime(clean_text($input['datetime'] ?? ''));

    if ($id === '' || $title === '' || $location === '' || $datetime === null) {
        send_json(['error' => 'Dati di modifica non validi'], 422);
    }

    $updated = false;
    foreach ($events as &$event) {
        if (($event['id'] ?? '') === $id) {
            $event['title'] = $title;
            $event['location'] = $location;
            $event['datetime'] = $datetime;
            $updated = true;
            break;
        }
    }
    unset($event);

    if (!$updated) {
        send_json(['error' => 'Evento non trovato'], 404);
    }

    if (!write_events($events)) {
        send_json(['error' => 'Errore durante il salvataggio'], 500);
    }

    send_json(['ok' => true, 'events' => $events]);
}

if ($action === 'delete') {
    $id = clean_text($input['id'] ?? '');
    if ($id === '') {
        send_json(['error' => 'ID evento mancante'], 422);
    }

    $filtered = array_values(array_filter($events, static function ($event) use ($id) {
        return ($event['id'] ?? '') !== $id;
    }));

    if (count($filtered) === count($events)) {
        send_json(['error' => 'Evento non trovato'], 404);
    }

    if (!write_events($filtered)) {
        send_json(['error' => 'Errore durante il salvataggio'], 500);
    }

    send_json(['ok' => true, 'events' => $filtered]);
}

if ($action === 'reorder') {
    $ids = $input['ids'] ?? null;

    if (!is_array($ids)) {
        send_json(['error' => 'Ordine non valido'], 422);
    }

    $map = [];
    foreach ($events as $event) {
        $id = $event['id'] ?? '';
        if (is_string($id) && $id !== '') {
            $map[$id] = $event;
        }
    }

    $reordered = [];
    foreach ($ids as $id) {
        if (is_string($id) && isset($map[$id])) {
            $reordered[] = $map[$id];
            unset($map[$id]);
        }
    }

    foreach ($map as $leftover) {
        $reordered[] = $leftover;
    }

    if (!write_events($reordered)) {
        send_json(['error' => 'Errore durante il salvataggio'], 500);
    }

    send_json(['ok' => true, 'events' => $reordered]);
}

send_json(['error' => 'Azione non supportata'], 400);
