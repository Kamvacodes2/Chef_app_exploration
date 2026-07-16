# SKILL 03: SCAFFOLD NEW PROJECT
## Step-by-Step Guide to Bootstrap Any New ERP Backend

> **For any LLM:** Follow this guide in exact order.
> Do NOT skip phases. Each phase depends on the previous.

---

## PHASE 0: GATHER REQUIREMENTS FIRST

Before writing code, answer these questions:

1. **What is the app name?** → becomes `YourProject` namespace everywhere
2. **Which domains do you need?** → Use the matrix in `02-domain-modules.md`
3. **External integrations?** → Moodle? WhatsApp? PayFast? Email?
4. **Auth model?** → JWT (always), multi-tenant?
5. **Database?** → SQL Server (production default)
6. **Deployment target?** → Azure (default), AWS, on-prem

### Domain Selection Matrix

| App Type | Required Domains |
|----------|-----------------|
| E-learning platform | Users, Auth, LMS/Courses, Notifications, Payments, Documents |
| Corporate HR system | Users, Auth, HR/Equity, Documents, Notifications, Reporting |
| SaaS multi-tenant | Users, Auth, CRM, Multi-tenancy, Payments, Notifications, Scheduling |
| Training company | Users, Auth, LMS, Learnerships, CRM, Payments, Moodle, WhatsApp |
| Mobile app backend | Users, Auth, Notifications, Scheduling, Documents |
| School platform | Users, Auth, Academy, LMS, Teams, Parents/Students, Scheduling |
| Full ERP | ALL domains |

---

## PHASE 1: CREATE SOLUTION STRUCTURE

```powershell
# 1. Create solution root
mkdir YourProject && cd YourProject
dotnet new sln -n YourProject

# 2. Create projects
# Domain
dotnet new classlib -n YourProject.Domain -o src/Domain/YourProject.Domain --framework net8.0

# Data
dotnet new classlib -n YourProject.Data -o src/Infrastructure/Data/YourProject.Data --framework net8.0

# Service Interfaces
dotnet new classlib -n YourProject.Services.Interfaces -o src/Services/YourProject.Services.Interfaces --framework net8.0

# Services
dotnet new classlib -n YourProject.Services -o src/Services/YourProject.Services --framework net8.0

# API
dotnet new webapi -n YourProject.Api -o src/Presentation/YourProject.Api --framework net8.0

# Optional: Scheduler
dotnet new webapi -n YourProject.Scheduler -o src/Presentation/YourProject.Scheduler --framework net8.0

# 3. Add to solution
dotnet sln add src/Domain/YourProject.Domain/YourProject.Domain.csproj
dotnet sln add src/Infrastructure/Data/YourProject.Data/YourProject.Data.csproj
dotnet sln add src/Services/YourProject.Services.Interfaces/YourProject.Services.Interfaces.csproj
dotnet sln add src/Services/YourProject.Services/YourProject.Services.csproj
dotnet sln add src/Presentation/YourProject.Api/YourProject.Api.csproj

# 4. Add project references (follow dependency direction from 01-architecture.md)
dotnet add src/Services/YourProject.Services/YourProject.Services.csproj reference src/Domain/YourProject.Domain/YourProject.Domain.csproj
dotnet add src/Services/YourProject.Services/YourProject.Services.csproj reference src/Services/YourProject.Services.Interfaces/YourProject.Services.Interfaces.csproj
dotnet add src/Infrastructure/Data/YourProject.Data/YourProject.Data.csproj reference src/Domain/YourProject.Domain/YourProject.Domain.csproj
dotnet add src/Infrastructure/Data/YourProject.Data/YourProject.Data.csproj reference src/Services/YourProject.Services.Interfaces/YourProject.Services.Interfaces.csproj
dotnet add src/Presentation/YourProject.Api/YourProject.Api.csproj reference src/Infrastructure/Data/YourProject.Data/YourProject.Data.csproj
dotnet add src/Presentation/YourProject.Api/YourProject.Api.csproj reference src/Services/YourProject.Services/YourProject.Services.csproj
```

---

## PHASE 2: INSTALL NUGET PACKAGES

