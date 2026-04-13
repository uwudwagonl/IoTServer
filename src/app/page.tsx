"use client";

import Link from "next/link";
import { MqttProvider } from "@/lib/mqtt";
import ConnectionStatus from "@/components/ConnectionStatus";
import StatsBar from "@/components/StatsBar";
import MessageFeed from "@/components/MessageFeed";
import TopicOverview from "@/components/TopicOverview";
import MessageChart from "@/components/MessageChart";
import PublishForm from "@/components/PublishForm";

export default function Dashboard() {
  return (
    <MqttProvider>
      <div className="mx-auto max-w-7xl px-4 py-6">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">IoT Dashboard</h1>
            <p className="text-sm text-gray-500">
              4AHWII — Real-time MQTT Monitor ·{" "}
              <Link href="/admin" className="text-blue-400 hover:underline">
                admin
              </Link>
            </p>
          </div>
          <ConnectionStatus />
        </header>

        <div className="space-y-6">
          <StatsBar />

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <MessageChart />
            </div>
            <PublishForm />
          </div>

          <TopicOverview />
          <MessageFeed />
        </div>
      </div>
    </MqttProvider>
  );
}
