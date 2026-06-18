import html2canvas from "html2canvas";
import { ArrowLeft, Copy, Download, Swords } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import VSMatchCard from "./VSMatchCard.jsx";

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function createBattleLink(match) {
  const battleSlug = `${slugify(match.creatorA.name)}-vs-${slugify(match.creatorB.name)}`;
  return `${window.location.origin}/battle/${battleSlug}`;
}

function createDownloadName(match) {
  return `fan-war-${slugify(match.creatorA.name)}-vs-${slugify(match.creatorB.name)}.png`;
}

export default function MatchPreview({ match, onBackToEdit, onContinue }) {
  const cardRef = useRef(null);
  const [copyStatus, setCopyStatus] = useState("");
  const [downloadStatus, setDownloadStatus] = useState("");
  const battleLink = useMemo(() => createBattleLink(match), [match]);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloadStatus("Preparing card...");

    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      });

      const link = document.createElement("a");
      link.download = createDownloadName(match);
      link.href = canvas.toDataURL("image/png");
      link.click();
      setDownloadStatus("Download ready");
    } catch (error) {
      console.error("Could not download VS card", error);
      setDownloadStatus("Download failed");
    }
  };

  const handleCopyLink = async () => {
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

      setCopyStatus("Link copied");
      window.setTimeout(() => setCopyStatus(""), 2200);
    } catch (error) {
      console.error("Could not copy battle link", error);
      setCopyStatus("Copy failed");
    }
  };

  return (
    <main className="fanwar-shell match-preview-shell">
      <div className="cinema-grid" aria-hidden="true" />
      <section className="match-preview-layout" aria-label="Generated VS match card preview">
        <div className="preview-card-stage">
          <VSMatchCard match={match} cardRef={cardRef} />
        </div>

        <aside className="preview-control-panel">
          <div className="preview-control-copy">
            <span className="eyebrow">Match Created</span>
            <h1>Match Created</h1>
            <p>Share this VS card with both fan communities.</p>
          </div>

          <dl className="match-summary preview-summary">
            <div>
              <dt>Battle title</dt>
              <dd>{match.title}</dd>
            </div>
            <div>
              <dt>Duration</dt>
              <dd>{match.duration}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{match.category}</dd>
            </div>
          </dl>

          <div className="preview-link-box">
            <span>Battle link</span>
            <strong>{battleLink}</strong>
          </div>

          <div className="preview-actions">
            <button className="preview-action primary" type="button" onClick={handleDownload}>
              <Download aria-hidden="true" size={20} />
              Download VS Card
            </button>
            <button className="preview-action secondary" type="button" onClick={handleCopyLink}>
              <Copy aria-hidden="true" size={20} />
              Copy Battle Link
            </button>
            <button className="preview-action accent" type="button" onClick={onContinue}>
              <Swords aria-hidden="true" size={20} />
              Continue to Battle Board
            </button>
            <button className="preview-action ghost" type="button" onClick={onBackToEdit}>
              <ArrowLeft aria-hidden="true" size={20} />
              Back to Edit
            </button>
          </div>

          <div className="preview-status-row" aria-live="polite">
            {copyStatus && <span>{copyStatus}</span>}
            {downloadStatus && <span>{downloadStatus}</span>}
          </div>
        </aside>
      </section>
    </main>
  );
}