```powershell
$api = "src/Presentation/YourProject.Api/YourProject.Api.csproj"
$data = "src/Infrastructure/Data/YourProject.Data/YourProject.Data.csproj"
$svc = "src/Services/YourProject.Services/YourProject.Services.csproj"
$domain = "src/Domain/YourProject.Domain/YourProject.Domain.csproj"

# Domain — minimal
dotnet add $domain package Microsoft.EntityFrameworkCore --version 8.0.11

# Data — EF Core SQL Server
dotnet add $data package Microsoft.EntityFrameworkCore.SqlServer --version 8.0.11
dotnet add $data package Microsoft.EntityFrameworkCore.Design --version 8.0.11
dotnet add $data package Microsoft.AspNetCore.Identity.EntityFrameworkCore --version 8.0.11
dotnet add $data package Dapper --version 2.1.35

# Services — business logic dependencies
dotnet add $svc package Newtonsoft.Json --version 13.0.3
dotnet add $svc package Microsoft.Extensions.Http --version 8.0.0
dotnet add $svc package Microsoft.Extensions.Options --version 8.0.0
dotnet add $svc package CryptSharp.Standard --version 2.1.0  # if Moodle integration
dotnet add $svc package QuestPDF --version 2025.1.5           # if PDF generation

# API — presentation layer
dotnet add $api package Microsoft.AspNetCore.Authentication.JwtBearer --version 8.0.11
dotnet add $api package Microsoft.AspNetCore.OpenApi --version 8.0.11
dotnet add $api package Swashbuckle.AspNetCore --version 6.5.0
dotnet add $api package FluentValidation --version 12.0.0
dotnet add $api package FluentValidation.AspNetCore --version 11.3.1
dotnet add $api package Quartz --version 3.11.0
dotnet add $api package Quartz.Extensions.Hosting --version 3.11.0
dotnet add $api package Serilog.AspNetCore --version 8.0.1
dotnet add $api package Serilog.Sinks.MSSqlServer --version 6.6.0
dotnet add $api package DotNetEnv --version 3.1.1
dotnet add $api package System.IdentityModel.Tokens.Jwt --version 7.4.1
dotnet add $api package Microsoft.ApplicationInsights.AspNetCore --version 2.22.0
```

---

## PHASE 3: DOMAIN — ENTITIES & CONSTANTS

### 3.1 Create base entity (all entities inherit this or copy the pattern)
```csharp
// src/Domain/YourProject.Domain/Entities/Base/BaseEntity.cs
public abstract class BaseEntity
{
    public int RecordStatusId { get; set; } = 1; // 1=Active default
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public DateTime ModifiedDate { get; set; } = DateTime.UtcNow;
}
```

### 3.2 Create Constants.cs
```csharp
// src/Domain/YourProject.Domain/Constants/Constants.cs
public static class Constants
{
    // Record status
    public const int ActiveRecordStatusID = 1;
    public const int InactiveRecordStatusID = 2;
    public const int DeletedRecordStatusID = 3;
    public const int PendingRecordStatusID = 4;
    public const int ZeroValue = 0;

    // Auth policies
    public const string AdminOnlyPolicy = "AdminOnly";
    public const string AdminHROnlyPolicy = "AdminHROnly";
    public const string EmployeeOnlyPolicy = "EmployeeOnly";
    public const string HROnlyPolicy = "HROnly";
}

public static class UserRoles
{
    public const string Admin = "Admin";
    public const string HR = "HR";
    public const string Employee = "Employee";
    public const string Learner = "Learner";
    public const string Sales = "Sales";
    public const string TeamLeader = "TeamLeader";
}
```

### 3.3 Create core entities (one file per entity)
```csharp
// src/Domain/YourProject.Domain/Entities/User.cs
public class User
{
    public int UserId { get; set; }
    public Guid UserKey { get; set; } = Guid.NewGuid();
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public Guid LmsKey { get; set; } = Guid.NewGuid(); // Moodle password seed
    public int? MoodleUserId { get; set; }
    public int RecordStatusId { get; set; } = Constants.ActiveRecordStatusID;
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public DateTime ModifiedDate { get; set; } = DateTime.UtcNow;
}

// Add all other entities for your chosen domains from 02-domain-modules.md
```

### 3.4 Create settings DTO
```csharp
// src/Domain/YourProject.Domain/Constants/AppSettingsDto.cs
public class AppSettingsDto
{
    public ConnectionStringsDto ConnectionStrings { get; set; } = new();
    public MoodleSettingsDto Moodle { get; set; } = new();
    public MoodleWebServiceDto MoodleWebService { get; set; } = new();
    public AuthorizationSettingsDto AuthorizationSettings { get; set; } = new();
    public CorsSettingsDto CORSSettings { get; set; } = new();
}

public class ConnectionStringsDto { public string AppDb { get; set; } = string.Empty; }
public class AuthorizationSettingsDto { public string AuthKey { get; set; } = string.Empty; }
public class CorsSettingsDto { public string[] AllowedOrigins { get; set; } = []; }
public class MoodleSettingsDto { public string Url { get; set; } = string.Empty; public string Login { get; set; } = string.Empty; }
public class MoodleWebServiceDto
{
    public string Url { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public string GetUserRequestUrl { get; set; } = string.Empty;
    public string CreateUserUrl { get; set; } = string.Empty;
    public string UpdateUserUrl { get; set; } = string.Empty;
    public string EnrolUserUrl { get; set; } = string.Empty;
}
```

