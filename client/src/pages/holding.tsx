/**
 * HoldingPage — minimal launch screen.
 *
 * Single dark screen: wordmark + tagline (Intelligent in mint,
 * Agentic in rose) + launch film + partner names + footer. Contact
 * is reachable through the pill drawer, so no email-capture form is
 * needed here.
 */

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { SEOHead } from "@/components/seo-head";
import { Footer } from "@/components/footer";
import constanciaLogoDarkWebp from "@assets/constancia-logo-dark.webp";
import constanciaLogoDarkPng from "@assets/constancia-logo-dark.png";

const SEO = {
  title: "Constancia — Building Intelligent Agentic Enterprise",
  description:
    "Constancia is launching. Building Intelligent Agentic Enterprise. Official OneStream and Abacum partner.",
  keywords: [
    "Constancia",
    "Intelligent Agentic Enterprise",
    "OneStream partner",
    "Abacum partner",
    "AI for finance",
    "enterprise intelligence",
  ],
  includeOrganizationSchema: true,
};

export default function HoldingPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  // Once the user touches the sound toggle, sound is theirs: ambient
  // gesture-unmute must never fight an explicit mute afterwards.
  const userSoundIntentRef = useRef(false);

  useEffect(() => {
    document.body.classList.add("is-holding-page");
    return () => document.body.classList.remove("is-holding-page");
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // We want sound-on autoplay. Browsers — especially on mobile — block
    // autoplay WITH audio until the user has interacted with the origin,
    // so this is best-effort and cannot be forced:
    //   1. Try to play unmuted immediately (works on desktop / repeat
    //      visitors with media engagement).
    //   2. If blocked, fall back to muted autoplay so the film still runs,
    //      then unmute on the first user gesture elsewhere on the page
    //      (tap, scroll-release, key, click) — no dedicated "play" click
    //      required. We listen on activation-GRANTING events only
    //      (touchend/pointerup/keydown/click): touchstart/pointerdown fire
    //      before the browser grants the user-activation that an unmuted
    //      play() requires, so unmuting from those is silently blocked.
    let disposed = false;
    const gestureEvents = [
      "pointerup",
      "touchend",
      "keydown",
      "click",
    ] as const;

    const removeGestureListeners = () => {
      gestureEvents.forEach((ev) =>
        window.removeEventListener(ev, unmuteOnGesture),
      );
    };

    const unmuteOnGesture = (event: Event) => {
      // The page is being torn down (e.g. the Clerk error boundary swapped
      // the tree, or the route changed). Never resume a detached element.
      if (disposed) return;
      // Ignore interactions with the film itself (tap = play/pause) and
      // the sound toggle (explicit mute control) so we never fight an
      // explicit user choice — only ambient gestures elsewhere on the
      // page enable sound.
      if (userSoundIntentRef.current) {
        // User has taken explicit control of sound — retire ambient
        // unmute entirely for this page session.
        removeGestureListeners();
        return;
      }
      const target = event.target as Node | null;
      if (target && (target === video || video.contains(target))) return;
      if (
        target instanceof Element &&
        target.closest(".holding-film__controls")
      )
        return;
      video.muted = false;
      video.volume = 1;
      video.play().then(
        () => removeGestureListeners(), // sound is on — stop listening
        () => {
          // Still blocked: stay muted and keep the listeners attached so a
          // later gesture can retry.
          video.muted = true;
          video.play().catch(() => {});
        },
      );
    };

    const start = async () => {
      video.muted = false;
      video.volume = 1;
      try {
        await video.play();
        return; // Browser allowed sound-on autoplay.
      } catch {
        // Blocked: play muted now, unmute on first interaction.
      }
      if (disposed) return;
      video.muted = true;
      video.play().catch(() => {});
      gestureEvents.forEach((ev) =>
        window.addEventListener(ev, unmuteOnGesture, { passive: true }),
      );
    };

    // Keep the sound-toggle icon in sync with the element's real state,
    // regardless of whether mute changes came from autoplay fallback,
    // ambient-gesture unmute, or the button itself.
    const onVolumeChange = () => setMuted(video.muted);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    video.addEventListener("volumechange", onVolumeChange);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    // Reflect the real element state on mount (e.g. autoplay blocked
    // entirely → film starts paused and the button must show "Play").
    setMuted(video.muted);
    setPlaying(!video.paused);

    void start();

    return () => {
      disposed = true;
      removeGestureListeners();
      video.removeEventListener("volumechange", onVolumeChange);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      // Stop playback when this page unmounts. A <video> that is detached
      // from the DOM can keep playing its audio until it is garbage
      // collected in several browsers. If the tree is ever remounted — most
      // notably when the Clerk error boundary fails over to its fallback
      // <App /> for users whose browser blocks Clerk's JS — the old, still-
      // playing soundtrack overlaps the new instance, producing a doubled,
      // slightly-offset "overlay" of the launch film audio. Pausing here
      // guarantees the audio stops with the element.
      try {
        video.pause();
        video.muted = true;
      } catch {
        /* element already torn down */
      }
    };
  }, []);

  return (
    <div className="holding-page">
      <SEOHead {...SEO} />

      <main className="holding-page__main">
        {/* Wordmark. */}
        <div className="holding-wordmark">
          <picture>
            <source srcSet={constanciaLogoDarkWebp} type="image/webp" />
            <img src={constanciaLogoDarkPng} alt="Constancia" width={640} height={296} />
          </picture>
        </div>

        {/* Tagline — Intelligent in mint, Agentic in rose. */}
        <h1 className="holding-tagline">
          Building{" "}
          <em className="holding-tagline__intelligent">Intelligent</em>{" "}
          <em className="holding-tagline__agentic">Agentic</em>{" "}
          Enterprise
        </h1>

        {/* Launch film — 4:5 vertical intro at 1080×1350. Explicit
            width/height attributes match the source so the browser
            reserves the slot before any bytes arrive (no CLS). A single
            H.264 (High / yuv420p) MP4 with +faststart for progressive
            playback — universally decodable on iOS, Android, and
            desktop. (A previous VP9 Profile 1 / 4:4:4 WebM was dropped
            because mobile decoders can't play it and browsers wouldn't
            fall back to the MP4.) The poster JPEG is preloaded in
            index.html so it lights up the LCP slot without waiting on
            metadata.

            Frameless: native controls are removed so no browser player
            chrome is drawn. Tapping the film toggles play/pause (WCAG
            2.2.2 pause control) and a minimal overlay button toggles
            sound. */}
        <div className="holding-film">
          <video
            ref={videoRef}
            className="holding-film__video"
            width={1080}
            height={1350}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="/launch-film-poster.jpg"
            aria-label="Constancia launch film — tap to play or pause"
            disablePictureInPicture
            disableRemotePlayback
            onClick={() => {
              const v = videoRef.current;
              if (!v) return;
              if (v.paused) v.play().catch(() => {});
              else v.pause();
            }}
            data-testid="video-launch-film"
          >
            <source src="/launch-film-v4.mp4" type="video/mp4" />
            <track kind="captions" src="/launch-film.vtt" srcLang="en" label="English" default />
          </video>
          <div className="holding-film__controls">
            <button
              type="button"
              className="holding-film__control"
              aria-label={playing ? "Pause launch film" : "Play launch film"}
              data-testid="button-play-toggle"
              onClick={() => {
                const v = videoRef.current;
                if (!v) return;
                if (v.paused) v.play().catch(() => {});
                else v.pause();
              }}
            >
              {playing ? (
                <Pause size={18} aria-hidden="true" />
              ) : (
                <Play size={18} aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              className="holding-film__control"
              aria-label={muted ? "Unmute launch film" : "Mute launch film"}
              data-testid="button-sound-toggle"
              onClick={() => {
                const v = videoRef.current;
                if (!v) return;
                // Sound is now under explicit user control — ambient
                // gesture-unmute is retired for this session.
                userSoundIntentRef.current = true;
                if (v.muted) {
                  v.muted = false;
                  v.volume = 1;
                  v.play().catch(() => {
                    // Browser refused unmuted playback (no user activation
                    // yet, e.g. programmatic click) — stay muted.
                    v.muted = true;
                    v.play().catch(() => {});
                  });
                } else {
                  v.muted = true;
                }
              }}
            >
              {muted ? (
                <VolumeX size={18} aria-hidden="true" />
              ) : (
                <Volume2 size={18} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Partners */}
        <div className="holding-partners" role="group" aria-label="Partners">
          <span>AI Advisory</span>
          <span className="holding-partners__sep" aria-hidden="true" />
          <span>OneStream</span>
          <span className="holding-partners__sep" aria-hidden="true" />
          <span>Abacum</span>
        </div>
      </main>

      <Footer hideContactEmail />
    </div>
  );
}
