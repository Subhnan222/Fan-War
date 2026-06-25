import { Clock3, Crown, ListChecks, Swords, Zap } from "lucide-react";
import { useState } from "react";
import ImageUploadBox from "./ImageUploadBox.jsx";

const DURATIONS = [
  { label: "1 Hour", value: "1", unit: "Hour", hours: 1, icon: Clock3 },
  { label: "5 Hours", value: "5", unit: "Hours", hours: 5, icon: Clock3 },
  { label: "10 Hours", value: "10", unit: "Hours", hours: 10, icon: Clock3 },
];

const emptyForm = {
  title: "",
  creatorAName: "",
  creatorAImage: {
    previewUrl: "",
    file: null,
  },
  creatorBName: "",
  creatorBImage: {
    previewUrl: "",
    file: null,
  },
  duration: "1 Hour",
};

function formFromMatch(match) {
  if (!match) return emptyForm;

  return {
    title: match.title || "",
    creatorAName: match.creatorA?.name || "",
    creatorAImage: {
      previewUrl: match.creatorA?.imageUrl || "",
      file: null,
    },
    creatorBName: match.creatorB?.name || "",
    creatorBImage: {
      previewUrl: match.creatorB?.imageUrl || "",
      file: null,
    },
    duration: match.duration || "1 Hour",
  };
}

export default function StartMatch({
  initialMatch,
  onCreateMatch,
  onOpenMyMatches,
  hasSavedMatches = false,
  submitError = "",
  isSubmitting = false,
}) {
  const [form, setForm] = useState(() => formFromMatch(initialMatch));

  const selectedDuration = DURATIONS.find((duration) => duration.label === form.duration);
  const canCreate = Boolean(
    form.title.trim() &&
      form.creatorAName.trim() &&
      form.creatorBName.trim() &&
      selectedDuration
  );

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateCreatorImage = (field, image, label) => {
    console.log(`${label} selected file:`, image.file);
    setForm((current) => ({ ...current, [field]: image }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canCreate || !selectedDuration || isSubmitting) return;

    const createdAt = new Date();
    const endsAt = new Date(createdAt.getTime() + selectedDuration.hours * 60 * 60 * 1000);
    const match = {
      title: form.title.trim(),
      creatorA: {
        name: form.creatorAName.trim(),
        imageUrl: form.creatorAImage.previewUrl,
        imageFile: form.creatorAImage.file,
      },
      creatorB: {
        name: form.creatorBName.trim(),
        imageUrl: form.creatorBImage.previewUrl,
        imageFile: form.creatorBImage.file,
      },
      duration: form.duration,
      category: null,
      message: "Support your favorite creator. Fans decide the winner.",
      createdAt: createdAt.toISOString(),
      endsAt: endsAt.toISOString(),
    };

    await onCreateMatch(match);
  };

  return (
    <main className="fanwar-shell">
      <div className="cinema-grid" aria-hidden="true" />
      <section className="start-match-layout" aria-label="Start a Fan War match">
        <header className="fanwar-header">
          <Crown className="brand-crown" aria-hidden="true" size={34} />
          <p className="brand-mark">
            <span>FAN</span> <strong>WAR</strong>
          </p>
          <p className="brand-tagline">Creators compete. Fans decide.</p>
          {hasSavedMatches ? (
            <button className="my-matches-entry" type="button" onClick={onOpenMyMatches}>
              <ListChecks aria-hidden="true" size={18} />
              My Matches
            </button>
          ) : null}
        </header>

        <form className="match-form" onSubmit={handleSubmit}>
          <div className="hero-panel full-span">
            <div className="hero-copy">
              <h1>Start Match</h1>
              <p>Two sides. One winner.</p>
            </div>
            <div className="title-divider" aria-hidden="true" />
          </div>

          <label className="form-field title-field full-span">
            <span>1. Match title</span>
            <input
              type="text"
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Abbas vs Sajad"
            />
          </label>

          <section className="creator-card creator-a-card">
            <label className="form-field">
              <span>2. Side A name</span>
              <input
                type="text"
                value={form.creatorAName}
                onChange={(event) => updateField("creatorAName", event.target.value)}
                placeholder="Creator A name"
              />
            </label>
            <ImageUploadBox
              id="creator-a-image"
              label="3. Side A photo"
              imageUrl={form.creatorAImage.previewUrl}
              onImageChange={(image) => updateCreatorImage("creatorAImage", image, "Creator A")}
            />
          </section>

          <section className="creator-card creator-b-card">
            <label className="form-field">
              <span>4. Side B name</span>
              <input
                type="text"
                value={form.creatorBName}
                onChange={(event) => updateField("creatorBName", event.target.value)}
                placeholder="Creator B name"
              />
            </label>
            <ImageUploadBox
              id="creator-b-image"
              label="5. Side B photo"
              imageUrl={form.creatorBImage.previewUrl}
              onImageChange={(image) => updateCreatorImage("creatorBImage", image, "Creator B")}
            />
          </section>

          <section className="choice-section duration-section full-span">
            <div className="section-label">
              <span>6. Time</span>
            </div>
            <div className="duration-grid">
              {DURATIONS.map((duration) => (
                <button
                  key={duration.label}
                  className={`choice-card ${form.duration === duration.label ? "selected" : ""}`}
                  type="button"
                  onClick={() => updateField("duration", duration.label)}
                >
                  <duration.icon aria-hidden="true" size={28} />
                  <strong>{duration.value}</strong>
                  <span>{duration.unit}</span>
                </button>
              ))}
            </div>
          </section>

          <div className="cta-zone full-span">
            <button className="create-match-button" type="submit" disabled={!canCreate || isSubmitting}>
              <Swords aria-hidden="true" size={26} />
              <span>{isSubmitting ? "Creating your match..." : "CREATE MATCH"}</span>
              <Zap aria-hidden="true" size={30} />
            </button>
            {submitError ? (
              <p className="form-error-message" role="alert">
                {submitError}
              </p>
            ) : null}
            {isSubmitting ? <p>Uploading images and preparing your Fan War</p> : null}
          </div>
        </form>
      </section>
    </main>
  );
}
