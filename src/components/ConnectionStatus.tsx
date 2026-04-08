"use client";

import { useMqtt } from "@/lib/mqtt";

export default function ConnectionStatus() {
  const { connected } = useMqtt();

  return (
    <div className="flex items-center gap-2">
      <div
        className={`h-3 w-3 rounded-full ${
          connected ? "bg-green-500 shadow-green-500/50 shadow-lg" : "bg-red-500"
        }`}
      />
      <span className="text-sm text-gray-400">
        {connected ? "Connected to broker" : "Disconnected"}
      </span>
    </div>
  );
}
