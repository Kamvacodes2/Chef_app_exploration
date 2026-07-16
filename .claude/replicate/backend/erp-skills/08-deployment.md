# SKILL 08: DEPLOYMENT
## Azure, Docker, Environments, CI/CD, Database Migrations, Health Checks

---

## 1. ENVIRONMENT STRATEGY

| Environment | Config Source | Database | Key Vault |
|-------------|--------------|----------|-----------|
| `Development` | `.env` + `appsettings.Development.json` | Local SQL Server | Developer Key Vault (optional) |
| `Staging` | Azure App Service Config | Azure SQL (UAT) | UAT Key Vault |
| `Production` | Azure Key Vault only | Azure SQL (Prod) | Production Key Vault |

### Environment detection in Program.cs
```csharp
if (builder.Environment.IsDevelopment())
    builder.Configuration.AddAzureDeveloperKeyVaultConfiguration();  // Dev KV
else if (builder.Environment.IsStaging())
    builder.Configuration.AddAzureUATKeyVaultConfiguration();         // UAT KV
else
    builder.Configuration.AddAzureKeyVaultConfiguration();            // Prod KV
```

---

## 2. APPSETTINGS PER ENVIRONMENT

```
appsettings.json                   ← Base (non-secret, committed to git)
appsettings.Development.json       ← Dev overrides (committed — no secrets)
appsettings.Staging.json           ← Staging (DO NOT commit — use App Service config)
appsettings.Production.json        ← Never exists — Key Vault handles everything
.env                               ← Local dev secrets (NEVER commit — in .gitignore)
```

### .env file template (copy to each dev machine, fill in values)
```
ASPNETCORE_ENVIRONMENT=Development
CONNECTIONSTRINGS__APPDB=Server=localhost;Database=YourProjectDb;Trusted_Connection=True;TrustServerCertificate=True;
AUTHORIZATIONSETTIINGS__AUTHKEY=your-jwt-secret-at-least-32-characters
MOODLEWEBSERVICE__TOKEN=your-moodle-token
PAYFAST__MERCHANTKEY=your-payfast-key
WHATSAPP__ACCESSTOKEN=your-meta-access-token
```

---

## 3. AZURE APP SERVICE DEPLOYMENT

### Publish profile approach
```powershell
# Build and publish
dotnet publish src/Presentation/YourProject.Api -c Release -o ./publish

# Azure CLI deploy
az webapp deployment source config-zip \
  --resource-group YourRG \
  --name your-api-app \
  --src publish.zip
```

### App Service configuration (set via Azure Portal or CLI)
```powershell
# Set app settings (these override appsettings.json)
az webapp config appsettings set \
  --resource-group YourRG \
  --name your-api-app \
  --settings \
    "ASPNETCORE_ENVIRONMENT=Production" \
    "ApplicationInsights__ConnectionString=InstrumentationKey=..." \
    "Azure__KeyVault__Uri=https://your-keyvault.vault.azure.net/"
```

---

## 4. DOCKERFILE

```dockerfile
# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project files and restore (layer cache optimization)
COPY ["src/Domain/YourProject.Domain/YourProject.Domain.csproj", "Domain/YourProject.Domain/"]
COPY ["src/Infrastructure/Data/YourProject.Data/YourProject.Data.csproj", "Infrastructure/Data/YourProject.Data/"]
COPY ["src/Services/YourProject.Services.Interfaces/YourProject.Services.Interfaces.csproj", "Services/YourProject.Services.Interfaces/"]
COPY ["src/Services/YourProject.Services/YourProject.Services.csproj", "Services/YourProject.Services/"]
COPY ["src/Presentation/YourProject.Api/YourProject.Api.csproj", "Presentation/YourProject.Api/"]
RUN dotnet restore "Presentation/YourProject.Api/YourProject.Api.csproj"

# Copy all source and build
COPY src/ .
WORKDIR "/src/Presentation/YourProject.Api"
RUN dotnet build -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish -c Release -o /app/publish --no-restore

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Non-root user for security
RUN adduser --disabled-password --gecos "" appuser && chown -R appuser /app
USER appuser

COPY --from=publish /app/publish .

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "YourProject.Api.dll"]
```

### docker-compose.yml (local dev with SQL Server)
```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "5000:8080"
    environment:
      - ASPNETCORE_ENVIRONMENT=Development
      - ConnectionStrings__AppDb=Server=sqlserver;Database=YourProjectDb;User=sa;Password=YourStr0ngP@ssword!;TrustServerCertificate=True;
    depends_on:
      - sqlserver
    volumes:
      - ./uploads:/app/Uploads

  sqlserver:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      SA_PASSWORD: "YourStr0ngP@ssword!"
      ACCEPT_EULA: "Y"
    ports:
      - "1433:1433"
    volumes:
      - sqldata:/var/opt/mssql

volumes:
  sqldata:
```

---

## 5. GITHUB ACTIONS CI/CD

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy API

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  DOTNET_VERSION: '8.0.x'
  AZURE_WEBAPP_NAME: 'your-api-app'

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: ${{ env.DOTNET_VERSION }}

      - name: Restore
        run: dotnet restore

      - name: Build
        run: dotnet build --no-restore -c Release

      - name: Test
        run: dotnet test --no-build -c Release --verbosity normal

      - name: Publish
        if: github.ref == 'refs/heads/main'
        run: dotnet publish src/Presentation/YourProject.Api -c Release -o ./publish

      - name: Upload artifact
        if: github.ref == 'refs/heads/main'
        uses: actions/upload-artifact@v4
        with:
          name: api-publish
          path: ./publish

  deploy:
    needs: build-and-test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: api-publish
          path: ./publish

      - name: Login to Azure
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Deploy to Azure Web App
        uses: azure/webapps-deploy@v2
        with:
          app-name: ${{ env.AZURE_WEBAPP_NAME }}
          package: ./publish
