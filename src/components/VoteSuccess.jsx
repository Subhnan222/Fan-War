import html2canvas from "html2canvas";
import { Copy, Download, MessageCircle } from "lucide-react";
import { useRef, useState } from "react";

function initialFor(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "F";
}

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function createDownloadName(fan, selectedSide) {
  return `fan-war-i-voted-${slugify(fan.name)}-team-${slugify(selectedSide.name)}.png`;
}

function FanVotedCard({ match, selectedSide, fan, cardRef }) {
  return (
    <article className={`fan-voted-card ${selectedSide.color}`} ref={cardRef} aria-label="Fan War I voted card">
      <div className="fan-voted-bg" aria-hidden="true" />
      <header className="fan-voted-header">
        <h2>
          FAN <strong>WAR</strong>
        </h2>
        <p>I VOTED FOR</p>
      </header>

      <section className="fan-voted-team">
        <div className="fan-voted-team-avatar">
          {selectedSide.imageUrl ? (
            <img src={selectedSide.imageUrl} alt={`${selectedSide.name} logo`} crossOrigin="anonymous" />
          ) : (
            <span>{initialFor(selectedSide.name)}</span>
          )}
        </div>
        <h3>{selectedSide.name}</h3>
      </section>

      <section className="fan-voted-fan">
        <div className="fan-voted-fan-avatar">
          {fan.photoUrl ? <img src={fan.photoUrl} alt={`${fan.name} fan`} /> : <span>{initialFor(fan.name)}</span>}
        </div>
        <dl>
          <div>
            <dt>Fan</dt>
            <dd>{fan.name}</dd>
          </div>
          <div>
            <dt>Team</dt>
            <dd>{selectedSide.name}</dd>
          </div>
          <div>
            <dt>Battle</dt>
            <dd>
              {match.creatorA.name} vs {match.creatorB.name}
            </dd>
          </div>
          <div>
            <dt>Vote Power</dt>
            <dd>+1</dd>
          </div>
        </dl>
      </section>

      <footer>Join the Fan War</footer>
    </article>
  );
}

export default function VoteSuccess({ match, selectedSide, fan, battleLink, onBackToBattle }) {
  const cardRef = useRef(null);
  const [status, setStatus] = useState("");

  const copyBattleLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(battleLink);
        return true;
      }
    } catch {
      // Fall through to the textarea fallback below.
    }

    const textarea = document.createElement("textarea");
    textarea.value = battleLink;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    return true;
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setStatus("Preparing fan card...");

    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      });

      const link = document.createElement("a");
      link.download = createDownloadName(fan, selectedSide);
      link.href = canvas.toDataURL("image/png");
      link.click();
      setStatus("Download ready");
    } catch (error) {
      console.error("Could not download fan card", error);
      setStatus("Download failed");
    }
  };

  const handleCopyLink = async () => {
    try {
      const copied = await copyBattleLink();
      setStatus(copied ? "Voting link copied" : "Copy unavailable");
      window.setTimeout(() => setStatus(""), 2200);
    } catch (error) {
      console.error("Could not copy battle link", error);
      setStatus("Copy failed");
    }
  };

  const handleWhatsAppShare = () => {
    const message = `${fan.name} voted for Team ${selectedSide.name} in Fan War. Vote here: ${battleLink}`;
    const shareUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <main className="fanwar-shell vote-success-shell">
      <div className="cinema-grid" aria-hidden="true" />
      <section className="vote-success-layout" aria-label="Vote success and fan card">
        <div className="fan-card-stage">
          <FanVotedCard match={match} selectedSide={selectedSide} fan={fan} cardRef={cardRef} />
        </div>

        <aside className={`vote-success-panel ${selectedSide.color}`}>
          <span className="vote-success-badge">Vote counted</span>
          <h1>VOTE COUNTED</h1>
          <p>
            {fan.name} voted for Team <strong>{selectedSide.name}</strong>
          </p>

          <div className="vote-success-actions">
            <button className="preview-action primary" type="button" onClick={handleDownload}>
              <Download aria-hidden="true" size={20} />
              Download Fan Card
            </button>
            <button className="preview-action secondary" type="button" onClick={handleWhatsAppShare}>
              <MessageCircle aria-hidden="true" size={20} />
              Share WhatsApp
            </button>
            <button className="preview-action secondary" type="button" onClick={handleCopyLink}>
              <Copy aria-hidden="true" size={20} />
              Copy Voting Link
            </button>
            <button className="preview-action ghost" type="button" onClick={onBackToBattle}>
              Back to Live Match
            </button>
          </div>

          <div className="preview-status-row" aria-live="polite">
            {status && <span>{status}</span>}
          </div>
        </aside>
      </section>
    </main>
  );
}
