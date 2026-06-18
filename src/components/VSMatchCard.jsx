import { CalendarDays, Crown } from "lucide-react";

function initialFor(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "F";
}

function durationParts(duration) {
  if (duration === "24 Hours") return { value: "24", unit: "HOURS" };
  return { value: duration?.match(/\d+/)?.[0] || "5", unit: "DAYS" };
}

function displayTitle(title) {
  const cleaned = title?.trim() || "Fan Battle";
  const lower = cleaned.toLowerCase();

  if (lower === "tiktok" || lower === "tiktok game" || lower === "tik tok game") {
    return "TIKTOK FAN BATTLE";
  }

  if (lower === "food") return "FOOD FAN BATTLE";
  if (lower.endsWith(" game")) return `${cleaned.slice(0, -5)} Fan Battle`.toUpperCase();
  return cleaned.toUpperCase();
}

function CreatorPanel({ creator, side }) {
  return (
    <section className={`creator-panel ${side}`}>
      <div className="creator-avatar">
        {creator.imageUrl ? (
          <img src={creator.imageUrl} alt={`${creator.name} logo`} />
        ) : (
          <span>{initialFor(creator.name)}</span>
        )}
      </div>
      <strong>{creator.name}</strong>
      <em>TEAM {creator.name}</em>
    </section>
  );
}

export default function VSMatchCard({ match, cardRef }) {
  const duration = durationParts(match.duration);

  return (
    <article className="vs-card design-one" ref={cardRef} aria-label="Fan War VS match card">
      <div className="vs-bg" aria-hidden="true" />

      <header className="fanwar-header-card">
        <Crown aria-hidden="true" size={30} />
        <h2><span>FAN</span> <strong>WAR</strong></h2>
        <p>CREATORS COMPETE. <strong>FANS DECIDE.</strong></p>
      </header>

      <section className="battle-title">
        <h3>{displayTitle(match.title)}</h3>
      </section>

      <section className="duration-badge">
        <CalendarDays aria-hidden="true" size={18} />
        <span>{duration.value} {duration.unit} BATTLE</span>
      </section>

      <CreatorPanel creator={match.creatorA} side="left" />
      <CreatorPanel creator={match.creatorB} side="right" />

      <div className="center-vs" aria-hidden="true">VS</div>

      <section className="timer-board">
        <strong>BATTLE STARTS NOW</strong>
        <span>ENDS IN</span>
        <p><em>{duration.value}</em>D : <em>12</em>H : <em>34</em>M : <em>56</em>S</p>
      </section>

      <footer className="bottom-slogan">
        <span>CAST YOUR VOTE.</span>
        <strong>FANS DECIDE THE WINNER.</strong>
      </footer>
    </article>
  );
}
