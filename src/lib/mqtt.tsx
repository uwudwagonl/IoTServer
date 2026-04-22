"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import mqtt, { MqttClient } from "mqtt";

export interface MqttMessage {
  id: number;
  topic: string;
  payload: string;
  timestamp: Date;
}

export const BUCKET_MS = 10_000;
const BUCKET_RETAIN_MS = 6 * 60 * 60 * 1000;

export const PEX_INVOKE_TOPIC = "pex/invoke";
export interface PexEvent {
  nonce: string;
  count: number;
  duration: number;
  ts: number;
}

export interface BrokerPreset {
  label: string;
  url: string;
}

// Built-in brokers. Pi (via Cloudflare tunnel) is the default because it works
// from both Vercel and localhost; the LAN preset is faster for local dev but
// only works when the browser is on the same LAN as the Pi.
export const BROKER_PRESETS: BrokerPreset[] = [
  {
    label: "Raspberry Pi (tunnel)",
    url: "wss://hosted-controllers-plus-texas.trycloudflare.com",
  },
  { label: "Raspberry Pi (LAN)", url: "ws://10.252.74.225:9001" },
  {
    label: "Cloudflare tunnel (Ubuntu)",
    url: "wss://blues-brian-employee-episodes.trycloudflare.com",
  },
];

export const DEFAULT_BROKER_URL =
  process.env.NEXT_PUBLIC_MQTT_BROKER_URL || BROKER_PRESETS[0].url;

const BROKER_LS_KEY = "mqtt.brokerUrl";
const BROKER_CUSTOM_LS_KEY = "mqtt.brokerPresets.custom";

export function loadCustomPresets(): BrokerPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BROKER_CUSTOM_LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is BrokerPreset =>
        p && typeof p.label === "string" && typeof p.url === "string",
    );
  } catch {
    return [];
  }
}

export function saveCustomPresets(presets: BrokerPreset[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BROKER_CUSTOM_LS_KEY, JSON.stringify(presets));
}

interface MqttContextValue {
  client: MqttClient | null;
  connected: boolean;
  brokerUrl: string;
  setBrokerUrl: (url: string) => void;
  customPresets: BrokerPreset[];
  addCustomPreset: (preset: BrokerPreset) => void;
  removeCustomPreset: (url: string) => void;
  messages: MqttMessage[];
  topicData: Record<string, MqttMessage>;
  bucketCounts: Record<number, number>;
  pexEvent: PexEvent | null;
  subscribe: (topic: string) => void;
  publish: (topic: string, message: string) => void;
  publishRetained: (topic: string, message: string) => void;
  clearMessages: () => void;
  clearTopic: (topic: string) => void;
  clearAllTopics: () => void;
  clearBuckets: () => void;
  deleteRetained: (topic: string) => void;
}

const MqttContext = createContext<MqttContextValue>({
  client: null,
  connected: false,
  brokerUrl: DEFAULT_BROKER_URL,
  setBrokerUrl: () => {},
  customPresets: [],
  addCustomPreset: () => {},
  removeCustomPreset: () => {},
  messages: [],
  topicData: {},
  bucketCounts: {},
  pexEvent: null,
  subscribe: () => {},
  publish: () => {},
  publishRetained: () => {},
  clearMessages: () => {},
  clearTopic: () => {},
  clearAllTopics: () => {},
  clearBuckets: () => {},
  deleteRetained: () => {},
});

const MAX_MESSAGES = 200;

