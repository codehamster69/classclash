import { BingoBoard } from "@/components/BingoBoard";

export default function BingoPage({ params }: { params: { roomId: string } }) {
  return <BingoBoard roomId={params.roomId} />;
}
