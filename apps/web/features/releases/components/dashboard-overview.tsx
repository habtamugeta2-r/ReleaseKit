type DashboardOverviewProps = {
  apiStatus: "checking" | "online" | "offline";
  total: number;
  version?: string;
};

const pipelineStages = [
  ["01", "Source", "Changes reviewed"],
  ["02", "Verify", "Tests & checks"],
  ["03", "Package", "Immutable images"],
  ["04", "Deploy", "Approved release"],
] as const;

export function DashboardOverview({
  apiStatus,
  total,
  version,
}: DashboardOverviewProps) {
  return (
    <>
      <header className="topbar">
        <a className="brand" href="/" aria-label="ReleaseKit home">
          <span className="brand-mark" aria-hidden="true">
            R
          </span>
          <span>ReleaseKit</span>
        </a>
        <div className="topbar-meta">
          <span className={`health-indicator health-${apiStatus}`}>
            <span className="health-dot" />
            API {apiStatus}
          </span>
          <span className="version-chip">
            {version ? `build ${version}` : "version unavailable"}
          </span>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Delivery overview</p>
          <h1>Ship with confidence.</h1>
          <p className="hero-description">
            A clear view of your releases, pipeline progress, and the health of
            your delivery platform.
          </p>
        </div>
        <div
          className="hero-metric"
          role="group"
          aria-label={`${total} releases tracked`}
        >
          <span className="metric-value">
            {total.toString().padStart(2, "0")}
          </span>
          <span className="metric-label">releases tracked</span>
        </div>
      </section>

      <section className="pipeline-panel" aria-labelledby="pipeline-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Automated delivery</p>
            <h2 id="pipeline-heading">Pipeline at a glance</h2>
          </div>
          <span className="pipeline-caption">
            Every change moves through the same quality gates
          </span>
        </div>
        <ol className="pipeline-stages">
          {pipelineStages.map(([step, title, caption], index) => (
            <li className="pipeline-stage" key={step}>
              <span
                className={`stage-number ${index === 3 ? "stage-number-last" : ""}`}
              >
                {step}
              </span>
              <div>
                <h3>{title}</h3>
                <p>{caption}</p>
              </div>
              {index < pipelineStages.length - 1 && (
                <span className="stage-connector" aria-hidden="true" />
              )}
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

export function DashboardFooter() {
  return (
    <footer className="footer">
      <span>ReleaseKit · Built for reliable delivery</span>
      <span>Health checks · Immutable artifacts · Verified deployments</span>
    </footer>
  );
}
