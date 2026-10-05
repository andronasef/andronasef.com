---
title: Changelog Flutter Kit – Open Source Package
excerpt: An open source Flutter package for platform-adaptive "What's New" screens and release notes, with native Cupertino and Material 3 UI.
type: Open Source
tech: Flutter
cover: /assets/projects/changelog-kit.webp
hero: /assets/projects/full/changelog-kit.webp
order: 3
featured: true
siteUrl: https://pub.dev/packages/changelog_flutter_kit
---

## Project Overview

Changelog Flutter Kit is an open source package I published on pub.dev to help Flutter developers show off new features after an update. It ships a drop-in "What's New" experience that feels native on every platform — and a fully headless mode for teams that want to build their own UI.

## Project Objective

Showing release notes is something almost every app needs and few do well. The goal was to build a kit that:

- Looks like Apple's system onboarding sheet on iOS and Material 3 on Android.
- Tracks seen versions automatically, with no database setup.
- Works for both quick drop-in use and fully custom designs.
- Can update release notes remotely without a new store release.

## Key Features

- **Platform-adaptive UI** — Cupertino modal sheet on iOS/macOS, Material 3 bottom sheet on Android, centered dialog on desktop and tablets.
- **Smart version lifecycle** — Fresh installs stay quiet; upgrades show the announcement once.
- **SemVer 2.0.0 comparison** — Handles pre-releases, build numbers and `v` prefixes.
- **Remote changelogs (OTA)** — Load notes from a CDN or API with an offline asset fallback.
- **Pro feature gating** — Lock badges and paywall hooks for monetized features.
- **Headless mode** — `WhatsNewBuilder` and `WhatsNewGate` for 100% custom UI.
- **Localization** — Built-in English, Spanish, French, German and Arabic (RTL) presets.
- **Full version history** — A ready-made screen for your Settings or About page.

## Benefits

- **Native feel, zero friction** — Users get a polished update experience on every platform.
- **Less code to maintain** — Persistence, version logic and UI in one package.
- **Flexible** — Start with the default sheet, go headless when you need to.
