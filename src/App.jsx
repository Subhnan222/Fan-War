import { useState } from "react";
import BattleBoard from "./components/BattleBoard.jsx";
import FanIdentity from "./components/FanIdentity.jsx";
import MatchPreview from "./components/MatchPreview.jsx";
import StartMatch from "./components/StartMatch.jsx";
import VoteSide from "./components/VoteSide.jsx";
import VoteSuccess from "./components/VoteSuccess.jsx";
import { isSupabaseConfigured, supabase } from "./lib/supabaseClient.js";

const DEMO_VOTES_A = 540;
const DEMO_VOTES_B = 460;

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function createBattleId(matchData) {
  return [
    slugify(matchData.creatorA.name),
    "vs",
    slugify(matchData.creatorB.name),
    new Date(matchData.createdAt).getTime() || "demo",
  ].join("-");
}

function createBattleLink(matchData) {
  const battleSlug = `${slugify(matchData.creatorA.name)}-vs-${slugify(matchData.creatorB.name)}`;
  return `${window.location.origin}/battle/${battleSlug}`;
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

function getInitialVoteCounts(matchData, storedVote) {
  const counts = {
    A: matchData.creatorA.votes ?? DEMO_VOTES_A,
    B: matchData.creatorB.votes ?? DEMO_VOTES_B,
  };

  if (storedVote?.selectedSide?.side && !storedVote.countApplied) {
    counts[storedVote.selectedSide.side] += 1;
  }

  return counts;
}

function getVoteStats(voteCounts) {
  const creatorAVotes = voteCounts.A;
  const creatorBVotes = voteCounts.B;
  const totalVotes = creatorAVotes + creatorBVotes;
  const creatorAPercent = totalVotes > 0 ? Math.round((creatorAVotes / totalVotes) * 100) : 50;

  return {
    creatorAVotes,
    creatorBVotes,
    totalVotes,
    creatorAPercent,
    creatorBPercent: 100 - creatorAPercent,
  };
}

export default function App() {
  const [screen, setScreen] = useState("startMatch");
  const [match, setMatch] = useState(null);
  const [selectedSide, setSelectedSide] = useState(null);
  const [fan, setFan] = useState(null);
  const [voteCounts, setVoteCounts] = useState({ A: DEMO_VOTES_A, B: DEMO_VOTES_B });
  const [voteRecord, setVoteRecord] = useState(null);
  const [battleError, setBattleError] = useState("");
  const [voteError, setVoteError] = useState("");
  const [isCreatingBattle, setIsCreatingBattle] = useState(false);
  const [isCreatingFanCard, setIsCreatingFanCard] = useState(false);

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

    const localBattleId = createBattleId(matchData);
    const battleLink = createBattleLink(matchData);
    const battlePayload = {
      title: matchData.title,
      creator_a_name: matchData.creatorA.name,
      creator_a_image_url: matchData.creatorA.imageUrl || null,
      creator_b_name: matchData.creatorB.name,
      creator_b_image_url: matchData.creatorB.imageUrl || null,
      duration: matchData.duration,
      category: matchData.category,
      message: matchData.message,
      battle_link: battleLink,
      created_at: matchData.createdAt,
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

      const battleId = data?.id || localBattleId;
      const matchWithId = {
        ...matchData,
        id: battleId,
        battleLink: data?.battle_link || battleLink,
      };
      const storedVote = readStoredVote(battleId);

      setMatch(matchWithId);
      setSelectedSide(storedVote?.selectedSide || null);
      setFan(storedVote?.fan || null);
      setVoteRecord(storedVote);
      setVoteCounts(getInitialVoteCounts(matchWithId, storedVote));
      setScreen("matchPreview");
      console.log("Fan War match created", matchWithId);
    } catch (error) {
      console.error("Battle insert error:", error);
      setBattleError(error.message || "Could not create battle.");
    } finally {
      setIsCreatingBattle(false);
    }
  };

  const handleVoteNow = () => {
    if (voteRecord?.selectedSide) {
      setSelectedSide(voteRecord.selectedSide);
      setFan(voteRecord.fan || fan);
      setScreen(voteRecord.fan || fan ? "voteSuccess" : "fanIdentity");
      return;
    }

    setScreen("voteSide");
  };

  const handleVoteSide = (sideOption) => {
    if (!match) return;

    const existingVote = readStoredVote(match.id);
    if (existingVote?.selectedSide) {
      setSelectedSide(existingVote.selectedSide);
      setFan(existingVote.fan || null);
      setVoteRecord(existingVote);
      setScreen(existingVote.fan ? "voteSuccess" : "fanIdentity");
      return;
    }

    const side = {
      id: sideOption.id,
      name: sideOption.name,
      imageUrl: sideOption.imageUrl,
      color: sideOption.color,
      side: sideOption.side,
    };
    const nextVoteRecord = {
      battleId: match.id,
      selectedSide: side,
      fan: null,
      votedAt: new Date().toISOString(),
      countApplied: false,
    };

    setSelectedSide(side);
    setVoteRecord(nextVoteRecord);
    setVoteError("");
    setScreen("fanIdentity");
  };

  const handleCreateFanCard = async (fanData) => {
    if (!match || !selectedSide) return;

    setVoteError("");
    setIsCreatingFanCard(true);

    if (!isSupabaseConfigured || !supabase) {
      const error = new Error("Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      console.error("Vote insert error:", error);
      setVoteError(error.message);
      setIsCreatingFanCard(false);
      return;
    }

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

      setFan(fanData);
      const shouldApplyCount = !voteRecord?.countApplied;
      const nextVoteRecord = {
        ...(voteRecord || {}),
        battleId: match.id,
        selectedSide,
        fan: fanData,
        votedAt: voteRecord?.votedAt || new Date().toISOString(),
        countApplied: true,
      };

      setVoteRecord(nextVoteRecord);
      if (shouldApplyCount) {
        setVoteCounts((currentCounts) => ({
          ...currentCounts,
          [selectedSide.side]: currentCounts[selectedSide.side] + 1,
        }));
      }
      writeStoredVote(match.id, nextVoteRecord);
      console.log("Fan War vote created", {
        match,
        selectedSide,
        fan: fanData,
      });
      setScreen("voteSuccess");
    } catch (error) {
      console.error("Vote insert error:", error);
      setVoteError(error.message || "Could not save vote.");
    } finally {
      setIsCreatingFanCard(false);
    }
  };

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
        voteCounts={voteCounts}
        voteRecord={voteRecord?.selectedSide ? voteRecord.selectedSide : null}
        onVoteNow={handleVoteNow}
        onBackToPreview={() => setScreen("matchPreview")}
      />
    );
  }

  if (screen === "voteSide" && match) {
    return (
      <VoteSide
        match={match}
        voteStats={getVoteStats(voteCounts)}
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
        battleLink={match.battleLink || createBattleLink(match)}
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