export function MqttProvider({ children }: { children: React.ReactNode }) {
  const [brokerUrl, setBrokerUrlState] = useState<string>(DEFAULT_BROKER_URL);
  const [customPresets, setCustomPresets] = useState<BrokerPreset[]>([]);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<MqttMessage[]>([]);
  const [topicData, setTopicData] = useState<Record<string, MqttMessage>>({});
  const [bucketCounts, setBucketCounts] = useState<Record<number, number>>({});
  const [pexEvent, setPexEvent] = useState<PexEvent | null>(null);
  const clientRef = useRef<MqttClient | null>(null);
  const msgIdRef = useRef(0);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(BROKER_LS_KEY);
      if (stored) setBrokerUrlState(stored);
    } catch {}
    setCustomPresets(loadCustomPresets());
  }, []);

  const setBrokerUrl = useCallback((url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    try {
      window.localStorage.setItem(BROKER_LS_KEY, trimmed);
    } catch {}
    setBrokerUrlState(trimmed);
  }, []);

  const addCustomPreset = useCallback((preset: BrokerPreset) => {
    setCustomPresets((prev) => {
      const filtered = prev.filter((p) => p.url !== preset.url);
      const next = [...filtered, preset];
      saveCustomPresets(next);
      return next;
    });
  }, []);

  const removeCustomPreset = useCallback((url: string) => {
    setCustomPresets((prev) => {
      const next = prev.filter((p) => p.url !== url);
      saveCustomPresets(next);
      return next;
    });
  }, []);

  useEffect(() => {
    // Reset per-broker state on reconnect to avoid stale cross-broker data.
    setConnected(false);
    setMessages([]);
    setTopicData({});
    setBucketCounts({});

    const client = mqtt.connect(brokerUrl, {
      keepalive: 60,
      clean: true,
      reconnectPeriod: 5000,
    });
    clientRef.current = client;

    client.on("connect", () => {
      setConnected(true);
      client.subscribe("#");
    });
    client.on("close", () => setConnected(false));
    client.on("error", () => setConnected(false));

    client.on("message", (topic, payload) => {
      const payloadStr = payload.toString();
      if (topic === PEX_INVOKE_TOPIC) {
        try {
          const data = JSON.parse(payloadStr);
          setPexEvent({
            nonce: String(data.nonce ?? Date.now()),
            count: Math.max(1, Math.min(400, Number(data.count) || 80)),
            duration: Math.max(500, Math.min(30_000, Number(data.duration) || 5000)),
            ts: Date.now(),
          });
        } catch {
          setPexEvent({ nonce: String(Date.now()), count: 80, duration: 5000, ts: Date.now() });
        }
        return;
      }
      const msg: MqttMessage = {
        id: ++msgIdRef.current,
        topic,
        payload: payloadStr,
        timestamp: new Date(),
      };
      setMessages((prev) => [msg, ...prev].slice(0, MAX_MESSAGES));
      setTopicData((prev) => ({ ...prev, [topic]: msg }));
      setBucketCounts((prev) => {
        const bucket = Math.floor(msg.timestamp.getTime() / BUCKET_MS) * BUCKET_MS;
        const cutoff = Date.now() - BUCKET_RETAIN_MS;
        const next: Record<number, number> = { [bucket]: (prev[bucket] || 0) + 1 };
        for (const k in prev) {
          const n = Number(k);
          if (n >= cutoff && n !== bucket) next[n] = prev[n];
        }
        return next;
      });
    });

    return () => {
      client.end(true);
      if (clientRef.current === client) clientRef.current = null;
    };
  }, [brokerUrl]);

  const subscribe = useCallback((topic: string) => {
    clientRef.current?.subscribe(topic);
  }, []);

  const publish = useCallback((topic: string, message: string) => {
    clientRef.current?.publish(topic, message);
  }, []);

  const publishRetained = useCallback((topic: string, message: string) => {
    clientRef.current?.publish(topic, message, { retain: true, qos: 0 });
  }, []);

  const clearMessages = useCallback(() => setMessages([]), []);
  const clearBuckets = useCallback(() => setBucketCounts({}), []);
  const clearAllTopics = useCallback(() => setTopicData({}), []);
  const clearTopic = useCallback((topic: string) => {
    setTopicData((prev) => {
      const { [topic]: _, ...rest } = prev;
      return rest;
    });
    setMessages((prev) => prev.filter((m) => m.topic !== topic));
  }, []);
  const deleteRetained = useCallback((topic: string) => {
    clientRef.current?.publish(topic, "", { retain: true, qos: 0 });
    setTopicData((prev) => {
      const { [topic]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  return (
    <MqttContext.Provider
      value={{
        client: clientRef.current,
        connected,
        brokerUrl,
        setBrokerUrl,
        customPresets,
        addCustomPreset,
        removeCustomPreset,
        messages,
        topicData,
        bucketCounts,
        pexEvent,
        subscribe,
        publish,
        publishRetained,
        clearMessages,
        clearTopic,
        clearAllTopics,
        clearBuckets,
        deleteRetained,
      }}
    >
      {children}
    </MqttContext.Provider>
  );
}

export function useMqtt() {
  return useContext(MqttContext);
}
