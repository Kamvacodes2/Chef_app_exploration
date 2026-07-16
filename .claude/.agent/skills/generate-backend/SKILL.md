---
name: generate-backend
description: Generate a fully built-out .NET 8 Clean Architecture backend from a PRD or frontend project analysis. Replicates the Speccon TAP enterprise-grade architecture pattern with Domain, Infrastructure, Services, and Presentation layers.
---

# Generate Backend Skill

## Overview
This skill generates a **complete, production-ready ASP.NET Core 8 backend** following the exact Clean Architecture pattern used in the Speccon TAP system. Given a PRD (Product Requirements Document) or a frontend project to analyze, this skill produces a fully wired, compilable backend with all layers, patterns, and cross-cutting concerns.

## When To Use
- User provides a PRD and asks for a backend
- User provides a frontend project path and asks for a matching backend
- User says "generate backend", "create API", "build the backend", or similar

---

## PHASE 1: ANALYSIS — Understand the Domain

Before generating ANY code, you MUST gather requirements. Do ONE of the following:

### Option A: PRD Provided
Read the PRD document. Extract:
1. **Entities**: Every noun that represents a data object (User, Order, Product, etc.)
2. **Relationships**: How entities relate (one-to-many, many-to-many)
3. **Features/Modules**: Logical groupings of functionality (Auth, Payments, Notifications, etc.)
4. **API Endpoints**: Every action the frontend needs (CRUD, search, upload, etc.)
5. **Integrations**: External services (email, blob storage, payment gateways, AI, etc.)
6. **Auth Model**: JWT, OAuth, API keys, role-based access, multi-tenant

### Option B: Frontend Project Provided
Scan the frontend project:
1. Look for API call files (services/, api/, hooks/) to extract endpoint shapes
2. Look for TypeScript/JS interfaces or types to infer entity structures
3. Look for route definitions to understand feature modules
4. Look for auth context/guards to understand the auth model
5. Look for state management to understand data flow

### Output of Analysis
Create a structured list:
- `ProjectName` — PascalCase name for the solution (e.g., `EasyChef`, `TradeFlow`)
- `Entities[]` — Each with: Name, Properties (name, type, nullable, default), Navigation Properties, Key type
- `Modules[]` — Logical groupings (e.g., Auth, Users, Orders, Products, Payments)
- `Endpoints[]` — Route, HTTP method, request DTO, response DTO, auth requirement
- `Integrations[]` — External service needs
- `Roles[]` — User roles for authorization

**Ask the user to confirm this analysis before proceeding to code generation.**

---

## PHASE 2: CODE GENERATION — Architecture Blueprint

### Solution Structure

The generated solution MUST follow this EXACT folder structure:

```
{ProjectName}/
├── {ProjectName}.sln
├── {ProjectName}_Host.csproj        ← ROOT STUB (excludes src/**; makes `dotnet run` work at root)
├── Program.cs                        ← stub host entry point
├── appsettings.json                  ← stub (AllowedHosts + Logging only)
├── appsettings.Development.json      ← stub
├── Properties/
│   └── launchSettings.json           ← dev ports for stub
├── Controllers/
│   └── HomeController.cs             ← stub MVC controller
├── Views/
│   ├── Home/
│   │   ├── Index.cshtml
│   │   └── Privacy.cshtml
│   ├── Shared/
│   │   └── Error.cshtml
│   ├── _ViewImports.cshtml
│   └── _ViewStart.cshtml
├── Models/
│   └── ErrorViewModel.cs             ← stub model
├── wwwroot/                           ← empty static-files root
├── .gitignore
└── src/
    ├── Domain/
    │   └── {ProjectName}.Domain/
    │       ├── {ProjectName}.Domain.csproj
    │       ├── Entities/
    │       │   ├── {Entity}.cs                    (one per entity)
    │       │   └── {SubModule}/                   (grouped by module if >15 entities)
    │       ├── Constants/
    │       │   ├── Constants.cs                   (global constants)
    │       │   └── {Module}Constants.cs           (per-module constants)
    │       ├── Enums/
    │       │   └── {EnumName}.cs                  (one per enum)
    │       ├── Extensions/
    │       │   └── PagedResult.cs                 (pagination support)
    │       └── Helpers/
    │           ├── EncryptionManager.cs
    │           ├── PasswordGenerator.cs
    │           └── CodeGenerator.cs
    │
    ├── Infrastructure/
    │   └── Data/
    │       └── {ProjectName}.Data/
    │           ├── {ProjectName}.Data.csproj
    │           ├── AppContext/
    │           │   └── AppDbContext.cs             (EF Core DbContext)
    │           ├── AppRepositories/
    │           │   ├── GenericRepository.cs        (generic CRUD repo)
    │           │   └── {Module}/                   (custom repos per module)
    │           ├── UnitOfWorks/
    │           │   └── UnitOfWork.cs
    │           ├── Seeding/
    │           │   └── FeatureSeeder.cs
    │           ├── Scripts/                        (SQL migration scripts)
    │           ├── DependencyInjectionExtensions.cs (repo + DbContext DI)
    │           └── Migrations/                     (EF Core auto-migrations)
    │
    ├── Services/
    │   ├── {ProjectName}.Services/
    │   │   ├── {ProjectName}.Services.csproj
    │   │   ├── Interfaces/
    │   │   │   ├── AppRepositories/
    │   │   │   │   ├── IGenericRepository.cs
    │   │   │   │   └── {Module}/                  (custom repo interfaces)
    │   │   │   ├── Services/
    │   │   │   │   └── {Module}/
    │   │   │   │       └── I{Service}Service.cs   (one per service)
    │   │   │   └── UnitOfWork/
    │   │   │       └── IUnitOfWork.cs
    │   │   ├── Services/
    │   │   │   └── {Module}/
    │   │   │       └── {Service}Service.cs        (implementations)
    │   │   ├── ServiceDtos/
    │   │   │   ├── Common/
    │   │   │   │   ├── ResponseDto.cs             (standard API response wrapper)
    │   │   │   │   └── StreamResponseDto.cs
    │   │   │   ├── Helper/
    │   │   │   │   ├── ConfigurationHelper.cs
    │   │   │   │   ├── CacheHelper.cs
    │   │   │   │   └── KeyvaultAppConfigurationDto.cs
    │   │   │   └── {Module}/
    │   │   │       └── {Dto}Dto.cs                (request/response DTOs)
    │   │   ├── Helpers/                           (service-level helpers)
    │   │   ├── Extensions/                        (service-level extensions)
    │   │   └── DependencyInjectionExtensions.cs   (service DI registrations)
    │   │
    │   └── {ProjectName}.Services.Test/           (unit test project)
    │       └── {ProjectName}.Services.Test.csproj
    │
    └── Presentation/
        ├── {ProjectName}.Api/                     (main API project)
        │   ├── {ProjectName}.Api.csproj
        │   ├── Program.cs
        │   ├── appsettings.json
        │   ├── appsettings.Development.json
        │   ├── Controllers/
        │   │   ├── BaseController.cs
        │   │   └── {Module}Controller.cs          (one per module)
        │   ├── Middleware/
        │   │   ├── ExceptionHandler.cs
        │   │   └── RateLimitingMiddleware.cs
        │   ├── Filters/
        │   │   ├── ValidateFilter.cs
        │   │   ├── ClaimAuthorizationFilter.cs
        │   │   ├── SwaggerIgnoreSchemaFilter.cs
        │   │   └── SwaggerIgnoreOperationFilter.cs
        │   ├── Validators/
        │   │   └── {Module}/
        │   │       └── {Validator}Validator.cs     (FluentValidation)
        │   ├── Extension/
        │   │   ├── DependencyInjectionExtensions.cs
        │   │   └── ConfigureOptionsExtensions.cs
        │   ├── EventManager/
        │   │   ├── IEventBus.cs
        │   │   ├── EventBus.cs
        │   │   ├── IntegrationEvent.cs
        │   │   └── IIntegrationEventHandler.cs
        │   ├── Scheduler/
        │   │   └── Quartz/
        │   │       ├── QuartzConfiguration.cs
        │   │       ├── JobFactory.cs
        │   │       └── Jobs/
        │   ├── WebHooks/
        │   │   ├── IWebHook.cs
        │   │   └── WebHook.cs
        │   ├── Localization/
        │   │   └── JsonStringLocalizer.cs
        │   └── wwwroot/
        │       └── Fonts/
        │
        └── (optional additional API projects per bounded context)
            ├── {ProjectName}.Enterprise/
            ├── {ProjectName}.Scheduler/
            └── {ProjectName}.Functions/
```

