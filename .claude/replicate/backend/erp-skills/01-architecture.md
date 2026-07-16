# SKILL 01: ARCHITECTURE
## Clean Architecture Blueprint for Any ERP Backend

---

## 1. SOLUTION STRUCTURE (copy this for every new project)

```
YourProject.sln
│
├── src/
│   ├── Domain/
│   │   └── YourProject.Domain/
│   │       ├── Constants/           ← All magic numbers, IDs, role names, config keys
│   │       ├── Entities/            ← EF Core model classes (no logic)
│   │       ├── Enums/               ← All enumerations
│   │       ├── Extensions/          ← Entity-to-DTO mapping extension methods
│   │       └── Helper/              ← Pure utility classes (no DI dependencies)
│   │
│   ├── Infrastructure/
│   │   └── Data/
│   │       └── YourProject.Data/
│   │           ├── AppContext/      ← AppDbContext + entity configurations
│   │           ├── AppRepositories/ ← GenericRepository<T> implementation
│   │           ├── UnitOfWorks/     ← UnitOfWork implementation
│   │           ├── BackgroundServices/ ← IHostedService implementations
│   │           ├── Seeding/         ← Database seed data
│   │           └── DependencyInjectionExtensions.cs ← ALL repo/service DI registrations
│   │
│   ├── Services/
│   │   ├── YourProject.Services/
│   │   │   ├── Services/            ← Organised by domain (Users/, Courses/, etc.)
│   │   │   └── ServiceDtos/         ← Input/Output DTOs for each service
│   │   └── YourProject.Services.Interfaces/
│   │       ├── Services/            ← IXxxService interfaces
│   │       ├── AppRepositories/     ← IGenericRepository<T> interface
│   │       └── UnitOfWork/          ← IUnitOfWork interface
│   │
│   └── Presentation/
│       └── YourProject.Api/
│           ├── Controllers/         ← ApiController classes
│           ├── Authorization/       ← Custom auth handlers/requirements
│           ├── Filters/             ← Action filters (validation, auth, content)
│           ├── Middleware/          ← Custom pipeline middleware
│           ├── Extension/           ← IServiceCollection extension methods
│           ├── Localization/        ← JSON-based localizer
│           ├── Scheduler/           ← Quartz.NET job definitions
│           ├── EventManager/        ← In-process event bus
│           ├── Validators/          ← FluentValidation validators
│           ├── Uploads/             ← Static file upload directories
│           ├── EmailTemplates/      ← HTML email template files
│           ├── WebHooks/            ← Webhook handler implementations
│           ├── Program.cs           ← App bootstrap
│           ├── appsettings.json
│           └── appsettings.Development.json
```

---

## 2. DEPENDENCY DIRECTION (STRICT — NEVER VIOLATE)

```
Presentation  ──→  Services.Interfaces  ←──  Services
     │                                           │
     └──────────→  Data (DI only)  ←────────────┘
                        │
              Domain ←──┘
```

**Rules:**
- `Domain` has ZERO external dependencies (no NuGet, no EF, no HttpClient)
- `Data` depends on `Domain` only
- `Services` depends on `Domain` + `Services.Interfaces` only
- `Presentation` depends on `Services.Interfaces` + `Data` (for DI wiring only)
- **Never** reference `Services` directly from `Presentation` — only through interfaces

---

## 3. PROJECT FILE TEMPLATES

### Domain project (YourProject.Domain.csproj)
```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.EntityFrameworkCore" Version="8.0.11" />
  </ItemGroup>
</Project>
```

### Data project (YourProject.Data.csproj)
```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.EntityFrameworkCore.SqlServer" Version="8.0.11" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="8.0.11">
      <PrivateAssets>all</PrivateAssets>
    </PackageReference>
    <PackageReference Include="Dapper" Version="2.1.35" />
  </ItemGroup>
  <ItemGroup>
    <ProjectReference Include="..\..\Domain\YourProject.Domain\YourProject.Domain.csproj" />
    <ProjectReference Include="..\..\Services\YourProject.Services.Interfaces\YourProject.Services.Interfaces.csproj" />
  </ItemGroup>
</Project>
```

### API project (YourProject.Api.csproj)
```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="8.0.11" />
    <PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="8.0.11" />
    <PackageReference Include="Swashbuckle.AspNetCore" Version="6.5.0" />
    <PackageReference Include="FluentValidation.AspNetCore" Version="11.3.1" />
    <PackageReference Include="Quartz.Extensions.Hosting" Version="3.11.0" />
    <PackageReference Include="QuestPDF" Version="2025.1.5" />
    <PackageReference Include="Serilog.AspNetCore" Version="8.0.1" />
    <PackageReference Include="Serilog.Sinks.MSSqlServer" Version="6.6.0" />
    <PackageReference Include="DotNetEnv" Version="3.1.1" />
    <PackageReference Include="System.IdentityModel.Tokens.Jwt" Version="7.4.1" />
    <PackageReference Include="Microsoft.ApplicationInsights.AspNetCore" Version="2.22.0" />
  </ItemGroup>
  <ItemGroup>
    <ProjectReference Include="..\..\Infrastructure\Data\YourProject.Data\YourProject.Data.csproj" />
    <ProjectReference Include="..\..\Services\YourProject.Services\YourProject.Services.csproj" />
  </ItemGroup>
</Project>
```

