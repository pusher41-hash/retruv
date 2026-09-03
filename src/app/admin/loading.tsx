import { PageSkeleton } from "@/components/skeletons";

export default function Loading() {
  return <PageSkeleton stats={8} cards={2} />;
}
