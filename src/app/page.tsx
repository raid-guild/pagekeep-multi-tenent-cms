import { ExternalLink, Server, Shield, Workflow } from "lucide-react";

import { createTenantAction } from "@/app/actions";
import { listTenants } from "@/lib/tenants";

const stats = [
  {
    label: "Parent service",
    value: "Railway-ready",
    icon: Server,
  },
  {
    label: "Tenant boundary",
    value: "Service + SQLite",
    icon: Shield,
  },
  {
    label: "Next slice",
    value: "Provisioning",
    icon: Workflow,
  },
];

export const dynamic = "force-dynamic";

export default function Home() {
  const tenants = listTenants();

  return (
    <main>
      <section className="hero">
        <div className="shell stack-large">
          <div className="stack">
            <p className="eyebrow">
              PageKeep
            </p>
            <div className="hero-grid">
              <div className="stack">
                <h1>
                  Managed keeps for docs and portfolio sites.
                </h1>
                <p className="lede">
                  PageKeep manages tenant records, Railway child
                  services, scoped Codex sessions, and content API tokens. The
                  first slice is a deployable foundation with persistent tenant
                  state.
                </p>
              </div>
              <div className="status-panel">
                <p className="panel-title">
                  Railway health
                </p>
                <a
                  className="inline-link"
                  href="/api/health"
                >
                  Open `/api/health`
                  <ExternalLink aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>

          <div className="stat-grid">
            {stats.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  className="stat-card"
                  key={item.label}
                >
                  <Icon aria-hidden="true" />
                  <p className="stat-label">
                    {item.label}
                  </p>
                  <p className="stat-value">{item.value}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="content-grid shell">
        <div className="table-panel">
          <div className="panel-header">
            <div>
              <h2>Page Keeps</h2>
              <p className="panel-subtitle">
                Create tenant records now. Provisioning is submitted through the
                Prism hook once the hook is enabled and service-token auth is
                configured.
              </p>
            </div>
          </div>
          {tenants.length ? (
            <div className="tenant-list">
              {tenants.map((tenant) => (
                <div className="tenant-row" key={tenant.id}>
                  <div>
                    <p className="tenant-name">{tenant.siteName}</p>
                    <p className="muted">{tenant.orgName}</p>
                    {tenant.provisioningError ? (
                      <p className="error-text">{tenant.provisioningError}</p>
                    ) : null}
                  </div>
                  <p className="muted">{tenant.templateKey}</p>
                  <p className={`status-text status-${tenant.status}`}>
                    {tenant.status}
                  </p>
                  {tenant.serviceUrl ? (
                    <a
                      className="secondary-button"
                      href={tenant.serviceUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open child
                    </a>
                  ) : (
                    <form
                      action={`/api/tenants/${tenant.id}/provision`}
                      method="post"
                    >
                      <button className="secondary-button" type="submit">
                        Provision child
                      </button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              No tenants yet. Use the create-site form to add the first one.
            </div>
          )}
        </div>

        <aside className="form-panel">
          <h2>Create Site</h2>
          <form action={createTenantAction} className="create-form">
            <label>
              Organization
              <input
                name="org_name"
                placeholder="Example Guild"
                required
                type="text"
              />
            </label>
            <label>
              Site name
              <input
                name="site_name"
                placeholder="Example Docs"
                required
                type="text"
              />
            </label>
            <label>
              Admin email
              <input
                name="admin_email"
                placeholder="admin@example.com"
                required
                type="email"
              />
            </label>
            <label>
              Admin name
              <input name="admin_name" placeholder="Optional" type="text" />
            </label>
            <label>
              Site type
              <select name="template_key" required>
                <option value="docs-site">Docs site</option>
                <option value="portfolio-site">Portfolio site</option>
              </select>
            </label>
            <button className="primary-button" type="submit">
              Create tenant
            </button>
          </form>

          <div className="next-panel">
            <h3>Next backend hook</h3>
              <p>
              The provision button calls the Prism hook, which starts the
              tenant-child-provisioner workflow. Codex-runtime keeps the Railway
              project token; PageKeep only sends tenant metadata.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
