"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BROKER_PRESETS,
  BrokerPreset,
  useMqtt,
} from "@/lib/mqtt";

export default function BrokerSwitcher() {
  const {
    brokerUrl,
    setBrokerUrl,
    customPresets,
    addCustomPreset,
    removeCustomPreset,
    connected,
  } = useMqtt();

  const [open, setOpen] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [pageIsHttps, setPageIsHttps] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPageIsHttps(window.location.protocol === "https:");
    }
  }, []);

  const allPresets: BrokerPreset[] = useMemo(
    () => [...BROKER_PRESETS, ...customPresets],
    [customPresets],
  );

  const currentLabel =
    allPresets.find((p) => p.url === brokerUrl)?.label ?? "Custom";

  // Mixed-content warning: wss page can't open ws:// URLs.
  const mixedContent = pageIsHttps && brokerUrl.startsWith("ws://");

  const onSelect = (url: string) => {
    setBrokerUrl(url);
    setOpen(false);
  };

  const onAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const label = customLabel.trim() || customUrl.trim();
    const url = customUrl.trim();
    if (!url) return;
    addCustomPreset({ label, url });
    setBrokerUrl(url);
    setCustomLabel("");
    setCustomUrl("");
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-800"
        title={brokerUrl}
      >
        <span
          className={`h-2 w-2 rounded-full ${
            connected ? "bg-green-500" : "bg-red-500"
          }`}
        />
        <span className="max-w-[16ch] truncate">{currentLabel}</span>
        <svg
          className="h-3 w-3 text-gray-400"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.24 4.38a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-md border border-gray-700 bg-gray-900 p-3 shadow-lg">
          <div className="mb-2 text-xs uppercase tracking-wide text-gray-500">
            Brokers
          </div>
          <ul className="mb-3 space-y-1">
            {allPresets.map((p) => {
              const active = p.url === brokerUrl;
              const isCustom = customPresets.some((cp) => cp.url === p.url);
              return (
                <li key={p.url} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelect(p.url)}
                    className={`flex-1 rounded px-2 py-1.5 text-left text-sm ${
                      active
                        ? "bg-blue-600/20 text-blue-300"
                        : "text-gray-200 hover:bg-gray-800"
                    }`}
                  >
                    <div className="font-medium">{p.label}</div>
                    <div className="truncate text-xs text-gray-500">
                      {p.url}
                    </div>
                  </button>
                  {isCustom && (
                    <button
                      type="button"
                      aria-label="Remove"
                      onClick={() => removeCustomPreset(p.url)}
                      className="rounded px-1.5 py-0.5 text-xs text-gray-500 hover:bg-gray-800 hover:text-red-400"
                    >
                      ✕
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          <form onSubmit={onAddCustom} className="space-y-2 border-t border-gray-800 pt-3">
            <div className="text-xs uppercase tracking-wide text-gray-500">
              Add custom
            </div>
            <input
              type="text"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="Label (optional)"
              className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-sm text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:outline-none"
            />
            <input
              type="text"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="ws://host:9001 or wss://host"
              className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-sm text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!customUrl.trim()}
              className="w-full rounded bg-blue-600 px-2 py-1 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-500"
            >
              Add & connect
            </button>
          </form>

          {mixedContent && (
            <p className="mt-3 text-xs text-amber-400">
              This page is served over HTTPS — browsers block{" "}
              <code>ws://</code> connections. Use a <code>wss://</code> URL
              (tunnel) or open the dashboard over <code>http://</code> on your
              LAN.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
