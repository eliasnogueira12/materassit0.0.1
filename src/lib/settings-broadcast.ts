const CHANNEL_NAME = "materassist-settings";

export function broadcastSettingsChange(key: string) {
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage({ type: "settings-changed", key, timestamp: Date.now() });
    channel.close();
  } catch {
    // BroadcastChannel not supported (e.g. old browsers)
  }
}

export function listenSettingsChange(callback: (key: string) => void) {
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event) => {
      if (event.data?.type === "settings-changed") {
        callback(event.data.key);
      }
    };
    return () => channel.close();
  } catch {
    return () => {};
  }
}
