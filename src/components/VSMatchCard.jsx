import { CalendarDays, Clock3, Crown } from "lucide-react";

function initialFor(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "F";
}

function durationParts(duration) {
  const label = duration || "1 Hour";
  const value = label.match(/\d+/)?.[0] || "1";
  const isHour = /hour/i.test(label);
  const unit = isHour ? (value === "1" ? "HOUR" : "HOURS") : value === "1" ? "DAY" : "DAYS";

  return { value, unit, isHour };
}

function fallbackMilliseconds(duration) {
  const value = Number(duration?.match(/\d+/)?.[0] || 1);
  const safeValue = Number.isFinite(value) ? value : 1;
  return /day/i.test(duration || "") ? safeValue * 24 * 60 * 60 * 1000 : safeValue * 60 * 60 * 1000;
}

function posterCountdown(match) {
  const endTime = new Date(match.endsAt).getTime();
  const remainingMs = Number.isFinite(endTime)
    ? Math.max(0, endTime - Date.now())
    : fallbackMilliseconds(match.duration);
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return [
      { value: days, label: "D" },
      { value: hours, label: "H" },
      { value: minutes, label: "M" },
      { value: seconds, label: "S" },
    ];
  }

  return [
    { value: hours, label: "H" },
    { value: minutes, label: "M" },
    { value: seconds, label: "S" },
  ];
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
      <div className="creator-photo-wrap">
        {creator.imageUrl ? (
          <img src={creator.imageUrl} alt={`${creator.name} logo`} crossOrigin="anonymous" />
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
  const countdown = posterCountdown(match);
  const DurationIcon = duration.isHour ? Clock3 : CalendarDays;

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
        <DurationIcon aria-hidden="true" size={18} />
        <span>{duration.value} {duration.unit} BATTLE</span>
      </section>

      <CreatorPanel creator={match.creatorA} side="left" />
      <CreatorPanel creator={match.creatorB} side="right" />

      <div className="center-vs" aria-hidden="true">VS</div>

      <section className="timer-board">
        <strong>BATTLE STARTS NOW</strong>
        <span>ENDS IN</span>
        <p className={countdown.length === 3 ? "compact-time" : undefined}>
          {countdown.map((part, index) => (
            <span key={part.label}>
              <em>{String(part.value).padStart(2, "0")}</em>{part.label}
              {index < countdown.length - 1 ? " : " : ""}
            </span>
          ))}
        </p>
      </section>

      <footer className="bottom-slogan">
        <span>CAST YOUR VOTE.</span>
        <strong>FANS DECIDE THE WINNER.</strong>
      </footer>
    </article>
  );
}