---

## PHASE 2.5: ROOT STUB PROJECT (MANDATORY)

Every generated solution MUST include a thin MVC stub at the **solution root** so that running `dotnet run` in the project directory "just works" without having to specify `--project`. This mirrors the Speccon_TAP_Ext pattern exactly.

The stub compiles as its own web project but explicitly **excludes** everything under `src/` so there is no clash with the real Clean Architecture projects.

### 2.5.1 `{ProjectName}_Host.csproj`

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>

  <ItemGroup>
    <Compile Remove="src\**" />
    <Content Remove="src\**" />
    <EmbeddedResource Remove="src\**" />
    <None Remove="src\**" />
  </ItemGroup>

</Project>
```

**Naming rule:** The stub csproj is named `{ProjectName}_Host.csproj` (using `_Host` suffix) so it never collides with `src/Presentation/{ProjectName}.Api/{ProjectName}.Api.csproj`.

### 2.5.2 `Program.cs` (root stub)

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllersWithViews();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();
```

### 2.5.3 `appsettings.json` (root stub)

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*"
}
```

### 2.5.4 `appsettings.Development.json` (root stub)

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  }
}
```

### 2.5.5 `Properties/launchSettings.json`

```json
{
  "profiles": {
    "http": {
      "commandName": "Project",
      "launchBrowser": true,
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      },
      "dotnetRunMessages": true,
      "applicationUrl": "http://localhost:5000"
    },
    "https": {
      "commandName": "Project",
      "launchBrowser": true,
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      },
      "dotnetRunMessages": true,
      "applicationUrl": "https://localhost:7000;http://localhost:5000"
    },
    "IIS Express": {
      "commandName": "IISExpress",
      "launchBrowser": true,
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      }
    }
  },
  "iisSettings": {
    "windowsAuthentication": false,
    "anonymousAuthentication": true,
    "iisExpress": {
      "applicationUrl": "http://localhost:5000/",
      "sslPort": 44300
    }
  }
}
```

### 2.5.6 `Controllers/HomeController.cs`

```csharp
using Microsoft.AspNetCore.Mvc;
using {ProjectName}_Host.Models;
using System.Diagnostics;

namespace {ProjectName}_Host.Controllers
{
    public class HomeController : Controller
    {
        public HomeController() { }

        public IActionResult Index()
        {
            return View();
        }

        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
```

**Note on namespace:** The namespace uses `{ProjectName}_Host` (matching the csproj assembly name). Replace `{ProjectName}` with the actual project name (e.g., `Popply_Host`).

### 2.5.7 `Models/ErrorViewModel.cs`

```csharp
namespace {ProjectName}_Host.Models
{
    public class ErrorViewModel
    {
        public string? RequestId { get; set; }

        public bool ShowRequestId => !string.IsNullOrEmpty(RequestId);
    }
}
```

### 2.5.8 `Views/Home/Index.cshtml`

```html
@{
    ViewData["Title"] = "Home Page";
}

<div class="text-center">
    <h1 class="display-4">Welcome to {ProjectName}</h1>
    <p>API: <a href="/swagger">Swagger UI</a> — run <code>dotnet run --project src/Presentation/{ProjectName}.Api/{ProjectName}.Api.csproj</code></p>
</div>
```

### 2.5.9 `Views/Home/Privacy.cshtml`

```html
@{
    ViewData["Title"] = "Privacy Policy";
}
<h1>@ViewData["Title"]</h1>
<p>Use this page to detail your site's privacy policy.</p>
```

### 2.5.10 `Views/Shared/Error.cshtml`

```html
@model {ProjectName}_Host.Models.ErrorViewModel
@{
    ViewData["Title"] = "Error";
}

<h1 class="text-danger">Error.</h1>
<h2 class="text-danger">An error occurred while processing your request.</h2>

@if (Model.ShowRequestId)
{
    <p><strong>Request ID:</strong> <code>@Model.RequestId</code></p>
}
```

### 2.5.11 `Views/_ViewImports.cshtml`

```
@using {ProjectName}_Host
@using {ProjectName}_Host.Models
@addTagHelper *, Microsoft.AspNetCore.Mvc.TagHelpers
```

### 2.5.12 `Views/_ViewStart.cshtml`

```
@{
    Layout = "_Layout";
}
```

### 2.5.13 `.gitignore`

Generate a standard .NET `.gitignore` at root covering:

```
bin/
obj/
*.user
.env
*.env.local
.vs/
*.suo
*.userprefs
```

### 2.5.14 `README.md` (REQUIRED OUTPUT FILE)

Generate this file at the solution root. It MUST be the last file created before Phase 3. Substitute `{ProjectName}` and `{ApiPort}` appropriately.

