import { ImageResponse } from "next/og";

/** App icon: two overlapping rings on sage. Drawn in code so there are no binary assets to manage. */
export function brandIcon(size: number, { rounded = false }: { rounded?: boolean } = {}) {
  const ring = Math.round(size * 0.36);
  const stroke = Math.max(2, Math.round(size * 0.055));
  const offset = Math.round(size * 0.1);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#6f8f78",
          borderRadius: rounded ? size * 0.22 : 0,
        }}
      >
        <div style={{ display: "flex", position: "relative", width: ring + offset * 2, height: ring }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              width: ring,
              height: ring,
              borderRadius: ring,
              border: `${stroke}px solid #faf7f2`,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: offset * 2,
              width: ring,
              height: ring,
              borderRadius: ring,
              border: `${stroke}px solid #f3d9c6`,
            }}
          />
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
