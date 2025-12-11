import { writable } from 'svelte/store';

export const messages = writable([]);
export const peers = writable([]);
export const outputLog = writable([]);
export const connectionStatus = writable('disconnected'); // disconnected, connecting, connected
export const myPeerId = writable('');
export const agentConnected = writable(false);

export function addLog(msg) {
    outputLog.update(l => [...l, `[${new Date().toLocaleTimeString()}] ${msg}`].slice(-50));
    console.log(`[P2P] ${msg}`);
}

export function addMessage(msg) {
    messages.update(m => [...m, msg]);
}