---

## PHASE 4: DATA — DBCONTEXT & REPOSITORIES

### 4.1 AppDbContext
```csharp
// src/Infrastructure/Data/YourProject.Data/AppContext/AppDbContext.cs
public class AppDbContext : IdentityDbContext<IdentityUser, ApplicationRole, string>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users { get; set; }
    public DbSet<SystemErrorLog> SystemErrorLogs { get; set; }
    public DbSet<SystemConfiguration> SystemConfigurations { get; set; }
    public DbSet<EmailNotification> EmailNotifications { get; set; }
    // Add DbSet for each entity in your chosen domains

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}

public class ApplicationRole : IdentityRole
{
    public ApplicationRole() : base() { }
    public ApplicationRole(string roleName) : base(roleName) { }
}
```

### 4.2 Copy GenericRepository from 01-architecture.md

### 4.3 Copy UnitOfWork from 01-architecture.md

### 4.4 Create DI Extensions
```csharp
// src/Infrastructure/Data/YourProject.Data/DependencyInjectionExtensions.cs
public static class DependencyInjectionExtensions
{
    public static IServiceCollection AddApplicationDbContextAndRepositories(
        this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlServer(configuration.GetConnectionString("AppDb"),
                sql => sql.EnableRetryOnFailure(3)));

        services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        return services;
    }
}
```

### 4.5 Create initial migration
```powershell
cd src/Infrastructure/Data/YourProject.Data
dotnet ef migrations add InitialCreate --startup-project ../../Presentation/YourProject.Api
dotnet ef database update --startup-project ../../Presentation/YourProject.Api
```

---

## PHASE 5: SERVICE INTERFACES

### 5.1 System error log interface (always first — used by all services)
```csharp
// src/Services/YourProject.Services.Interfaces/Services/Systems/ISystemErrorLogService.cs
public interface ISystemErrorLogService
{
    void LogSystemError(string parameters, string errorMessage, string layer,
        string className, string methodName, Guid userKey, string additionalContext);
    Task<IEnumerable<SystemErrorLog>> GetRecentErrors(int count = 100);
}
```

### 5.2 User service interface
```csharp
// src/Services/YourProject.Services.Interfaces/Services/Users/IUserService.cs
public interface IUserService
{
    Task<UserDto> GetUserByKey(Guid userKey);
    Task<UserDto> GetUserByEmail(string email);
    Task<User> UpdateUser(User user);
    Task<UserDto> CreateUser(CreateUserDto dto);
    Task<bool> DeactivateUser(Guid userKey);
    Task<PagedResponseDto<UserDto>> GetUsersPaginated(RequestDto request, string? search = null);
}
```

### 5.3 Add interfaces for each domain service you need
Pattern: `I{Domain}Service` in matching subfolder under `Services/`

---

## PHASE 6: SERVICE IMPLEMENTATIONS

### 6.1 Standard service pattern (copy for every service)
```csharp
// src/Services/YourProject.Services/Services/Users/UserService.cs
public class UserService : IUserService
{
    private readonly IGenericRepository<User> _userRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ISystemErrorLogService _errorLog;

    public UserService(
        IGenericRepository<User> userRepository,
        IUnitOfWork unitOfWork,
        ISystemErrorLogService errorLog)
    {
        _userRepository = userRepository;
        _unitOfWork = unitOfWork;
        _errorLog = errorLog;
    }

    public async Task<UserDto> GetUserByKey(Guid userKey)
    {
        try
        {
            var user = await _userRepository.GetByCondition(
                x => x.UserKey == userKey && x.RecordStatusId == Constants.ActiveRecordStatusID,
                tracking: false);
            return user?.ToDto() ?? throw new KeyNotFoundException($"User {userKey} not found");
        }
        catch (Exception ex)
        {
            _errorLog.LogSystemError(userKey.ToString(), ex.ToString(),
                "Service", nameof(UserService), nameof(GetUserByKey), userKey, string.Empty);
            throw;
        }
    }

    public async Task<User> UpdateUser(User user)
    {
        try
        {
            user.ModifiedDate = DateTime.UtcNow;
            var updated = await _userRepository.UpdateAsync(user);
            await _unitOfWork.SaveChangesAsync();
            return updated;
        }
        catch (Exception ex)
        {
            _errorLog.LogSystemError(user.UserKey.ToString(), ex.ToString(),
                "Service", nameof(UserService), nameof(UpdateUser), user.UserKey, string.Empty);
            throw;
        }
    }
}
```

