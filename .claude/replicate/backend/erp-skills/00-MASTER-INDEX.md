# ERP BACKEND SKILL SET — MASTER INDEX
## Based on: Speccon TAP ERP System (Production-Grade, .NET 8)

> **For any LLM:** Start here. This index tells you which skill file to read for each task.
> All files are in the same directory as this index. Read them in order for a full build.

---

## WHAT THIS SKILL SET GIVES YOU

A complete blueprint to generate a **fully functional ERP backend** for ANY web or mobile app,
built on the exact production architecture of the Speccon TAP system.

### Capabilities You Get Out of the Box

| Domain | What It Does |
|--------|-------------|
| **User Management** | Registration, roles, JWT auth, profiles, CV generation |
| **LMS / eLearning** | Courses, lessons, units, quizzes, exams, certificates |
| **Moodle Integration** | Sync users/enrollments/grades with open-source Moodle |
| **Teams & Collaboration** | Teams, team members, leaderboards, messaging |
| **CRM** | Clients, leads, sales pipeline, contacts |
| **HR / Employee Equity** | Employment equity reporting, workforce profiles, payroll |
| **Payments** | PayFast integration, subscriptions, invoicing, wallets |
| **WhatsApp Bot** | Course delivery, notifications, user onboarding via WhatsApp |
| **AI / GenAI** | AI prompt management, assessment, validation, scoring |
| **Kanban** | Project boards, tasks, workflows |
| **Scheduling** | Quartz.NET background jobs, email/notification queues |
| **Reporting** | DevExpress dashboards, PDF generation (QuestPDF) |
| **Document Management** | Upload, store, categorise, share documents |
| **Notifications** | Email, WhatsApp, in-app, bulk broadcast |
| **Multi-tenancy** | Per-client branding, CORS, config, portal isolation |
| **Security** | JWT, role-based auth, claims, rate limiting, banned words |

---

## SKILL FILES (Read in this order for a full build)

| File | Purpose | When to Read |
|------|---------|--------------|
| `00-MASTER-INDEX.md` | This file — navigation | Always first |
| `01-architecture.md` | Solution structure, clean architecture, DI | Before writing any code |
| `02-domain-modules.md` | All 18 business domains, entities, relationships | When designing your data model |
| `03-scaffold-new-project.md` | Step-by-step guide to scaffold for any new app | When starting a new project |
| `04-api-patterns.md` | Controller patterns, auth, middleware, validation | When building endpoints |
| `05-service-patterns.md` | Service layer, repository pattern, unit of work | When building business logic |
| `06-moodle-integration.md` | Full Moodle Web Services integration | When adding LMS features |
| `07-integrations.md` | WhatsApp, PayFast, Azure, email, AI/GenAI | When adding external services |
| `08-deployment.md` | Azure pipelines, Docker, Key Vault, environments | When deploying |

---

## QUICK PROJECT RECIPES

### "I want to build an e-learning platform"
Read: `01` → `02` (LMS/Academy sections) → `03` → `04` → `06`

### "I want to build an HR/People management system"
Read: `01` → `02` (User/HR/Equity sections) → `03` → `04` → `05`

### "I want to build a CRM with payments"
Read: `01` → `02` (CRM/Payments sections) → `03` → `04` → `07`

### "I want to build a multi-tenant SaaS backend"
Read: `01` → `02` → `03` → `04` → `05` → `07` → `08`

### "I want the full ERP — everything"
Read all files in order `01` through `08`.

---

## TECH STACK SUMMARY

```
Runtime:        .NET 8 / ASP.NET Core 8
ORM:            Entity Framework Core 8 (SQL Server)
Auth:           JWT Bearer (Microsoft.AspNetCore.Authentication.JwtBearer 8.0.11)
Scheduler:      Quartz.NET 3.11.0
PDF:            QuestPDF 2025.1.5
Logging:        Serilog 3.1.2 + SQL Server sink
Validation:     FluentValidation 12.0.0
API Docs:       Swashbuckle (Swagger) 6.5.0
AI:             Azure OpenAI / custom prompt system
WhatsApp:       Meta Business API
Payments:       PayFast
LMS:            Moodle REST Web Services
Config:         Azure Key Vault + .env (DotNetEnv)
Monitoring:     Azure Application Insights
Background:     Azure Functions + Quartz hosted service
Reporting:      DevExpress Dashboard
```

---

## DIRECTORY STRUCTURE REFERENCE

```
YourProject/
├── YourProject.sln
├── src/
│   ├── Domain/
│   │   └── YourProject.Domain/          ← Entities, Enums, Constants
│   ├── Infrastructure/
│   │   └── Data/
│   │       └── YourProject.Data/        ← EF Core, Repositories, DbContext
│   ├── Services/
│   │   ├── YourProject.Services/        ← Business logic
│   │   └── YourProject.Services.Interfaces/ ← Contracts
│   └── Presentation/
│       ├── YourProject.Api/             ← Main REST API
│       ├── YourProject.Scheduler/       ← Background jobs
│       └── YourProject.Functions/       ← Azure Functions
```
