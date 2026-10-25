# NasabLink on SAP CAP

React client of NasabLink, running against the CAP Java service `NasabLinkService` (`/odata/v4/nasablink`).

- Model: `db/nasablink.cds`, service: `srv/nasablink-service.cds`, logic: `srv/src/main/java/customer/supplychain/nasablink/`
- `src/services/odataAdapter.js` is an axios adapter: the UI still calls its old REST paths, the adapter turns them
  into OData reads (`$filter`, `$orderby`), PATCH updates or CAP actions. Unported features return empty lists or 501.
- Auth: login form -> HTTP basic against CAP mock users (`admin/admin`, `user/user`, `alice/alice`).

## Run
```
cd srv && mvn spring-boot:run          # CAP on :8080 (Java 25)
cd nasablink-react && npm install
npm start                              # dev, http://localhost:8082 (proxies /odata to :8080)
npm run build                          # builds into ../app/nasablink, served at http://localhost:8080/nasablink/
```

## Ported / not ported
Ported: users/profile, trees (CRUD, type, layout), members + roles + invite-by-email, people (add descendant/parent/
spouse, edit, delete with cascade, reorder, no-heir), generations, stats, notifications, workspace templates.
Not ported (UI shows empty or "not available"): Firebase/Google login, subscriptions/payments/limits, documents,
citations, tags, research questions, custom fields definitions, tree settings, viewer/share links, contributions,
tree connections & person links, public/explore pages, GEDCOM import/export, advanced search, GDPR, admin console,
monitoring, email, Neo4j graph, webhooks.
