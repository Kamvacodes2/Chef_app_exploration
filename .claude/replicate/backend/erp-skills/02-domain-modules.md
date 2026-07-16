# SKILL 02: DOMAIN MODULES
## All 18 Business Domains — Entities, Capabilities & Relationships

> For each domain below: entities listed are real production entities from the Speccon TAP ERP.
> Use this as your data model reference when designing any new project.

---

## HOW TO READ THIS FILE

Each domain section contains:
1. **What it does** — plain-English summary
2. **Core entities** — the database tables, with key fields
3. **Key relationships** — how it connects to other domains
4. **Service layer** — what business logic exists
5. **Use in your project** — when you'd include this domain

---

## DOMAIN 1: USER MANAGEMENT

### What it does
Central identity system. Every person in the system (learner, employee, admin, sales, HR) is a `User`.
Handles registration, profile, roles, authentication credentials, activity tracking.

### Core Entities
```csharp
User {
    int UserId; Guid UserKey;           // PK + external GUID (used as Moodle username)
    string FirstName, LastName, Email;
    string? CitizenId;                  // National ID / passport
    Guid LmsKey;                        // Password seed for Moodle SSO
    int? MoodleUserId;                  // Cached Moodle internal ID
    int RecordStatusId;                 // 1=Active, 2=Inactive
    DateTime? DateOfBirth;
    int? GenderId, RaceId, DisabilityId;
    bool IsProfileComplete;
    DateTime CreatedDate, ModifiedDate;
    // 50+ fields for full ERP user profile
}

UserRole           { UserId, RoleId, RecordStatusId }
UserAddress        { UserId, AddressLine1..4, CityId, ProvinceId, CountryId }
UserWorkExperience { UserId, CompanyName, JobTitle, StartDate, EndDate, ... }
UserHighSchool     { UserId, HighSchoolId, GraduationYear, ... }
UserSkill          { UserId, SkillId, ProficiencyLevelId }
UserNotification   { UserId, Message, IsRead, NotificationTypeId }
UserActiveTime     { UserId, LoginTime, LogoutTime, SessionDurationMinutes }
UserActivityLogger { UserId, ActivityType, Description, Timestamp }
UserEmailSetting   { UserId, NotificationTypeId, IsEnabled }
UserWallet         { UserId, Balance, CurrencyId }
UserCart           { UserId, CourseId, Quantity, AddedDate }
UserWishList       { UserId, CourseId, AddedDate }
OTPManager         { UserId, OTP, ExpiryTime, IsUsed }
```

### Key Relationships
- Every other domain links back to `User.UserId`
- `UserRole` → `Constants.UserRoles` (Admin, HR, Employee, Learner, Sales, etc.)

### Service Layer
- `UserService` — CRUD, profile updates, role assignment
- `UserNotificationService` — push/read notifications
- `UserActivityLogger` — track user behaviour across portal

### Use in your project
**Always included.** Every system needs users.

---

## DOMAIN 2: AUTHENTICATION & AUTHORIZATION

### What it does
JWT-based stateless auth. Role-based and claims-based access control.
Custom policies for multi-tenant isolation (TenantAdmin, SalesAdmin).

### Key Components
```csharp
// Roles (from UserRoles constants)
"Admin", "HR", "Employee", "Learner", "Sales", "TeamLeader", "SkillsPartner"

// Custom auth policies
Constants.AdminOnlyPolicy         // RequireRole("Admin")
Constants.AdminHROnlyPolicy       // RequireRole("Admin", "HR")
Constants.EmployeeOnlyPolicy      // RequireRole("Employee")
Constants.HROnlyPolicy            // RequireRole("HR")
"TenantAdminOrSalesAdmin"         // Custom requirement handler

// JWT Token fields
{ sub: userId, role: "Admin", email: "...", exp: timestamp, ... }
```

### Filters
```csharp
ClaimAuthorizationFilter    // Extracts user info from JWT claims on every request
ValidateFilter              // Runs FluentValidation on request body
BannedContentValidationFilter // Blocks requests containing banned words
```

### Use in your project
**Always included.** Even simple apps need auth.

---

## DOMAIN 3: LMS / eLEARNING

### What it does
Full Learning Management System. Courses, lessons, units, quizzes, exams, certificates.
Content can be hosted internally or delegated to Moodle.

