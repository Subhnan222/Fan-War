import html2canvas from "html2canvas";
import { Copy, Crown, Download, Flame, MessageCircle, Swords, Timer, Trophy, UsersRound, Vote, X, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import WinnerCard from "./WinnerCard.jsx";

function initialFor(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "F";
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function slugify(value) {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatBattleTitle(title) {
  const normalizedTitle = title?.trim()?.replace(/\s+/g, " ") || "Fan Battle";
  const upperTitle = normalizedTitle.toUpperCase();

  if (upperTitle.includes("FAN BATTLE")) return upperTitle;

  const cleanedShortTitle = upperTitle.replace(/\bGAME\b/g, "").replace(/\s+/g, " ").trim();
  if (cleanedShortTitle && !cleanedShortTitle.includes("BATTLE")) {
    return `${cleanedShortTitle} FAN BATTLE`;
  }

  return upperTitle;
}

function getRemaining(endsAt) {
  const endTime = new Date(endsAt).getTime();
  if (!Number.isFinite(endTime)) return 0;
  return Math.max(0, endTime - Date.now());
}

function formatCountdown(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
}

function CreatorBattleCard({ creator, side, votes, percent, isLeader, isTie, stateLabel = "LEADING" }) {
  const stateClass = isLeader ? "leader-card" : isTie ? "tie-card" : "";

  return (
    <section className={`battle-creator-card ${side} ${stateClass}`}>
      {isLeader || isTie ? (
        <div className={`leader-state-badge ${isTie ? "tie" : ""}`}>
          {isTie ? <Swords aria-hidden="true" size={15} /> : <Crown aria-hidden="true" size={15} />}
          {isTie ? "TIE" : stateLabel}
        </div>
      ) : null}
      {isLeader ? (
        <div className="leader-sparks" aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => (
            <span key={index} />
          ))}
        </div>
      ) : null}
      <div className="battle-panel-frame">
        {isLeader ? <Crown className="creator-crown" aria-hidden="true" size={30} /> : null}
        <div className="battle-avatar">
          {creator.imageUrl ? (
            <img src={creator.imageUrl} alt={`${creator.name} logo`} />
          ) : (
            <span>{initialFor(creator.name)}</span>
          )}
        </div>
      </div>
      <div className="creator-copy">
        <strong>{creator.name}</strong>
        <span className="team-label">Team {creator.name}</span>
        <p>{formatNumber(votes)} votes</p>
      </div>
      <div className="creator-percent">{percent}% votes</div>
      {isLeader ? <p className="winning-now">{stateLabel === "WINNER" ? "Final winner" : "Winning now"}</p> : null}
    </section>
  );
}

export default function BattleBoard({
  match,
  voteStats,
  voteRecord,
  onVoteNow,
  onBackToPreview,
  onRefreshVotes,
  onStartNewMatch,
  onTrackEvent,
  statusMessage = "",
}) {
  const [remaining, setRemaining] = useState(() => getRemaining(match.endsAt));
  const [showWinnerCard, setShowWinnerCard] = useState(false);
  const [winnerStatus, setWinnerStatus] = useState("");
  const winnerCardRef = useRef(null);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setRemaining(getRemaining(match.endsAt));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [match.endsAt]);

  useEffect(() => {
    if (!onRefreshVotes) return undefined;

    const intervalId = window.setInterval(() => {
      onRefreshVotes().catch(() => {});
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [onRefreshVotes]);

  const stats = useMemo(() => {
    const creatorAVotes = voteStats?.creatorAVotes ?? 0;
    const creatorBVotes = voteStats?.creatorBVotes ?? 0;
    const totalVotes = creatorAVotes + creatorBVotes;
    const creatorAPercent = voteStats?.creatorAPercent ?? (totalVotes > 0 ? Math.round((creatorAVotes / totalVotes) * 100) : 50);
    const creatorBPercent = voteStats?.creatorBPercent ?? (totalVotes > 0 ? 100 - creatorAPercent : 50);
    const isTie = creatorAVotes === creatorBVotes;
    const leaderSide = isTie ? "tie" : creatorAVotes > creatorBVotes ? "A" : "B";
    const winnerCreator = leaderSide === "A" ? match.creatorA : leaderSide === "B" ? match.creatorB : null;
    const winner = winnerCreator?.name || "Tie";
    const leaderLine = isTie ? "Battle is tied" : `${winner} is leading`;
    const margin = Math.abs(creatorAVotes - creatorBVotes);

    return {
      creatorAVotes,
      creatorBVotes,
      creatorAPercent,
      creatorBPercent,
      totalVotes,
      leaderLine,
      leaderSide,
      isTie,
      margin,
      resultType: isTie ? "tie" : leaderSide === "A" ? "red" : "gold",
      winner,
      winnerCreator,
      winnerName: winner,
    };
  }, [match, voteStats]);

  const countdown = formatCountdown(remaining);
  const battleEnded = remaining <= 0;
  const battleTitle = formatBattleTitle(match.title);
  const votedCreatorName = voteRecord?.selectedCreatorName || voteRecord?.name || "";
  const battleLink = match.battleLink || `${window.location.origin}/?battle=${match.slug}`;
  const resultMessage = stats.isTie ? "BATTLE ENDED IN A TIE" : `${stats.winnerName} WINS`;
  const winnerResult = {
    resultType: stats.resultType,
    winnerName: stats.winnerName,
    winnerCreator: stats.winnerCreator,
    creatorAVotes: stats.creatorAVotes,
    creatorBVotes: stats.creatorBVotes,
    totalVotes: stats.totalVotes,
    margin: stats.margin,
  };

  const copyBattleLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(battleLink);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = battleLink;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setWinnerStatus("Voting link copied");
      onTrackEvent?.("copy_link_clicked", { battleId: match.id });
      window.setTimeout(() => setWinnerStatus(""), 2200);
    } catch (error) {
      console.error("Could not copy battle link", error);
      setWinnerStatus("Copy failed");
    }
  };

  const handleDownloadWinnerCard = async () => {
    if (!winnerCardRef.current) return;
    setWinnerStatus("Preparing winner card...");
    onTrackEvent?.("winner_card_downloaded", { battleId: match.id });

    try {
      const canvas = await html2canvas(winnerCardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      });

      const link = document.createElement("a");
      link.download = `fan-war-winner-${slugify(stats.isTie ? "tie" : stats.winnerName)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      setWinnerStatus("Download ready");
    } catch (error) {
      console.error("Could not download winner card", error);
      setWinnerStatus("Download failed");
    }
  };

  const handleShareWinner = () => {
    onTrackEvent?.("whatsapp_share_clicked", { battleId: match.id });
    const message = stats.isTie
      ? `Fan War ended in a tie!\nFinal votes: ${formatNumber(stats.creatorAVotes)} vs ${formatNumber(stats.creatorBVotes)}\n${battleLink}`
      : `${stats.winnerName} won the Fan War!\nFinal votes: ${formatNumber(stats.creatorAVotes)} vs ${formatNumber(stats.creatorBVotes)}\nFans decided the winner.\n${battleLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <main className="fanwar-shell battle-board-shell">
      <div className="cinema-grid" aria-hidden="true" />
      <section className="battle-board" aria-label="Fan War battle board">
        <div className="arena-energy" aria-hidden="true" />
        <header className="battle-board-header">
          <Crown className="battle-crown" aria-hidden="true" size={30} />
          <p className="brand-mark">
            <span>FAN</span> <strong>WAR</strong>
          </p>
          <p className="battle-tagline">
            Creators compete. <strong>Fans decide.</strong>
          </p>
          <div className={`live-badge ${battleEnded ? "ended" : ""}`}>
            <Flame aria-hidden="true" size={16} />
            {battleEnded ? "BATTLE ENDED" : "LIVE FAN BATTLE"}
          </div>
          <h1>{battleTitle}</h1>
        </header>

        <section className="battle-matchup-grid">
          <CreatorBattleCard
            creator={match.creatorA}
            side="red"
            votes={stats.creatorAVotes}
            percent={stats.creatorAPercent}
            isLeader={stats.leaderSide === "A"}
            isTie={stats.isTie}
            stateLabel={battleEnded ? "WINNER" : "LEADING"}
          />

          <div className={`battle-vs-core ${stats.isTie ? "tie" : ""}`} aria-label={stats.isTie ? "Battle is tied" : "Versus"}>
            <div className="battle-lightning-slash" />
            <span>VS</span>
            {stats.isTie ? <small>Battle is tied</small> : null}
          </div>

          <CreatorBattleCard
            creator={match.creatorB}
            side="gold"
            votes={stats.creatorBVotes}
            percent={stats.creatorBPercent}
            isLeader={stats.leaderSide === "B"}
            isTie={stats.isTie}
            stateLabel={battleEnded ? "WINNER" : "LEADING"}
          />
        </section>

        {battleEnded ? (
          <section className={`battle-final-result ${stats.resultType}`} aria-label="Final battle result">
            <span>Final Result</span>
            <h2>{resultMessage}</h2>
            <div className="final-vote-grid">
              <p>
                <strong>{match.creatorA.name}</strong>
                {formatNumber(stats.creatorAVotes)} votes
              </p>
              <p>
                <strong>{match.creatorB.name}</strong>
                {formatNumber(stats.creatorBVotes)} votes
              </p>
              <p>
                <strong>Total votes</strong>
                {formatNumber(stats.totalVotes)}
              </p>
            </div>
            <p className="final-margin">
              {stats.isTie ? "No winner yet. Equal votes." : `Won by ${formatNumber(stats.margin)} votes`}
            </p>
          </section>
        ) : null}

        <section className={`support-meter-panel leader-${stats.leaderSide.toLowerCase()}`} aria-label="Vote percentage meter">
          <p>Current votes</p>
          <div className="meter-label-row">
            <span>{match.creatorA.name} {stats.creatorAPercent}%</span>
            <Zap aria-hidden="true" size={20} />
            <span>{match.creatorB.name} {stats.creatorBPercent}%</span>
          </div>
          <div className="battle-support-meter">
            {stats.leaderSide !== "tie" ? (
              <div className={`meter-leader-marker ${stats.leaderSide === "A" ? "red" : "gold"}`}>
                <Crown aria-hidden="true" size={18} />
              </div>
            ) : null}
            <div
              className={`support-fill-red ${stats.leaderSide === "A" ? "leading" : ""}`}
              style={{ width: `${stats.creatorAPercent}%` }}
            />
            <div
              className={`support-fill-gold ${stats.leaderSide === "B" ? "leading" : ""}`}
              style={{ width: `${stats.creatorBPercent}%` }}
            />
          </div>
        </section>

        <section className={`battle-timer-board ${battleEnded ? "ended" : ""}`}>
          <Timer aria-hidden="true" size={22} />
          {battleEnded ? (
            <>
              <span>BATTLE ENDED</span>
              <strong>Winner: {stats.winner}</strong>
            </>
          ) : (
            <>
              <span>ENDS IN</span>
              <div className="countdown-grid" aria-label="Countdown">
                <strong>{String(countdown.days).padStart(2, "0")}</strong>
                <strong>{String(countdown.hours).padStart(2, "0")}</strong>
                <strong>{String(countdown.minutes).padStart(2, "0")}</strong>
                <strong>{String(countdown.seconds).padStart(2, "0")}</strong>
                <small>Days</small>
                <small>Hours</small>
                <small>Mins</small>
                <small>Secs</small>
              </div>
            </>
          )}
        </section>

        <section className="battle-stats-row">
          <div>
            <UsersRound aria-hidden="true" size={20} />
            <strong>{formatNumber(stats.totalVotes)}</strong>
            <span>fans voted</span>
          </div>
          <div className={`leader-stat ${stats.isTie ? "tie" : stats.leaderSide === "A" ? "red" : "gold"}`}>
            <Trophy aria-hidden="true" size={20} />
            <span>{battleEnded ? "Winner" : "Leading"}</span>
            <strong>{battleEnded ? resultMessage : stats.leaderLine}</strong>
          </div>
        </section>

        <div className="battle-actions">
          {statusMessage ? (
            <p className="form-error-message" role="alert">
              {statusMessage}
            </p>
          ) : null}
          {votedCreatorName ? (
            <p className="already-voted-message">You voted for Team {votedCreatorName}</p>
          ) : null}
          <button className="support-favorite-button" type="button" onClick={onVoteNow} disabled={battleEnded}>
            <Vote aria-hidden="true" size={25} />
            {battleEnded ? "VOTING CLOSED" : votedCreatorName ? "VIEW MY VOTE" : "VOTE NOW"}
          </button>
          <p>
            Choose a side. <strong>Cast your vote.</strong> Share your card.
          </p>
          <button className="battle-back-button" type="button" onClick={onBackToPreview}>
            Back to VS Card
          </button>
        </div>

        {battleEnded ? (
          <section className="winner-actions" aria-label="Winner card actions">
            <button className="preview-action primary open-board-action" type="button" onClick={() => setShowWinnerCard(true)}>
              <Trophy aria-hidden="true" size={22} />
              View Winner Card
            </button>
            <div className="preview-secondary-actions">
              <button className="preview-action secondary" type="button" onClick={handleDownloadWinnerCard}>
                <Download aria-hidden="true" size={20} />
                Download Winner Card
              </button>
              <button className="preview-action secondary" type="button" onClick={handleShareWinner}>
                <MessageCircle aria-hidden="true" size={20} />
                Share Result WhatsApp
              </button>
            </div>
            <div className="preview-secondary-actions">
              <button className="preview-action ghost" type="button" onClick={copyBattleLink}>
                <Copy aria-hidden="true" size={20} />
                Copy Voting Link
              </button>
              <button className="preview-action ghost" type="button" onClick={onStartNewMatch}>
                Start New Match
              </button>
            </div>
            <div className="preview-status-row" aria-live="polite">
              {winnerStatus && <span>{winnerStatus}</span>}
            </div>
          </section>
        ) : null}

        {battleEnded ? (
          <div className="winner-card-capture" aria-hidden="true">
            <WinnerCard match={match} result={winnerResult} cardRef={winnerCardRef} />
          </div>
        ) : null}

        {showWinnerCard ? (
          <div className="winner-modal" role="dialog" aria-modal="true" aria-label="Winner card preview">
            <button className="winner-modal-backdrop" type="button" onClick={() => setShowWinnerCard(false)} aria-label="Close winner card preview" />
            <section className="winner-modal-panel">
              <button className="winner-modal-close" type="button" onClick={() => setShowWinnerCard(false)} aria-label="Close winner card">
                <X aria-hidden="true" size={20} />
              </button>
              <WinnerCard match={match} result={winnerResult} />
              <div className="winner-modal-actions">
                <button className="preview-action primary" type="button" onClick={handleDownloadWinnerCard}>
                  <Download aria-hidden="true" size={20} />
                  Download Winner Card
                </button>
                <button className="preview-action secondary" type="button" onClick={handleShareWinner}>
                  <MessageCircle aria-hidden="true" size={20} />
                  Share Result
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
}
