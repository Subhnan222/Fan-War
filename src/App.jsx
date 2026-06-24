import { useCallback, useEffect, useState } from "react";
import BattleBoard from "./components/BattleBoard.jsx";
import FanIdentity from "./components/FanIdentity.jsx";
import MatchPreview from "./components/MatchPreview.jsx";
import MyMatches from "./components/MyMatches.jsx";
import StartMatch from "./components/StartMatch.jsx";
import VoteSide from "./components/VoteSide.jsx";
import VoteSuccess from "./components/VoteSuccess.jsx";
import { trackEvent } from "./lib/analytics.js";
import { isSupabaseConfigured, supabase } from "./lib/supabaseClient.js";

const STORAGE_BUCKET = "fan-war-assets";
const MY_MATCHES_KEY = "fanwar_my_matches";

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

function getFileExtension(file) {
  return file?.name?.split(".").pop()?.toLowerCase()?.replace(/[^a-z0-9]/g, "") || "png";
}

async function uploadCreatorImage(file, battleSlug, creatorKey) {
  if (!file) {
    console.log(`${creatorKey} no file selected`);
    return null;
  }

  console.log(`Uploading ${creatorKey} file:`, file);

  const fileExt = getFileExtension(file);
  const filePath = `creators/${battleSlug}/${creatorKey}-${Date.now()}.${fileExt}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    console.error(`${creatorKey} upload error:`, uploadError);
    uploadError.isImageUploadError = true;
    throw uploadError;
  }

  console.log(`${creatorKey} upload success:`, uploadData);

  const { data: publicUrlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
  console.log(`${creatorKey} public URL:`, publicUrlData.publicUrl);

  return publicUrlData.publicUrl;
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

function readMyMatches() {
  try {
    const rawMatches = window.localStorage.getItem(MY_MATCHES_KEY);
    const matches = rawMatches ? JSON.parse(rawMatches) : [];
    return Array.isArray(matches) ? matches : [];
  } catch (error) {
    console.error("Could not read Fan War matches", error);
    return [];
  }
}

function createSavedMatchRecord(battle) {
  return {
    id: battle.id,
    slug: battle.slug,
    title: battle.title,
    creatorAName: battle.creator_a_name,
    creatorBName: battle.creator_b_name,
    creatorAImage: battle.creator_a_image,
    creatorBImage: battle.creator_b_image,
    createdAt: battle.created_at,
    endsAt: battle.ends_at,
  };
}

function saveMyMatch(battle) {
  const savedMatch = createSavedMatchRecord(battle);
  const currentMatches = readMyMatches();
  const existingIndex = currentMatches.findIndex(
    (match) => match.id === savedMatch.id || match.slug === savedMatch.slug,
  );
  const nextMatches =
    existingIndex >= 0
      ? currentMatches.map((match, index) => (index === existingIndex ? { ...match, ...savedMatch } : match))
      : [savedMatch, ...currentMatches];

  try {
    window.localStorage.setItem(MY_MATCHES_KEY, JSON.stringify(nextMatches));
  } catch (error) {
    console.error("Could not save Fan War match", error);
  }

  return nextMatches;
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

function getStoredVoteSide(storedVote) {
  if (!storedVote) return "";
  if (storedVote.selectedSide === "A" || storedVote.selectedSide === "B") return storedVote.selectedSide;
  if (storedVote.selectedSide?.side === "A" || storedVote.selectedSide?.side === "B") {
    return storedVote.selectedSide.side;
  }
  return "";
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
    category: battle.category || null,
    message: battle.message || "Fans decide the winner.",
    duration: battle.duration_label || "5 Days",
    createdAt: battle.created_at || battle.starts_at,
    startsAt: battle.starts_at,
    endsAt: battle.ends_at,
    battleLink: createBattleLinkFromSlug(battle.slug),
    creatorA: {
      name: battle.creator_a_name || localMatchData?.creatorA?.name || "Creator A",
      imageUrl: battle.creator_a_image || "",
    },
    creatorB: {
      name: battle.creator_b_name || localMatchData?.creatorB?.name || "Creator B",
      imageUrl: battle.creator_b_image || "",
    },
  };
}

function createSelectedSideFromMatch(match, side) {
  if (!match || (side !== "A" && side !== "B")) return null;

  const isSideB = side === "B";
  const creator = isSideB ? match.creatorB : match.creatorA;

  return {
    id: isSideB ? "creator-b" : "creator-a",
    name: creator.name,
    imageUrl: creator.imageUrl,
    color: isSideB ? "gold" : "red",
    side,
  };
}

function normalizeStoredVote(storedVote, match) {
  const side = getStoredVoteSide(storedVote);
  if (!storedVote || !side || !match?.id) return null;

  const selectedSide = createSelectedSideFromMatch(match, side);

  return {
    battleId: storedVote.battleId || match.id,
    selectedSide: side,
    selectedCreatorName:
      storedVote.selectedCreatorName || storedVote.selectedSide?.name || selectedSide?.name || "Creator",
    fanName: storedVote.fanName || storedVote.fan?.name || "",
    votedAt: storedVote.votedAt || new Date().toISOString(),
  };
}

function readNormalizedStoredVote(match) {
  if (!match?.id) return null;

  const storedVote = readStoredVote(match.id);
  const normalizedVote = normalizeStoredVote(storedVote, match);

  if (storedVote && normalizedVote && JSON.stringify(storedVote) !== JSON.stringify(normalizedVote)) {
    writeStoredVote(match.id, normalizedVote);
  }

  return normalizedVote;
}

function createFanFromVoteRecord(voteRecord) {
  return voteRecord?.fanName ? { name: voteRecord.fanName, photoUrl: "" } : null;
}

function createLocalVoteRecord(match, selectedSide, fanData, votedAt) {
  return {
    battleId: match.id,
    selectedSide: selectedSide.side,
    selectedCreatorName: selectedSide.name,
    fanName: fanData.name,
    votedAt,
  };
}

function isMatchEnded(match) {
  const endTime = new Date(match?.endsAt).getTime();
  return Number.isFinite(endTime) && Date.now() > endTime;
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

function AlreadyVotedScreen({ match, voteRecord, onViewFanCard, onBackToBattle }) {
  const [status, setStatus] = useState("");
  const selectedCreatorName = voteRecord?.selectedCreatorName || "this team";
  const battleLink = match.battleLink || createBattleLinkFromSlug(match.slug);

  const handleShareBattle = async () => {
    const message = `I voted for Team ${selectedCreatorName} in Fan War. Vote here: ${battleLink}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Fan War Battle",
          text: message,
          url: battleLink,
        });
        setStatus("Share opened");
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message);
        setStatus("Voting link copied");
        window.setTimeout(() => setStatus(""), 2200);
        return;
      }

      setStatus("Share unavailable");
    } catch (error) {
      console.error("Could not share battle", error);
      setStatus("Share failed");
    }
  };

  return (
    <main className="fanwar-shell already-voted-shell">
      <div className="cinema-grid" aria-hidden="true" />
      <section className="already-voted-panel" aria-live="polite">
        <span className="vote-success-badge">Vote already counted</span>
        <h1>YOU ALREADY VOTED</h1>
        <p>
          You already voted for Team <strong>{selectedCreatorName}</strong>.
        </p>
        {!voteRecord?.fanName ? (
          <p className="already-voted-note">Your fan card data is not available on this device.</p>
        ) : null}

        <div className="vote-success-actions">
          <button
            className="preview-action primary"
            type="button"
            onClick={onViewFanCard}
            disabled={!voteRecord?.fanName}
          >
            View My Fan Card
          </button>
          <button className="preview-action secondary" type="button" onClick={onBackToBattle}>
            Back to Live Match
          </button>
          <button className="preview-action ghost" type="button" onClick={handleShareBattle}>
            Share Battle
          </button>
        </div>

        <div className="preview-status-row" aria-live="polite">
          {status && <span>{status}</span>}
        </div>
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
  const [myMatches, setMyMatches] = useState(() => readMyMatches());

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [screen]);

  useEffect(() => {
    if (screen !== "battleBoard" || !match?.id) return;
    void trackEvent("battle_view", { battleId: match.id });
  }, [match?.id, screen]);

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

  const loadBattleBySlug = useCallback(async (battleSlug) => {
    if (!battleSlug) return false;

    setIsLoadingBattle(true);
    setLoadError("");
    setBoardError("");

    if (!isSupabaseConfigured || !supabase) {
      setLoadError("Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      setIsLoadingBattle(false);
      return false;
    }

    const { data, error } = await supabase.from("battles").select("*").eq("slug", battleSlug).single();

    if (error) {
      console.error("Battle fetch error:", error);
      setLoadError("Battle not found");
      setIsLoadingBattle(false);
      return false;
    }

    const loadedMatch = mapBattleRowToMatch(data);
    const storedVote = readNormalizedStoredVote(loadedMatch);
    let loadedVoteStats = EMPTY_VOTE_STATS;

    try {
      loadedVoteStats = await fetchVoteCounts(loadedMatch.id);
    } catch (voteCountError) {
      console.error("Vote count fetch error:", voteCountError);
      setBoardError("Could not load latest vote counts.");
    }

    setMatch(loadedMatch);
    setSelectedSide(createSelectedSideFromMatch(loadedMatch, storedVote?.selectedSide));
    setFan(createFanFromVoteRecord(storedVote));
    setVoteRecord(storedVote);
    setVoteStats(loadedVoteStats);
    setScreen("battleBoard");
    setIsLoadingBattle(false);
    return true;
  }, []);

  useEffect(() => {
    const battleSlug = getBattleSlugFromUrl();
    if (!battleSlug) {
      setIsLoadingBattle(false);
      return undefined;
    }

    void loadBattleBySlug(battleSlug);
    return undefined;
  }, [loadBattleBySlug]);

  const handleStartNewMatch = () => {
    window.history.pushState({}, "", "/");
    setLoadError("");
    setBattleError("");
    setMatch(null);
    setSelectedSide(null);
    setFan(null);
    setVoteRecord(null);
    setVoteStats(EMPTY_VOTE_STATS);
    setScreen("startMatch");
  };

  const handleOpenMyMatches = () => {
    setLoadError("");
    setBattleError("");
    setMyMatches(readMyMatches());
    setScreen("myMatches");
  };

  const handleOpenSavedMatch = async (savedMatch) => {
    if (!savedMatch?.slug) return;

    window.history.pushState({}, "", `/?battle=${savedMatch.slug}`);
    await loadBattleBySlug(savedMatch.slug);
  };

  const handleCreateMatch = async (matchData) => {
    console.log("Creating battle...");
    console.log("Supabase URL:", import.meta.env.VITE_SUPABASE_URL);

    setBattleError("");
    setIsCreatingBattle(true);

    if (!isSupabaseConfigured || !supabase) {
      const error = new Error("Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      console.error("Battle insert error:", error);
      setBattleError("Could not create match. Please check internet and try again.");
      setIsCreatingBattle(false);
      return;
    }

    try {
      const slug = await createAvailableBattleSlug(matchData);
      console.log("Uploading Creator A image...");
      const creatorAImageUrl = await uploadCreatorImage(matchData.creatorA.imageFile, slug, "creator-a");
      console.log("Creator A image URL:", creatorAImageUrl);
      console.log("Uploading Creator B image...");
      const creatorBImageUrl = await uploadCreatorImage(matchData.creatorB.imageFile, slug, "creator-b");
      console.log("Creator B image URL:", creatorBImageUrl);
      console.log("Final creator image URLs:", {
        creatorAImageUrl,
        creatorBImageUrl,
      });
      const battlePayload = {
        slug,
        title: matchData.title,
        category: null,
        message: matchData.message || "Support your favorite creator. Fans decide the winner.",
        duration_label: matchData.duration,
        creator_a_name: matchData.creatorA.name,
        creator_a_image: creatorAImageUrl,
        creator_b_name: matchData.creatorB.name,
        creator_b_image: creatorBImageUrl,
        starts_at: matchData.createdAt,
        ends_at: matchData.endsAt,
      };
      console.log("Creating battle with image URLs:", battlePayload);
      console.log("Battle insert payload:", battlePayload);

      const { data, error } = await supabase.from("battles").insert(battlePayload).select().single();

      if (error) {
        console.error("Battle insert error:", error);
        setBattleError("Could not create match. Please check internet and try again.");
        return;
      }

      console.log("Battle inserted:", data);

      const matchWithSupabaseBattle = mapBattleRowToMatch(data);
      const storedVote = readNormalizedStoredVote(matchWithSupabaseBattle);
      setMyMatches(saveMyMatch(data));
      window.history.pushState({}, "", `/?battle=${data.slug}`);

      setMatch(matchWithSupabaseBattle);
      setSelectedSide(createSelectedSideFromMatch(matchWithSupabaseBattle, storedVote?.selectedSide));
      setFan(createFanFromVoteRecord(storedVote));
      setVoteRecord(storedVote);
      setVoteStats(EMPTY_VOTE_STATS);
      setScreen("matchPreview");
    } catch (error) {
      if (error.isImageUploadError) {
        console.error("Image upload failed:", error);
        setBattleError("Image upload failed. Check Supabase Storage policy.");
      } else {
        console.error("Battle insert error:", error);
        setBattleError("Could not create match. Please check internet and try again.");
      }
    } finally {
      setIsCreatingBattle(false);
    }
  };

  const handleVoteNow = () => {
    if (!match) return;
    void trackEvent("vote_now_clicked", { battleId: match.id });

    if (isMatchEnded(match)) {
      setBoardError("This battle has ended. Voting is closed.");
      setScreen("battleBoard");
      return;
    }

    const storedVote = readNormalizedStoredVote(match);
    if (storedVote?.selectedSide) {
      setSelectedSide(createSelectedSideFromMatch(match, storedVote.selectedSide));
      setFan(createFanFromVoteRecord(storedVote));
      setVoteRecord(storedVote);
      setScreen("alreadyVoted");
      return;
    }

    setBoardError("");
    setVoteError("");
    setScreen("voteSide");
  };

  const handleVoteSide = (sideOption) => {
    if (!match) return;
    if (isMatchEnded(match)) {
      setBoardError("This battle has ended. Voting is closed.");
      setScreen("battleBoard");
      return;
    }

    const existingVote = readNormalizedStoredVote(match);
    if (existingVote?.selectedSide) {
      setSelectedSide(createSelectedSideFromMatch(match, existingVote.selectedSide));
      setFan(createFanFromVoteRecord(existingVote));
      setVoteRecord(existingVote);
      setScreen("alreadyVoted");
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
    void trackEvent("side_selected", {
      battleId: match.id,
      selectedSide: side.side,
    });
    setScreen("fanIdentity");
  };

  const handleCreateFanCard = async (fanData) => {
    if (!match || !selectedSide) return;

    setVoteError("");
    setIsCreatingFanCard(true);

    if (isMatchEnded(match)) {
      setVoteError("This battle has ended. Voting is closed.");
      setIsCreatingFanCard(false);
      return;
    }

    const existingVote = readNormalizedStoredVote(match);
    if (existingVote?.selectedSide) {
      setVoteError(`You already voted for Team ${existingVote.selectedCreatorName}.`);
      setSelectedSide(createSelectedSideFromMatch(match, existingVote.selectedSide));
      setFan(createFanFromVoteRecord(existingVote));
      setVoteRecord(existingVote);
      setIsCreatingFanCard(false);
      setScreen("alreadyVoted");
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
      void trackEvent("vote_completed", {
        battleId: match.id,
        selectedSide: selectedSide.side,
        fanName: fanData.name,
      });

      const nextVoteRecord = createLocalVoteRecord(
        match,
        selectedSide,
        fanData,
        data.created_at || new Date().toISOString(),
      );

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

  const handleViewSavedFanCard = () => {
    if (!match || !voteRecord?.fanName) return;

    const savedSide = createSelectedSideFromMatch(match, voteRecord.selectedSide);
    const savedFan =
      fan?.name === voteRecord.fanName ? fan : { name: voteRecord.fanName, photoUrl: "" };

    setSelectedSide(savedSide);
    setFan(savedFan);
    setScreen("voteSuccess");
  };

  const handleReturnToBattleBoard = () => {
    setScreen("battleBoard");
  };

  if (isLoadingBattle) {
    return <NoticeScreen title="Loading Match" message="Opening the live Fan War match." />;
  }

  if (loadError) {
    return <NoticeScreen title={loadError} message="This battle link is unavailable or has been removed." onPrimaryAction={handleStartNewMatch} />;
  }

  if (screen === "myMatches") {
    return (
      <MyMatches
        matches={myMatches}
        onOpenMatch={handleOpenSavedMatch}
        onBack={() => setScreen("startMatch")}
        onStartNewMatch={handleStartNewMatch}
      />
    );
  }

  if (screen === "matchPreview" && match) {
    return (
      <MatchPreview
        match={match}
        onBackToEdit={handleStartNewMatch}
        onContinue={handleReturnToBattleBoard}
        onTrackEvent={trackEvent}
      />
    );
  }

  if (screen === "battleBoard" && match) {
    return (
      <BattleBoard
        match={match}
        voteStats={voteStats}
        voteRecord={voteRecord}
        onVoteNow={handleVoteNow}
        onBackToPreview={() => setScreen("matchPreview")}
        onRefreshVotes={() => refreshVoteCounts(match.id)}
        onStartNewMatch={handleStartNewMatch}
        onTrackEvent={trackEvent}
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
        onBackToBattle={handleReturnToBattleBoard}
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

  if (screen === "alreadyVoted" && match && voteRecord) {
    return (
      <AlreadyVotedScreen
        match={match}
        voteRecord={voteRecord}
        onViewFanCard={handleViewSavedFanCard}
        onBackToBattle={handleReturnToBattleBoard}
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
        onBackToBattle={handleReturnToBattleBoard}
        onTrackEvent={trackEvent}
      />
    );
  }

  return (
    <StartMatch
      initialMatch={match}
      onCreateMatch={handleCreateMatch}
      onOpenMyMatches={handleOpenMyMatches}
      hasSavedMatches={myMatches.length > 0}
      submitError={battleError}
      isSubmitting={isCreatingBattle}
    />
  );
}
