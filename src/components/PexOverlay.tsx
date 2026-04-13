"use client";

import { useEffect, useState } from "react";
import { useMqtt } from "@/lib/mqtt";

const PEX_IMG =
  "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Ftse4.mm.bing.net%2Fth%2Fid%2FOIP.H92fAbueZnieS3rOPewtSwHaHa%3Fpid%3DApi&f=1&ipt=c57f48239b8135a690623e381455d1848a42c6baab17960a0a02b5ec228d183c&ipo=images";

interface Drop {
  id: string;
  left: number;
  size: number;
  duration: number;
  delay: number;
}

export default function PexOverlay() {
  const { pexEvent } = useMqtt();
  const [drops, setDrops] = useState<Drop[]>([]);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!pexEvent) return;
    const next: Drop[] = Array.from({ length: pexEvent.count }, (_, i) => ({
      id: `${pexEvent.nonce}-${i}`,
      left: Math.random() * 95,
      size: 60 + Math.random() * 140,
      duration: 2.5 + Math.random() * 3,
      delay: Math.random() * (pexEvent.duration / 1000) * 0.6,
    }));
    setDrops(next);
    setActive(true);
    const t = setTimeout(() => {
      setActive(false);
      setDrops([]);
    }, pexEvent.duration + 3500);
    return () => clearTimeout(t);
  }, [pexEvent]);

  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {drops.map((d) => (
        <img
          key={d.id}
          src={PEX_IMG}
          alt=""
          style={{
            position: "absolute",
            top: 0,
            left: `${d.left}%`,
            width: `${d.size}px`,
            height: "auto",
            animation: `pex-fall ${d.duration}s linear ${d.delay}s 1 both`,
            willChange: "transform, opacity",
          }}
        />
      ))}
    </div>
  );
}
