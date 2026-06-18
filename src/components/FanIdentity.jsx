import { Camera, ChevronLeft, Crown, Trash2, UserRound } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

function initialFor(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "F";
}

export default function FanIdentity({ selectedSide, initialFan, onCreateFanCard, onBackToVoteSide }) {
  const [fanName, setFanName] = useState(initialFan?.name || "");
  const [photoUrl, setPhotoUrl] = useState(initialFan?.photoUrl || "");
  const fileInputRef = useRef(null);
  const nameInputId = useId();
  const fileInputId = useId();

  useEffect(() => {
    return () => {
      if (photoUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(photoUrl);
      }
    };
  }, [photoUrl]);

  const trimmedName = fanName.trim();
  const canCreate = trimmedName.length > 0;

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const nextPhotoUrl = URL.createObjectURL(file);
    setPhotoUrl((currentPhotoUrl) => {
      if (currentPhotoUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(currentPhotoUrl);
      }
      return nextPhotoUrl;
    });
  };

  const handleRemovePhoto = () => {
    setPhotoUrl((currentPhotoUrl) => {
      if (currentPhotoUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(currentPhotoUrl);
      }
      return "";
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canCreate) return;

    onCreateFanCard({
      name: trimmedName,
      photoUrl,
    });
  };

  return (
    <main className="fanwar-shell fan-identity-shell">
      <div className="cinema-grid" aria-hidden="true" />
      <section className="fan-identity-arena" aria-label="Create fan card">
        <div className="fan-identity-energy" aria-hidden="true" />
        <header className="fan-identity-header">
          <Crown className="battle-crown" aria-hidden="true" size={28} />
          <p className="brand-mark">
            <span>FAN</span> <strong>WAR</strong>
          </p>
          <div className="fan-identity-badge">Fan identity</div>
          <h1>Create your fan card</h1>
          <p>Your vote for Team {selectedSide.name} is ready.</p>
        </header>

        <div className="fan-identity-grid">
          <aside className={`selected-team-pass ${selectedSide.color}`} aria-label={`Selected team ${selectedSide.name}`}>
            <span className="supporting-label">Your vote is for</span>
            <div className="selected-team-avatar">
              {selectedSide.imageUrl ? (
                <img src={selectedSide.imageUrl} alt={`${selectedSide.name} logo`} />
              ) : (
                <span>{initialFor(selectedSide.name)}</span>
              )}
            </div>
            <strong>Team {selectedSide.name}</strong>
            <p>Your fan card will show this team.</p>
          </aside>

          <form className="fan-profile-card" onSubmit={handleSubmit}>
            <label className="fan-name-field" htmlFor={nameInputId}>
              <span>Your name</span>
              <input
                id={nameInputId}
                type="text"
                value={fanName}
                onChange={(event) => setFanName(event.target.value.slice(0, 16))}
                placeholder="Your name"
                maxLength={16}
                autoComplete="off"
              />
              <em>{fanName.length}/16</em>
            </label>

            <div className="fan-photo-field">
              <div className="fan-photo-heading">
                <span>Fan photo</span>
                <em>Optional</em>
              </div>
              <button
                className={`fan-photo-upload ${photoUrl ? "has-photo" : ""}`}
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Add or change fan photo"
              >
                {photoUrl ? (
                  <img src={photoUrl} alt="Fan preview" />
                ) : (
                  <>
                    <UserRound aria-hidden="true" size={56} />
                    <Camera aria-hidden="true" size={24} />
                  </>
                )}
              </button>
              <input
                id={fileInputId}
                ref={fileInputRef}
                className="hidden-file-input"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
              />
              <div className="fan-photo-actions">
                <label htmlFor={fileInputId}>{photoUrl ? "Change photo" : "Upload photo"}</label>
                {photoUrl ? (
                  <button type="button" onClick={handleRemovePhoto}>
                    <Trash2 aria-hidden="true" size={15} />
                    Remove
                  </button>
                ) : null}
              </div>
            </div>

            <div className="fan-setup-actions">
              <button className="fan-start-button" type="submit" disabled={!canCreate}>
                CREATE MY FAN CARD
              </button>
              <button className="fan-back-button" type="button" onClick={onBackToVoteSide}>
                <ChevronLeft aria-hidden="true" size={18} />
                Back to Vote
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
