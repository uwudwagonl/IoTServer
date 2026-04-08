# MQTT Client mit TLS-Zertifikat-Authentifizierung

.NET Konsolen-App die sich per TLS (Client-Zertifikat) mit dem MQTT Broker verbindet.

## Voraussetzungen

- .NET 9 SDK
- Geraete-Zertifikat (`device.crt` + `device.key`) — wird mit `gen-cert.bat` generiert
- Netzwerkzugang zum Broker `130.61.140.154:8883`

## Zertifikat generieren

```bat
gen-cert.bat
```

Das Skript fragt nach einem Geraete-Namen (z.B. `esp32-wohnzimmer`), verbindet sich
per SSH zum Server, generiert das Zertifikat und kopiert die Dateien hierher.

Danach liegen im `certs/`-Ordner:
- `<name>.crt` — Client-Zertifikat
- `<name>.key` — Privater Schluessel
- `ca.crt` — CA-Zertifikat (wird am ESP32 auch benoetigt)

## Starten

```bash
cd MqttClient
dotnet run
```

Oder mit eigenem Zertifikat:

```bash
dotnet run ../certs/esp32-wohnzimmer.crt ../certs/esp32-wohnzimmer.key
```

## Verbindungsdetails

| Parameter         | Wert                    |
|-------------------|-------------------------|
| Broker            | `130.61.140.154`        |
| Port              | `8883` (MQTTS mit TLS)  |
| Authentifizierung | Client-Zertifikat       |
| CA                | `IoT-CA`                |
| Topic-Prefix      | `htlvb/Stockhamer/`    |

## ESP32 Anleitung

Am ESP32 (Arduino/PlatformIO) mit `WiFiClientSecure`:

```cpp
#include <WiFiClientSecure.h>
#include <PubSubClient.h>

// Zertifikate als C-Strings einfuegen (Inhalt von ca.crt, device.crt, device.key)
const char* ca_cert = R"(
-----BEGIN CERTIFICATE-----
... Inhalt von ca.crt ...
-----END CERTIFICATE-----
)";

const char* client_cert = R"(
-----BEGIN CERTIFICATE-----
... Inhalt von <geraet>.crt ...
-----END CERTIFICATE-----
)";

const char* client_key = R"(
-----BEGIN RSA PRIVATE KEY-----
... Inhalt von <geraet>.key ...
-----END RSA PRIVATE KEY-----
)";

WiFiClientSecure espClient;
PubSubClient mqtt(espClient);

void setup() {
    // ... WiFi verbinden ...

    espClient.setCACert(ca_cert);
    espClient.setCertificate(client_cert);
    espClient.setPrivateKey(client_key);

    mqtt.setServer("130.61.140.154", 8883);
    mqtt.connect("esp32-mein-geraet");
    mqtt.subscribe("htlvb/Stockhamer/#");
}
```

> **Hinweis:** Die `.key`-Datei ist der private Schluessel — nicht weitergeben oder committen!