```markdown
# {ProjectName}

## Architecture

Clean Architecture (.NET 8) with the following layers:

| Layer | Project | Path |
|---|---|---|
| Domain | `{ProjectName}.Domain` | `src/Domain/{ProjectName}.Domain/` |
| Infrastructure | `{ProjectName}.Data` | `src/Infrastructure/Data/{ProjectName}.Data/` |
| Services | `{ProjectName}.Services` | `src/Services/{ProjectName}.Services/` |
| API | `{ProjectName}.Api` | `src/Presentation/{ProjectName}.Api/` |

## Running the Project

### Option 1 — Stub host (solution compile check, no database required)

```bash
# From solution root
dotnet run
# → http://localhost:5000
```

### Option 2 — Real API (Clean Architecture entry point)

```bash
dotnet run --project src/Presentation/{ProjectName}.Api/{ProjectName}.Api.csproj
# → https://localhost:{ApiPort}
# → Swagger: https://localhost:{ApiPort}/swagger
```

## Building

```bash
dotnet build {ProjectName}.sln
```

## Database

1. Set `ConnectionStrings:AppDb` in `src/Presentation/{ProjectName}.Api/appsettings.Development.json`
2. Run migrations:
   ```bash
   dotnet ef database update --project src/Infrastructure/Data/{ProjectName}.Data --startup-project src/Presentation/{ProjectName}.Api
   ```
```

---

## PHASE 3: CODE TEMPLATES — Generate Each File

### 3.1 Domain Layer

#### Entity Template Pattern
Every entity MUST follow this exact pattern:
```csharp
using System.ComponentModel.DataAnnotations;

namespace {ProjectName}.Domain.Entities
{
    public class {EntityName}
    {
        [Key]
        public int {EntityName}Id { get; set; }
        public Guid {EntityName}Key { get; set; } = Guid.NewGuid();
        public DateTime CreatedDate { get; set; } = DateTime.Now;
        
        // Domain-specific properties with defaults
        public string Name { get; set; } = string.Empty;
        public int RecordStatusId { get; set; } = Constants.Constants.ActiveRecordStatusID;
        
        // Nullable foreign keys use int? or string?
        // Navigation properties use virtual keyword for lazy loading
        public virtual {RelatedEntity}? {RelatedEntity} { get; set; }
        public virtual List<{ChildEntity}>? {ChildEntities} { get; set; }
    }
}
```

**Entity rules:**
- Primary key: `int {EntityName}Id` with `[Key]` attribute
- GUID key: `Guid {EntityName}Key` with default `Guid.NewGuid()`
- Always include `CreatedDate` with default `DateTime.Now`
- String defaults: `= string.Empty`
- Bool defaults: explicit `= false` or `= true`
- Use `int RecordStatusId` for soft-delete pattern
- Navigation properties: `virtual` for EF lazy loading
- Group related entities into subfolders when >15 entities exist

#### Constants Template
```csharp
namespace {ProjectName}.Domain.Constants
{
    public static class Constants
    {
        public const int ActiveRecordStatusID = 1;
        public const int InactiveRecordStatusID = 2;
        public const int DeletedRecordStatusID = 3;
        public const int DefaultClientId = 1;
        public const string FieldExceptionKey = "FieldValidation";
        public const string AdminOnlyPolicy = "AdminOnly";
        public const string AdminHROnlyPolicy = "AdminHROnly";
        // Add project-specific constants
    }

    public static class UserRoles
    {
        public const string Admin = "Admin";
        public const string HR = "HR";
        public const string Employee = "Employee";
        public const string Student = "Student";
        // Add project-specific roles
    }
}
```

#### PagedResult Template
```csharp
using Microsoft.EntityFrameworkCore;

namespace {ProjectName}.Domain
{
    public class PagedResult<T>
    {
        public IQueryable<T> Results { get; set; }
        public int RowCount { get; set; }
    }

    public class QueryPagedResult<T> : PagedResultBase where T : class
    {
        public List<T> Results { get; set; }
        public QueryPagedResult() { Results = new List<T>(); }
    }

    public abstract class PagedResultBase
    {
        public int CurrentPage { get; set; }
        public int PageCount { get; set; }
        public int PageSize { get; set; }
        public int RowCount { get; set; }
        public int FirstRowOnPage => (CurrentPage - 1) * PageSize + 1;
        public int LastRowOnPage => Math.Min(CurrentPage * PageSize, RowCount);
    }

    public static class PaginationExtensionMethod
    {
        public static async Task<QueryPagedResult<T>> GetPagedAsync<T>(
            this IQueryable<T> query, int page, int pageSize) where T : class
        {
            var result = new QueryPagedResult<T>();
            if (pageSize == -1)
            {
                result.CurrentPage = page;
                result.RowCount = await query.CountAsync();
                result.PageSize = result.RowCount;
                result.PageCount = 1;
                result.Results = await query.ToListAsync();
                return result;
            }
            result.CurrentPage = page;
            result.PageSize = pageSize;
            result.RowCount = await query.CountAsync();
            var pageCount = (double)result.RowCount / pageSize;
            result.PageCount = (int)Math.Ceiling(pageCount);
            var skip = page == 1 ? 0 : (page - 1) * pageSize;
            result.Results = await query.Skip(skip).Take(pageSize).ToListAsync();
            return result;
        }
    }
}
```

#### Domain .csproj Template
```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.EntityFrameworkCore" Version="8.0.1" />
    <PackageReference Include="Microsoft.IdentityModel.Tokens" Version="7.4.1" />
  </ItemGroup>
</Project>
```

---

### 3.2 Infrastructure Layer (Data)

#### IGenericRepository Interface
```csharp
using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore.Query;

namespace {ProjectName}.Services.Interfaces.AppRepositories
{
    public interface IGenericRepository<T> where T : class
    {
        Task<T> AddAsync(T entity);
        Task<List<T>> AddRangesAsync(List<T> entities);
        Task DeleteAsync(T entity);
        Task DeleteRangeAsync(List<T> entities);
        Task<List<T>> GetAllAsync(
            Expression<Func<T, bool>>? where = null,
            Func<IQueryable<T>, IIncludableQueryable<T, object?>>? includes = null,
            Expression<Func<T, object>>? orderByExpression = null,
            bool trackChanges = false,
            int? page = null, int? pageSize = null, bool asc = true);
        Task<T> GetByIdAsync(int id);
        Task<T> GetByCondition(
            Expression<Func<T, bool>> where,
            bool trackChanges = false,
            Expression<Func<T, object?>>[]? includes = null,
            Expression<Func<T, object>>? orderByExpression = null,
            bool orderByDescending = false);
        Task<T> UpdateAsync(T entity);
        Task UpdateRangeAsync(List<T> entities);
        Task<T> AddOrUpdateAsync(T entity, Expression<Func<T, bool>> where, bool trackChanges = false);
        Task<List<TType>> GetSpecific<TType>(Expression<Func<T, bool>> where, Expression<Func<T, TType>> select) where TType : class;
        Task<T> GetLastData(Expression<Func<T, object>> orderByExpression);
        Task<PagedResult<T>> GetAllPagingAsync(
            Expression<Func<T, bool>>? where = null,
            Func<IQueryable<T>, IIncludableQueryable<T, object>>? includes = null,
            Expression<Func<T, object>>? orderByExpression = null,
            bool trackChanges = false,
            int? page = null, int? pageSize = null, bool asc = true);
        Task<int> GetCountByCondition(Expression<Func<T, bool>> where, bool trackChanges = false);
        Task BulkInsertAsync(List<T> entities);
        IQueryable<T> GetQueryable(bool trackChanges = false);
    }
}
```

