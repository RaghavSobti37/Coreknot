import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/react';
import { useAuth } from '../../contexts/AuthContext';
import AppBootError from '../../components/AppBootError';
import BootScreen from '../../components/BootScreen';
import AuthMarketingShell from '../../components/auth/AuthMarketingShell';
import ClearSessionCookiesButton from '../../components/auth/ClearSessionCookiesButton';
import ClerkSignUpBlock from '../../components/auth/ClerkSignUpBlock';
import { isClerkConfigured } from '../../config/clerk';
import { registerCopy } from '../../constants/marketingContent';
import { resolvePostAuthPath } from '../../utils/postAuthPath';
import { subscribeClerkEstablishError } from '../../lib/clerkEstablishRegistry';
import { computeLoginUiState } from '../../lib/clerkSignInFlow';
import { navigateOnce, resetNavigateGuard } from '../../lib/postLoginRedirect';

const linkClass =
  'text-[var(--brand-green)] font-medium hover:text-[var(--brand-teal-deep)] underline-offset-2 hover:underline transition-colors';

export default function RegisterPage() {
  if (!isClerkConfigured()) {
    return <RegisterPageView clerkLoaded clerkSignedIn={false} clerkSessionId={null} pathname="/register" />;
  }
  return <RegisterPageWithClerk />;
}

function RegisterPageWithClerk() {
  const { isLoaded: clerkLoaded, isSignedIn: clerkSignedIn, sessionId: clerkSessionId } = useClerkAuth();
  const location = useLocation();
  return (
    <RegisterPageView
      clerkLoaded={clerkLoaded}
      clerkSignedIn={clerkSignedIn}
      clerkSessionId={clerkSessionId}
      pathname={location.pathname}
    />
  );
}

function RegisterPageView({
  clerkLoaded,
  clerkSignedIn,
  clerkSessionId = null,
  pathname = '/register',
}) {
  const { user, loading: authLoading, sessionReady, bootError, retryBoot } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navigatedRef = useRef(false);
  const [establishError, setEstablishError] = useState(null);
  const clerkReady = isClerkConfigured();

  const uiState = computeLoginUiState({
    clerkReady,
    clerkLoaded,
    clerkSignedIn,
    clerkSessionId,
    pathname,
    authLoading,
    user,
    sessionReady,
    establishError,
    bootError,
  });

  useEffect(() => {
    resetNavigateGuard();
  }, []);

  useEffect(() => subscribeClerkEstablishError(setEstablishError), []);

  useEffect(() => {
    if (uiState !== 'REDIRECTING') {
      navigatedRef.current = false;
      return;
    }
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    const target = resolvePostAuthPath(user, {
      stateFrom: location.state?.from,
      search: location.search,
    });
    navigateOnce(navigate, target);
  }, [uiState, navigate, location.state, location.search, user]);

  if (uiState === 'BOOT_ERROR') {
    return (
      <>
        <AppBootError bootError={bootError} onRefresh={() => retryBoot()} />
        <ClearSessionCookiesButton bootError stuckLogin className="mt-4" />
      </>
    );
  }

  if (uiState === 'BOOT_LOADING' || uiState === 'ESTABLISHING' || uiState === 'REDIRECTING') {
    return <BootScreen onRefresh={() => retryBoot()} />;
  }

  const asideLinks = (
    <>
      <span className="text-[var(--brand-teal-mid)]">{registerCopy.signInPrompt}</span>
      <Link to="/login" className={linkClass}>
        {registerCopy.signInLink}
      </Link>
    </>
  );

  return (
    <AuthMarketingShell
      title={registerCopy.title}
      subtitle={registerCopy.subtitle}
      asideLinks={asideLinks}
    >
      {!clerkReady ? (
        <p className="text-sm text-red-200 text-center">
          Clerk is not configured. Set <code className="text-xs">VITE_CLERK_PUBLISHABLE_KEY</code> in client env.
        </p>
      ) : (
        <>
          {uiState === 'ESTABLISH_ERROR' && establishError ? (
            <div
              className="mb-4 rounded-lg border border-red-400/40 bg-red-950/40 px-4 py-3 text-sm text-red-100 text-center"
              role="alert"
            >
              <p className="font-medium">Workspace session failed</p>
              <p className="mt-1 text-red-100/90">{establishError.message}</p>
            </div>
          ) : null}
          <ClerkSignUpBlock />
          <p className="mt-4 text-center text-xs text-teal-100/70 leading-relaxed">
            {registerCopy.openSystemNote}
          </p>
        </>
      )}
      <ClearSessionCookiesButton bootError={Boolean(bootError) || Boolean(establishError)} />
    </AuthMarketingShell>
  );
}
