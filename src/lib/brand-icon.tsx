import { ImageResponse } from "next/og";
import { BRAND } from "./brand";

/**
 * App icon: two planner pages, one resting on the other, on pine green.
 * Drawn in code so there are no binary assets to manage.
 */
export function brandIcon(size: number, { rounded = false }: { rounded?: boolean } = {}) {
  const pageW = Math.round(size * 0.44);
  const pageH = Math.round(size * 0.56);
  const radius = Math.round(size * 0.04);
  const line = Math.max(2, Math.round(size * 0.028));
  const { paper, accent, highlight, ink } = BRAND.colors;
  const rule = (width: number, color: string) => (
    <div style={{ width, height: line, borderRadius: line, background: color, marginTop: Math.round(size * 0.055) }} />
  );
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: accent,
          borderRadius: rounded ? size * 0.22 : 0,
        }}
      >
        <div style={{ display: "flex", position: "relative", width: pageW * 1.5, height: pageH * 1.1 }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: Math.round(pageH * 0.06),
              width: pageW,
              height: pageH,
              borderRadius: radius,
              background: "#e9dcc4",
              transform: "rotate(-9deg)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: Math.round(pageW * 0.48),
              top: 0,
              width: pageW,
              height: pageH,
              borderRadius: radius,
              background: paper,
              transform: "rotate(6deg)",
              display: "flex",
              flexDirection: "column",
              padding: Math.round(size * 0.05),
              paddingTop: Math.round(size * 0.04),
            }}
          >
            {rule(Math.round(pageW * 0.62), highlight)}
            {rule(Math.round(pageW * 0.7), `${ink}33`)}
            {rule(Math.round(pageW * 0.5), `${ink}33`)}
            {rule(Math.round(pageW * 0.64), `${ink}33`)}
          </div>
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
