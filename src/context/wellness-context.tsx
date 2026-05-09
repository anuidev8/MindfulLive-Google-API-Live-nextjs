"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import type {
  ActivityRuntime,
  AnalysisWidget,
  ApprovedPlan,
  PlanProposal,
  SessionRecord,
  WellnessActivityType,
  WellnessState,
} from "@/types";
import {
  getProgressStats,
  loadSessionHistory,
  saveSessionHistory,
} from "@/lib/wellness-storage";

type WellnessAction =
  | { type: "HYDRATE_HISTORY"; history: SessionRecord[] }
  | { type: "SET_PENDING_PROPOSAL"; proposal: PlanProposal }
  | { type: "APPLY_PROPOSAL"; proposalId: string }
  | { type: "REJECT_PROPOSAL"; proposalId: string }
  | {
      type: "START_ACTIVITY";
      activityType: WellnessActivityType;
      durationSeconds: number;
    }
  | { type: "UPDATE_ACTIVITY"; patch: Partial<ActivityRuntime> }
  | { type: "TICK_ACTIVITY" }
  | { type: "COMPLETE_ACTIVITY"; completionQuality: string; notes?: string }
  | { type: "CANCEL_ACTIVITY"; reason: string }
  | { type: "UPSERT_ANALYSIS_WIDGET"; widget: AnalysisWidget }
  | { type: "SET_ERROR"; code: string; message: string }
  | { type: "RESET" };

const initialState: WellnessState = {
  phase: "idle",
  activeActivity: null,
  pendingProposal: null,
  pendingConfirmId: null,
  approvedPlan: null,
  activityRuntime: null,
  analysisWidgets: {},
  sessionHistory: [],
  currentSession: null,
  lastError: null,
  activityLog: [],
};

const WellnessContext = createContext<
  | {
      state: WellnessState;
      dispatch: React.Dispatch<WellnessAction>;
      approveProposal: (proposalId: string) => void;
      rejectProposal: (proposalId: string) => void;
    }
  | undefined
>(undefined);

export function WellnessProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(wellnessReducer, initialState);

  useEffect(() => {
    dispatch({ type: "HYDRATE_HISTORY", history: loadSessionHistory() });
  }, []);

  useEffect(() => {
    saveSessionHistory(state.sessionHistory);
  }, [state.sessionHistory]);

  const value = useMemo(
    () => ({
      state,
      dispatch,
      approveProposal: (proposalId: string) =>
        dispatch({ type: "APPLY_PROPOSAL", proposalId }),
      rejectProposal: (proposalId: string) =>
        dispatch({ type: "REJECT_PROPOSAL", proposalId }),
    }),
    [state]
  );

  return (
    <WellnessContext.Provider value={value}>
      {children}
    </WellnessContext.Provider>
  );
}

export function useWellness() {
  const context = useContext(WellnessContext);
  if (!context) {
    throw new Error("useWellness must be used within WellnessProvider");
  }
  return context;
}

