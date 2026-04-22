"use client";

import Link from "next/link";
import { MqttProvider } from "@/lib/mqtt";
import LoginGate from "@/components/LoginGate";
import AdminPanel from "@/components/AdminPanel";
import PexPanel from "@/components/PexPanel";
import PexOverlay from "@/components/PexOverlay";
import BrokerSwitcher from "@/components/BrokerSwitcher";
import ConnectionStatus from "@/components/ConnectionStatus";
import StatsBar from "@/components/StatsBar";
import MessageChart from "@/components/MessageChart";

export default function AdminPage() {
  return (
    <LoginGate>
      <MqttProvider>
        <PexOverlay />
        <div className="mx-auto max-w-7xl px-4 py-6">
          <header className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-sm text-gray-500">
                4AHWII — Operator view ·{" "}
                <Link href="/" className="text-blue-400 hover:underline">
                  public dashboard
                </Link>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <BrokerSwitcher />
              <ConnectionStatus />
            </div>
          </header>

          <div className="space-y-6">
            <StatsBar />
            <MessageChart />
            <PexPanel />
            <AdminPanel />
          </div>
        </div>
      </MqttProvider>
    </LoginGate>
  );
}
