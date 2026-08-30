import { GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import mentorPhoto from "@/assets/dr-neha-singh.png.asset.json";

export function MentorCard() {
  return (
    <Card className="overflow-hidden shadow-[var(--shadow-card)]">
      <CardContent className="flex flex-col items-center gap-4 p-5 text-center sm:flex-row sm:items-center sm:p-6 sm:text-left">
        <img
          src={mentorPhoto.url}
          alt="Dr. Neha Singh, faculty mentor for Engineering Mathematics"
          loading="lazy"
          className="size-24 shrink-0 rounded-2xl border object-cover object-top shadow-[var(--shadow-card)] sm:size-28"
        />
        <div>
          <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-primary sm:justify-start">
            <GraduationCap className="size-4" /> Mentor
          </p>
          <h2 className="mt-1 font-display text-lg font-bold sm:text-xl">Dr. Neha Singh</h2>
          <p className="text-sm text-muted-foreground">
            Faculty, Engineering Mathematics
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            This study companion is guided by Dr. Neha Singh&apos;s approach to engineering
            mathematics — clear concepts, correct steps and exam-ready practice.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
