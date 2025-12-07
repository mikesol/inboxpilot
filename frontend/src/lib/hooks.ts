"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "./api";
import type { MeResponse, WorkspaceWithRole } from "./types";

export function useApi() {
  const { getToken } = useAuth();

  const fetchWithAuth = useCallback(
    async <T>(fetchFn: () => Promise<T>): Promise<T> => {
      const token = await getToken();
      api.setToken(token);
      return fetchFn();
    },
    [getToken]
  );

  return { fetchWithAuth, api };
}

export function useMe() {
  const { fetchWithAuth, api } = useApi();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMe() {
      try {
        const data = await fetchWithAuth(() => api.getMe());
        setMe(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch user");
      } finally {
        setLoading(false);
      }
    }
    fetchMe();
  }, [fetchWithAuth, api]);

  return { me, loading, error };
}

export function useWorkspace() {
  const { me, loading: meLoading, error: meError } = useMe();
  const [currentWorkspace, setCurrentWorkspace] =
    useState<WorkspaceWithRole | null>(null);

  useEffect(() => {
    if (me && me.workspaces.length > 0 && !currentWorkspace) {
      // Default to first workspace
      setCurrentWorkspace(me.workspaces[0]);
    }
  }, [me, currentWorkspace]);

  return {
    workspace: currentWorkspace,
    workspaces: me?.workspaces || [],
    setWorkspace: setCurrentWorkspace,
    user: me?.user,
    loading: meLoading,
    error: meError,
  };
}
