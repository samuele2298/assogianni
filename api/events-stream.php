<?php

declare(strict_types=1);

header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('Connection: keep-alive');

const EVENTS_FILE = __DIR__ . '/../data/events.json';

function read_events_json(): string
{
    if (!file_exists(EVENTS_FILE)) {
        return json_encode(['events' => []], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    $raw = file_get_contents(EVENTS_FILE);
    if ($raw === false || trim($raw) === '') {
        return json_encode(['events' => []], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded) || !isset($decoded['events']) || !is_array($decoded['events'])) {
        return json_encode(['events' => []], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    return json_encode(['events' => array_values($decoded['events'])], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

@set_time_limit(0);
@ini_set('output_buffering', 'off');
@ini_set('zlib.output_compression', '0');

$lastMtime = 0;
$startedAt = time();

while (!connection_aborted() && (time() - $startedAt) < 50) {
    clearstatcache(false, EVENTS_FILE);
    $mtime = file_exists(EVENTS_FILE) ? (int) filemtime(EVENTS_FILE) : 0;

    if ($mtime !== $lastMtime) {
        $lastMtime = $mtime;
        $data = read_events_json();
        echo "event: events\n";
        echo "data: " . $data . "\n\n";
        @ob_flush();
        flush();
    }

    usleep(1000000);
}

// Keep clients reconnecting regularly.
echo "event: ping\n";
echo "data: {}\n\n";
@ob_flush();
flush();
