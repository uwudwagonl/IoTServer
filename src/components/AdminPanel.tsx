"use client";

import { useMemo, useState } from "react";
import { useMqtt } from "@/lib/mqtt";

export default function AdminPanel() {
  const {
    messages,
    topicData,
    connected,
    publish,
    clearMessages,
    clearTopic,
    clearAllTopics,
    clearBuckets,
    deleteRetained,
  } = useMqtt();
  const [filter, setFilter] = useState("");
  const [topic, setTopic] = useState("");
  const [payload, setPayload] = useState("");

  const filtered = useMemo(() => {
    if (!filter) return messages;
    const q = filter.toLowerCase();
    return messages.filter(
      (m) =>
        m.topic.toLowerCase().includes(q) ||
        m.payload.toLowerCase().includes(q)
    );
  }, [messages, filter]);

  const topics = Object.keys(topicData).sort();

  const brokerUrl =
    process.env.NEXT_PUBLIC_MQTT_BROKER_URL ||
    "wss://blues-brian-employee-episodes.trycloudflare.com";

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-3">
        <InfoTile label="Broker" value={brokerUrl} mono />
        <InfoTile label="Status" value={connected ? "Connected" : "Disconnected"} />
        <InfoTile label="Known topics" value={String(topics.length)} />
      </section>

      <section className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Topic cache</h2>
          <div className="flex gap-2">
            <button
              onClick={clearAllTopics}
              className="rounded-md bg-gray-800 px-3 py-1 text-xs text-gray-300 hover:bg-gray-700"
            >
              Clear all (local)
            </button>
          </div>
        </div>
        {topics.length === 0 ? (
          <p className="text-sm text-gray-500">No topics cached.</p>
        ) : (
          <div className="max-h-60 overflow-y-auto rounded-lg border border-gray-800 bg-black/40">
            <table className="w-full text-xs">
              <tbody>
                {topics.map((t) => (
                  <tr key={t} className="border-b border-gray-900/60">
                    <td className="truncate px-3 py-1.5 font-mono text-blue-400">
                      {t}
                    </td>
                    <td className="truncate px-3 py-1.5 text-gray-300">
                      {topicData[t].payload}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right">
                      <button
                        onClick={() => clearTopic(t)}
                        className="mr-2 rounded bg-gray-800 px-2 py-0.5 text-[11px] text-gray-300 hover:bg-gray-700"
                        title="Drop from local cache only"
                      >
                        Forget
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete retained message on "${t}" from broker?`)) {
                            deleteRetained(t);
                          }
                        }}
                        disabled={!connected}
                        className="rounded bg-red-700 px-2 py-0.5 text-[11px] text-white hover:bg-red-600 disabled:opacity-40"
                        title="Publish empty retained payload to wipe retained message"
                      >
                        Delete retained
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <h2 className="mb-3 text-lg font-semibold">Maintenance</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { if (confirm("Clear cached message feed?")) clearMessages(); }}
            className="rounded-md bg-gray-800 px-3 py-2 text-xs text-gray-300 hover:bg-gray-700"
          >
            Clear message feed
          </button>
          <button
            onClick={() => { if (confirm("Clear chart history?")) clearBuckets(); }}
            className="rounded-md bg-gray-800 px-3 py-2 text-xs text-gray-300 hover:bg-gray-700"
          >
            Clear chart history
          </button>
          <button
            onClick={() => {
              if (confirm("Clear everything locally (feed, topics, chart)?")) {
                clearMessages();
                clearAllTopics();
                clearBuckets();
              }
            }}
            className="rounded-md bg-red-800 px-3 py-2 text-xs text-white hover:bg-red-700"
          >
            Clear everything (local)
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          &quot;Delete retained&quot; above is the only action that touches the broker;
          everything else clears this browser&apos;s in-memory state.
        </p>
      </section>

      <section className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <h2 className="mb-3 text-lg font-semibold">Broadcast</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (topic && payload) {
              publish(topic, payload);
              setPayload("");
            }
          }}
          className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]"
        >
          <input
            type="text"
            placeholder="Topic (e.g. admin/broadcast)"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-blue-500"
          />
          <input
            type="text"
            placeholder="Payload"
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!connected || !topic || !payload}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-40"
          >
            Publish
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Raw message log</h2>
          <input
            type="text"
            placeholder="Filter by topic or payload…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-64 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-blue-500"
          />
        </div>
        <div className="h-[28rem] overflow-y-auto rounded-lg border border-gray-800 bg-black/40 font-mono text-xs">
          {filtered.length === 0 ? (
            <p className="p-4 text-gray-500">No messages.</p>
          ) : (
            <table className="w-full">
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id} className="border-b border-gray-900/60">
                    <td className="whitespace-nowrap px-3 py-1 text-gray-500">
                      {m.timestamp.toLocaleTimeString()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1 text-blue-400">
                      {m.topic}
                    </td>
                    <td className="break-all px-3 py-1 text-gray-200">
                      {m.payload}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Showing {filtered.length} of {messages.length} cached messages.
        </p>
      </section>
    </div>
  );
}

function InfoTile({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className={`mt-1 truncate text-sm font-semibold ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
