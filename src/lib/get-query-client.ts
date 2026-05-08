import { QueryClient } from "@tanstack/react-query";
import { cache } from "react";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 1000 * 60 * 5,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

/** Use only from Server Components / Route Handlers (one client per request). */
export const getQueryClient = cache(createQueryClient);