function wellnessReducer(
  state: WellnessState,
  action: WellnessAction
): WellnessState {
  switch (action.type) {
    case "HYDRATE_HISTORY":
      return withProgressWidget({ ...state, sessionHistory: action.history });

    case "SET_PENDING_PROPOSAL":
      return logAction(
        {
          ...state,
          phase: "planning",
          pendingProposal: action.proposal,
          pendingConfirmId: null,
          lastError: null,
        },
        action.type,
        action.proposal
      );

    case "APPLY_PROPOSAL": {
      if (
        !state.pendingProposal ||
        state.pendingProposal.id !== action.proposalId ||
        state.pendingConfirmId === action.proposalId
      ) {
        return state;
      }

      const approvedPlan: ApprovedPlan = {
        ...state.pendingProposal,
        approvedAt: Date.now(),
      };

      return logAction(
        {
          ...state,
          phase: "executing",
          activeActivity: approvedPlan.activityType,
          pendingProposal: null,
          pendingConfirmId: action.proposalId,
          approvedPlan,
        },
        action.type,
        approvedPlan
      );
    }

    case "REJECT_PROPOSAL":
      if (state.pendingProposal?.id !== action.proposalId) return state;
      return logAction(
        {
          ...state,
          phase: "idle",
          pendingProposal: null,
          pendingConfirmId: null,
        },
        action.type,
        { proposalId: action.proposalId }
      );

    case "START_ACTIVITY": {
      const startedAt = Date.now();
      const currentSession: SessionRecord = {
        id: `session-${startedAt}`,
        activityType: action.activityType,
        durationSeconds: action.durationSeconds,
        completedAt: startedAt,
        completionQuality: "in-progress",
      };

      return logAction(
        {
          ...state,
          phase: "executing",
          activeActivity: action.activityType,
          currentSession,
          activityRuntime: {
            timerSeconds: action.durationSeconds,
            totalSeconds: action.durationSeconds,
            phase: action.activityType === "breathing" ? "inhale" : "settling",
            guidance: defaultGuidance(action.activityType),
            encouragement: "Stay with the session.",
            startedAt,
            paused: false,
          },
        },
        action.type,
        action
      );
    }

    case "UPDATE_ACTIVITY":
      if (!state.activityRuntime) return state;
      return logAction(
        {
          ...state,
          activityRuntime: { ...state.activityRuntime, ...action.patch },
        },
        action.type,
        action.patch
      );

    case "TICK_ACTIVITY":
      if (!state.activityRuntime || state.activityRuntime.paused) return state;
      return {
        ...state,
        activityRuntime: {
          ...state.activityRuntime,
          timerSeconds: Math.max(0, state.activityRuntime.timerSeconds - 1),
        },
      };

    case "COMPLETE_ACTIVITY": {
      const session = completeCurrentSession(
        state,
        action.completionQuality,
        action.notes
      );
      const sessionHistory = session
        ? [...state.sessionHistory, session]
        : state.sessionHistory;

      return logAction(
        withProgressWidget({
          ...state,
          phase: "analyzing",
          activityRuntime: null,
          activeActivity: null,
          currentSession: session,
          sessionHistory,
        }),
        action.type,
        action
      );
    }

    case "CANCEL_ACTIVITY":
      return logAction(
        {
          ...state,
          phase: "idle",
          activeActivity: null,
          activityRuntime: null,
          currentSession: null,
        },
        action.type,
        action
      );

    case "UPSERT_ANALYSIS_WIDGET":
      return logAction(
        {
          ...state,
          phase: "analyzing",
          analysisWidgets: {
            ...state.analysisWidgets,
            [action.widget.surfaceId]: action.widget,
          },
        },
        action.type,
        action.widget
      );

    case "SET_ERROR":
      return {
        ...state,
        lastError: {
          code: action.code,
          message: action.message,
          at: Date.now(),
        },
      };

    case "RESET":
      return { ...initialState, sessionHistory: state.sessionHistory };

    default:
      return state;
  }
}

function defaultGuidance(activityType: WellnessActivityType) {
  if (activityType === "breathing") return "Follow the breath pattern.";
  if (activityType === "focus") return "Keep your attention on one task.";
  return "Settle into quiet attention.";
}

function completeCurrentSession(
  state: WellnessState,
  completionQuality: string,
  notes?: string
): SessionRecord | null {
  if (!state.currentSession) return null;

  return {
    ...state.currentSession,
    completedAt: Date.now(),
    completionQuality,
    notes,
  };
}

function withProgressWidget(state: WellnessState): WellnessState {
  const stats = getProgressStats(state.sessionHistory);
  return {
    ...state,
    analysisWidgets: {
      ...state.analysisWidgets,
      "wellness-analysis-progress": {
        surfaceId: "wellness-analysis-progress",
        data: stats,
      },
    },
  };
}

function logAction(
  state: WellnessState,
  type: string,
  payload: unknown
): WellnessState {
  return {
    ...state,
    activityLog: [...state.activityLog, { type, payload, at: Date.now() }].slice(
      -80
    ),
  };
}
