"use client";
import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { removePushSubscriptionAction, savePushSubscriptionAction } from "@/server/actions/notifications";

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function PushToggle() {
  const [status, setStatus] = useState<"unsupported" | "off" | "on" | "denied" | "loading">("loading");
  useEffect(() => {
    (async () => {
      if (!KEY || !("serviceWorker" in navigator) || !("PushManager" in window)) return setStatus("unsupported");
      if (Notification.permission === "denied") return setStatus("denied");
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setStatus(sub ? "on" : "off");
    })().catch(() => setStatus("unsupported"));
  }, []);

  async function enable() {
    setStatus("loading");
    try {
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setStatus(perm === "denied" ? "denied" : "off");
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(KEY!) });
      const r = await savePushSubscriptionAction(sub.toJSON());
      setStatus(r.ok ? "on" : "off");
    } catch {
      setStatus("off");
    }
  }
  async function disable() {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) { await removePushSubscriptionAction(sub.endpoint); await sub.unsubscribe(); }
    setStatus("off");
  }

  if (status === "unsupported") return <p className="text-sm text-ink-400">Notificações push não estão disponíveis neste navegador/servidor. No iPhone, instale o app na tela de início (Compartilhar → Adicionar à Tela de Início) e abra por lá.</p>;
  if (status === "denied") return <p className="text-sm text-ink-400">As notificações foram bloqueadas nas configurações do navegador.</p>;
  return status === "on"
    ? <button onClick={disable} className="btn-secondary"><BellOff className="size-4" />Desativar notificações neste aparelho</button>
    : <button onClick={enable} disabled={status === "loading"} className="btn-primary"><Bell className="size-4" />Ativar notificações neste aparelho</button>;
}
