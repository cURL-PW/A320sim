// BroadcastChannel wrapper for main <-> CDU window sync.
import { CHANNEL_NAME } from './model.js';

export function openChannel(onMessage) {
  const ch = new BroadcastChannel(CHANNEL_NAME);
  ch.onmessage = ev => onMessage(ev.data);
  return {
    send(msg) { ch.postMessage(msg); },
    close() { ch.close(); },
  };
}