### 6.2 Add all service registrations to DI Extensions
```csharp
// Add to DependencyInjectionExtensions.cs
public static IServiceCollection AddApplicationServices(
    this IServiceCollection services, IConfiguration configuration)
{
    services.AddScoped<ISystemErrorLogService, SystemErrorLogService>();
    services.AddScoped<IUserService, UserService>();
    // Add each service for your chosen domains

    // HttpClients for external APIs
    services.AddHttpClient();  // base HttpClient
    // services.AddHttpClient<ILmsService, LmsService>(); // if Moodle
    return services;
}
```

---

## PHASE 7: API — CONTROLLERS & MIDDLEWARE

### 7.1 Base controller (all controllers inherit this)
```csharp
// src/Presentation/YourProject.Api/Controllers/BaseController.cs
[ApiController]
[Route("api/[controller]")]
[Authorize]
public abstract class BaseController : ControllerBase
{
    protected Guid CurrentUserKey
    {
        get
        {
            var claim = User.FindFirst("userKey")?.Value;
            return Guid.TryParse(claim, out var key) ? key : Guid.Empty;
        }
    }

    protected string CurrentUserEmail
        => User.FindFirst(ClaimTypes.Email)?.Value ?? string.Empty;

    protected string CurrentUserRole
        => User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;

    protected IActionResult HandleException(Exception ex, string context = "")
    {
        return StatusCode(500, new { error = "An error occurred", detail = ex.Message });
    }
}
```

### 7.2 Standard controller pattern
```csharp
// src/Presentation/YourProject.Api/Controllers/UserController.cs
public class UserController : BaseController
{
    private readonly IUserService _userService;

    public UserController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet("{userKey:guid}")]
    public async Task<IActionResult> GetUser(Guid userKey)
    {
        var result = await _userService.GetUserByKey(userKey);
        return Ok(ApiResponse<UserDto>.Ok(result));
    }

    [HttpGet]
    [Authorize(Policy = Constants.AdminOnlyPolicy)]
    public async Task<IActionResult> GetUsers([FromQuery] RequestDto request, [FromQuery] string? search)
    {
        var result = await _userService.GetUsersPaginated(request, search);
        return Ok(ApiResponse<PagedResponseDto<UserDto>>.Ok(result));
    }

    [HttpPut("{userKey:guid}")]
    public async Task<IActionResult> UpdateUser(Guid userKey, [FromBody] UpdateUserDto dto)
    {
        // Only allow update of own profile unless admin
        if (CurrentUserKey != userKey && CurrentUserRole != UserRoles.Admin)
            return Forbid();

        var result = await _userService.UpdateUserProfile(userKey, dto);
        return Ok(ApiResponse<UserDto>.Ok(result));
    }
}
```

### 7.3 Auth middleware filter
```csharp
// src/Presentation/YourProject.Api/Filters/ClaimAuthorizationFilter.cs
public class ClaimAuthorizationFilter : IActionFilter
{
    public void OnActionExecuting(ActionExecutingContext context)
    {
        // Extract and validate JWT claims before every action
        var user = context.HttpContext.User;
        if (user.Identity?.IsAuthenticated == true)
        {
            // Claims available to all controllers
            context.HttpContext.Items["UserKey"] = user.FindFirst("userKey")?.Value;
            context.HttpContext.Items["ClientId"] = user.FindFirst("clientId")?.Value;
        }
    }

    public void OnActionExecuted(ActionExecutedContext context) { }
}
```

### 7.4 Rate limiting middleware
```csharp
// src/Presentation/YourProject.Api/Middleware/RateLimitingMiddleware.cs
public class RateLimitingMiddleware : IMiddleware
{
    private readonly IRateLimitService _rateLimitService;

    public RateLimitingMiddleware(IRateLimitService rateLimitService)
    {
        _rateLimitService = rateLimitService;
    }

    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        var clientIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        if (!_rateLimitService.IsAllowed(clientIp))
        {
            context.Response.StatusCode = 429;
            await context.Response.WriteAsync("Too Many Requests");
            return;
        }
        await next(context);
    }
}
```

