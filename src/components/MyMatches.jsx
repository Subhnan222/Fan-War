import { ArrowLeft, Crown, Swords } from "lucide-react";

function initialFor(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "F";
}

function isLiveMatch(match) {
  const endTime = new Date(match.endsAt).getTime();
  return Number.isFinite(endTime) && Date.now() < endTime;
}

function CreatorMini({ name, imageUrl, side }) {
  return (
    <div className={`my-match-creator ${side}`}>
      <span className="my-match-avatar">
        {imageUrl ? <img src={imageUrl} alt={`${name} logo`} /> : <span>{initialFor(name)}</span>}
      </span>
      <strong>{name}</strong>
    </div>
  );
}

export default function MyMatches({ matches, onOpenMatch, onBack, onStartNewMatch }) {
  const hasMatches = matches.length > 0;

  return (
    <main className="fanwar-shell my-matches-shell">
      <div className="cinema-grid" aria-hidden="true" />
      <section className="my-matches-panel" aria-label="My Fan War matches">
        <header className="my-matches-header">
          <Crown className="battle-crown" aria-hidden="true" size={30} />
          <p className="brand-mark">
            <span>FAN</span> <strong>WAR</strong>
          </p>
          <span className="eyebrow">My Matches</span>
          <h1>My Matches</h1>
          <p>Open matches created on this device.</p>
        </header>

        {hasMatches ? (
          <div className="my-matches-list">
            {matches.map((match) => {
              const live = isLiveMatch(match);

              return (
                <article className="my-match-card" key={match.id || match.slug}>
                  <div className="my-match-card-top">
                    <div>
                      <span className={`my-match-status ${live ? "live" : "ended"}`}>
                        {live ? "LIVE" : "ENDED"}
                      </span>
                      <h2>{match.title || "Fan War Match"}</h2>
                    </div>
                    <Swords aria-hidden="true" size={24} />
                  </div>

                  <div className="my-match-creators">
                    <CreatorMini name={match.creatorAName} imageUrl={match.creatorAImage} side="red" />
                    <span className="my-match-vs">VS</span>
                    <CreatorMini name={match.creatorBName} imageUrl={match.creatorBImage} side="gold" />
                  </div>

                  <button className="preview-action primary open-board-action" type="button" onClick={() => onOpenMatch(match)}>
                    Open Live Match
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <section className="my-matches-empty">
            <h2>No matches created on this device yet.</h2>
            <button className="preview-action primary open-board-action" type="button" onClick={onStartNewMatch}>
              Start New Match
            </button>
          </section>
        )}

        <button className="preview-action ghost my-matches-back" type="button" onClick={onBack}>
          <ArrowLeft aria-hidden="true" size={20} />
          Back
        </button>
      </section>
    </main>
  );
}
