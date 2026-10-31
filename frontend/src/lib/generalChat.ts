export const CHAT_HISTORY_UPDATED_EVENT = "intellidocs:chat-history-updated";

export function notifyChatHistoryChanged() {
  window.dispatchEvent(new Event(CHAT_HISTORY_UPDATED_EVENT));
}