---

## PHASE 8: CONFIGURATION FILES

### 8.1 appsettings.json
```json
{
  "ConnectionStrings": {
    "AppDb": "Server=localhost;Database=YourProjectDb;Trusted_Connection=True;TrustServerCertificate=True;"
  },
  "AuthorizationSettings": {
    "AuthKey": "YOUR_JWT_SECRET_MIN_32_CHARACTERS_LONG"
  },
  "CORSSettings": {
    "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"]
  },
  "ApplicationInsights": {
    "ConnectionString": ""
  },
  "RateLimiting": {
    "Enabled": "0"
  },
  "Moodle": {
    "Url": "",
    "Login": ""
  },
  "MoodleWebService": {
    "Url": "",
    "Token": "",
    "GetUserRequestUrl": "",
    "CreateUserUrl": "",
    "UpdateUserUrl": "",
    "EnrolUserUrl": ""
  }
}
```

### 8.2 .env file (local dev secrets — DO NOT commit)
```
DB_CONNECTION_STRING=Server=localhost;Database=YourProjectDb;...
JWT_AUTH_KEY=your-secret-key-32-chars-min
MOODLE_TOKEN=your-moodle-token
```

### 8.3 .gitignore additions
```
.env
*.user
**/bin/
**/obj/
appsettings.Production.json
```

---

## PHASE 9: SWAGGER & JWT SETUP

```csharp
// In Program.cs / Service extensions
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "YourProject API", Version = "v1" });

    var jwtScheme = new OpenApiSecurityScheme
    {
        BearerFormat = "JWT",
        Name = "JWT Authentication",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = JwtBearerDefaults.AuthenticationScheme,
        Description = "Enter your JWT Bearer token",
        Reference = new OpenApiReference
        {
            Id = JwtBearerDefaults.AuthenticationScheme,
            Type = ReferenceType.SecurityScheme
        }
    };

    c.AddSecurityDefinition(jwtScheme.Reference.Id, jwtScheme);
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        { jwtScheme, Array.Empty<string>() }
    });
});
```

---

## PHASE 10: SEED DATA

```csharp
// src/Infrastructure/Data/YourProject.Data/Seeding/DbSeeder.cs
public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext context, UserManager<IdentityUser> userManager)
    {
        // Seed roles
        string[] roles = [UserRoles.Admin, UserRoles.HR, UserRoles.Employee, UserRoles.Learner, UserRoles.Sales];
        foreach (var role in roles)
        {
            if (!await context.Roles.AnyAsync(r => r.Name == role))
                await context.Roles.AddAsync(new ApplicationRole(role));
        }

        // Seed admin user
        if (!await userManager.Users.AnyAsync())
        {
            var admin = new IdentityUser { Email = "admin@yourproject.com", UserName = "admin@yourproject.com" };
            await userManager.CreateAsync(admin, "Admin@123456");
            await userManager.AddToRoleAsync(admin, UserRoles.Admin);
        }

        // Seed record status
        if (!await context.Set<RecordStatus>().AnyAsync())
        {
            context.Set<RecordStatus>().AddRange(
                new RecordStatus { RecordStatusId = 1, StatusName = "Active" },
                new RecordStatus { RecordStatusId = 2, StatusName = "Inactive" }
            );
        }

        await context.SaveChangesAsync();
    }
}
```

---

## CHECKLIST: VERIFY YOUR SCAFFOLD IS COMPLETE

```
[ ] Solution builds with zero errors (dotnet build)
[ ] All project references follow dependency direction (see 01-architecture.md)
[ ] AppDbContext has DbSet for all entities
[ ] GenericRepository<T> is registered as scoped
[ ] IUnitOfWork is registered as scoped
[ ] ISystemErrorLogService is registered (used by all services)
[ ] JWT auth is configured with signing key
[ ] CORS policy matches your frontend origins
[ ] Swagger shows all endpoints with JWT auth header
[ ] appsettings.json has all required keys
[ ] .env file created for local dev secrets
[ ] Initial EF migration created and applied
[ ] Seed data runs on startup (in dev)
[ ] BaseController is the parent of all controllers
[ ] ClaimAuthorizationFilter is registered globally
[ ] RateLimitingMiddleware is in the pipeline
[ ] dotnet run starts without exceptions
[ ] GET /api/user returns 401 (not 500) when no token
```
