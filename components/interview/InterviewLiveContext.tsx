"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

// Tells the interview chrome (the header's "Return to Home") whether a
// session is live right now. The live stage marks itself on mount and clears
// on unmount, so Setup, Connecting, Finalizing and the result pages read false.

const InterviewLiveContext = createContext<{
  live: boolean;
  setLive: (live: boolean) => void;
}>({ live: false, setLive: () => {} });

export function InterviewLiveProvider({ children }: { children: ReactNode }) {
  const [live, setLive] = useState(false);
  return (
    <InterviewLiveContext.Provider value={{ live, setLive }}>
      {children}
    </InterviewLiveContext.Provider>
  );
}

export function useInterviewLive(): boolean {
  return useContext(InterviewLiveContext).live;
}

// Marks the interview live for as long as the calling component is mounted.
export function useMarkInterviewLive() {
  const { setLive } = useContext(InterviewLiveContext);
  useEffect(() => {
    setLive(true);
    return () => setLive(false);
  }, [setLive]);
}