#### GenericRepository Implementation
Generate the full GenericRepository<T> exactly as found in the reference project (see `AppRepositories/GenericRepository.cs`). It wraps AppDbContext, supports LINQ expressions, includes, ordering, pagination, bulk operations, and AsNoTracking by default.

#### IUnitOfWork Interface
```csharp
namespace {ProjectName}.Services.Interfaces.UnitOfWork
{
    public interface IUnitOfWork : IDisposable
    {
        Task<int> SaveChangesAsync();
        Task<T> ExecuteInTransactionAsync<T>(Func<Task<T>> operation);
        Task CreateTransactionAsync();
        Task CommitTransactionAsync();
        Task RollBackTransactionAsync();
        void Detach<T>(T Model);
    }
}
```

#### UnitOfWork Implementation
Generate the full UnitOfWork exactly as in the reference (wraps AppDbContext with IDbContextTransaction support, execution strategy for retries, detach support).

#### AppDbContext Template
```csharp
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using {ProjectName}.Domain.Entities;

namespace {ProjectName}.Data.AppContext
{
    public class AppDbContext : IdentityDbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        // One DbSet<T> per entity
        public DbSet<{EntityName}> {EntityName}s { get; set; }
        // ... repeat for all entities

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            // Fluent API configurations
            // Composite keys, indexes, relationships, query filters
        }
    }
}
```

#### Data .csproj Template
```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Dapper" Version="2.1.28" />
    <PackageReference Include="EFCore.BulkExtensions" Version="8.0.1" />
    <PackageReference Include="Microsoft.AspNetCore.Identity.EntityFrameworkCore" Version="8.0.1" />
    <PackageReference Include="Microsoft.EntityFrameworkCore" Version="8.0.1" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="8.0.1">
      <PrivateAssets>all</PrivateAssets>
      <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
    </PackageReference>
    <PackageReference Include="Microsoft.EntityFrameworkCore.SqlServer" Version="8.0.1" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.Tools" Version="8.0.1">
      <PrivateAssets>all</PrivateAssets>
      <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
    </PackageReference>
  </ItemGroup>
  <ItemGroup>
    <ProjectReference Include="..\..\..\Services\{ProjectName}.Services\{ProjectName}.Services.csproj" />
  </ItemGroup>
</Project>
```

#### Data DI Extensions Template
```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using {ProjectName}.Data.AppContext;
using {ProjectName}.Data.AppRepositories;
using {ProjectName}.Data.UnitOfWorks;
using {ProjectName}.Services.Interfaces.AppRepositories;
using {ProjectName}.Services.Interfaces.UnitOfWork;
using {ProjectName}.Domain.Entities;

namespace {ProjectName}.Data
{
    public static class DependencyInjectionExtensions
    {
        public static IServiceCollection AddApplicationDbContextAndRepositories(
            this IServiceCollection services, IConfiguration configuration)
        {
            services.AddDbContextFactory<AppDbContext>(options =>
            {
                options.UseSqlServer(configuration["ConnectionStrings:AppDb"], sqlOptions =>
                {
                    sqlOptions.CommandTimeout(60);
                });
            });

            services.AddTransient(typeof(IGenericRepository<>), typeof(GenericRepository<>));

            // Register one IGenericRepository<T> per entity
            // services.AddTransient<IGenericRepository<{Entity}>, GenericRepository<{Entity}>>();
            // ... repeat for ALL entities

            // Register custom repositories
            // services.AddTransient<I{Custom}Repository, {Custom}Repository>();

            // Register Unit of Work
            services.AddTransient<IUnitOfWork, UnitOfWork>();

            return services;
        }
    }
}
```

---

### 3.3 Services Layer

#### Service Interface Template
```csharp
namespace {ProjectName}.Services.Interfaces.Services.{Module}
{
    public interface I{Entity}Service
    {
        Task<{ResponseDto}> Get{Entity}ById(int id);
        Task<List<{ResponseDto}>> GetAll{Entity}s(int clientId);
        Task<int> Create{Entity}({CreateDto} dto, int userId);
        Task<int> Update{Entity}({UpdateDto} dto, int userId);
        Task<int> Delete{Entity}(int id, int userId);
        // Add domain-specific methods
    }
}
```

#### Service Implementation Template
```csharp
using {ProjectName}.Services.Interfaces.AppRepositories;
using {ProjectName}.Services.Interfaces.Services.{Module};
using {ProjectName}.Services.Interfaces.UnitOfWork;
using {ProjectName}.Domain.Entities;

namespace {ProjectName}.Services.Services.{Module}
{
    public class {Entity}Service : I{Entity}Service
    {
        private readonly IGenericRepository<{Entity}> _{entity}Repository;
        private readonly IUnitOfWork _unitOfWork;

        public {Entity}Service(
            IGenericRepository<{Entity}> {entity}Repository,
            IUnitOfWork unitOfWork)
        {
            _{entity}Repository = {entity}Repository;
            _unitOfWork = unitOfWork;
        }

        public async Task<{ResponseDto}> Get{Entity}ById(int id)
        {
            var entity = await _{entity}Repository.GetByCondition(x => x.{Entity}Id == id);
            if (entity == null)
                throw new ApplicationException("Record not found");
            return Map(entity);
        }

        public async Task<int> Create{Entity}({CreateDto} dto, int userId)
        {
            var entity = new {Entity}
            {
                // Map DTO properties to entity
            };
            await _{entity}Repository.AddAsync(entity);
            await _unitOfWork.SaveChangesAsync();
            return entity.{Entity}Id;
        }

        // ... remaining CRUD methods following the same pattern
    }
}
```

