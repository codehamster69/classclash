import { DotsBoard } from "@/components/DotsBoard";

export default function DotsPage({ params }: { params: { roomId: string } }) {
  return <DotsBoard roomId={params.roomId} />;
}
