<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Application rules
- Store crop records in Cloud with owner-scoped RLS and authenticated server functions; fields are private to each account.
- Keep the weather dashboard and general AI chat public; crop tracking is under the client-only authenticated layout.
- Load saved fields on the server for each signed-in AI question, and apply weather only to fields matching the selected coordinates; never trust browser-supplied crop records.
- Share AI generation in a server-only helper, preserving the existing model and keeping secrets out of the client bundle.
- Use one root account listener to invalidate identity-dependent queries and clear private cache on sign-out.
- Rainfall monitoring runs server-side on a managed schedule every 5 minutes calling /api/public/jobs/rainfall-alerts with the generated cron auth; detection, dedup, alerts and in-app notifications live in Cloud tables (rainfall_alerts, rainfall_notifications, rainfall_monitor_lock, rainfall_alert_prefs). Email sending will be added to the same monitor only after the sender-domain setup and transactional-template scaffold exist.