#### ResponseDto Templates
```csharp
namespace {ProjectName}.Services.ServiceDtos.Common
{
    public class ResponseDto
    {
        public bool isError { get; set; }
        public string errorMessage { get; set; } = string.Empty;
        public string message { get; set; } = string.Empty;
        public int statusCode { get; set; }
    }

    public class ResponseDto<T> : ResponseDto
    {
        public T? result { get; set; }
    }

    public interface IResponseDto<T> { }

    public interface IResponseMultiErrorDto
    {
        string message { get; set; }
    }

    public class ResponseMultiErrorDto : IResponseMultiErrorDto
    {
        public object? result { get; set; }
        public bool isError { get; set; }
        public List<dynamic> errorMessage { get; set; } = new();
        public string message { get; set; } = string.Empty;
        public int statusCode { get; set; }
        public bool isFieldLevel { get; set; }
    }

    public class StreamResponseDto
    {
        public Stream? FileStream { get; set; }
        public string ContentType { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
    }
}
```

#### ConfigurationHelper
```csharp
using Microsoft.Extensions.Configuration;

namespace {ProjectName}.Services.ServiceDtos.Helper
{
    public static class ConfigurationHelper
    {
        public static IConfiguration config { get; private set; }
        public static void Initialize(IConfiguration configuration)
        {
            config = configuration;
        }
    }

    public static class CacheHelper
    {
        public static Microsoft.Extensions.Caching.Memory.IMemoryCache cache { get; private set; }
        public static void Initialize(Microsoft.Extensions.Caching.Memory.IMemoryCache memoryCache)
        {
            cache = memoryCache;
        }
    }
}
```

#### Services DI Extensions Template
```csharp
using Microsoft.Extensions.DependencyInjection;

namespace {ProjectName}.Services
{
    public static class DependencyInjectionExtensions
    {
        public static IServiceCollection AddApplicationServices(this IServiceCollection services)
        {
            // System services
            services.AddScoped<ISystemErrorLogService, SystemErrorLogService>();

            // Per-module service registration
            // services.AddTransient<I{Service}Service, {Service}Service>();
            // ... repeat for ALL services

            return services;
        }
    }
}
```

#### Services .csproj Template
```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
  <ItemGroup>
    <FrameworkReference Include="Microsoft.AspNetCore.App" />
  </ItemGroup>
  <ItemGroup>
    <PackageReference Include="Azure.Storage.Blobs" Version="12.24.0" />
    <PackageReference Include="Newtonsoft.Json" Version="13.0.3" />
    <PackageReference Include="System.IdentityModel.Tokens.Jwt" Version="7.2.0" />
    <PackageReference Include="Microsoft.Extensions.DependencyInjection.Abstractions" Version="8.0.0" />
    <PackageReference Include="Swashbuckle.AspNetCore.Annotations" Version="9.0.6" />
    <!-- Add project-specific packages as needed -->
  </ItemGroup>
  <ItemGroup>
    <ProjectReference Include="..\..\Domain\{ProjectName}.Domain\{ProjectName}.Domain.csproj" />
  </ItemGroup>
</Project>
```

---

### 3.4 Presentation Layer (API)

#### BaseController Template
Generate the FULL BaseController with:
- `[Authorize]` attribute
- Constructor injection of `IStringLocalizer` and `ISystemErrorLogService`
- `GetUserId()` — extracts user ID from JWT claims (`"Identity"` claim)
- `GetClientId()` — extracts tenant/client ID from JWT claims (`"Tenant"` claim)
- `GetUserRole()` — extracts role from ClaimTypes.Role
- `GetUserName()` — extracts from User.Identity.Name
- `GetResultDtoAsync<TResult>()` — wraps service calls in ResponseDto with proper error handling (ApplicationException → 400, FieldAccessException → 400 with field data, Exception → 500)
- `GetStreamResultAsync()` — for file download responses
- `GetMultiErrorResultDtoAsync<TResult>()` — for multi-error field validation responses
- `GetResultDtoPagingAsync<TResult>()` — for paginated responses

**This is the MOST CRITICAL pattern.** Every controller inherits BaseController and uses `GetResultDtoAsync` to wrap ALL service calls.

#### Controller Template
```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Localization;
using {ProjectName}.Services.Interfaces.Services.{Module};
using {ProjectName}.Services.Interfaces.Services.Systems.Errors;
using {ProjectName}.Services.ServiceDtos.{Module};

namespace {ProjectName}.Api.Controllers
{
    [Route("api/{Entity}")]
    [ApiController]
    public class {Entity}Controller(
        I{Entity}Service {entity}Service,
        IStringLocalizer stringLocalizer,
        ISystemErrorLogService errorLog)
        : BaseController(stringLocalizer, errorLog)
    {
        private readonly I{Entity}Service _{entity}Service = {entity}Service;

        [HttpGet("GetAll")]
        [Produces<ResponseDto<List<{Entity}Dto>>>]
        public async Task<IActionResult> GetAll()
        {
            return await GetResultDtoAsync(async () =>
                await _{entity}Service.GetAll{Entity}s(GetClientId()));
        }

        [HttpGet("GetById/{id}")]
        [Produces<ResponseDto<{Entity}Dto>>]
        public async Task<IActionResult> GetById(int id)
        {
            return await GetResultDtoAsync(async () =>
                await _{entity}Service.Get{Entity}ById(id));
        }

        [HttpPost("Create")]
        [Produces<ResponseDto<int>>]
        public async Task<IActionResult> Create([FromBody] Create{Entity}Dto dto)
        {
            return await GetResultDtoAsync(async () =>
                await _{entity}Service.Create{Entity}(dto, GetUserId()),
                "Record created successfully");
        }

        [HttpPut("Update")]
        [Produces<ResponseDto<int>>]
        public async Task<IActionResult> Update([FromBody] Update{Entity}Dto dto)
        {
            return await GetResultDtoAsync(async () =>
                await _{entity}Service.Update{Entity}(dto, GetUserId()),
                "Record updated successfully");
        }

        [HttpDelete("Delete/{id}")]
        [Produces<ResponseDto<int>>]
        public async Task<IActionResult> Delete(int id)
        {
            return await GetResultDtoAsync(async () =>
                await _{entity}Service.Delete{Entity}(id, GetUserId()),
                "Record deleted successfully");
        }
    }
}
```

#### Program.cs Template
Generate the FULL Program.cs with:
1. `WebApplication.CreateBuilder(args)` minimal hosting
2. `.env` loading via `DotNetEnv`
3. Azure Key Vault configuration (dev vs prod)
4. `ConfigureAppSettingsOptions` binding
5. Application Insights telemetry
6. **ASP.NET Identity** with `IdentityUser`/`IdentityRole` using `AppDbContext`
7. **JWT Bearer Authentication** setup with symmetric key, no issuer/audience validation
8. Validator registration via FluentValidation
9. **Memory Cache** registration
10. File upload limit configuration (Kestrel + FormOptions)
11. **CORS** policy from config `CORSSettings:AllowedOrigins`
12. **Swagger/OpenAPI** with JWT security scheme
13. Localization middleware + `IStringLocalizer` → `JsonStringLocalizer`
14. WebHook registration
15. `AddApplicationDbContextAndRepositories` (Data layer DI)
16. `AddApplicationServices` (Service layer DI)
17. **EventBus** singleton + scoped event handlers
18. `IHttpContextAccessor` + `IActionContextAccessor`
19. **Rate limiting** service
20. **Authorization policies** (AdminOnly, AdminHROnly, etc.)
21. Controller registration with global filters (ClaimAuthorizationFilter, ValidateFilter)
22. **Quartz.NET** scheduler setup with JobFactory, hosted service
23. App pipeline: RequestLocalization → StaticFiles → Swagger → CORS → RateLimiting → HTTPS → Auth → AuthZ → MapControllers

