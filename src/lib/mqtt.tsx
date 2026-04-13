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

interface MqttContextValue {
  client: MqttClient | null;
  connected: boolean;
  messages: MqttMessage[];
  topicData: Record<string, MqttMessage>;
  subscribe: (topic: string) => void;
  publish: (topic: string, message: string) => void;
}

const MqttContext = createContext<MqttContextValue>({
  client: null,
  connected: false,
  messages: [],
  topicData: {},
  subscribe: () => {},
  publish: () => {},
});

const BROKER_URL =
  process.env.NEXT_PUBLIC_MQTT_BROKER_URL || "ws://130.61.140.154:9001";

const MAX_MESSAGES = 200;

export function MqttProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<MqttMessage[]>([]);
  const [topicData, setTopicData] = useState<Record<string, MqttMessage>>({});
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
