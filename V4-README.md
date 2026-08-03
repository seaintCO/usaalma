# ALMA Simple SaaS Experience v4

This package contains the complete ALMA source with the v3 premium CRM work and
the v4 simplification layer.

## What changed in v4

- Removed the ALMA mobile bottom navigation.
- Removed the native iOS browser-style bottom controls.
- Kept one responsive side menu, opened with the mobile hamburger.
- Reduced the default side menu to everyday workspaces; specialist tools remain
  available under **More**.
- Replaced the nonfunctional sidebar search box.
- Simplified Home into one ALMA command, a daily pulse, four compact metrics,
  and optional advanced details.
- Simplified the empty chat state and changed suggestions to real business work.
- Rebuilt the public homepage as a dark reflective SaaS experience.
- Added a deterministic interactive phone preview for ALMA, Customers, Inbox,
  Work, and Money.

## Safety

The redesign does not replace ALMA's APIs, database, authentication, billing,
usage metering, approvals, CRM persistence, voice, Live Camera, or automation
infrastructure. The public phone preview makes no provider call and changes no
records.

## Local checks

```powershell
npm install
npm run simple-saas:check
npm run chat-experience:check
npm run premium-workspaces:check
npm run live-camera:check
npm run usage:check
npx tsc --noEmit
npm run build
```

The normal Safari address bar is controlled by iOS and remains visible when the
website is opened in Safari. It is not part of ALMA. It disappears in the native
app or when the website is installed to the Home Screen as a PWA.
