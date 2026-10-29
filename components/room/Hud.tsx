"use client";

import styles from "./room.module.css";

type Props = {
  ready: boolean;
  glFailed: boolean;
  zone: string | null;
  reduced: boolean;
  onPress: (dir: "left" | "right") => void;
  onRelease: (dir: "left" | "right") => void;
};

export default function Hud({ ready, glFailed, zone, reduced, onPress, onRelease }: Props) {
  return (
    <div className={styles.hud}>
      {glFailed ? (
        <p role="alert" className={styles.message}>
          WebGL is not available in this browser.
        </p>
      ) : !ready ? (
        <p role="status" className={styles.message}>
          Loading the room
        </p>
      ) : (
        <>
          <p className={styles.hint}>Walk to the turntable</p>
          <p className={styles.keys}>A and D, or the arrow keys, to move</p>
          <div className={styles.pad}>
            <button
              type="button"
              className={styles.padButton}
              aria-label="Walk left"
              onPointerDown={() => onPress("left")}
              onPointerUp={() => onRelease("left")}
              onPointerLeave={() => onRelease("left")}
              onPointerCancel={() => onRelease("left")}
              onBlur={() => onRelease("left")}
            >
              Left
            </button>
            <button
              type="button"
              className={styles.padButton}
              aria-label="Walk right"
              onPointerDown={() => onPress("right")}
              onPointerUp={() => onRelease("right")}
              onPointerLeave={() => onRelease("right")}
              onPointerCancel={() => onRelease("right")}
              onBlur={() => onRelease("right")}
            >
              Right
            </button>
          </div>
          {reduced && <p className={styles.note}>Camera sway is off.</p>}
        </>
      )}

      <p className={styles.live} aria-live="polite" role="status">
        {zone ?? ""}
      </p>
    </div>
  );
}
