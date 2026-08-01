import { NextResponse } from "next/server";

const association = {
  applinks: {
    details: [
      {
        appIDs: ["5V5G75AUT9.com.seaint.alma"],
        components: [
          { "/": "/login/*" },
          { "/": "/onboarding/*" },
          { "/": "/dashboard/*" },
          { "/": "/customers/*" },
          { "/": "/money/*" },
          { "/": "/inbox/*" },
          { "/": "/documents/*" },
        ],
      },
    ],
  },
  webcredentials: { apps: ["5V5G75AUT9.com.seaint.alma"] },
};

export function GET() {
  return NextResponse.json(association, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "application/json",
    },
  });
}