---

## 4. GENERIC REPOSITORY PATTERN

### Interface
```csharp
// Services.Interfaces/AppRepositories/IGenericRepository.cs
public interface IGenericRepository<T> where T : class
{
    Task<T> GetByCondition(Expression<Func<T, bool>> expression, bool tracking = true);
    Task<IEnumerable<T>> GetAllAsync(
        Expression<Func<T, bool>>? expression = null,
        Func<IQueryable<T>, IIncludableQueryable<T, object>>? include = null,
        Expression<Func<T, object>>? orderByExpression = null,
        bool orderByDescending = false);
    Task<PagedResult<T>> GetAllPagingAsync(
        Expression<Func<T, bool>>? expression,
        Func<IQueryable<T>, IIncludableQueryable<T, object>>? include,
        Expression<Func<T, object>>? orderByExpression,
        bool orderByDescending,
        int page, int pageSize, bool trackChanges = false);
    Task<T> AddAsync(T entity);
    Task<T> UpdateAsync(T entity);
    Task DeleteAsync(T entity);
    Task<bool> AnyAsync(Expression<Func<T, bool>> expression);
    Task<int> CountAsync(Expression<Func<T, bool>>? expression = null);
    IQueryable<T> GetQueryable(Expression<Func<T, bool>>? expression = null);
}
```

### Implementation
```csharp
// Data/AppRepositories/GenericRepository.cs
public class GenericRepository<T> : IGenericRepository<T> where T : class
{
    protected readonly AppDbContext _context;
    protected readonly DbSet<T> _dbSet;

    public GenericRepository(AppDbContext context)
    {
        _context = context;
        _dbSet = context.Set<T>();
    }

    public async Task<T> GetByCondition(Expression<Func<T, bool>> expression, bool tracking = true)
    {
        var query = tracking ? _dbSet.AsTracking() : _dbSet.AsNoTracking();
        return await query.FirstOrDefaultAsync(expression);
    }

    public async Task<IEnumerable<T>> GetAllAsync(
        Expression<Func<T, bool>>? expression = null,
        Func<IQueryable<T>, IIncludableQueryable<T, object>>? include = null,
        Expression<Func<T, object>>? orderByExpression = null,
        bool orderByDescending = false)
    {
        IQueryable<T> query = _dbSet.AsNoTracking();
        if (expression != null) query = query.Where(expression);
        if (include != null) query = include(query);
        if (orderByExpression != null)
            query = orderByDescending
                ? query.OrderByDescending(orderByExpression)
                : query.OrderBy(orderByExpression);
        return await query.ToListAsync();
    }

    public async Task<T> AddAsync(T entity)
    {
        await _dbSet.AddAsync(entity);
        return entity;
    }

    public async Task<T> UpdateAsync(T entity)
    {
        _dbSet.Update(entity);
        return entity;
    }

    public async Task DeleteAsync(T entity)
    {
        _dbSet.Remove(entity);
    }

    public async Task<bool> AnyAsync(Expression<Func<T, bool>> expression)
        => await _dbSet.AnyAsync(expression);

    public async Task<int> CountAsync(Expression<Func<T, bool>>? expression = null)
        => expression == null ? await _dbSet.CountAsync() : await _dbSet.CountAsync(expression);
}
```

---

## 5. UNIT OF WORK

```csharp
// Interfaces
public interface IUnitOfWork
{
    Task SaveChangesAsync();
    void Detach<T>(T entity) where T : class;
}

// Implementation
public class UnitOfWork : IUnitOfWork
{
    private readonly AppDbContext _context;
    public UnitOfWork(AppDbContext context) => _context = context;

    public async Task SaveChangesAsync() => await _context.SaveChangesAsync();

    public void Detach<T>(T entity) where T : class
        => _context.Entry(entity!).State = EntityState.Detached;
}
```

---

## 6. APPDBCONTEXT

```csharp
public class AppDbContext : IdentityDbContext<IdentityUser, ApplicationRole, string>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // --- Core tables ---
    public DbSet<User> Users { get; set; }
    public DbSet<Course> Courses { get; set; }
    public DbSet<UserCourse> UserCourses { get; set; }
    public DbSet<SystemErrorLog> SystemErrorLogs { get; set; }
    public DbSet<SystemConfiguration> SystemConfigurations { get; set; }
    public DbSet<EmailNotification> EmailNotifications { get; set; }
    public DbSet<LmsConfiguration> LmsConfigurations { get; set; }
    // ... all other DbSets for your chosen domains

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        // Apply all entity configurations from the assembly
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
```