### Core Entities
```csharp
Course {
    int CourseId; Guid CourseKey;
    string CourseName, Description;
    int MoodleCourseId;              // 0 = not on Moodle, >0 = synced
    int CategoryId, LevelTypeId;
    bool IsFeatured, IsPublished;
    decimal Price;
    int RecordStatusId;
}

CourseUnit         { CourseId, UnitName, OrderIndex, Duration }
CourseCustomLesson { UnitId, LessonName, LessonContent, VideoUrl, Duration, OrderIndex }
CourseCustomQuestion { LessonId, QuestionText, QuestionTypeId, Points }
CourseCustomQuiz   { CourseId, QuizName, PassMark, TimeLimit }
CourseExaminationSection { CourseId, SectionName, TotalMarks, TimeLimit }
Certificate        { CourseId, TemplatePath, ValidityMonths }

UserCourse {
    UserId, CourseId;
    bool IsStarted, IsCompleted, IsOpen;
    DateTime? StartDate, CompletionDate;
    decimal? ProgressPercentage;
    bool IsUpdateRequired;          // Flag: needs Moodle sync
    int WhatsAppUserCourseAssignmentId; // 0 = direct, >0 = via WhatsApp
}

UserLessonProgress { UserId, LessonId, IsCompleted, LastAccessedDate }
UserLessonNotes    { UserId, LessonId, NoteContent, CreatedDate }
UserCourseQuiz     { UserId, CourseId, Score, AttemptNumber, CompletedDate }
UserCourseExamination { UserId, CourseId, ExamScore, Passed, AttemptDate }
```

### Service Layer
- `CourseService` — CRUD, search, filtering, publish/unpublish
- `CourseManagementService` — complex course builder operations
- `LessonManagementService` — lesson CRUD, ordering, content management
- `UnitManagementService` — unit CRUD, ordering
- `QuizManagementService` — quiz creation, attempt tracking, scoring
- `ExamManagementService` — exam sessions, marking, review queries
- `eLearningService` — eLearning-specific (external SCORM/xAPI)

### Use in your project
Include when: e-learning platform, training system, onboarding portal, school system.

---

## DOMAIN 4: ACADEMY (Advanced Learning)

### What it does
Structured academic curriculum. Subjects, modules, topics, rubric-based assessment.
AI-powered assessment scoring and validation.

### Core Entities
```csharp
Academy            { AcademyId, AcademyName, Description }
AcademyModule      { AcademyId, ModuleName, OrderIndex }
AcademyModuleTopic { ModuleId, TopicName, Content }
AcademySubject     { SubjectName, GradeLevel }
AcademyGrade       { SubjectId, GradeValue, GradeLabel }
AcademyRubric      { AssessmentId, Criteria, MaxScore, Weight }
AcademyUserAssessment { UserId, AssessmentId, Score, AIScore, Status }
AcademyScheduledWork  { UserId, Title, DueDate, IsComplete }
```

### Use in your project
Include when: schools, colleges, structured curriculum delivery.

---

## DOMAIN 5: TEAMS & COLLABORATION

### What it does
Team management, role hierarchy within teams, messaging, leaderboards, exam sessions.
Teams can be assigned predefined courses/bundles.

### Core Entities
```csharp
Team {
    int TeamId; Guid TeamKey;
    string TeamName;
    int ManagerUserId;
    int ClientId;
    int RecordStatusId;
}

TeamMember         { TeamId, UserId, TeamMemberRoleId, JoinedDate }
TeamMemberRole     { TeamId, UserId, RoleTypeId, EffectiveDate }
TeamMemberMessage  { TeamId, SenderId, MessageContent, SentDate }
TeamMemberMessageDetail { MessageId, RecipientUserId, IsRead }
TeamPredefinedCourse      { TeamId, CourseId, IsRequired }
TeamPredefinedCourseBundle { TeamId, CourseBundleId }
TeamExaminationSession    { TeamId, ExaminationId, ScheduledDate, Status }
```

### Service Layer
- `TeamService` — team CRUD, member management, course assignment
- `TeamMemberService` — join/leave, role changes
- `TeamLeaderboardService` — rankings, points, achievements
- `TeamExaminationSessionService` — schedule/run team exams

### Use in your project
Include when: corporate training, group learning, sports teams, project management.

---

## DOMAIN 6: CRM (Customer Relationship Management)

### What it does
Full CRM: clients, leads, sales pipeline, contacts, activities, documents.
Per-client branding, portal customisation, SMTP configuration.

