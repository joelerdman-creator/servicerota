import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth as adminAuth, firestore as adminFirestore } from "@/firebase/admin-app";
import { format } from "date-fns";

interface Props {
  params: Promise<{ uid: string }>;
}

const STATUS_COLORS: Record<string, string> = {
  Open: "bg-amber-100 text-amber-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Closed: "bg-gray-100 text-gray-600",
};

const PRIORITY_COLORS: Record<string, string> = {
  Low: "bg-gray-100 text-gray-600",
  Medium: "bg-amber-100 text-amber-800",
  High: "bg-red-100 text-red-800",
  Critical: "bg-red-200 text-red-900 font-bold",
};

function formatTs(ts: any): string {
  if (!ts) return "—";
  const ms = ts._seconds ? ts._seconds * 1000 : ts.seconds ? ts.seconds * 1000 : null;
  if (!ms) return "—";
  return format(new Date(ms), "MMM d, yyyy");
}

export default async function UserFramePage({ params }: Props) {
  const { uid } = await params;

  if (!adminAuth || !adminFirestore) {
    return (
      <div style={{ padding: "1.5rem", color: "#dc2626", fontSize: "0.875rem" }}>
        Admin services unavailable.
      </div>
    );
  }

  // Verify caller is a superuser
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value;
  if (!sessionCookie) redirect("/");

  let callerIsSuperUser = false;
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    callerIsSuperUser = decoded.superUser === true;
  } catch {
    redirect("/");
  }

  if (!callerIsSuperUser) {
    return (
      <div style={{ padding: "1.5rem", color: "#dc2626", fontSize: "0.875rem" }}>
        Forbidden: superuser access required.
      </div>
    );
  }

  // Fetch target user data
  let userRecord: any = null;
  let userProfile: any = null;
  let churchProfile: any = null;
  let recentTickets: any[] = [];

  try {
    userRecord = await adminAuth.getUser(uid);
  } catch {
    return (
      <div style={{ padding: "1.5rem", color: "#dc2626", fontSize: "0.875rem" }}>
        User not found (uid: {uid}).
      </div>
    );
  }

  try {
    const snap = await adminFirestore.collection("users").doc(uid).get();
    userProfile = snap.exists ? snap.data() : null;
  } catch {}

  if (userProfile?.churchId) {
    try {
      const snap = await adminFirestore.collection("churches").doc(userProfile.churchId).get();
      churchProfile = snap.exists ? snap.data() : null;
    } catch {}
  }

  try {
    const snap = await adminFirestore
      .collection("support_tickets")
      .where("submittedByUid", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();
    recentTickets = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {}

  const displayName =
    userProfile?.firstName && userProfile?.lastName
      ? `${userProfile.firstName} ${userProfile.lastName}`
      : userRecord.displayName || userRecord.email || uid;

  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{displayName} — User Context</title>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; font-size: 14px; line-height: 1.5; background: #f9fafb; color: #111827; -webkit-font-smoothing: antialiased; }
          .card { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
          .label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; margin-bottom: 8px; }
          .badge { display: inline-flex; align-items: center; border-radius: 9999px; padding: 2px 8px; font-size: 12px; font-weight: 500; }
          .row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f3f4f6; }
          .row:last-child { border-bottom: none; }
          .mono { font-family: ui-monospace, monospace; font-size: 12px; }
          .muted { color: #6b7280; }
          .ticket-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
          .ticket-row:last-child { border-bottom: none; }
          .badges { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
          .avatar { width: 48px; height: 48px; border-radius: 9999px; background: #e0e7ff; color: #4338ca; font-weight: 700; font-size: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .user-header { display: flex; align-items: center; gap: 16px; }
          .user-meta { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
        `}</style>
      </head>
      <body>
        <div style={{ padding: "20px", maxWidth: "640px", margin: "0 auto" }}>

          {/* Profile */}
          <div className="card">
            <div className="user-header">
              <div className="avatar">{initials}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</div>
                <div className="muted" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userRecord.email}</div>
                <div className="user-meta">
                  {userProfile?.role && (
                    <span className="badge" style={{ background: "#eef2ff", color: "#4338ca" }}>
                      {userProfile.role}
                    </span>
                  )}
                  {userProfile?.status && (
                    <span className="badge" style={{
                      background: userProfile.status === "active" ? "#f0fdf4" : "#fffbeb",
                      color: userProfile.status === "active" ? "#166534" : "#92400e",
                    }}>
                      {userProfile.status.replace(/_/g, " ")}
                    </span>
                  )}
                  {userRecord.disabled && (
                    <span className="badge" style={{ background: "#fef2f2", color: "#991b1b" }}>Disabled</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Church */}
          {(churchProfile || userProfile?.churchId) && (
            <div className="card">
              <div className="label">Church</div>
              <div style={{ fontWeight: 500 }}>{churchProfile?.name || "Unknown Church"}</div>
              {churchProfile?.address && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{churchProfile.address}</div>}
              <div className="muted mono" style={{ marginTop: 4, fontSize: 11 }}>{userProfile?.churchId}</div>
            </div>
          )}

          {/* Account */}
          <div className="card">
            <div className="label">Account</div>
            <div className="row">
              <span className="muted">UID</span>
              <span className="mono" style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>{uid}</span>
            </div>
            <div className="row">
              <span className="muted">Created</span>
              <span>{userRecord.metadata?.creationTime ? format(new Date(userRecord.metadata.creationTime), "MMM d, yyyy") : "—"}</span>
            </div>
            <div className="row">
              <span className="muted">Last sign-in</span>
              <span>{userRecord.metadata?.lastSignInTime ? format(new Date(userRecord.metadata.lastSignInTime), "MMM d, yyyy h:mm a") : "Never"}</span>
            </div>
            <div className="row">
              <span className="muted">Email verified</span>
              <span style={{ color: userRecord.emailVerified ? "#166534" : "#92400e" }}>
                {userRecord.emailVerified ? "Yes" : "No"}
              </span>
            </div>
          </div>

          {/* Tickets */}
          <div className="card">
            <div className="label">Support Tickets ({recentTickets.length})</div>
            {recentTickets.length === 0 ? (
              <div className="muted">No tickets submitted.</div>
            ) : (
              recentTickets.map((t: any) => (
                <div key={t.id} className="ticket-row">
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.subject}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{formatTs(t.createdAt)}</div>
                  </div>
                  <div className="badges">
                    {t.priority && (
                      <span className="badge" style={{
                        background: (PRIORITY_COLORS[t.priority] || "").includes("red-2") ? "#fee2e2"
                          : (PRIORITY_COLORS[t.priority] || "").includes("red") ? "#fef2f2"
                          : (PRIORITY_COLORS[t.priority] || "").includes("amber") ? "#fffbeb"
                          : "#f3f4f6",
                        color: (PRIORITY_COLORS[t.priority] || "").includes("red-9") ? "#7f1d1d"
                          : (PRIORITY_COLORS[t.priority] || "").includes("red") ? "#991b1b"
                          : (PRIORITY_COLORS[t.priority] || "").includes("amber") ? "#92400e"
                          : "#4b5563",
                      }}>
                        {t.priority}
                      </span>
                    )}
                    <span className="badge" style={{
                      background: t.status === "Open" ? "#fffbeb" : t.status === "In Progress" ? "#eff6ff" : "#f3f4f6",
                      color: t.status === "Open" ? "#92400e" : t.status === "In Progress" ? "#1e40af" : "#4b5563",
                    }}>
                      {t.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </body>
    </html>
  );
}
