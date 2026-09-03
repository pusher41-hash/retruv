import { PageSkeleton } from "@/components/skeletons";

export default function Loading() {
  return <PageSkeleton stats={3} cards={4} />;
}
