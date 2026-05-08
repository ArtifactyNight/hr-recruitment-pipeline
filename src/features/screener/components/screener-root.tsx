"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import { createAppEdenClient, eden } from "@/lib/eden";

import { ResumeScreener } from "./resume-screener";

export function ScreenerRoot() {
  const queryClient = useQueryClient();
  const client = useMemo(() => createAppEdenClient(), []);

  return (
    <eden.Provider client={client} queryClient={queryClient}>
      <ResumeScreener />
    </eden.Provider>
  );
}
