import { Crown, Vote } from "lucide-react";

function initialFor(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "F";
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function VoteCreatorCard({ option, onVote }) {
  return (
    <button className={`vote-side-card ${option.color}`} type="button" onClick={() => onVote(option)}>
      <span className="vote-side-avatar">
        {option.imageUrl ? <img src={option.imageUrl} alt={`${option.name} logo`} /> : <span>{initialFor(option.name)}</span>}
      </span>
      <span className="vote-side-copy">
        <strong>{option.name}</strong>
        <em>Team {option.name}</em>
      </span>
      <span className="vote-side-stats">
        <span>
          <b>{formatNumber(option.votes)}</b>
          votes
        </span>
        <span>
          <b>{option.percent}%</b>
          vote share
        </span>
      </span>
      <span className="vote-side-cta">
        <Vote aria-hidden="true" size={18} />
        Vote {option.name}
      </span>
    </button>
  );
}

export default function VoteSide({ match, voteStats, onVoteSide, onBackToBattle }) {
  const sideA = {
    id: "creator-a",
    side: "A",
    color: "red",
    name: match.creatorA.name,
    imageUrl: match.creatorA.imageUrl,
    votes: voteStats.creatorAVotes,
    percent: voteStats.creatorAPercent,
  };
  const sideB = {
    id: "creator-b",
    side: "B",
    color: "gold",
    name: match.creatorB.name,
    imageUrl: match.creatorB.imageUrl,
    votes: voteStats.creatorBVotes,
    percent: voteStats.creatorBPercent,
  };

  return (
    <main className="fanwar-shell vote-side-shell">
      <div className="cinema-grid" aria-hidden="true" />
      <section className="vote-side-arena" aria-label="Vote for your Fan War side">
        <div className="vote-side-energy" aria-hidden="true" />
        <header className="vote-side-header">
          <Crown className="battle-crown" aria-hidden="true" size={28} />
          <p className="brand-mark">
            <span>FAN</span> <strong>WAR</strong>
          </p>
          <div className="vote-side-badge">Cast your vote</div>
          <h1>Who gets your vote?</h1>
          <p>Pick your side. Your vote counts instantly.</p>
        </header>

        <section className="vote-side-matchup" aria-label="Vote options">
          <VoteCreatorCard option={sideA} onVote={onVoteSide} />
          <div className="vote-side-vs" aria-hidden="true">VS</div>
          <VoteCreatorCard option={sideB} onVote={onVoteSide} />
        </section>

        <button className="vote-side-back" type="button" onClick={onBackToBattle}>
          Back to Battle Board
        </button>
      </section>
    </main>
  );
}
