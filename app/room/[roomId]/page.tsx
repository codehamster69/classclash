import { RoomLobby } from "@/components/RoomLobby";

export default function RoomPage({ params }: { params: { roomId: string } }) {
  return <RoomLobby roomId={params.roomId} />;
}