### Core Entities
```csharp
Client {
    int ClientId; Guid ClientKey;
    string CompanyName, TradingName;
    string ContactEmail, ContactPhone;
    int IndustryId, RecordStatusId;
    bool IsActive;
    // 30+ fields
}

ClientAddress       { ClientId, AddressType, AddressLine1..4, CityId }
ClientConfiguration { ClientId, ConfigKey, ConfigValue }
ClientSmtpConfiguration { ClientId, SmtpHost, Port, Username, Password, FromEmail }
ClientCatalog       { ClientId, CourseId, IsVisible }
ClientBroadcast     { ClientId, Subject, Body, ScheduledDate, SentDate }
ClientShowcase      { ClientId, MediaType, MediaUrl, DisplayOrder }
SkillsPartner       { CompanyName, ContactName, Email, Phone, SlaId }
SkillsPartnerClient { SkillsPartnerId, ClientId }
```

### Use in your project
Include when: B2B SaaS, training company platform, any system with named client accounts.

---

## DOMAIN 7: HR & EMPLOYMENT EQUITY

### What it does
SA-specific Employment Equity reporting (EEA2, EEA4), workforce analysis, occupational levels,
equity committee management, legal appointment letters, BBBEE.

### Core Entities
```csharp
EntityCompanyProfile    { EntityId, RegisteredName, EENumber, SectorId }
EntityWorkforceProfile  { EntityId, OccupationalLevelId, GenderId, RaceId, Disability, Count }
EntityEquityManager     { EntityId, UserId, AppointmentDate, ExpiryDate }
EntityEquityCommitteeMember { EntityId, UserId, RoleId, AppointedDate }
EntityPlan              { EntityId, PlanYear, Status, SubmittedDate }
EntityPlanDetail        { PlanId, Indicator, Target, Actual, Progress }
UserEquity              { UserId, OccupationalLevelId, RaceId, GenderId, DisabilityId }
WorkforceProfile        { EntityId, FinancialYearId, TotalEmployees, ... }
```

### Use in your project
Include when: South African corporate HR system, compliance reporting, BBBEE platform.

---

## DOMAIN 8: PAYMENTS & SUBSCRIPTIONS

### What it does
Payment processing via PayFast, subscription management, invoice generation,
wallet system, payment history, cart/checkout flow.

### Core Entities
```csharp
PaymentTransaction {
    int TransactionId; Guid TransactionKey;
    int UserId, CourseId;
    decimal Amount; string Currency;
    string PaymentStatus; // pending, complete, failed, cancelled
    string PaymentProvider; // PayFast
    string PayFastPaymentId;
    DateTime CreatedDate;
}

PaymentTransactionDetail { TransactionId, ItemName, ItemPrice, Quantity }
UserWallet              { UserId, Balance, LastUpdated }
UserPaymentHistory      { UserId, TransactionId, ActionDate }
UserCart                { UserId, CourseId, AddedDate }
SubscriptionPackageType { PackageName, Price, DurationMonths, MaxUsers }
CourseBundle            { BundleName, Description, Price }
CourseBundleCollection  { BundleId, CourseId }
```

### Service Layer
- `PaymentService` — initiate payment, handle callback, update status
- `PayFastService` — PayFast-specific: signature generation, ITN validation
- `SubscriptionService` — manage plan upgrades/downgrades

### Use in your project
Include when: paid courses, SaaS subscriptions, marketplace, e-commerce.

---

## DOMAIN 9: NOTIFICATIONS & COMMUNICATIONS

### What it does
Multi-channel notification system: email, WhatsApp, in-app notifications.
Email templates, SMTP per client, bulk broadcast, notification type management.

### Core Entities
```csharp
EmailNotification {
    int NotificationId;
    int UserId, ClientId;
    string Subject, Body;
    string RecipientEmail;
    bool IsSent; DateTime? SentDate;
    string? ErrorMessage;
}

EmailTemplate      { TemplateName, HtmlBody, PlainBody, SubjectTemplate }
EmailConfiguration { ClientId, SmtpHost, Port, Username, Password, SenderName }
BulkEmailLog       { ClientId, Subject, RecipientCount, SentDate, Status }
NotificationType   { NotificationTypeId, Name, Channel } // Email, WhatsApp, InApp
UserNotification   { UserId, Title, Body, IsRead, NotificationTypeId, CreatedDate }
SystemNotificationChannelSetting { NotificationTypeId, IsEnabled, Channel }
```

### Service Layer
- `EmailService` — send single/bulk emails, template rendering
- `UserNotificationService` — create/read/dismiss in-app notifications

### Use in your project
Include when: any system requiring user communications (almost always).

---

## DOMAIN 10: WHATSAPP INTEGRATION

