- [x] Add private saved field records and crop tracker with account access.
- [x] Include saved crop records in signed-in FarmGuard AI answers.
- [ ] Verify field create/edit/delete and crop-aware chat. Blocked: no signed-up account exists; user must sign in first. Crop context tests, public navigation, and sign-in screens verified.
## Rainfall early-warning emails (in progress)
- [x] Detection engine: 15-minute forecast slots, lead-time classification, duplicate/update rules, crop risk assessment + unit tests.
- [x] Database: rainfall_alerts, alert preferences, monitor lock tables with RLS.
- [ ] Email domain setup (blocked: user must complete one-time sender-domain setup).
- [ ] Scaffold email templates and rainfall alert email.
- [ ] Monitor route + 5-minute schedule; verify end-to-end.
