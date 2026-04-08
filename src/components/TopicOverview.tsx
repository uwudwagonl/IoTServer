"use client";

import { useMqtt } from "@/lib/mqtt";

export default function TopicOverview() {
  const { topicData } = useMqtt();
  const topics = Object.entries(topicData);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <h2 className="mb-3 text-lg font-semibold">Active Topics</h2>
      {topics.length === 0 ? (
        <p className="text-sm text-gray-500">No topics received yet...</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {topics.map(([topic, msg]) => (
            <div
              key={topic}
              className="rounded-lg border border-gray-700 bg-gray-800/50 p-3"
            >
              <p className="mb-1 truncate font-mono text-sm text-blue-400">
                {topic}
              </p>
              <p className="text-2xl font-bold">{msg.payload}</p>
              <p className="mt-1 text-xs text-gray-500">
                Last update: {msg.timestamp.toLocaleTimeString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
