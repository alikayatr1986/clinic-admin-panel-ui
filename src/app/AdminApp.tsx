import { toast } from "sonner";
import { useCallback, useEffect, useRef, useState } from "react";
import { useOutlet } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "../lib/api";
import { queryClient } from "../lib/query-client";
import { useAdminNavigation } from "../lib/admin-navigation";
import { AdminShell } from "../components/layout/AdminShell";
import { BlogDraftProvider } from "../features/blogs/context/BlogDraftContext";
import { clearLeadFilters } from "../features/leads/hooks/leadFilters";
import { authKeys, useAuth } from "../features/auth/hooks/useAuth";
import type { AdminSession } from "../features/auth/types/auth.types";
import {
  describeError,
  safeReturnTarget,
} from "../features/auth/utils/auth.utils";
import { LoginPage } from "../features/auth/components/LoginPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function AdminApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminAppContent />
    </QueryClientProvider>
  );
}

function AdminAppContent() {
  const {
    session,
    fetchSession,
    login: authLogin,
    logout: authLogout,
  } = useAuth();
  const maybeNavigation = useAdminNavigation();
  if (!maybeNavigation) throw new Error("AdminApp requires the admin router");
  const navigation = maybeNavigation;
  const [checking, setChecking] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [reauthenticating, setReauthenticating] = useState(false);
  const [blogNotice, setBlogNotice] = useState("");
  const identity = useRef<string | null>(null);
  const generation = useRef(0);
  const expiryPending = useRef(false);
  const blocker = useRef<(() => boolean) | null>(null);
  const returnTarget = useRef(
    safeReturnTarget(
      navigation.routeId === "login"
        ? new URLSearchParams(navigation.search).get("returnTo")
        : navigation.pathname + navigation.search,
    ),
  );
  const initialBlogReturn = new URLSearchParams(navigation.search).get(
    "returnTo",
  );
  const blogReturn = useRef(
    initialBlogReturn && /^\/admin\/blogs(?:\?[^#]*)?$/.test(initialBlogReturn)
      ? initialBlogReturn
      : "/admin/blogs",
  );
  const initialGalleryReturn = new URLSearchParams(navigation.search).get(
    "returnTo",
  );
  const galleryReturn = useRef(
    initialGalleryReturn &&
      /^\/admin\/gallery(?:\?[^#]*)?$/.test(initialGalleryReturn)
      ? initialGalleryReturn
      : "/admin/gallery",
  );
  if (navigation.routeId === "blog-list")
    blogReturn.current = navigation.pathname + navigation.search;
  if (navigation.routeId === "gallery-list")
    galleryReturn.current = navigation.pathname + navigation.search;

  async function updateSession(next: AdminSession | null, operation: number) {
    if (operation !== generation.current) return false;
    const nextIdentity = next ? `${next.username}:${next.role}` : null;
    if (!nextIdentity || nextIdentity !== identity.current) {
      clearLeadFilters();
      await queryClient.cancelQueries();
      if (operation !== generation.current) return false;
      queryClient.removeQueries({
        predicate: (query) =>
          query.queryKey.join("/") !== authKeys.session().join("/"),
      });
      queryClient.getMutationCache().clear();
    }
    if (operation !== generation.current) return false;
    queryClient.removeQueries({
      queryKey: [...authKeys.session(), "pending"],
      exact: true,
    });
    identity.current = nextIdentity;
    queryClient.setQueryData(authKeys.session(), next);
    return true;
  }
  async function checkSession() {
    const operation = ++generation.current;
    setChecking(true);
    setSessionError("");
    try {
      const data = await fetchSession();
      if (!(await updateSession(data, operation))) return;
      if (navigation.routeId === "login")
        navigation.navigate("/admin/", { replace: true, bypassBlock: true });
    } catch (error) {
      if (operation !== generation.current) return;
      if (error instanceof ApiError && error.status === 401) {
        if (!(await updateSession(null, operation))) return;
        setReauthenticating(true);
        navigation.navigate("/admin/login", {
          replace: true,
          bypassBlock: true,
        });
      } else setSessionError(describeError(error));
    } finally {
      if (operation === generation.current) setChecking(false);
    }
  }
  useEffect(() => {
    void checkSession();
    return () => {
      generation.current++;
      void queryClient.cancelQueries({
        queryKey: [...authKeys.session(), "pending"],
        exact: true,
      });
      queryClient.removeQueries({
        queryKey: [...authKeys.session(), "pending"],
        exact: true,
      });
    };
  }, []);
  async function login(username: string, password: string) {
    const operation = ++generation.current;
    let data: AdminSession;
    try {
      data = await authLogin(username, password);
    } catch (error) {
      if (operation !== generation.current) return;
      throw error;
    }
    const previous = identity.current;
    if (!(await updateSession(data, operation))) return;
    void queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] !== "auth",
    });
    setReauthenticating(false);
    expiryPending.current = false;
    toast.success("Signed in successfully.");
    navigation.navigate(
      previous && previous !== `${data.username}:${data.role}`
        ? "/admin/"
        : returnTarget.current,
      { replace: true, bypassBlock: true },
    );
  }
  async function logout() {
    if (blocker.current && !blocker.current()) return;
    const operation = ++generation.current;
    try {
      await authLogout();
    } catch (error) {
      if (operation !== generation.current) return;
      if (!(error instanceof ApiError && error.status === 401)) throw error;
    }
    if (!(await updateSession(null, operation))) return;
    returnTarget.current = "/admin/";
    toast.success("Signed out successfully.");
    navigation.navigate("/admin/login", { replace: true, bypassBlock: true });
  }
  const handleExpired = useCallback(() => {
    if (expiryPending.current) return;
    expiryPending.current = true;
    toast.error("Your session expired. Sign in again.");
    returnTarget.current = safeReturnTarget(
      navigation.pathname + navigation.search,
    );
    setReauthenticating(true);
    navigation.navigate("/admin/login", { replace: true, bypassBlock: true });
  }, [navigation.pathname, navigation.search, navigation.navigate]);
  const registerBlocker = useCallback(
    (callback: (() => boolean) | null) => {
      blocker.current = callback;
      navigation.registerBlocker(callback);
    },
    [navigation.registerBlocker],
  );
  const outlet = useOutlet({
    session,
    onExpired: handleExpired,
    navigate: navigation.navigate,
    registerBlocker,
    blogReturn: blogReturn.current,
    galleryReturn: galleryReturn.current,
    onBlogDeleted: () => {
      setBlogNotice(
        "Article deleted. New public reads are unavailable; any homepage selection falls back to the newest eligible article.",
      );
      navigation.navigate(blogReturn.current, { bypassBlock: true });
    },
  });
  const savedOutlet = useRef(outlet);
  if (!reauthenticating) savedOutlet.current = outlet;
  if (checking)
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <p role="status">Checking staff session…</p>
      </main>
    );
  if (sessionError)
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle asChild>
              <h1>Unable to verify your session</h1>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p role="alert" className="text-sm text-slate-700">
              {sessionError}
            </p>
            <Button type="button" onClick={() => void checkSession()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  if (!session) return <LoginPage onLogin={login} />;
  return (
    <BlogDraftProvider key={`${session.username}:${session.role}`}>
      <div hidden={reauthenticating}>
        <AdminShell
          session={session}
          path={
            reauthenticating
              ? returnTarget.current.split("?")[0]
              : navigation.pathname
          }
          routeId={navigation.routeId}
          onNavigate={(path) => navigation.navigate(path)}
          onLogout={logout}
          onExpired={handleExpired}
        >
          {navigation.routeId === "blog-list" && blogNotice && (
            <p
              role="status"
              className="mt-5 rounded-md bg-green-50 p-4 text-green-900"
            >
              {blogNotice}
            </p>
          )}
          {reauthenticating ? savedOutlet.current : outlet}
        </AdminShell>
      </div>
      {reauthenticating && <LoginPage onLogin={login} />}
    </BlogDraftProvider>
  );
}