#### Middleware Templates

**ExceptionHandler** — Catches all unhandled exceptions, logs via ISystemErrorLogService, returns structured ResponseDto JSON.

**RateLimitingMiddleware** — IP-based fixed-window rate limiting using IRateLimitService.

#### Filter Templates

**ClaimAuthorizationFilter** — Validates JWT claims per-request
**ValidateFilter** — ModelState validation filter
**SwaggerIgnoreSchemaFilter/OperationFilter** — Hides annotated props from Swagger

#### EventBus Pattern
Generate the full EventBus system:
- `IntegrationEvent` base class (with Id and CreatedDate)
- `IIntegrationEventHandler<TEvent>` interface (with Handle method)
- `IEventBus` interface (Publish, Subscribe, Unsubscribe)
- `EventBus` implementation using Dictionary<Type, List<Type>> for handler registration

#### API .csproj Template
```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="DotNetEnv" Version="3.1.1" />
    <PackageReference Include="Microsoft.ApplicationInsights.AspNetCore" Version="2.22.0" />
    <PackageReference Include="FluentValidation" Version="12.0.0" />
    <PackageReference Include="FluentValidation.AspNetCore" Version="11.3.1" />
    <PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="8.0.3" />
    <PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="8.0.3" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="8.0.3">
      <PrivateAssets>all</PrivateAssets>
    </PackageReference>
    <PackageReference Include="Quartz" Version="3.11.0" />
    <PackageReference Include="Quartz.Extensions.Hosting" Version="3.11.0" />
    <PackageReference Include="Swashbuckle.AspNetCore" Version="6.5.0" />
    <PackageReference Include="System.IdentityModel.Tokens.Jwt" Version="7.4.1" />
  </ItemGroup>
  <ItemGroup>
    <ProjectReference Include="..\..\Infrastructure\Data\{ProjectName}.Data\{ProjectName}.Data.csproj" />
    <ProjectReference Include="..\..\Services\{ProjectName}.Services\{ProjectName}.Services.csproj" />
  </ItemGroup>
</Project>
```

#### appsettings.json Template
```json
{
  "AllowedHosts": "*",
  "ApplicationInsights": {
    "ConnectionString": ""
  },
  "ConnectionStrings": {
    "AppDb": ""
  },
  "AuthorizationSettings": {
    "AuthKey": "your-256-bit-secret-key-here-minimum-32-chars!!"
  },
  "CORSSettings": {
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:5173"
    ]
  },
  "RateLimiting": {
    "Seconds": 1,
    "Enabled": 1,
    "MaxRequestsPerSecond": 20
  },
  "AzureBlobStorage": {
    "ContainerName": "",
    "ConnectionString": ""
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information"
    }
  }
}
```

---

### 3.5 Solution File Template

Generate the `.sln` file following this exact structure, modeled on Speccon_TAP_Ext:

**Project listing order** (critical — the root stub must be the FIRST real project entry, outside any solution folder):

```
1. {ProjectName}_Host  ← root stub csproj (NOT nested inside any solution folder)
2. src                 ← virtual solution folder
   └── Domain          ← virtual solution folder
       └── {ProjectName}.Domain
   └── Infrastructure  ← virtual solution folder
       └── Data        ← virtual solution folder (nested inside Infrastructure)
           └── {ProjectName}.Data
   └── Services        ← virtual solution folder
       ├── {ProjectName}.Services
       └── {ProjectName}.Services.Test
   └── Presentation    ← virtual solution folder
       └── {ProjectName}.Api
       └── (optional) {ProjectName}.Enterprise, {ProjectName}.Scheduler, etc.
```

**Concrete `.sln` skeleton** (replace GUIDs with freshly generated ones, keep type GUIDs fixed):