### What it does
WhatsApp Business API integration for: course delivery via WhatsApp, onboarding flows,
notifications, bot interactions, purchase flows.

### Core Entities
```csharp
WhatsAppCourse         { CourseId, WhatsAppSectionCount, IsActive }
WhatsAppSection        { CourseId, SectionName, OrderIndex }
WhatsAppStepMessage    { SectionId, MessageText, OrderIndex }
WhatsAppStepQuestion   { SectionId, QuestionText, CorrectAnswer, Points }
WhatsAppStepImage      { SectionId, ImageUrl, Caption }
WhatsAppStepAudio      { SectionId, AudioUrl }
WhatsAppStepVideo      { SectionId, VideoUrl }
WhatsAppUserContext    { UserId, CurrentSectionId, CurrentStepId, State }
WhatappConfigurations  { ApiUrl, AccessToken, PhoneNumberId, WebhookSecret }
WhatsAppCatalog        { CatalogId, Name, Description }
```

### Service Layer
- `WhatsAppService` — send messages, handle webhook, manage conversations
- `WhatsAppCourseService` — deliver course content step-by-step via WhatsApp

### Use in your project
Include when: African/emerging markets, mobile-first users, bot-driven onboarding.

---

## DOMAIN 11: AI / GENERATIVE AI

### What it does
Prompt management system, AI-powered assessment, validation runs, scoring.
Pluggable prompt templates with versioning and test runs.

### Core Entities
```csharp
AIPromptSystem     { SystemId, SystemName, Description, SystemPrompt }
AIPromptTemplate   { TemplateId, SystemId, TemplateName, PromptBody, Version }
AIPromptVersion    { TemplateId, VersionNumber, PromptBody, CreatedDate }
AIPromptTestRun    { TemplateId, InputData, Output, Score, RunDate }
AIValidationPrompts { TemplateId, ValidationRule, ExpectedFormat }
AIValidationRuns    { UserId, TemplateId, InputText, Score, Passed, RunDate }
AIValidationConstraints { TemplateId, MinScore, MaxLength, RequiredKeywords }
```

### Service Layer
- `GenAIService` — call Azure OpenAI, format prompts, parse responses
- `AIValidationService` — run automated AI assessment on submissions

### Use in your project
Include when: AI-powered coaching, assessment, content generation, chatbots.

---

## DOMAIN 12: DOCUMENTS & FILE MANAGEMENT

### What it does
Document upload, storage, categorisation, sharing, version control.
Supports per-user documents, per-entity documents, DMS (Document Management System).

### Core Entities
```csharp
Document {
    int DocumentId; Guid DocumentKey;
    string FileName, FilePath, MimeType;
    long FileSizeBytes;
    int DocumentTypeId, UserId;
    DateTime UploadedDate;
    int RecordStatusId;
}

DocumentType       { TypeName, AllowedExtensions, MaxFileSizeMB }
EEDocumentLibrary  { EntityId, DocumentId, CategoryId }
SkillsPartnerDocument { PartnerId, DocumentId, CategoryId }
UploadTemplate     { TemplateName, Columns, FileFormat }
```

### Use in your project
Include when: any system where users upload files (CVs, certificates, reports, evidence).

---

## DOMAIN 13: REPORTING & ANALYTICS

### What it does
Dashboard KPIs, analytics queries, DevExpress dashboard integration,
monthly statistics, portal activity tracking.

### Core Entities
```csharp
MonthlyStats       { EntityId, Month, Year, Metric, Value }
PortalActivity     { UserId, ActivityTypeId, EntityId, Timestamp }
PortalActivityType { TypeName, Category }
SystemAdminAuditLog { AdminUserId, Action, TargetEntityType, TargetEntityId, Timestamp }
DeploymentLog      { Version, DeployedBy, DeployedDate, Notes, Status }
```

### Service Layer
- `AnalyticsService` — aggregate statistics for dashboard
- `ReportingService` — generate PDF/Excel reports via QuestPDF

### Use in your project
Include when: management dashboards, compliance reporting, KPI tracking.

---

## DOMAIN 14: SYSTEM CONFIGURATION

### What it does
Per-client and global system settings, feature flags, error logging, status management.

### Core Entities
```csharp
SystemConfiguration {
    int ConfigId;
    string ConfigKey, ConfigValue;
    int? ClientId;            // null = global, set = per-client
    string DataType;          // "string", "bool", "int", "json"
}

SystemErrorLog {
    int ErrorId;
    string Parameters, ErrorMessage;
    string Layer, ClassName, MethodName;
    Guid? UserKey;
    DateTime Timestamp;
}

SystemStatus { StatusName, IsOperational, Message, UpdatedDate }
```

