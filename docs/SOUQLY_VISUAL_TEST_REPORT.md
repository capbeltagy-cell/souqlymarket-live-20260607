# Souqly Visual Test Report

Date: 2026-07-28

The production-style Node server started and 97 static routes were crawled: 92 returned HTTP 200,
5 returned expected HTTP 307 redirects, and none failed.

Cloud-browser visual testing was attempted against local preview, but the available browser has an
explicit saved permission blocking localhost and instructed that no alternate bypass be used. No
Production or public preview was deployed, as required. Screenshots and visual PASS claims are
therefore intentionally absent.

| Coverage | Result |
| --- | --- |
| Public and authenticated routes | Route crawl PASS; visual NOT RUN |
| Checkout/payment/subscription/payout | Route crawl PASS; visual NOT RUN |
| 320/360/390/414/768/1024/1440/1920 px | NOT RUN |
| RTL/LTR/dark/loading/empty/error | NOT RUN |
| Keyboard/menu/tables/dialogs/payment screens | NOT RUN |

Visual QA remains a launch blocker until an approved browser-accessible Test URL is available.