---

## 7. DI REGISTRATION PATTERN

All registrations live in `Data/DependencyInjectionExtensions.cs`:

```csharp
public static class DependencyInjectionExtensions
{
    public static IServiceCollection AddApplicationDbContextAndRepositories(
        this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("AppDb");

        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlServer(connectionString,
                sql => sql.EnableRetryOnFailure(3)));

        services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        return services;
    }

    public static IServiceCollection AddApplicationServices(
        this IServiceCollection services, IConfiguration configuration)
    {
        // Group by domain
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<ICourseService, CourseService>();
        services.AddScoped<ILmsService, LmsService>();
        services.AddScoped<IEmailService, EmailService>();
        services.AddScoped<ISystemErrorLogService, SystemErrorLogService>();
        // ... all others

        // HttpClients for external APIs
        services.AddHttpClient<ILmsService, LmsService>();
        services.AddHttpClient<IWhatsAppService, WhatsAppService>();

        return services;
    }
}
```

---

## 8. PROGRAM.CS BOOTSTRAP TEMPLATE

```csharp
var builder = WebApplication.CreateBuilder(args);

try
{
    Env.Load(); // Load .env file for local dev

    var config = builder.Configuration;

    // Key Vault (dev vs prod)
    if (builder.Environment.IsDevelopment())
        builder.Configuration.AddAzureDeveloperKeyVaultConfiguration();
    else
        builder.Configuration.AddAzureKeyVaultConfiguration();

    // Bind strongly-typed settings
    builder.Services.Configure<AppSettingsDto>(config);
    builder.Services.ConfigureAppSettingsOptions(config);

    // Application Insights
    builder.Services.AddApplicationInsightsTelemetry();

    // Identity + JWT
    builder.Services.AddIdentity<IdentityUser, ApplicationRole>()
        .AddEntityFrameworkStores<AppDbContext>()
        .AddDefaultTokenProviders();

    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(x =>
        {
            x.RequireHttpsMetadata = true;
            x.SaveToken = true;
            x.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(config["AuthorizationSettings:AuthKey"]!)),
                ValidateIssuer = false,
                ValidateAudience = false
            };
        });

    // CORS
    var allowedOrigins = config.GetSection("CORSSettings:AllowedOrigins").Get<string[]>();
    builder.Services.AddCors(c => c.AddPolicy("AllowedOrigin", opts =>
        opts.WithOrigins(allowedOrigins!).AllowAnyMethod().AllowAnyHeader()));

    // DB + Repos + Services
    builder.Services.AddApplicationDbContextAndRepositories(config);
    builder.Services.AddApplicationServices(config);

    // Controllers with filters
    builder.Services.AddControllers(opts =>
    {
        opts.Filters.Add<ClaimAuthorizationFilter>();
        opts.Filters.Add<ValidateFilter>();
    });

    // Swagger
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(/* JWT scheme config */);

    // Memory cache
    builder.Services.AddMemoryCache();

    // Quartz scheduler
    builder.Services.AddQuartz(q =>
    {
        q.SchedulerId = "Scheduler-Core";
        q.UseMicrosoftDependencyInjectionJobFactory();
    });
    builder.Services.AddQuartzHostedService(q => q.WaitForJobsToComplete = true);

    // HTTP context accessor
    builder.Services.AddHttpContextAccessor();

    var app = builder.Build();

    app.UseRequestLocalization();
    app.UseStaticFiles();

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI();
    }

    app.UseCors("AllowedOrigin");
    app.UseMiddleware<RateLimitingMiddleware>();
    app.UseHttpsRedirection();
    app.UseAuthentication();
    app.UseAuthorization();
    app.MapControllers();
    app.Run();
}
catch (Exception ex)
{
    // Log startup failure
}
```

---

## 9. PAGED RESULT DTO (used everywhere)

```csharp
// Used by all paginated list endpoints
public class PagedResult<T>
{
    public IQueryable<T> Results { get; set; }
    public int RowCount { get; set; }
    public int PageSize { get; set; }
    public int CurrentPage { get; set; }
    public int PageCount => (int)Math.Ceiling((double)RowCount / PageSize);
}

public class PagedResponseDto<T>
{
    public IList<T> Items { get; set; } = new List<T>();
    public int TotalCount { get; set; }
}

public class RequestDto
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}
```

---

## 10. STANDARD RESPONSE ENVELOPE

```csharp
// All endpoints return this
public class ApiResponse<T>
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public T? Data { get; set; }
    public int StatusCode { get; set; }

    public static ApiResponse<T> Ok(T data, string? message = null)
        => new() { Success = true, Data = data, StatusCode = 200, Message = message };

    public static ApiResponse<T> Fail(string message, int code = 400)
        => new() { Success = false, Message = message, StatusCode = code };
}
```
