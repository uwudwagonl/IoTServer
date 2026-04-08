"use client";

import { useMqtt } from "@/lib/mqtt";

export default function MessageFeed() {
  const { messages } = useMqtt();

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <h2 className="mb-3 text-lg font-semibold">Live Messages</h2>
      <div className="h-80 space-y-1 overflow-y-auto pr-2">
        {messages.length === 0 ? (
          <p className="text-sm text-gray-500">Waiting for messages...</p>
        ) : (
          messages.map((msg, i) => (
            <div
              key={`${msg.timestamp.getTime()}-${i}`}
              className="flex gap-2 rounded-md bg-gray-800/50 px-3 py-2 text-sm"
            >
              <span className="shrink-0 font-mono text-blue-400">
                {msg.topic}
              </span>
              <span className="truncate text-gray-300">{msg.payload}</span>
              <span className="ml-auto shrink-0 text-xs text-gray-600">
                {msg.timestamp.toLocaleTimeString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
