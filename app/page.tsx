'use client'
import dynamic from "next/dynamic";

const Trees = dynamic(() => import("./_components/trees"), {
  ssr: false, // ⛔ don’t render on server, only in browser
});

export default function Page() {
  return <Trees />;
}