```
Microsoft Visual Studio Solution File, Format Version 12.00
# Visual Studio Version 17
VisualStudioVersion = 17.0.31903.59
MinimumVisualStudioVersion = 10.0.40219.1
Project("{9A19103F-16F7-4668-BE54-9A1E7A4F7556}") = "{ProjectName}_Host", "{ProjectName}_Host.csproj", "{STUB-GUID}"
EndProject
Project("{2150E333-8FDC-42A3-9474-1A3956D46DE8}") = "src", "src", "{SRC-GUID}"
EndProject
Project("{2150E333-8FDC-42A3-9474-1A3956D46DE8}") = "Domain", "Domain", "{DOMAIN-FOLDER-GUID}"
EndProject
Project("{9A19103F-16F7-4668-BE54-9A1E7A4F7556}") = "{ProjectName}.Domain", "src\Domain\{ProjectName}.Domain\{ProjectName}.Domain.csproj", "{DOMAIN-GUID}"
EndProject
Project("{2150E333-8FDC-42A3-9474-1A3956D46DE8}") = "Infrastructure", "Infrastructure", "{INFRA-FOLDER-GUID}"
EndProject
Project("{2150E333-8FDC-42A3-9474-1A3956D46DE8}") = "Data", "Data", "{DATA-FOLDER-GUID}"
EndProject
Project("{9A19103F-16F7-4668-BE54-9A1E7A4F7556}") = "{ProjectName}.Data", "src\Infrastructure\Data\{ProjectName}.Data\{ProjectName}.Data.csproj", "{DATA-GUID}"
EndProject
Project("{2150E333-8FDC-42A3-9474-1A3956D46DE8}") = "Services", "Services", "{SERVICES-FOLDER-GUID}"
EndProject
Project("{9A19103F-16F7-4668-BE54-9A1E7A4F7556}") = "{ProjectName}.Services", "src\Services\{ProjectName}.Services\{ProjectName}.Services.csproj", "{SERVICES-GUID}"
EndProject
Project("{9A19103F-16F7-4668-BE54-9A1E7A4F7556}") = "{ProjectName}.Services.Test", "src\Services\{ProjectName}.Services.Test\{ProjectName}.Services.Test.csproj", "{SERVICES-TEST-GUID}"
EndProject
Project("{2150E333-8FDC-42A3-9474-1A3956D46DE8}") = "Presentation", "Presentation", "{PRESENTATION-FOLDER-GUID}"
EndProject
Project("{9A19103F-16F7-4668-BE54-9A1E7A4F7556}") = "{ProjectName}.Api", "src\Presentation\{ProjectName}.Api\{ProjectName}.Api.csproj", "{API-GUID}"
EndProject
Global
    GlobalSection(SolutionConfigurationPlatforms) = preSolution
        Debug|Any CPU = Debug|Any CPU
        Release|Any CPU = Release|Any CPU
    EndGlobalSection
    GlobalSection(ProjectConfigurationPlatforms) = postSolution
        {STUB-GUID}.Debug|Any CPU.ActiveCfg = Debug|Any CPU
        {STUB-GUID}.Debug|Any CPU.Build.0 = Debug|Any CPU
        {STUB-GUID}.Release|Any CPU.ActiveCfg = Release|Any CPU
        {STUB-GUID}.Release|Any CPU.Build.0 = Release|Any CPU
        {DOMAIN-GUID}.Debug|Any CPU.ActiveCfg = Debug|Any CPU
        {DOMAIN-GUID}.Debug|Any CPU.Build.0 = Debug|Any CPU
        {DOMAIN-GUID}.Release|Any CPU.ActiveCfg = Release|Any CPU
        {DOMAIN-GUID}.Release|Any CPU.Build.0 = Release|Any CPU
        {DATA-GUID}.Debug|Any CPU.ActiveCfg = Debug|Any CPU
        {DATA-GUID}.Debug|Any CPU.Build.0 = Debug|Any CPU
        {DATA-GUID}.Release|Any CPU.ActiveCfg = Release|Any CPU
        {DATA-GUID}.Release|Any CPU.Build.0 = Release|Any CPU
        {SERVICES-GUID}.Debug|Any CPU.ActiveCfg = Debug|Any CPU
        {SERVICES-GUID}.Debug|Any CPU.Build.0 = Debug|Any CPU
        {SERVICES-GUID}.Release|Any CPU.ActiveCfg = Release|Any CPU
        {SERVICES-GUID}.Release|Any CPU.Build.0 = Release|Any CPU
        {SERVICES-TEST-GUID}.Debug|Any CPU.ActiveCfg = Debug|Any CPU
        {SERVICES-TEST-GUID}.Debug|Any CPU.Build.0 = Debug|Any CPU
        {SERVICES-TEST-GUID}.Release|Any CPU.ActiveCfg = Release|Any CPU
        {SERVICES-TEST-GUID}.Release|Any CPU.Build.0 = Release|Any CPU
        {API-GUID}.Debug|Any CPU.ActiveCfg = Debug|Any CPU
        {API-GUID}.Debug|Any CPU.Build.0 = Debug|Any CPU
        {API-GUID}.Release|Any CPU.ActiveCfg = Release|Any CPU
        {API-GUID}.Release|Any CPU.Build.0 = Release|Any CPU
    EndGlobalSection
    GlobalSection(SolutionProperties) = preSolution
        HideSolutionNode = FALSE
    EndGlobalSection
    GlobalSection(NestedProjects) = preSolution
        {DOMAIN-FOLDER-GUID} = {SRC-GUID}
        {DOMAIN-GUID} = {DOMAIN-FOLDER-GUID}
        {INFRA-FOLDER-GUID} = {SRC-GUID}
        {DATA-FOLDER-GUID} = {INFRA-FOLDER-GUID}
        {DATA-GUID} = {DATA-FOLDER-GUID}
        {SERVICES-FOLDER-GUID} = {SRC-GUID}
        {SERVICES-GUID} = {SERVICES-FOLDER-GUID}
        {SERVICES-TEST-GUID} = {SERVICES-FOLDER-GUID}
        {PRESENTATION-FOLDER-GUID} = {SRC-GUID}
        {API-GUID} = {PRESENTATION-FOLDER-GUID}
    EndGlobalSection
    GlobalSection(ExtensibilityGlobals) = preSolution
        SolutionGuid = {SOLUTION-GUID}
    EndGlobalSection
EndGlobal
```

**Key rules:**
- The stub (`{ProjectName}_Host`) is listed first, outside `NestedProjects` — it sits at the solution root level
- All real projects are nested inside `src/` and their respective layer folder
- The `{9A19103F-16F7-4668-BE54-9A1E7A4F7556}` type GUID is the C# SDK-style project type
- The `{2150E333-8FDC-42A3-9474-1A3956D46DE8}` type GUID is the virtual solution folder type
- Generate a unique GUID for every placeholder using `[System.Guid]::NewGuid().ToString("B").ToUpper()` or equivalent

---

## PHASE 4: PROJECT REFERENCES & DEPENDENCY FLOW

The dependency flow MUST be strictly:

```
Domain ← Services ← Data ← API
  (no dependencies)   (refs Services)  (refs Services)   (refs Data + Services)
```

- **Domain** — Zero project references. Only basic NuGet (EF Core abstractions, IdentityModel.Tokens)
- **Services** — References Domain only. Contains interfaces, DTOs, service implementations
- **Data** — References Services (to implement repository interfaces). Contains EF Core, Dapper, DbContext
- **API (Presentation)** — References Data + Services. Contains controllers, middleware, Program.cs

### Canonical Project Reference Paths

These are the EXACT relative paths to use in each `.csproj`. Using wrong paths is the #1 cause of broken builds in generated projects. Copy these verbatim, substituting `{ProjectName}`.

| Source project (csproj location) | Target project | Relative `<ProjectReference>` path |
|---|---|---|
| `src/Services/{ProjectName}.Services/` | `{ProjectName}.Domain` | `..\..\Domain\{ProjectName}.Domain\{ProjectName}.Domain.csproj` |
| `src/Infrastructure/Data/{ProjectName}.Data/` | `{ProjectName}.Services` | `..\..\..\Services\{ProjectName}.Services\{ProjectName}.Services.csproj` |
| `src/Presentation/{ProjectName}.Api/` | `{ProjectName}.Data` | `..\..\Infrastructure\Data\{ProjectName}.Data\{ProjectName}.Data.csproj` |
| `src/Presentation/{ProjectName}.Api/` | `{ProjectName}.Services` | `..\..\Services\{ProjectName}.Services\{ProjectName}.Services.csproj` |
| `src/Services/{ProjectName}.Services.Test/` | `{ProjectName}.Services` | `..\{ProjectName}.Services\{ProjectName}.Services.csproj` |

**Verification rule:** After emitting all `.csproj` files, count the `..` segments relative to each project's folder depth from the solution root and confirm they resolve correctly before proceeding to Phase 5.

---

## PHASE 5: DI WIRING CHECKLIST

After generating all files, ensure the DI is complete:

