import { Crown, Trophy, UsersRound } from "lucide-react";

function initialFor(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "F";
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

function WinnerImage({ creator, resultType }) {
  return (
    <div className={`winner-card-avatar ${resultType}`}>
      {creator.imageUrl ? (
        <img src={creator.imageUrl} alt={`${creator.name} logo`} crossOrigin="anonymous" />
      ) : (
        <span>{initialFor(creator.name)}</span>
      )}
    </div>
  );
}

export default function WinnerCard({ match, result, cardRef }) {
  const isTie = result.resultType === "tie";

  return (
    <article className={`winner-card ${result.resultType}`} ref={cardRef} aria-label="Fan War final result card">
      <div className="winner-card-bg" aria-hidden="true" />
      <div className="winner-card-bursts" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>

      <header className="winner-card-header">
        <Crown aria-hidden="true" size={28} />
        <h2>
          FAN <strong>WAR</strong>
        </h2>
        <p>FINAL RESULT</p>
      </header>

      <section className="winner-card-headline">
        <Trophy aria-hidden="true" size={32} />
        <h3>{isTie ? "BATTLE TIED" : `${result.winnerName} WINS`}</h3>
      </section>

      {isTie ? (
        <section className="winner-card-tie-creators">
          <WinnerImage creator={match.creatorA} resultType="red" />
          <strong>VS</strong>
          <WinnerImage creator={match.creatorB} resultType="gold" />
        </section>
      ) : (
        <section className="winner-card-winner">
          <WinnerImage creator={result.winnerCreator} resultType={result.resultType} />
          <strong>{result.winnerName}</strong>
        </section>
      )}

      <section className="winner-card-score">
        <p>
          {match.creatorA.name} <strong>{formatNumber(result.creatorAVotes)}</strong>
        </p>
        <span>-</span>
        <p>
          <strong>{formatNumber(result.creatorBVotes)}</strong> {match.creatorB.name}
        </p>
      </section>

      <dl className="winner-card-details">
        <div>
          <dt>Battle</dt>
          <dd>
            {match.creatorA.name} VS {match.creatorB.name}
          </dd>
        </div>
        <div>
          <dt>Total Fans Voted</dt>
          <dd>
            <UsersRound aria-hidden="true" size={16} />
            {formatNumber(result.totalVotes)}
          </dd>
        </div>
        <div>
          <dt>Battle Duration</dt>
          <dd>{match.duration}</dd>
        </div>
      </dl>

      <footer>
        <span>Fans decided the winner.</span>
        <strong>Create your own Fan War.</strong>
      </footer>
    </article>
  );
}
