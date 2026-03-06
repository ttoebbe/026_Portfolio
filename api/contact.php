<?php

declare(strict_types=1);

header("Content-Type: application/json; charset=utf-8");

$allowedOrigins = [
    "https://thomas-toebbe.de",
    "https://www.thomas-toebbe.de",
];

if (isset($_SERVER["HTTP_ORIGIN"]) && in_array($_SERVER["HTTP_ORIGIN"], $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: " . $_SERVER["HTTP_ORIGIN"]);
    header("Vary: Origin");
}

header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

$siteEmail = getenv("CONTACT_RECIPIENT_EMAIL") ?: "toebbe.thomas@outlook.de";
$traceId = bin2hex(random_bytes(8));
header("X-Contact-Trace-Id: {$traceId}");
logContactEvent($traceId, "request_received", [
    "method" => $_SERVER["REQUEST_METHOD"] ?? "unknown",
    "origin" => $_SERVER["HTTP_ORIGIN"] ?? "unknown",
    "remote_addr" => $_SERVER["REMOTE_ADDR"] ?? "unknown",
]);

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    logContactEvent($traceId, "invalid_method", ["method" => $_SERVER["REQUEST_METHOD"] ?? "unknown"]);
    respond(405, ["success" => false, "error" => "Method not allowed", "traceId" => $traceId]);
}

if (!filter_var($siteEmail, FILTER_VALIDATE_EMAIL)) {
    logContactEvent($traceId, "invalid_server_mail_config", ["site_email" => $siteEmail]);
    respond(500, ["success" => false, "error" => "Server mail configuration invalid", "traceId" => $traceId]);
}

$rawBody = file_get_contents("php://input");
if ($rawBody === false) {
    logContactEvent($traceId, "invalid_request_body", []);
    respond(400, ["success" => false, "error" => "Invalid request body", "traceId" => $traceId]);
}

$params = json_decode($rawBody, true);
if (!is_array($params) || json_last_error() !== JSON_ERROR_NONE) {
    logContactEvent($traceId, "invalid_json", ["json_error" => json_last_error_msg()]);
    respond(400, ["success" => false, "error" => "Invalid JSON", "traceId" => $traceId]);
}

$email = trim((string)($params["email"] ?? ""));
$name = trim((string)($params["name"] ?? ""));
$userMessage = trim((string)($params["message"] ?? ""));

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $name === "" || $userMessage === "") {
    logContactEvent($traceId, "invalid_input", [
        "name_present" => $name !== "",
        "email_valid" => (bool)filter_var($email, FILTER_VALIDATE_EMAIL),
        "message_present" => $userMessage !== "",
    ]);
    respond(400, ["success" => false, "error" => "Invalid input data", "traceId" => $traceId]);
}

if (mb_strlen($name) > 120 || mb_strlen($userMessage) > 10000) {
    logContactEvent($traceId, "input_too_long", [
        "name_length" => mb_strlen($name),
        "message_length" => mb_strlen($userMessage),
    ]);
    respond(400, ["success" => false, "error" => "Input too long", "traceId" => $traceId]);
}

$safeName = htmlspecialchars($name, ENT_QUOTES, "UTF-8");
$safeEmail = htmlspecialchars($email, ENT_QUOTES, "UTF-8");
$safeMessage = nl2br(htmlspecialchars($userMessage, ENT_QUOTES, "UTF-8"));

$replyTo = sanitizeHeaderValue($email);

$subject = "Website Contact Form";

$mailBody = "
    <strong>Name:</strong> {$safeName}<br>
    <strong>Email:</strong> {$safeEmail}<br><br>
    <strong>Message:</strong><br>
    {$safeMessage}
";

$headers = [];
$headers[] = "MIME-Version: 1.0";
$headers[] = "Content-type: text/html; charset=utf-8";
$headers[] = "From: Website Kontakt <{$siteEmail}>";
$headers[] = "Reply-To: {$replyTo}";
$headers[] = "Return-Path: {$siteEmail}";

logContactEvent($traceId, "mail_attempt", [
    "recipient" => $siteEmail,
    "reply_to" => $replyTo,
]);

$mailWarning = null;
set_error_handler(static function (int $severity, string $message) use (&$mailWarning): bool {
    $mailWarning = $message;
    return false;
});
error_clear_last();

$success = mail(
    $siteEmail,
    $subject,
    $mailBody,
    implode("\r\n", $headers),
    "-f {$siteEmail}"
);

restore_error_handler();

if (!$success) {
    $lastError = error_get_last();
    $reason = $mailWarning
        ?? (is_array($lastError) && isset($lastError["message"]) ? (string)$lastError["message"] : null)
        ?? "mail() returned false. Mail transport is likely not configured on the server.";

    error_log("[contact.php][{$traceId}] Mail delivery failed: {$reason}");
    logContactEvent($traceId, "mail_failed", ["reason" => $reason]);

    respond(500, ["success" => false, "error" => "Mail delivery failed", "reason" => $reason, "traceId" => $traceId]);
}

logContactEvent($traceId, "mail_success", []);
respond(200, ["success" => true, "traceId" => $traceId]);

function sanitizeHeaderValue(string $value): string
{
    return str_replace(["\r", "\n"], "", $value);
}

function respond(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function logContactEvent(string $traceId, string $event, array $context): void
{
    $record = [
        "timestamp" => gmdate("c"),
        "traceId" => $traceId,
        "event" => $event,
        "context" => $context,
    ];

    error_log("[contact.php][{$traceId}] {$event} " . json_encode($context, JSON_UNESCAPED_UNICODE));

    $logFile = __DIR__ . "/contact-debug.log";
    @file_put_contents(
        $logFile,
        json_encode($record, JSON_UNESCAPED_UNICODE) . PHP_EOL,
        FILE_APPEND | LOCK_EX
    );
}
