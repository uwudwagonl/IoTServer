using MQTTnet;
using MQTTnet.Protocol;
using System.Security.Cryptography.X509Certificates;
using System.Text;

// hardcoded cert paths
var certPath = "device.crt";
var keyPath  = "device.key";

if (!File.Exists(certPath) || !File.Exists(keyPath))
{
    Console.WriteLine($"FEHLER: Zertifikat-Dateien nicht gefunden!");
    Console.WriteLine($"  Erwartet: {certPath}, {keyPath}");
    Console.WriteLine($"  Nutzung:  dotnet run [zertifikat.crt] [schluessel.key]");
    return;
}

var cert = X509Certificate2.CreateFromPemFile(certPath, keyPath);
Console.WriteLine($"Zertifikat geladen: {cert.Subject}");

// init
var factory = new MqttClientFactory();
var mqtt = factory.CreateMqttClient();

var options = new MqttClientOptionsBuilder()
    .WithTcpServer("130.61.140.154", 8883)
    .WithTlsOptions(o => o
        .WithClientCertificates([X509CertificateLoader.LoadPkcs12(cert.Export(X509ContentType.Pfx), null)])
        .WithCertificateValidationHandler(_ => true))
    .Build();

// print payload etc
mqtt.ApplicationMessageReceivedAsync += e =>
{
    var payload = Encoding.UTF8.GetString(e.ApplicationMessage.Payload);
    Console.WriteLine($"  [{DateTime.Now:HH:mm:ss}] {e.ApplicationMessage.Topic}: {payload}");
    return Task.CompletedTask;
};

mqtt.DisconnectedAsync += e =>
{
    Console.WriteLine($"Verbindung getrennt: {e.Reason}");
    return Task.CompletedTask;
};

await mqtt.ConnectAsync(options);
Console.WriteLine($"Verbunden mit MQTT Broker (TLS, Port 8883)");

// topic subs
await mqtt.SubscribeAsync("htlvb/Stockhamer/#");
Console.WriteLine("Subscribed: htlvb/Stockhamer/#");
Console.WriteLine("Ctrl+C zum Beenden.\n");

var cts = new CancellationTokenSource();
Console.CancelKeyPress += (_, e) => { e.Cancel = true; cts.Cancel(); };

try
{
    while (!cts.Token.IsCancellationRequested)
    {
        var msg = new MqttApplicationMessageBuilder()
            .WithTopic("htlvb/Stockhamer/test")
            .WithPayload($"ping von {cert.Subject} um {DateTime.Now:HH:mm:ss}")
            .WithQualityOfServiceLevel(MqttQualityOfServiceLevel.AtLeastOnce)
            .Build();

        await mqtt.PublishAsync(msg, cts.Token);
        Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] Gesendet auf htlvb/Stockhamer/test");
        await Task.Delay(5000, cts.Token);
    }
}
catch (OperationCanceledException) { }

await mqtt.DisconnectAsync();
Console.WriteLine("Getrennt.");