```

---

## 6. DATABASE MIGRATIONS

```powershell
# Add a new migration (from Data project directory)
dotnet ef migrations add AddCourseTagsTable \
  --project src/Infrastructure/Data/YourProject.Data \
  --startup-project src/Presentation/YourProject.Api

# Apply migrations to dev database
dotnet ef database update \
  --project src/Infrastructure/Data/YourProject.Data \
  --startup-project src/Presentation/YourProject.Api

# Generate SQL script for production (run manually or in pipeline)
dotnet ef migrations script \
  --project src/Infrastructure/Data/YourProject.Data \
  --startup-project src/Presentation/YourProject.Api \
  --output migration.sql \
  --idempotent

# Apply migrations in code at startup (for containerised deployments)
# In Program.cs BEFORE app.Run():
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();  // Apply pending migrations automatically
}
```

---

## 7. HEALTH CHECKS

```csharp
// Register in Program.cs
builder.Services.AddHealthChecks()
    .AddSqlServer(
        connectionString: builder.Configuration.GetConnectionString("AppDb")!,
        name: "sql-server",
        tags: ["database"])
    .AddUrlGroup(
        uri: new Uri(builder.Configuration["MoodleWebService:Url"]!),
        name: "moodle",
        tags: ["external"])
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: ["api"]);

// Map health check endpoint
app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
});

app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("database")
});

app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false  // Always returns healthy (liveness)
});

// NuGet: AspNetCore.HealthChecks.SqlServer, AspNetCore.HealthChecks.UI.Client
```

---

## 8. LOGGING WITH SERILOG

```csharp
// In Program.cs — configure Serilog before builder
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.EntityFrameworkCore", LogEventLevel.Warning)
    .WriteTo.Console()
    .WriteTo.MSSqlServer(
        connectionString: builder.Configuration.GetConnectionString("AppDb"),
        sinkOptions: new MSSqlServerSinkOptions
        {
            TableName = "SerilogLogs",
            AutoCreateSqlTable = true
        })
    .CreateLogger();

builder.Host.UseSerilog();

// Usage in services (via ILogger<T>)
public class CourseService : ICourseService
{
    private readonly ILogger<CourseService> _logger;

    public async Task<CourseDto> CreateCourse(CreateCourseDto dto)
    {
        _logger.LogInformation("Creating course: {CourseName}", dto.CourseName);
        // ...
        _logger.LogInformation("Course created: {CourseKey}", result.CourseKey);
        return result;
    }
}
```

---

## 9. AZURE SQL PERFORMANCE SETTINGS

```csharp
// In DI registration — production-grade EF Core config
services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString, sql =>
    {
        sql.EnableRetryOnFailure(
            maxRetryCount: 3,
            maxRetryDelay: TimeSpan.FromSeconds(30),
            errorNumbersToAdd: null);
        sql.CommandTimeout(60);           // 60 second query timeout
        sql.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery); // for Include() chains
    })
    .UseQueryTrackingBehavior(QueryTrackingBehavior.NoTrackingWithIdentityResolution)
);
```

---

## 10. PRODUCTION CHECKLIST

```
SECURITY
[ ] JWT AuthKey is >= 32 chars, stored in Key Vault (not appsettings)
[ ] HTTPS-only enforced (app.UseHttpsRedirection())
[ ] CORS origins are explicit (no wildcards in prod)
[ ] Rate limiting enabled (RateLimiting:Enabled = "1")
[ ] SQL Server connection uses least-privilege account
[ ] All secrets in Key Vault, not in appsettings or env vars directly
[ ] .env file is in .gitignore
[ ] Swagger disabled in production (only in Development)

PERFORMANCE
[ ] EF Core query splitting enabled for complex includes
[ ] Retry on failure configured for SQL Server
[ ] Memory caching enabled for reference data
[ ] Application Insights connection string set
[ ] Background jobs use scoped service factories (not singleton)

DEPLOYMENT
[ ] dotnet build -c Release succeeds with zero errors
[ ] All EF migrations are applied to target database
[ ] Health check endpoint responds at /health
[ ] Seed data runs idempotently (checks before inserting)
[ ] Static files (wwwroot) are included in publish output
[ ] Upload directories exist and have write permissions
[ ] All required environment variables are set in App Service config

MONITORING
[ ] Application Insights configured
[ ] Serilog writing to SQL table or Azure Storage
[ ] Health check UI configured (optional)
[ ] Alerts set for 5xx response rate > threshold
[ ] Database DTU/CPU alerts configured
```

---

## 11. RECOMMENDED AZURE RESOURCE NAMES

```
Resource Group:    rg-{projectname}-{env}        (e.g. rg-erp-prod)
App Service Plan:  asp-{projectname}-{env}
Web App (API):     api-{projectname}-{env}
SQL Server:        sql-{projectname}-{env}
SQL Database:      db-{projectname}-{env}
Key Vault:         kv-{projectname}-{env}
App Insights:      ai-{projectname}-{env}
Storage Account:   st{projectname}{env}           (lowercase, no hyphens, max 24 chars)
Container Registry: cr{projectname}{env}
```
