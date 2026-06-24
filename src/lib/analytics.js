import { isSupabaseConfigured, supabase } from "./supabaseClient.js";

const SESSION_STORAGE_KEY = "fanwar_session_id";

export function getAnalyticsSessionId() {
  try {
    const existingSessionId = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (existingSessionId) return existingSessionId;

    const sessionId =
      window.crypto?.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    return sessionId;
  } catch (error) {
    console.warn("Analytics event failed:", error);
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function getBattleViewKey(battleId, sessionId) {
  return `fanwar_viewed_${battleId}_${sessionId}`;
}

function hasTrackedBattleView(battleId, sessionId) {
  if (!battleId) return false;

  try {
    return Boolean(window.localStorage.getItem(getBattleViewKey(battleId, sessionId)));
  } catch (error) {
    console.warn("Analytics event failed:", error);
    return false;
  }
}

function markBattleViewTracked(battleId, sessionId) {
  if (!battleId) return;

  try {
    window.localStorage.setItem(getBattleViewKey(battleId, sessionId), "true");
  } catch (error) {
    console.warn("Analytics event failed:", error);
  }
}

export async function trackEvent(eventType, options = {}) {
  try {
    const sessionId = getAnalyticsSessionId();
    const battleId = options.battleId || null;

    if (eventType === "battle_view" && hasTrackedBattleView(battleId, sessionId)) {
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      console.warn("Analytics event failed:", "Supabase is not configured.");
      return;
    }

    const { error } = await supabase.from("analytics_events").insert({
      battle_id: battleId,
      event_type: eventType,
      selected_side: options.selectedSide || null,
      fan_name: options.fanName || null,
      session_id: sessionId,
      extra_data: options.extraData || null,
    });

    if (error) {
      console.warn("Analytics event failed:", error);
      return;
    }

    if (eventType === "battle_view") {
      markBattleViewTracked(battleId, sessionId);
    }
  } catch (error) {
    console.warn("Analytics event failed:", error);
  }
}
