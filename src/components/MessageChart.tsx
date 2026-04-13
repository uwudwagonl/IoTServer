"use client";

import { useEffect, useState } from "react";
import { useMqtt } from "@/lib/mqtt";
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
  time: string;
  count: number;
}

export default function MessageChart() {
  const { messages } = useMqtt();
  const [chartData, setChartData] = useState<DataPoint[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const now = Date.now();
    const buckets: Record<string, number> = {};

    // Show last 2 minutes in 10-second intervals
    for (let i = 11; i >= 0; i--) {
      const t = new Date(now - i * 10000);
      const key = t.toLocaleTimeString([], {
        minute: "2-digit",
        second: "2-digit",
      });
      buckets[key] = 0;
    }

    messages.forEach((msg) => {
      const age = now - msg.timestamp.getTime();
      if (age < 120000) {
        const t = new Date(
          Math.floor(msg.timestamp.getTime() / 10000) * 10000
        );
        const key = t.toLocaleTimeString([], {
          minute: "2-digit",
          second: "2-digit",
        });
        if (key in buckets) {
          buckets[key]++;
        }
      }
    });

    setChartData(
      Object.entries(buckets).map(([time, count]) => ({ time, count }))
    );
  }, [messages, tick]);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <h2 className="mb-3 text-lg font-semibold">Message Rate</h2>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="time"
              stroke="#6b7280"
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
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
              animationDuration={300}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
