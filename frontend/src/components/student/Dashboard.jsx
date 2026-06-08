import { useState } from "react";
import { Header, Sidebar } from "../common/UI";
import Feed from "./Feed";
import Profile from "./Profile";
import SubmitComplaint from "./SubmitComplaint";
import ComplaintHistory from "./ComplaintHistory";

const NAV = [
  { key: "feed", label: "Complaint Feed" },
  { key: "submit", label: "Submit Complaint" },
  { key: "history", label: "My Complaints" },
  { key: "profile", label: "My Profile" },
];

export default function Dashboard() {
  const [tab, setTab] = useState("feed");
  return (
    <>
      <Header />
      <div className="layout">
        <Sidebar items={NAV} active={tab} onSelect={setTab} />
        <main className="content">
          {tab === "feed" && <Feed />}
          {tab === "submit" && <SubmitComplaint />}
          {tab === "history" && <ComplaintHistory />}
          {tab === "profile" && <Profile />}
        </main>
      </div>
    </>
  );
}
