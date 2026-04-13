"use client";

import { useEffect, useMemo, useState } from "react";
import { BUCKET_MS, useMqtt } from "@/lib/mqtt";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  t: number;
  label: string;
  count: number;
}

type Range = { label: string; ms: number; step: number };

const RANGES: Range[] = [
  { label: "1m",  ms: 60_000,       step: BUCKET_MS },
  { label: "5m",  ms: 5 * 60_000,   step: BUCKET_MS },
  { label: "15m", ms: 15 * 60_000,  step: 30_000 },
  { label: "1h",  ms: 60 * 60_000,  step: 2 * 60_000 },
  { label: "6h",  ms: 6 * 60 * 60_000, step: 12 * 60_000 },
];

export default function MessageChart() {
  const { bucketCounts } = useMqtt();
  const [rangeIdx, setRangeIdx] = useState(1);
  const [offset, setOffset] = useState(0);
  const [live, setLive] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  const range = RANGES[rangeIdx];

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 2000);
    return () => clearInterval(iv);
  }, []);

  const chartData = useMemo<DataPoint[]>(() => {
    const end = live ? now : now - offset;
    const start = end - range.ms;
    const alignedStart = Math.floor(start / range.step) * range.step;
    const points: DataPoint[] = [];
    for (let t = alignedStart; t <= end; t += range.step) {
      let count = 0;
      const binEnd = t + range.step;
      for (let b = Math.floor(t / BUCKET_MS) * BUCKET_MS; b < binEnd; b += BUCKET_MS) {
        count += bucketCounts[b] || 0;
      }
      points.push({
        t,
        label: formatLabel(t, range.ms),
        count,
      });
    }
    return points;
  }, [bucketCounts, range, offset, live, now]);

  const pan = (dir: -1 | 1) => {
    setLive(false);
    setOffset((o) => Math.max(0, o - dir * range.ms * 0.5));
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Message Rate</h2>
        <div className="flex items-center gap-1">
          {RANGES.map((r, i) => (
            <button
              key={r.label}
              onClick={() => { setRangeIdx(i); setOffset(0); }}
              className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                i === rangeIdx
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {r.label}
            </button>
          ))}
          <div className="mx-1 h-4 w-px bg-gray-700" />
          <button
            onClick={() => pan(-1)}
            className="rounded-md bg-gray-800 px-2 py-1 text-xs text-gray-300 hover:bg-gray-700"
            aria-label="Pan back"
          >
            ◀
          </button>
          <button
            onClick={() => pan(1)}
            disabled={offset === 0 && !live}
            className="rounded-md bg-gray-800 px-2 py-1 text-xs text-gray-300 hover:bg-gray-700 disabled:opacity-40"
            aria-label="Pan forward"
          >
            ▶
          </button>
          <button
            onClick={() => { setLive(true); setOffset(0); }}
            className={`rounded-md px-2 py-1 text-xs font-medium ${
              live
                ? "bg-green-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            Live
          </button>
        </div>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="label"
              stroke="#6b7280"
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
              minTickGap={30}
            />
            <YAxis
              stroke="#6b7280"
              tick={{ fontSize: 11 }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
                color: "#f3f4f6",
              }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function formatLabel(t: number, rangeMs: number): string {
  const d = new Date(t);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return rangeMs <= 15 * 60_000 ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`;
}
