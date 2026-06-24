import html2canvas from "html2canvas";
import { ArrowLeft, Copy, Download, Flag } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import VSMatchCard from "./VSMatchCard.jsx";

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function createBattleLink(match) {
  const battleSlug = match.slug || `${slugify(match.creatorA.name)}-vs-${slugify(match.creatorB.name)}`;
  return `${window.location.origin}/?battle=${battleSlug}`;
}

function createDownloadName(match) {
  return `fan-war-${slugify(match.creatorA.name)}-vs-${slugify(match.creatorB.name)}.png`;
}

async function waitForImages(element) {
  const images = Array.from(element.querySelectorAll("img"));
  await Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();

      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    }),
  );
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Could not create poster image."));
      }
    }, "image/png");
  });
}

export default function MatchPreview({ match, onBackToEdit, onContinue, onTrackEvent }) {
  const cardRef = useRef(null);
  const [copyStatus, setCopyStatus] = useState("");
  const [downloadStatus, setDownloadStatus] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [posterImageUrl, setPosterImageUrl] = useState("");
  const battleLink = useMemo(() => match.battleLink || createBattleLink(match), [match]);

  useEffect(() => {
    return () => {
      if (posterImageUrl) {
        URL.revokeObjectURL(posterImageUrl);
      }
    };
  }, [posterImageUrl]);

  const handleDownload = async () => {
    const cardElement = cardRef.current;
    if (!cardElement || isDownloading) return;

    setIsDownloading(true);
    setDownloadStatus("Preparing poster...");

    if (posterImageUrl) {
      URL.revokeObjectURL(posterImageUrl);
      setPosterImageUrl("");
    }

    try {
      await waitForImages(cardElement);

      const canvas = await html2canvas(cardElement, {
        scale: Math.min(2, window.devicePixelRatio || 2),
        backgroundColor: null,
        useCORS: true,
        allowTaint: false,
        logging: false,
        imageTimeout: 15000,
        scrollX: 0,
        scrollY: -window.scrollY,
        onclone: (documentClone) => {
          const clonedCard = documentClone.querySelector(".vs-card");
          if (clonedCard) {
            clonedCard.style.transform = "none";
          }
        },
      });

      const blob = await canvasToBlob(canvas);
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = createDownloadName(match);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setPosterImageUrl(blobUrl);
      setDownloadStatus("Poster ready. If download does not start, open the image and long-press to save.");
    } catch (error) {
      console.error("Could not download VS card", error);
      setDownloadStatus("Could not download poster. Try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOpenPosterImage = () => {
    if (!posterImageUrl) return;
    window.open(posterImageUrl, "_blank", "noopener,noreferrer");
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

      setCopyStatus("Voting link copied");
      onTrackEvent?.("copy_link_clicked", { battleId: match.id });
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
          <h2>Your VS Poster</h2>
          <VSMatchCard match={match} cardRef={cardRef} />
        </div>

        <aside className="preview-control-panel">
          <div className="preview-control-copy">
            <span className="eyebrow">Match Created</span>
            <h1>Match Created</h1>
            <p>Your Fan War is live.</p>
          </div>

          <div className="preview-actions">
            <button className="preview-action primary open-board-action" type="button" onClick={onContinue}>
              <Flag aria-hidden="true" size={24} />
              Open Live Match
            </button>
            <div className="preview-secondary-actions">
              <button className="preview-action secondary" type="button" onClick={handleDownload} disabled={isDownloading}>
                <Download aria-hidden="true" size={20} />
                {isDownloading ? "Preparing poster..." : "Download Poster"}
              </button>
              <button className="preview-action secondary" type="button" onClick={handleCopyLink}>
                <Copy aria-hidden="true" size={20} />
                Copy Voting Link
              </button>
            </div>
            <button className="preview-action ghost" type="button" onClick={onBackToEdit}>
              <ArrowLeft aria-hidden="true" size={20} />
              Edit Match
            </button>
          </div>

          <section className="preview-next-steps" aria-label="What to do next">
            <strong>Your match is ready.</strong>
            <ol>
              <li><span>1</span> Download poster</li>
              <li><span>2</span> Share with fans</li>
              <li><span>3</span> Open live match</li>
            </ol>
          </section>

          <dl className="match-summary preview-summary">
            <div>
              <dt>Battle title</dt>
              <dd>{match.title}</dd>
            </div>
            <div>
              <dt>Duration</dt>
              <dd>{match.duration}</dd>
            </div>
          </dl>

          <div className="preview-status-row" aria-live="polite">
            {copyStatus && <span>{copyStatus}</span>}
            {downloadStatus && <span>{downloadStatus}</span>}
            {posterImageUrl ? (
              <button className="download-fallback-action" type="button" onClick={handleOpenPosterImage}>
                Open image to save
              </button>
            ) : null}
          </div>
        </aside>
      </section>
    </main>
  );
}
