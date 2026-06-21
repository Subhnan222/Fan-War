import { Crown, Flame, Timer, Trophy, UsersRound, Vote, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function initialFor(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "F";
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
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

function CreatorBattleCard({ creator, side, votes, percent }) {
  return (
    <section className={`battle-creator-card ${side}`}>
      <div className="battle-panel-frame">
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
  statusMessage = "",
}) {
  const [remaining, setRemaining] = useState(() => getRemaining(match.endsAt));

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
    const winner = isTie ? "Tie" : creatorAVotes > creatorBVotes ? match.creatorA.name : match.creatorB.name;
    const leader = isTie ? "Battle is tied" : creatorAVotes > creatorBVotes ? `${match.creatorA.name} is leading` : `${match.creatorB.name} is leading`;

    return {
      creatorAVotes,
      creatorBVotes,
      creatorAPercent,
      creatorBPercent,
      totalVotes,
      leader,
      winner,
    };
  }, [match, voteStats]);

  const countdown = formatCountdown(remaining);
  const battleEnded = remaining <= 0;
  const battleTitle = formatBattleTitle(match.title);

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
          />

          <div className="battle-vs-core" aria-hidden="true">
            <div className="battle-lightning-slash" />
            <span>VS</span>
          </div>

          <CreatorBattleCard
            creator={match.creatorB}
            side="gold"
            votes={stats.creatorBVotes}
            percent={stats.creatorBPercent}
          />
        </section>

        <section className="support-meter-panel" aria-label="Vote percentage meter">
          <p>Current votes</p>
          <div className="meter-label-row">
            <span>{match.creatorA.name} {stats.creatorAPercent}%</span>
            <Zap aria-hidden="true" size={20} />
            <span>{match.creatorB.name} {stats.creatorBPercent}%</span>
          </div>
          <div className="battle-support-meter">
            <div className="support-fill-red" style={{ width: `${stats.creatorAPercent}%` }} />
            <div className="support-fill-gold" style={{ width: `${stats.creatorBPercent}%` }} />
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
          <div>
            <Trophy aria-hidden="true" size={20} />
            <span>{battleEnded ? "Winner" : "Leading"}</span>
            <strong>{battleEnded ? stats.winner : stats.leader}</strong>
          </div>
        </section>

        <div className="battle-actions">
          {statusMessage ? (
            <p className="form-error-message" role="alert">
              {statusMessage}
            </p>
          ) : null}
          {voteRecord ? (
            <p className="already-voted-message">You already voted for Team {voteRecord.name}</p>
          ) : null}
          <button className="support-favorite-button" type="button" onClick={onVoteNow} disabled={battleEnded}>
            <Vote aria-hidden="true" size={25} />
            {voteRecord ? "VIEW FAN CARD" : "VOTE NOW"}
          </button>
          <p>
            Choose a side. <strong>Cast your vote.</strong> Share your card.
          </p>
          <button className="battle-back-button" type="button" onClick={onBackToPreview}>
            Back to VS Card
          </button>
        </div>
      </section>
    </main>
  );
}
