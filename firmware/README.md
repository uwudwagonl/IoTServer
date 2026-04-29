# Firmware & Pi tooling

## Broker layout (Raspberry Pi `amxtvs` @ 10.252.74.225)

| Listener   | Port | Bind        | Auth                         | Use                                |
|------------|------|-------------|------------------------------|------------------------------------|
| MQTT       | 1883 | `127.0.0.1` | anonymous                    | local CLI tools on the Pi only     |
| MQTT+TLS   | 8883 | `0.0.0.0`   | mutual TLS, ACL by cert CN   | LAN devices (ESP32 with cert)      |
| MQTT/WS    | 9001 | `0.0.0.0`   | anonymous                    | Cloudflare tunnel → Vercel dashboard |

CA + server cert: `/etc/mosquitto/ca/`
Per-device ACL: `/etc/mosquitto/acl` (managed by the issuer scripts)

## Issuing a cert for a new device

Two equivalent scripts on the Pi — pick whichever you prefer:

```bash
sudo /opt/iot-cert/issue.py                    # interactive (Python)
sudo ./issue.sh                                # interactive (bash)

# or one-shot:
sudo /opt/iot-cert/issue.py NAME PUB SUB
sudo ./issue.sh             NAME PUB SUB
```

`PUB` and `SUB` are comma-separated MQTT topic patterns (`+` / `#` allowed),
or `-` to grant nothing on that side.

Output bundle lands in `/opt/iot-cert/issued/<name>/`:

| File                  | What                                              |
|-----------------------|---------------------------------------------------|
| `ca.crt`              | Root CA — used by the device to verify the broker |
| `<name>.crt`          | Device certificate (CN = `<name>`)                |
| `<name>.key`          | Device private key                                |
| `<name>_certs.h`      | All three PEMs as C string literals — paste-ready |

The script also appends an ACL block under `/etc/mosquitto/acl` between
`# === device:NAME BEGIN ===` / `# === device:NAME END ===` markers and
sends `SIGHUP` to mosquitto to hot-reload.

## ESP32 template

`firmware/esp32_template/esp32_template.ino` is a drop-in sketch for any
HTL-IoT ESP32. To use:

1. Issue a cert on the Pi (`sudo /opt/iot-cert/issue.py myroom-01 'sensors/myroom-01/#' 'commands/myroom-01/#'`).
2. Copy the generated `myroom-01_certs.h` to your laptop:
   ```
   ssh amxtvs@10.252.74.225 "sudo cat /opt/iot-cert/issued/myroom-01/myroom-01_certs.h" > myroom-01_certs.h
   ```
3. Open the sketch in Arduino IDE; replace the placeholder `DEVICE_NAME`
   and the three `PASTE …` PEM blocks with the contents of the header.
4. Required libraries: `PubSubClient` (Library Manager). `WiFiClientSecure`
   ships with ESP32-Arduino.

## Verify from the LAN

```bash
mosquitto_sub -h 10.252.74.225 -p 8883 \
  --cafile ca.crt --cert myroom-01.crt --key myroom-01.key \
  -t 'sensors/myroom-01/#' -v
```
