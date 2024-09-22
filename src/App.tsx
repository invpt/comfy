import {
  createEffect,
  createSignal,
  For,
  JSX,
  onCleanup,
  onMount,
  Show,
  type Component,
} from "solid-js";
import { createStore, produce } from "solid-js/store";
import yaml from "js-yaml";

import logo from "./logo.svg";
import styles from "./App.module.css";
import { usePhysicalDimensions } from "./physicalDimensions";

type AppState =
  | {
      phase: "setup";
      touches: { x: number; y: number }[];
    }
  | {
      phase: "homed";
      homes: { x: number; y: number; adj?: { x: number; y: number } }[];
      touches: { x: number; y: number }[];
    };

const cx = 18;
const cy = 17;

const cap = 16;

const diff = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
  return { x: p1.x - p2.x, y: p1.y - p2.y };
};

const add = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
  return { x: p1.x + p2.x, y: p1.y + p2.y };
};

const len = (p1: { x: number; y: number }) => {
  return Math.sqrt(p1.x * p1.x + p1.y * p1.y);
};

const distance = (
  p1: { x: number; y: number },
  p2: { x: number; y: number },
) => {
  return len(diff(p1, p2));
};

const norm = (p1: { x: number; y: number }) => {
  const l = len(p1);
  return { x: p1.x / l, y: p1.y / l };
};

const scale = (x: number, p1: { x: number; y: number }) => {
  return { x: x * p1.x, y: x * p1.y };
};

const dot = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
  return p1.x * p2.x + p1.y * p2.y;
};

const atan2 = (p1: { x: number; y: number }) => {
  return Math.atan2(p1.y, p1.x) * (180 / Math.PI);
};

const App: Component = () => {
  const dim = usePhysicalDimensions();
  const [state, setState] = createStore<AppState>({
    phase: "setup",
    touches: [],
  });
  const [prevId, setPrevId] = createSignal<number>();

  const handleTouch: (
    eventKind: "start" | "move" | "end",
  ) => JSX.EventHandlerUnion<SVGSVGElement, TouchEvent> =
    (eventKind) => (event) => {
      setState(
        "touches",
        [...event.touches].map((touch) => ({
          x: dim.pxToMm(touch.clientX),
          y: dim.pxToMm(touch.clientY),
        })),
      );
    };

  createEffect(() => {
    if (state.phase === "setup" && state.touches.length === 5) {
      if (prevId()) {
        return;
      }
      const id = setTimeout(
        () =>
          setState({
            phase: "homed",
            homes: state.touches,
            touches: state.touches,
          }),
        500,
      );
      setPrevId(id);
    } else {
      if (prevId()) {
        clearTimeout(prevId());
        setPrevId(undefined);
      }
    }
  });

  const id = setInterval(() => {
    if (state.phase === "homed") {
      for (const touch of state.touches) {
        let best: number | undefined = undefined;
        let bestDist: number | undefined = undefined;
        for (let i = 0; i < state.homes.length; i++) {
          const home = state.homes[i];
          const d = distance(touch, home);
          if (d > cy * 1.5) {
            continue;
          }
          if (bestDist === undefined || d < bestDist) {
            best = i;
            bestDist = d;
          }
        }
        if (best !== undefined && bestDist !== undefined) {
          setState(
            produce((state) => {
              if (state.phase !== "homed") return;
              const home = state.homes[best];
              if (bestDist > cy / 2) {
                home.adj = scale(cy, norm(diff(touch, home)));
              } else {
                if (state.touches.length > 1) {
                } else {
                }
              }
            }),
          );
        }
      }
    }
  });

  onCleanup(() => clearInterval(id));

  const createExport = () => {
    if (state.phase !== "homed") {
      return yaml.dump({});
    }

    return yaml.dump({
      points: {
        key: {
          padding: cy,
          stagger: 0,
        },
        zones: Object.fromEntries(
          state.homes.map((home, i) => [
            `zone${i}`,
            {
              key: {
                adjust: {
                  shift: [home.x, -home.y],
                },
                splay: home.adj ? -(atan2(home.adj) + 90) : 0,
                origin: [home.x, cy - home.y],
              },
              columns: {
                col: null,
              },
              rows: {
                bottom: null,
                home: null,
                top: null,
              },
            },
          ]),
        ),
      },
    });
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.download = "ergogen.yml";
    const blob = new Blob([createExport()], { type: "text/plain" });
    a.href = URL.createObjectURL(blob);
    a.click();
  };

  return (
    <div class={styles.Root}>
      <svg
        onTouchStart={handleTouch("start")}
        onTouchMove={handleTouch("move")}
        onTouchEnd={handleTouch("end")}
        onTouchCancel={handleTouch("end")}
        viewBox={`0 0 ${dim.pxToMm(window.innerWidth)} ${dim.pxToMm(window.innerHeight)}`}
      >
        <For each={state.phase === "homed" ? state.homes : []}>
          {(touch) => (
            <>
              <Show when={touch.adj === undefined}>
                <circle r={cy / 2} cx={touch.x} cy={touch.y} fill="#0000ff" />
              </Show>
              <Show when={touch.adj !== undefined}>
                <g
                  transform={`translate(${touch.x - cx / 2}, ${touch.y - cy / 2})`}
                >
                  <rect
                    width={cap}
                    height={cap}
                    transform={`rotate(${atan2(touch.adj!)}, ${cap / 2}, ${cap / 2})`}
                  />
                  <g transform={`translate(${touch.adj!.x}, ${touch.adj!.y})`}>
                    <rect
                      width={cap}
                      height={cap}
                      transform={`rotate(${atan2(touch.adj!)}, ${cap / 2}, ${cap / 2})`}
                    />
                  </g>
                  <g
                    transform={`translate(${-touch.adj!.x}, ${-touch.adj!.y})`}
                  >
                    <rect
                      width={cap}
                      height={cap}
                      transform={`rotate(${atan2(touch.adj!)}, ${cap / 2}, ${cap / 2})`}
                    />
                  </g>
                </g>
              </Show>
              <circle r={17} cx={touch.x} cy={touch.y} fill="#0000ff80" />
            </>
          )}
        </For>
        <For each={state.touches}>
          {(touch) => (
            <circle r={8 / 2} cx={touch.x} cy={touch.y} fill="#ff000080" />
          )}
        </For>
      </svg>
      <div class={styles.Overlay}>
        <button
          onClick={() =>
            confirm("Are you sure you want to reset?")
              ? setState({ phase: "setup", touches: [] })
              : undefined
          }
        >
          RESET
        </button>
        <button onClick={handleDownload}>Download Ergogen file</button>
      </div>
    </div>
  );
};

export default App;
