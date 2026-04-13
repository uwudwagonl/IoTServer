"use client";

import { useRef, useState } from "react";
import { useMqtt } from "@/lib/mqtt";

const ABSURD: Record<string, () => string> = {
  temperature: () => `${(Math.random() * 200 - 50).toFixed(1)}°C`,
  humidity: () => `${Math.floor(Math.random() * 200)}%`,
  pressure: () => `${Math.floor(500 + Math.random() * 2000)} hPa`,
  speed: () => `${(Math.random() * 999).toFixed(1)} km/h`,
  status: () => (Math.random() > 0.5 ? "ON FIRE" : "MISSING"),
  power: () => `${Math.floor(Math.random() * 99999)} W`,
  lights: () => (Math.random() > 0.5 ? "ON" : "OFF"),
};

function absurdFor(topic: string): string {
  const t = topic.toLowerCase();
  for (const k in ABSURD) if (t.includes(k)) return ABSURD[k]();
  return `corrupted-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ChaosPanel() {
  const { topicData, publish, connected } = useMqtt();
  const [running, setRunning] = useState<string | null>(null);
  const [customTopic, setCustomTopic] = useState("");
  const [customPayload, setCustomPayload] = useState("");
  const [customCount, setCustomCount] = useState(50);
  const [customInterval, setCustomInterval] = useState(100);
  const [banner, setBanner] = useState("");
  const stopRef = useRef<{ cancel: boolean }>({ cancel: false });

  const allTopics = Object.keys(topicData);

  const run = async (label: string, fn: () => Promise<void>) => {
    if (running) return;
    stopRef.current = { cancel: false };
    setRunning(label);
    try {
      await fn();
    } finally {
      setRunning(null);
    }
  };

  const stop = () => {
    stopRef.current.cancel = true;
  };

  const sleep = (ms: number) =>
    new Promise<void>((r) => setTimeout(r, ms));

  const gaslight = () =>
    run("Gaslight", async () => {
      if (allTopics.length === 0) return;
      for (const t of allTopics) {
        if (stopRef.current.cancel) return;
        publish(t, absurdFor(t));
        await sleep(50);
      }
    });

  const flood = () =>
    run("Flood", async () => {
      const topics = allTopics.length > 0 ? allTopics : ["chaos/ping"];
      const end = Date.now() + 10_000;
      while (Date.now() < end) {
        if (stopRef.current.cancel) return;
        const t = topics[Math.floor(Math.random() * topics.length)];
        publish(t, absurdFor(t));
        await sleep(100);
      }
    });

  const lightShow = () =>
    run("Light show", async () => {
      const lights = allTopics.filter((t) => t.toLowerCase().includes("light"));
      const target = lights.length > 0 ? lights : ["lights/prank"];
      for (let i = 0; i < 40; i++) {
        if (stopRef.current.cancel) return;
        for (const t of target) publish(t, i % 2 === 0 ? "ON" : "OFF");
        await sleep(250);
      }
    });

  const sendBanner = () =>
    run("Banner", async () => {
      if (!banner) return;
      publish("admin/announce", banner);
    });

  const customSpam = () =>
    run("Custom", async () => {
      if (!customTopic || !customPayload) return;
      for (let i = 0; i < customCount; i++) {
        if (stopRef.current.cancel) return;
        publish(customTopic, customPayload);
        await sleep(Math.max(10, customInterval));
      }
    });

  return (
    <section className="rounded-xl border border-red-900/50 bg-red-950/10 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-red-300">Chaos tools</h2>
          <p className="text-xs text-gray-500">
            Publishes from this browser&apos;s MQTT session. Anyone subscribed sees it.
          </p>
        </div>
        {running && (
          <button
            onClick={stop}
            className="rounded-md bg-red-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600"
          >
            Stop {running}
          </button>
        )}
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <ChaosBtn
          label="Gaslight"
          desc={`Push absurd values to all ${allTopics.length} cached topics`}
          onClick={gaslight}
          disabled={!connected || !!running || allTopics.length === 0}
        />
        <ChaosBtn
          label="Flood 10s"
          desc="Spray nonsense at random topics at ~10/s"
          onClick={flood}
          disabled={!connected || !!running}
        />
        <ChaosBtn
          label="Light show"
          desc="Strobe every lights/* topic for 10s"
          onClick={lightShow}
          disabled={!connected || !!running}
        />
      </div>

      <div className="mb-4 rounded-lg border border-gray-800 bg-gray-900/60 p-3">
        <label className="mb-1 block text-xs text-gray-400">
          Banner on <span className="font-mono">admin/announce</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={banner}
            onChange={(e) => setBanner(e.target.value)}
            placeholder="Heheheha"
            className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-red-500"
          />
          <button
            onClick={sendBanner}
            disabled={!connected || !!running || !banner}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
        <p className="mb-2 text-xs text-gray-400">Custom spammer</p>
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_100px_100px_auto]">
          <input
            type="text"
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            placeholder="Topic"
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none focus:border-red-500"
          />
          <input
            type="text"
            value={customPayload}
            onChange={(e) => setCustomPayload(e.target.value)}
            placeholder="Payload"
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none focus:border-red-500"
          />
          <input
            type="number"
            min={1}
            value={customCount}
            onChange={(e) => setCustomCount(Number(e.target.value))}
            title="Count"
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none focus:border-red-500"
          />
          <input
            type="number"
            min={10}
            value={customInterval}
            onChange={(e) => setCustomInterval(Number(e.target.value))}
            title="Interval (ms)"
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none focus:border-red-500"
          />
          <button
            onClick={customSpam}
            disabled={!connected || !!running || !customTopic || !customPayload}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-40"
          >
            Spam
          </button>
        </div>
        <p className="mt-1 text-[11px] text-gray-600">
          count × interval, capped at 10ms min to keep the WS alive
        </p>
      </div>
    </section>
  );
}

function ChaosBtn({
  label,
  desc,
  onClick,
  disabled,
}: {
  label: string;
  desc: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-red-900/40 bg-red-950/30 p-3 text-left transition hover:bg-red-900/30 disabled:opacity-40 disabled:hover:bg-red-950/30"
    >
      <p className="font-semibold text-red-300">{label}</p>
      <p className="mt-0.5 text-xs text-gray-400">{desc}</p>
    </button>
  );
}
