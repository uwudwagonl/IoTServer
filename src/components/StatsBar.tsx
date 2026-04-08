"use client";

import { useMqtt } from "@/lib/mqtt";

export default function StatsBar() {
  const { messages, topicData } = useMqtt();
  const topicCount = Object.keys(topicData).length;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Stat label="Total Messages" value={messages.length} />
      <Stat label="Active Topics" value={topicCount} />
      <Stat
        label="Last Message"
        value={
          messages.length > 0
            ? messages[0].timestamp.toLocaleTimeString()
            : "—"
        }
      />
      <Stat
        label="Top Topic"
        value={
          topicCount > 0
            ? mostFrequent(messages.map((m) => m.topic))
            : "—"
        }
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 truncate text-xl font-bold">{value}</p>
    </div>
  );
}

function mostFrequent(arr: string[]): string {
  const freq: Record<string, number> = {};
  arr.forEach((v) => (freq[v] = (freq[v] || 0) + 1));
  let max = 0;
  let result = "";
  for (const [k, v] of Object.entries(freq)) {
    if (v > max) {
      max = v;
      result = k;
    }
  }
  return result;
}
