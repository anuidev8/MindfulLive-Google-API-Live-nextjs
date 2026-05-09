"use client";

import { BreathingActivity } from "@/components/activities/breathing-activity";
import { FocusActivity } from "@/components/activities/focus-activity";
import { MeditationActivity } from "@/components/activities/meditation-activity";
import type { ActivityRuntime, WellnessActivityType } from "@/types";

export function ExecutePhase({
  activityType,
  runtime,
}: {
  activityType: WellnessActivityType;
  runtime: ActivityRuntime;
}) {
  if (activityType === "breathing") {
    return <BreathingActivity runtime={runtime} />;
  }

  if (activityType === "focus") {
    return <FocusActivity runtime={runtime} />;
  }

  return <MeditationActivity runtime={runtime} />;
}
