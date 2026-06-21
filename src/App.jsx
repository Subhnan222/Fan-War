import { useCallback, useEffect, useState } from "react";
import BattleBoard from "./components/BattleBoard.jsx";
import FanIdentity from "./components/FanIdentity.jsx";
import MatchPreview from "./components/MatchPreview.jsx";
import StartMatch from "./components/StartMatch.jsx";
import VoteSide from "./components/VoteSide.jsx";
import VoteSuccess from "./components/VoteSuccess.jsx";
import { isSupabaseConfigured, supabase } from "./lib/supabaseClient.js";

const EMPTY_VOTE_STATS = {
  creatorAVotes: 0,
  creatorBVotes: 0,
  totalVotes: 0,
  creatorAPercent: 50,
  creatorBPercent: 50,
};

function slugify(value) {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function createBaseBattleSlug(matchData) {
  const baseSlug = `${slugify(matchData.creatorA.name)}-vs-${slugify(matchData.creatorB.name)}` || "fan-war-battle";
  return baseSlug;
}

function appendShortTimestamp(slug) {
  return `${slug}-${Date.now().toString().slice(-5)}`;
}

async function createAvailableBattleSlug(matchData) {
  const baseSlug = createBaseBattleSlug(matchData);

  if (!isSupabaseConfigured || !supabase) {
    return appendShortTimestamp(baseSlug);
  }

  const { data, error } = await supabase.from("battles").select("id").eq("slug", baseSlug).maybeSingle();

  if (error) {
    console.error("Battle slug check error:", error);
    return appendShortTimestamp(baseSlug);
  }

  return data ? appendShortTimestamp(baseSlug) : baseSlug;
}

function createBattleLinkFromSlug(slug) {
  return `${window.location.origin}/?battle=${slug}`;
}

function getBattleSlugFromUrl() {
  return new URLSearchParams(window.location.search).get("battle");
}

function getVoteStorageKey(battleId) {
  return `fanwar_vote_${battleId}`;
}

function readStoredVote(battleId) {
  try {
    const rawVote = window.localStorage.getItem(getVoteStorageKey(battleId));
    return rawVote ? JSON.parse(rawVote) : null;
  } catch (error) {
    console.error("Could not read Fan War vote", error);
    return null;
  }
}

function writeStoredVote(battleId, data) {
  try {
    window.localStorage.setItem(getVoteStorageKey(battleId), JSON.stringify(data));
  } catch (error) {
    console.error("Could not save Fan War vote", error);
  }
}

function createVoteStats(creatorAVotes, creatorBVotes) {
  const totalVotes = creatorAVotes + creatorBVotes;
  const creatorAPercent = totalVotes === 0 ? 50 : Math.round((creatorAVotes / totalVotes) * 100);

  return {
    creatorAVotes,
    creatorBVotes,
    totalVotes,
    creatorAPercent,
    creatorBPercent: totalVotes === 0 ? 50 : 100 - creatorAPercent,
  };
}

async function fetchVoteCounts(battleId) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }

  const { data, error } = await supabase.from("votes").select("selected_side").eq("battle_id", battleId);

  if (error) {
    throw error;
  }

  const creatorAVotes = data.filter((vote) => vote.selected_side === "A").length;
  const creatorBVotes = data.filter((vote) => vote.selected_side === "B").length;
  return createVoteStats(creatorAVotes, creatorBVotes);
}

function mapBattleRowToMatch(battle, localMatchData) {
  return {
    id: battle.id,
    slug: battle.slug,
    title: battle.title || "Fan Battle",
    category: battle.category || "Creator",
    message: battle.message || "",
    duration: battle.duration_label || "5 Days",
    createdAt: battle.created_at || battle.starts_at,
    startsAt: battle.starts_at,
    endsAt: battle.ends_at,
    battleLink: createBattleLinkFromSlug(battle.slug),
    creatorA: {
      name: battle.creator_a_name || localMatchData?.creatorA?.name || "Creator A",
      imageUrl: localMatchData?.creatorA?.imageUrl || battle.creator_a_image || "",
    },
    creatorB: {
      name: battle.creator_b_name || localMatchData?.creatorB?.name || "Creator B",
      imageUrl: localMatchData?.creatorB?.imageUrl || battle.creator_b_image || "",
    },
  };
}

function NoticeScreen({ title, message, onPrimaryAction }) {
  return (
    <main className="fanwar-shell preview-shell">
      <div className="cinema-grid" aria-hidden="true" />
      <section className="preview-panel" aria-live="polite">
        <div className="preview-stage">
          <span className="eyebrow">Fan War</span>
          <h1>{title}</h1>
          <p>{message}</p>
        </div>
        {onPrimaryAction ? (
          <button className="back-edit-button" type="button" onClick={onPrimaryAction}>
            Create Match
          </button>
        ) : null}
      </section>
    </main>
  );
}

