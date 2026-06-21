import {
  CalendarDays,
  CircleEllipsis,
  Clock3,
  Crown,
  GraduationCap,
  MapPin,
  Swords,
  Tag,
  Trophy,
  UserRound,
  Utensils,
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

const CATEGORIES = [
  { label: "Creator", icon: UserRound },
  { label: "Food", icon: Utensils },
  { label: "Brand", icon: Tag },
  { label: "School", icon: GraduationCap },
  { label: "Sports", icon: Trophy },
  { label: "District", icon: MapPin },
  { label: "Other", icon: CircleEllipsis },
];

const emptyForm = {
  title: "",
  creatorAName: "",
  creatorAImageUrl: "",
  creatorBName: "",
  creatorBImageUrl: "",
  duration: "5 Days",
  category: "",
  message: "",
};

function formFromMatch(match) {
  if (!match) return emptyForm;

  return {
    title: match.title || "",
    creatorAName: match.creatorA?.name || "",
    creatorAImageUrl: match.creatorA?.imageUrl || "",
    creatorBName: match.creatorB?.name || "",
    creatorBImageUrl: match.creatorB?.imageUrl || "",
    duration: match.duration || "5 Days",
    category: match.category || "",
    message: match.message || "",
  };
}

export default function StartMatch({ initialMatch, onCreateMatch, submitError = "", isSubmitting = false }) {
  const [form, setForm] = useState(() => formFromMatch(initialMatch));

  const selectedDuration = DURATIONS.find((duration) => duration.label === form.duration);
  const canCreate = Boolean(
    form.title.trim() &&
      form.creatorAName.trim() &&
      form.creatorBName.trim() &&
      selectedDuration &&
      form.category
  );

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
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
        imageUrl: form.creatorAImageUrl,
      },
      creatorB: {
        name: form.creatorBName.trim(),
        imageUrl: form.creatorBImageUrl,
      },
      duration: form.duration,
      category: form.category,
      message: form.message.trim() || "Vote for your favorite side. Fans decide the winner.",
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
              <p>Create a premium VS battle that both sides can share with their followers and let the fans decide the winner.</p>
            </div>
            <div className="title-divider" aria-hidden="true" />
          </div>

          <label className="form-field title-field full-span">
            <span>1. Battle title</span>
            <input
              type="text"
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Food Fan Battle"
            />
          </label>

          <section className="creator-card creator-a-card">
            <label className="form-field">
              <span>2. Creator / Brand A name</span>
              <input
                type="text"
                value={form.creatorAName}
                onChange={(event) => updateField("creatorAName", event.target.value)}
                placeholder="Creator A name"
              />
            </label>
            <ImageUploadBox
              id="creator-a-image"
              label="3. Creator / Brand A image / logo"
              imageUrl={form.creatorAImageUrl}
              onImageChange={(imageUrl) => updateField("creatorAImageUrl", imageUrl)}
            />
          </section>

          <section className="creator-card creator-b-card">
            <label className="form-field">
              <span>4. Creator / Brand B name</span>
              <input
                type="text"
                value={form.creatorBName}
                onChange={(event) => updateField("creatorBName", event.target.value)}
                placeholder="Creator B name"
              />
            </label>
            <ImageUploadBox
              id="creator-b-image"
              label="5. Creator / Brand B image / logo"
              imageUrl={form.creatorBImageUrl}
              onImageChange={(imageUrl) => updateField("creatorBImageUrl", imageUrl)}
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

          <section className="choice-section category-section full-span">
            <div className="section-label">
              <span>7. Battle category</span>
            </div>
            <div className="chip-grid">
              {CATEGORIES.map((category) => (
                <button
                  key={category.label}
                  className={`category-chip ${form.category === category.label ? "selected" : ""}`}
                  type="button"
                  onClick={() => updateField("category", category.label)}
                >
                  <category.icon aria-hidden="true" size={19} />
                  {category.label}
                </button>
              ))}
            </div>
          </section>

          <label className="form-field message-field full-span">
            <span>8. Battle message</span>
            <textarea
              maxLength={150}
              value={form.message}
              onChange={(event) => updateField("message", event.target.value)}
              placeholder="Vote for your favorite side. Fans decide the winner."
              rows={4}
            />
            <em className="message-count">{form.message.length}/150</em>
          </label>

          <div className="cta-zone full-span">
            <button className="create-match-button" type="submit" disabled={!canCreate || isSubmitting}>
              <Swords aria-hidden="true" size={26} />
              <span>{isSubmitting ? "CREATING..." : "CREATE MATCH"}</span>
              <Zap aria-hidden="true" size={30} />
            </button>
            {submitError ? (
              <p className="form-error-message" role="alert">
                {submitError}
              </p>
            ) : null}
            <p>You can edit this match before sharing.</p>
          </div>
        </form>
      </section>
    </main>
  );
}
