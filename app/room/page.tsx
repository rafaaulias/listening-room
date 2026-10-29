import type { Metadata } from "next";
import Scene from "@/components/room/Scene";

export const metadata: Metadata = {
  title: "The room - Listening Room",
  description: "A small room in perspective, waiting for a record.",
};

export default function RoomPage() {
  return <Scene />;
}
