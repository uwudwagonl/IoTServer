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

interface MqttContextValue {
  client: MqttClient | null;
  connected: boolean;
  messages: MqttMessage[];
  topicData: Record<string, MqttMessage>;
  bucketCounts: Record<number, number>;
  subscribe: (topic: string) => void;
  publish: (topic: string, message: string) => void;
}

const MqttContext = createContext<MqttContextValue>({
  client: null,
  connected: false,
  messages: [],
  topicData: {},
  bucketCounts: {},
  subscribe: () => {},
  publish: () => {},
});

const BROKER_URL =
  process.env.NEXT_PUBLIC_MQTT_BROKER_URL ||
  "wss://blues-brian-employee-episodes.trycloudflare.com";

const MAX_MESSAGES = 200;

export function MqttProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<MqttMessage[]>([]);
  const [topicData, setTopicData] = useState<Record<string, MqttMessage>>({});
  const [bucketCounts, setBucketCounts] = useState<Record<number, number>>({});
  const clientRef = useRef<MqttClient | null>(null);
  const msgIdRef = useRef(0);

  useEffect(() => {
    const client = mqtt.connect(BROKER_URL, {
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
      const msg: MqttMessage = {
        id: ++msgIdRef.current,
        topic,
        payload: payload.toString(),
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
    };
  }, []);

  const subscribe = useCallback((topic: string) => {
    clientRef.current?.subscribe(topic);
  }, []);

  const publish = useCallback((topic: string, message: string) => {
    clientRef.current?.publish(topic, message);
  }, []);

  return (
    <MqttContext.Provider
      value={{
        client: clientRef.current,
        connected,
        messages,
        topicData,
        bucketCounts,
        subscribe,
        publish,
      }}
    >
      {children}
    </MqttContext.Provider>
  );
}

export function useMqtt() {
  return useContext(MqttContext);
}
