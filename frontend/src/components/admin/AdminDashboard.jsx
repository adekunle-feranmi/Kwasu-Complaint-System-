import { useState } from "react";
import { Header, Sidebar } from "../common/UI";
import Stats from "./Stats";
import ProfileQueue from "./ProfileQueue";
import ComplaintQueue from "./ComplaintQueue";
import FlaggedQueue from "./FlaggedQueue";

const NAV = [
  { key: "overview", label: "Overview" },
  { key: "profiles", label: "Profile Management" },
  { key: "complaints", label: "Complaint Queue" },
  { key: "flagged", label: "Flagged Queue" },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState("overview");
  return (
    <>
      <Header />
      <div className="layout">
        <Sidebar items={NAV} active={tab} onSelect={setTab} />
        <main className="content">
          {tab === "overview" && <Stats />}
          {tab === "profiles" && <ProfileQueue />}
          {tab === "complaints" && <ComplaintQueue />}
          {tab === "flagged" && <FlaggedQueue />}
        </main>
      </div>
    </>
  );
}