export default function App() {
  const [screen, setScreen] = useState("startMatch");
  const [match, setMatch] = useState(null);
  const [selectedSide, setSelectedSide] = useState(null);
  const [fan, setFan] = useState(null);
  const [voteStats, setVoteStats] = useState(EMPTY_VOTE_STATS);
  const [voteRecord, setVoteRecord] = useState(null);
  const [battleError, setBattleError] = useState("");
  const [voteError, setVoteError] = useState("");
  const [boardError, setBoardError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [isLoadingBattle, setIsLoadingBattle] = useState(() => Boolean(getBattleSlugFromUrl()));
  const [isCreatingBattle, setIsCreatingBattle] = useState(false);
  const [isCreatingFanCard, setIsCreatingFanCard] = useState(false);

  const refreshVoteCounts = useCallback(async (battleId = match?.id) => {
    if (!battleId) return EMPTY_VOTE_STATS;

    try {
      const nextVoteStats = await fetchVoteCounts(battleId);
      setVoteStats(nextVoteStats);
      setBoardError("");
      return nextVoteStats;
    } catch (error) {
      console.error("Vote count fetch error:", error);
      setBoardError("Could not load latest vote counts.");
      throw error;
    }
  }, [match?.id]);

  useEffect(() => {
    const battleSlug = getBattleSlugFromUrl();
    if (!battleSlug) {
      setIsLoadingBattle(false);
      return undefined;
    }

    let isCancelled = false;

    async function loadBattleFromUrl() {
      setIsLoadingBattle(true);
      setLoadError("");
      setBoardError("");

      if (!isSupabaseConfigured || !supabase) {
        setLoadError("Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
        setIsLoadingBattle(false);
        return;
      }

      const { data, error } = await supabase.from("battles").select("*").eq("slug", battleSlug).single();

      if (isCancelled) return;

      if (error) {
        console.error("Battle fetch error:", error);
        setLoadError("Battle not found");
        setIsLoadingBattle(false);
        return;
      }

      const loadedMatch = mapBattleRowToMatch(data);
      const storedVote = readStoredVote(loadedMatch.id);
      let loadedVoteStats = EMPTY_VOTE_STATS;

      try {
        loadedVoteStats = await fetchVoteCounts(loadedMatch.id);
      } catch (voteCountError) {
        console.error("Vote count fetch error:", voteCountError);
        setBoardError("Could not load latest vote counts.");
      }

      if (isCancelled) return;

      setMatch(loadedMatch);
      setSelectedSide(storedVote?.selectedSide || null);
      setFan(storedVote?.fan || null);
      setVoteRecord(storedVote);
      setVoteStats(loadedVoteStats);
      setScreen("battleBoard");
      setIsLoadingBattle(false);
    }

    loadBattleFromUrl();

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleStartNewMatch = () => {
    window.history.replaceState(null, "", window.location.pathname);
    setLoadError("");
    setBattleError("");
    setMatch(null);
    setSelectedSide(null);
    setFan(null);
    setVoteRecord(null);
    setVoteStats(EMPTY_VOTE_STATS);
    setScreen("startMatch");
  };

  const handleCreateMatch = async (matchData) => {
    console.log("Creating battle...");
    console.log("Supabase URL:", import.meta.env.VITE_SUPABASE_URL);

    setBattleError("");
    setIsCreatingBattle(true);

    if (!isSupabaseConfigured || !supabase) {
      const error = new Error("Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      console.error("Battle insert error:", error);
      setBattleError(error.message);
      setIsCreatingBattle(false);
      return;
    }

    const slug = await createAvailableBattleSlug(matchData);
    const battlePayload = {
      slug,
      title: matchData.title,
      category: matchData.category,
      message: matchData.message,
      duration_label: matchData.duration,
      creator_a_name: matchData.creatorA.name,
      creator_a_image: null,
      creator_b_name: matchData.creatorB.name,
      creator_b_image: null,
      starts_at: matchData.createdAt,
      ends_at: matchData.endsAt,
    };

    try {
      const { data, error } = await supabase.from("battles").insert(battlePayload).select().single();

      if (error) {
        console.error("Battle insert error:", error);
        setBattleError(error.message || "Could not create battle.");
        return;
      }

      console.log("Battle inserted:", data);

      const matchWithSupabaseBattle = mapBattleRowToMatch(data, matchData);
      const storedVote = readStoredVote(matchWithSupabaseBattle.id);

      setMatch(matchWithSupabaseBattle);
      setSelectedSide(storedVote?.selectedSide || null);
      setFan(storedVote?.fan || null);
      setVoteRecord(storedVote);
      setVoteStats(EMPTY_VOTE_STATS);
      setScreen("matchPreview");
    } catch (error) {
      console.error("Battle insert error:", error);
      setBattleError(error.message || "Could not create battle.");
    } finally {
      setIsCreatingBattle(false);
    }
  };

  const handleVoteNow = () => {
    if (!match) return;

    const storedVote = readStoredVote(match.id);
    if (storedVote?.selectedSide) {
      setSelectedSide(storedVote.selectedSide);
      setFan(storedVote.fan || null);
      setVoteRecord(storedVote);

      if (storedVote.fan) {
        setScreen("voteSuccess");
      } else {
        setBoardError("You already voted on this device.");
      }
      return;
    }

    setBoardError("");
    setVoteError("");
    setScreen("voteSide");
  };

  const handleVoteSide = (sideOption) => {
    if (!match) return;

    const existingVote = readStoredVote(match.id);
    if (existingVote?.selectedSide) {
      setSelectedSide(existingVote.selectedSide);
      setFan(existingVote.fan || null);
      setVoteRecord(existingVote);

      if (existingVote.fan) {
        setScreen("voteSuccess");
      } else {
        setBoardError("You already voted on this device.");
        setScreen("battleBoard");
      }
      return;
    }

    const side = {
      id: sideOption.id,
      name: sideOption.name,
      imageUrl: sideOption.imageUrl,
      color: sideOption.color,
      side: sideOption.side,
    };

    setSelectedSide(side);
    setVoteRecord(null);
    setVoteError("");
    setScreen("fanIdentity");
  };

  const handleCreateFanCard = async (fanData) => {
    if (!match || !selectedSide) return;

    setVoteError("");
    setIsCreatingFanCard(true);

    const existingVote = readStoredVote(match.id);
    if (existingVote?.selectedSide) {
      setVoteError("You already voted on this device.");
      setSelectedSide(existingVote.selectedSide);
      setFan(existingVote.fan || null);
      setVoteRecord(existingVote);
      setIsCreatingFanCard(false);

      if (existingVote.fan) {
        setScreen("voteSuccess");
      }
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      const error = new Error("Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      console.error("Vote insert error:", error);
      setVoteError(error.message);
      setIsCreatingFanCard(false);
      return;
    }

    console.log("Submitting vote...", { battleId: match.id, selectedSide, fanName: fanData.name });

    try {
      const { data, error } = await supabase
        .from("votes")
        .insert({
          battle_id: match.id,
          selected_side: selectedSide.side,
          fan_name: fanData.name,
        })
        .select()
        .single();

      if (error) {
        console.error("Vote insert error:", error);
        setVoteError(error.message || "Could not save vote.");
        return;
      }

      console.log("Vote inserted:", data);

      const nextVoteRecord = {
        battleId: match.id,
        voteId: data.id,
        selectedSide,
        fan: fanData,
        votedAt: data.created_at || new Date().toISOString(),
      };

      setFan(fanData);
      setVoteRecord(nextVoteRecord);
      writeStoredVote(match.id, nextVoteRecord);

      try {
        await refreshVoteCounts(match.id);
      } catch {
        // The fan card can still be shown because the vote itself was inserted.
      }

      setScreen("voteSuccess");
    } catch (error) {
      console.error("Vote insert error:", error);
      setVoteError(error.message || "Could not save vote.");
    } finally {
      setIsCreatingFanCard(false);
    }
  };

  if (isLoadingBattle) {
    return <NoticeScreen title="Loading Battle" message="Opening the live Fan War board." />;
  }

  if (loadError) {
    return <NoticeScreen title={loadError} message="This battle link is unavailable or has been removed." onPrimaryAction={handleStartNewMatch} />;
  }

  if (screen === "matchPreview" && match) {
    return (
      <MatchPreview
        match={match}
        onBackToEdit={() => setScreen("startMatch")}
        onContinue={() => setScreen("battleBoard")}
      />
    );
  }

  if (screen === "battleBoard" && match) {
    return (
      <BattleBoard
        match={match}
        voteStats={voteStats}
        voteRecord={voteRecord?.selectedSide ? voteRecord.selectedSide : null}
        onVoteNow={handleVoteNow}
        onBackToPreview={() => setScreen("matchPreview")}
        onRefreshVotes={() => refreshVoteCounts(match.id)}
        statusMessage={boardError}
      />
    );
  }

  if (screen === "voteSide" && match) {
    return (
      <VoteSide
        match={match}
        voteStats={voteStats}
        onVoteSide={handleVoteSide}
        onBackToBattle={() => setScreen("battleBoard")}
      />
    );
  }

  if (screen === "fanIdentity" && match && selectedSide) {
    return (
      <FanIdentity
        selectedSide={selectedSide}
        initialFan={fan}
        onCreateFanCard={handleCreateFanCard}
        onBackToVoteSide={() => setScreen("voteSide")}
        submitError={voteError}
        isSubmitting={isCreatingFanCard}
      />
    );
  }

  if (screen === "voteSuccess" && match && selectedSide && fan) {
    return (
      <VoteSuccess
        match={match}
        selectedSide={selectedSide}
        fan={fan}
        battleLink={match.battleLink}
        onBackToBattle={() => setScreen("battleBoard")}
      />
    );
  }

  return (
    <StartMatch
      initialMatch={match}
      onCreateMatch={handleCreateMatch}
      submitError={battleError}
      isSubmitting={isCreatingBattle}
    />
  );
}