### Service Layer
- `SystemErrorLogService.LogSystemError(params, error, layer, class, method, userKey, context)`
- `SystemConfigurationService` — get/set config values

### Use in your project
**Always included.** Every system needs error logging and config management.

---

## DOMAIN 15: SCHEDULING & BACKGROUND JOBS

### What it does
Quartz.NET job scheduler for: email queues, Moodle sync, equity report generation,
WhatsApp message delivery, timed notifications.

### Core Jobs (production)
```
TeamNotificationEmailJob             — Send pending team notification emails
EquityCommitteeMemberAppointeeNotificationJob — Legal appointment notifications
EquityManagerAppointeeNotificationJob         — Manager appointment notifications
SendInviteEmailEventJob              — Course invitation emails
WhatsAppCourseAssignmentJob          — WhatsApp course delivery scheduling
```

### Event Bus Pattern
```csharp
// In-process event bus for triggering background jobs
IEventBus.Publish(new SendInviteEmailEvent { ... });

// Event handlers
IIntegrationEventHandler<SendInviteEmailEvent>: SendInviteEmailEventHandler
```

### Use in your project
Include when: timed jobs, async processing, scheduled reports, notifications queues.

---

## DOMAIN 16: LEARNERSHIPS & TRAINING PROGRAMS

### What it does
Formal learnership management (SA-specific): learnerships, learner registration,
OFO codes, SETA, skills development, training companies.

### Core Entities
```csharp
Learnerships    { LearnershipName, OFOCodeId, SetaId, NQFLevel, Duration }
TrainingCompany { CompanyName, AccreditationNumber, SetaId }
Seta            { SetaName, Acronym, ContactEmail }
OFOCode         { Code, MajorGroup, SubMajorGroup, MinorGroup, UnitGroup, Occupation }
UserCourseAssignment { UserId, CourseId, AssignedBy, AssignedDate, DueDate }
```

### Use in your project
Include when: South African training/skills development platform.

---

## DOMAIN 17: KANBAN & PROJECT MANAGEMENT

### What it does
Kanban-style project boards, tasks, workflows, AI-assisted task management.

### Core Entities (from Speccon.Tap.Kanban project)
```csharp
// In Speccon.Tap.Kanban project — standalone module
KanbanBoard    { BoardId, BoardName, UserId, CreatedDate }
KanbanColumn   { BoardId, ColumnName, OrderIndex, WipLimit }
KanbanCard     { ColumnId, Title, Description, AssigneeId, DueDate, Priority }
KanbanLabel    { CardId, LabelText, Color }
```

### Use in your project
Include when: task management, project tracking, agile/scrum tools.

---

## DOMAIN 18: MULTI-TENANCY & PORTALS

### What it does
Per-client portal isolation: custom branding, themes, course catalog visibility,
feature flags, white-labelling.

### Core Entities
```csharp
CompanyThemeSettings {
    ClientId;
    string PrimaryColor, SecondaryColor, AccentColor;
    string LogoUrl, FaviconUrl, BackgroundImageUrl;
    string FontFamily;
}

ClientConfiguration { ClientId, ConfigKey, ConfigValue }
ClientCatalog       { ClientId, CourseId, IsVisible, OrderIndex }
ClientRejectedCourses { ClientId, CourseId, RejectionReason }
PortalWhiteList     { ClientId, AllowedDomain }
Brand               { BrandName, LogoUrl, PrimaryColor }
```

### Use in your project
Include when: SaaS with multiple clients, white-label platform, multi-tenant portal.

---

## ENTITY STATUS CONVENTION (used across ALL domains)

```csharp
// Constants.cs
public const int ActiveRecordStatusID = 1;
public const int InactiveRecordStatusID = 2;
public const int DeletedRecordStatusID = 3;
public const int PendingRecordStatusID = 4;
public const int ZeroValue = 0;

// ALL entities have:
int RecordStatusId { get; set; }  // Never hard-delete; soft-delete by setting to 2

// ALL queries filter by:
x.RecordStatusId == Constants.ActiveRecordStatusID
```

## KEY PATTERN — GUID + INT dual key (used on all main entities)
```csharp
// Every main entity has BOTH:
int    EntityId  { get; set; }   // Internal DB auto-increment PK
Guid   EntityKey { get; set; }   // External GUID (exposed in APIs, never exposes int ID)

// APIs accept/return Guid (EntityKey), never the int PK
// DB relations use int FK for performance
```
