import { PageSkeleton } from "@/components/skeletons";

export default function Loading() {
  return <PageSkeleton stats={4} cards={6} />;
}
