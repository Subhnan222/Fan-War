import {
  CalendarDays,
  Clock3,
  Crown,
  Swords,
  Zap,
} from "lucide-react";
import { useState } from "react";
import ImageUploadBox from "./ImageUploadBox.jsx";

const DURATIONS = [
  { label: "24 Hours", value: "24", unit: "Hours", hours: 24, icon: Clock3 },
  { label: "3 Days", value: "3", unit: "Days", hours: 72, icon: CalendarDays },
  { label: "5 Days", value: "5", unit: "Days", hours: 120, icon: CalendarDays },
  { label: "7 Days", value: "7", unit: "Days", hours: 168, icon: CalendarDays },
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
  duration: "5 Days",
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
    duration: match.duration || "5 Days",
  };
}

export default function StartMatch({ initialMatch, onCreateMatch, submitError = "", isSubmitting = false }) {
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
        </header>

        <form className="match-form" onSubmit={handleSubmit}>
          <div className="hero-panel full-span">
            <div className="hero-copy">
              <h1>
                Start a <span>Fan War</span> Match
              </h1>
              <p>Create a VS battle card and let fans vote for their favorite.</p>
            </div>
            <div className="title-divider" aria-hidden="true" />
          </div>

          <label className="form-field title-field full-span">
            <span>1. Battle title</span>
            <input
              type="text"
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Abbas vs Sajad"
            />
          </label>

          <section className="creator-card creator-a-card">
            <label className="form-field">
              <span>2. Creator A name</span>
              <input
                type="text"
                value={form.creatorAName}
                onChange={(event) => updateField("creatorAName", event.target.value)}
                placeholder="Creator A name"
              />
            </label>
            <ImageUploadBox
              id="creator-a-image"
              label="3. Creator A image / logo"
              imageUrl={form.creatorAImage.previewUrl}
              onImageChange={(image) => updateCreatorImage("creatorAImage", image, "Creator A")}
            />
          </section>

          <section className="creator-card creator-b-card">
            <label className="form-field">
              <span>4. Creator B name</span>
              <input
                type="text"
                value={form.creatorBName}
                onChange={(event) => updateField("creatorBName", event.target.value)}
                placeholder="Creator B name"
              />
            </label>
            <ImageUploadBox
              id="creator-b-image"
              label="5. Creator B image / logo"
              imageUrl={form.creatorBImage.previewUrl}
              onImageChange={(image) => updateCreatorImage("creatorBImage", image, "Creator B")}
            />
          </section>

          <section className="choice-section duration-section full-span">
            <div className="section-label">
              <span>6. Battle duration</span>
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
            <p>{isSubmitting ? "Uploading images and preparing your Fan War" : "You can edit this match before sharing."}</p>
          </div>
        </form>
      </section>
    </main>
  );
}