1. **Every entity** → has a `IGenericRepository<Entity>` registered in Data DI
2. **Every service interface** → has a concrete implementation registered in Services DI
3. **Every controller** → injects only service interfaces (never repositories directly)
4. **UnitOfWork** → registered as transient
5. **DbContext** → registered via `AddDbContextFactory`
6. **BaseController dependencies** — IStringLocalizer + ISystemErrorLogService always available
7. **Global filters** — registered in `AddControllers(options => ...)`

---

## PHASE 6: VERIFICATION (MANDATORY — DO NOT SKIP)

After generating all code you MUST run the following commands and fix every error before handing off. Do not mark the task complete until all three checks pass.

### Step 1 — Full solution build

```bash
dotnet build {ProjectName}.sln
```

**Pass criteria:** Zero errors, zero warnings-as-errors. If any errors appear, fix them (missing usings, broken project references, unresolved DI registrations) and re-run until clean.

### Step 2 — Root stub boot check

```bash
# Run from the solution root directory
dotnet run
```

**Pass criteria:** Process starts without a build error. You should see output like:
```
Now listening on: http://localhost:5000
Application started. Press Ctrl+C to shut down.
```
The stub does not need a database — it must simply start. If it fails to start, fix the stub csproj/Program.cs/view files and re-run.

### Step 3 — Real API boot check

```bash
dotnet run --project src/Presentation/{ProjectName}.Api/{ProjectName}.Api.csproj
```

**Pass criteria:** Process starts (a missing connection string is acceptable at this stage — the check is that the build and host startup pipeline succeed, not that the DB is reachable). Expected output:
```
Now listening on: https://localhost:{ApiPort}
```

### Step 4 — Static verification checklist

After all three commands pass, confirm:

- [ ] Every entity has an `IGenericRepository<Entity>` registration in Data DI
- [ ] Every `I{Service}Service` interface has a concrete implementation registered in Services DI
- [ ] Every controller inherits `BaseController` and uses `GetResultDtoAsync` for ALL service calls
- [ ] `UnitOfWork` registered as transient
- [ ] `DbContext` registered via `AddDbContextFactory`
- [ ] Global filters (`ClaimAuthorizationFilter`, `ValidateFilter`) registered in `AddControllers(options => ...)`
- [ ] Swagger loads at `/swagger` (check route in Program.cs middleware pipeline)
- [ ] All project reference paths verified against the Canonical Paths table in Phase 4

---

## CRITICAL PATTERNS TO ALWAYS INCLUDE

1. **Generic Repository Pattern** — `GenericRepository<T>` with expression-based queries
2. **Unit of Work** — Transaction management with execution strategy
3. **BaseController wrapper** — `GetResultDtoAsync` wrapping ALL service calls
4. **ResponseDto<T>** — Standard API response envelope
5. **JWT Authentication** — SymmetricSecurityKey from config
6. **Role-based Authorization** — Policy-based with `[Authorize]`
7. **FluentValidation** — Request DTO validation
8. **Global Exception Handling** — Middleware + BaseController catch blocks
9. **Localization** — IStringLocalizer for error messages
10. **EventBus** — Publish/Subscribe for background processing
11. **Quartz.NET** — Job scheduling infrastructure
12. **Azure Key Vault** — Secret management
13. **Application Insights** — Telemetry
14. **Rate Limiting** — IP-based request throttling
15. **CORS** — Configurable origins
16. **Swagger** — OpenAPI documentation with JWT auth
17. **Pagination** — PagedResult<T> + GetPagedAsync extension
18. **Soft Delete** — RecordStatusId pattern
19. **Multi-tenancy** — ClientId/TenantId claim-based isolation
20. **Blob Storage** — Azure Blob for file uploads

---

## NAMING CONVENTIONS

| Item | Convention | Example |
|------|-----------|---------|
| Solution | `{ProjectName}.sln` | `EasyChef.sln` |
| Entity class | PascalCase singular | `User`, `Order`, `Product` |
| Entity PK | `{EntityName}Id` | `UserId`, `OrderId` |
| Entity GUID | `{EntityName}Key` | `UserKey`, `OrderKey` |
| DbSet | PascalCase plural | `Users`, `Orders` |
| Service interface | `I{Entity}Service` | `IUserService` |
| Service class | `{Entity}Service` | `UserService` |
| Controller | `{Entity}Controller` | `UserController` |
| DTO | `{Entity}{Action}Dto` | `UserLoginDto`, `CreateOrderDto` |
| Repository | `IGenericRepository<{Entity}>` | `IGenericRepository<User>` |
| Custom repo | `I{Module}Repository` | `IUserRepository` |
| Constants | `{Module}Constants` | `PaymentConstants` |
| Enum | `{Name}Enum` | `OrderStatusEnum` |
| Namespace - Domain | `{ProjectName}.Domain.Entities` | `EasyChef.Domain.Entities` |
| Namespace - Data | `{ProjectName}.Data.AppContext` | `EasyChef.Data.AppContext` |
| Namespace - Services | `{ProjectName}.Services.Services.{Module}` | `EasyChef.Services.Services.Users` |
| Namespace - API | `{ProjectName}.Api.Controllers` | `EasyChef.Api.Controllers` |
| Route | `api/{Entity}` | `api/User`, `api/Order` |

---

## EXECUTION ORDER

When triggered, follow this exact order:

1. **Analyze** — Read PRD/frontend, extract entities, modules, endpoints
2. **Confirm** — Present analysis to user, get approval
3. **Root Stub** — Create `{ProjectName}_Host.csproj`, `Program.cs`, `appsettings.json`, `appsettings.Development.json`, `Properties/launchSettings.json`, `Controllers/HomeController.cs`, `Views/` files, `Models/ErrorViewModel.cs`, `wwwroot/`, `.gitignore`, `README.md` (Phase 2.5)
4. **Domain** — Create entities, constants, enums, extensions, helpers, csproj
5. **Services (Interfaces)** — Create IGenericRepository, IUnitOfWork, service interfaces, DTOs
6. **Services (Implementations)** — Create service implementations, DI registration
7. **Infrastructure (Data)** — Create DbContext, GenericRepository, UnitOfWork, repo DI, csproj
8. **Presentation (API)** — Create Program.cs, BaseController, Controllers, Middleware, Filters, EventBus, csproj
9. **Solution** — Create `.sln` file with stub as first project + all real projects nested under `src/` solution folders (Phase 3.5)
10. **Wire DI** — Ensure all registrations complete across all DI extension files; verify paths against Canonical Paths table (Phase 4)
11. **Verify** — Run `dotnet build {ProjectName}.sln`, then `dotnet run`, then `dotnet run --project src/Presentation/{ProjectName}.Api/...`; fix ALL errors before completing (Phase 6 — MANDATORY)
