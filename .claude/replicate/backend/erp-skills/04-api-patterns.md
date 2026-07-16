# SKILL 04: API PATTERNS
## Controller Design, Authentication, Middleware, Validation & Filters

---

## 1. CONTROLLER ANATOMY (production pattern)

Every controller in this codebase follows this exact structure:

```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]                         // Default: require auth on all actions
public class CourseController : BaseController
{
    private readonly ICourseService _courseService;
    private readonly ISystemErrorLogService _errorLog;

    // Constructor injection only — never use service locator
    public CourseController(ICourseService courseService, ISystemErrorLogService errorLog)
    {
        _courseService = courseService;
        _errorLog = errorLog;
    }

    // ── LIST (paginated) ──────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetCourses([FromQuery] RequestDto request,
        [FromQuery] string? search = null)
    {
        var result = await _courseService.GetCoursesPaginated(request, search);
        return Ok(result);
    }

    // ── GET SINGLE ────────────────────────────────────────────────────
    [HttpGet("{courseKey:guid}")]
    public async Task<IActionResult> GetCourse(Guid courseKey)
    {
        var result = await _courseService.GetCourseByKey(courseKey);
        if (result == null) return NotFound();
        return Ok(result);
    }

    // ── CREATE ────────────────────────────────────────────────────────
    [HttpPost]
    [Authorize(Policy = Constants.AdminHROnlyPolicy)]
    public async Task<IActionResult> CreateCourse([FromBody] CreateCourseDto dto)
    {
        // ModelState validation is done by ValidateFilter globally
        var result = await _courseService.CreateCourse(dto);
        return Ok(result);
    }

    // ── UPDATE ────────────────────────────────────────────────────────
    [HttpPut("{courseKey:guid}")]
    [Authorize(Policy = Constants.AdminHROnlyPolicy)]
    public async Task<IActionResult> UpdateCourse(Guid courseKey, [FromBody] UpdateCourseDto dto)
    {
        dto.CourseKey = courseKey;
        var result = await _courseService.UpdateCourse(dto);
        return Ok(result);
    }

    // ── SOFT DELETE ───────────────────────────────────────────────────
    [HttpDelete("{courseKey:guid}")]
    [Authorize(Policy = Constants.AdminOnlyPolicy)]
    public async Task<IActionResult> DeleteCourse(Guid courseKey)
    {
        await _courseService.DisableCourse(courseKey); // sets RecordStatusId = 2
        return Ok(new { success = true });
    }

    // ── FILE UPLOAD ───────────────────────────────────────────────────
    [HttpPost("{courseKey:guid}/thumbnail")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadThumbnail(Guid courseKey, IFormFile file)
    {
        if (file == null || file.Length == 0) return BadRequest("No file provided");
        var result = await _courseService.UploadCourseThumbnail(courseKey, file);
        return Ok(result);
    }

    // ── ANONYMOUS endpoint (override Authorize) ───────────────────────
    [HttpGet("public")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPublicCourses()
    {
        var result = await _courseService.GetPublishedCourses();
        return Ok(result);
    }
}
```

---

## 2. BASE CONTROLLER (full production version)

```csharp
// Controllers/BaseController.cs
[ApiController]
[Route("api/[controller]")]
[Authorize]
public abstract class BaseController : ControllerBase
{
    // ── Current user from JWT claims ──────────────────────────────────
    protected Guid CurrentUserKey
    {
        get
        {
            var val = User.FindFirst("userKey")?.Value
                   ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(val, out var key) ? key : Guid.Empty;
        }
    }

    protected string CurrentUserEmail
        => User.FindFirst(ClaimTypes.Email)?.Value ?? string.Empty;

    protected string CurrentUserRole
        => User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;

    protected int CurrentClientId
    {
        get
        {
            var val = User.FindFirst("clientId")?.Value;
            return int.TryParse(val, out var id) ? id : 0;
        }
    }

    protected bool IsAdmin => CurrentUserRole == UserRoles.Admin;
    protected bool IsHR => CurrentUserRole == UserRoles.HR || IsAdmin;

    // ── Standard response helpers ─────────────────────────────────────
    protected IActionResult Success<T>(T data) => Ok(data);
    protected IActionResult NotFound(string entity) => NotFound(new { error = $"{entity} not found" });
    protected IActionResult BadInput(string message) => BadRequest(new { error = message });
    protected IActionResult Forbidden(string reason = "Access denied")
        => StatusCode(403, new { error = reason });
}
```

---

## 3. JWT TOKEN GENERATION

```csharp
// Services/AuthService.cs — GenerateToken method
public string GenerateJwtToken(User user, IList<string> roles)
{
    var claims = new List<Claim>
    {
        new(ClaimTypes.NameIdentifier, user.UserId.ToString()),
        new("userKey", user.UserKey.ToString()),
        new(ClaimTypes.Email, user.Email),
        new(ClaimTypes.Name, $"{user.FirstName} {user.LastName}"),
        new("clientId", user.ClientId?.ToString() ?? "0"),
    };

    // Add all roles as separate claims
    foreach (var role in roles)
        claims.Add(new Claim(ClaimTypes.Role, role));

    var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.AuthKey));
    var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

    var token = new JwtSecurityToken(
        issuer: null,
        audience: null,
        claims: claims,
        expires: DateTime.UtcNow.AddDays(7),  // 7-day token lifetime
        signingCredentials: creds
    );

    return new JwtSecurityTokenHandler().WriteToken(token);
}
```

---

## 4. AUTHORIZATION POLICIES

```csharp
// In Program.cs / extension
builder.Services.AddAuthorizationBuilder()
    .AddPolicy(Constants.AdminOnlyPolicy, policy =>
        policy.RequireRole(UserRoles.Admin)
              .RequireAuthenticatedUser())

    .AddPolicy(Constants.AdminHROnlyPolicy, policy =>
        policy.RequireRole(UserRoles.Admin, UserRoles.HR)
              .RequireAuthenticatedUser())

    .AddPolicy(Constants.EmployeeOnlyPolicy, policy =>
        policy.RequireRole(UserRoles.Employee)
              .RequireAuthenticatedUser())

    .AddPolicy(Constants.HROnlyPolicy, policy =>
        policy.RequireRole(UserRoles.HR)
              .RequireAuthenticatedUser())

    .AddPolicy("TenantAdminOrSalesAdmin", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.AddRequirements(new TenantAdminOrSalesAdminRequirement());
    });

// Custom requirement handler
public class TenantAdminOrSalesAdminRequirement : IAuthorizationRequirement { }

public class TenantAdminOrSalesAdminHandler
    : AuthorizationHandler<TenantAdminOrSalesAdminRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        TenantAdminOrSalesAdminRequirement requirement)
    {
        if (context.User.IsInRole("TenantAdmin") || context.User.IsInRole("SalesAdmin"))
            context.Succeed(requirement);
        return Task.CompletedTask;
    }
}
```

---

## 5. GLOBAL ACTION FILTERS

### ClaimAuthorizationFilter (runs on every authenticated request)
```csharp
public class ClaimAuthorizationFilter : IActionFilter
{
    public void OnActionExecuting(ActionExecutingContext context)
    {
        var user = context.HttpContext.User;
        if (!user.Identity?.IsAuthenticated == true) return;

        // Make claims available globally via HttpContext.Items
        var userKey = user.FindFirst("userKey")?.Value;
        var clientId = user.FindFirst("clientId")?.Value;

        context.HttpContext.Items["CurrentUserKey"] = userKey;
        context.HttpContext.Items["CurrentClientId"] = clientId;
    }

    public void OnActionExecuted(ActionExecutedContext context) { }
}
```

### ValidateFilter (auto-validates FluentValidation models)
```csharp
public class ValidateFilter : IActionFilter
{
    public void OnActionExecuting(ActionExecutingContext context)
    {
        if (!context.ModelState.IsValid)
        {
            var errors = context.ModelState
                .Where(x => x.Value?.Errors.Count > 0)
                .ToDictionary(
                    k => k.Key,
                    v => v.Value!.Errors.Select(e => e.ErrorMessage).ToArray()
                );

            context.Result = new BadRequestObjectResult(new
            {
                success = false,
                errors = errors
            });
        }
    }

    public void OnActionExecuted(ActionExecutedContext context) { }
}
```

### BannedContentValidationFilter
```csharp
public class BannedContentValidationFilter : IActionFilter
{
    private readonly IBannedWordService _bannedWordService;

    public BannedContentValidationFilter(IBannedWordService bannedWordService)
    {
        _bannedWordService = bannedWordService;
    }

    public void OnActionExecuting(ActionExecutingContext context)
    {
        foreach (var arg in context.ActionArguments.Values)
        {
            if (arg is string str && _bannedWordService.ContainsBannedContent(str))
            {
                context.Result = new BadRequestObjectResult(
                    new { error = "Content contains prohibited words." });
                return;
            }
        }
    }

    public void OnActionExecuted(ActionExecutedContext context) { }
}
```

---

## 6. FLUENT VALIDATION PATTERN

```csharp
// Validators/CreateCourseValidator.cs
public class CreateCourseValidator : AbstractValidator<CreateCourseDto>
{
    public CreateCourseValidator()
    {
        RuleFor(x => x.CourseName)
            .NotEmpty().WithMessage("Course name is required")
            .MaximumLength(200).WithMessage("Course name must not exceed 200 characters");

        RuleFor(x => x.Description)
            .NotEmpty().WithMessage("Description is required")
            .MaximumLength(2000);

        RuleFor(x => x.Price)
            .GreaterThanOrEqualTo(0).WithMessage("Price cannot be negative");

        RuleFor(x => x.CategoryId)
            .GreaterThan(0).WithMessage("Category is required");
    }
}

// Register in Program.cs
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<CreateCourseValidator>();
```

---

## 7. FILE UPLOAD CONFIGURATION

```csharp
// Extension/FileUploadExtension.cs
public static class FileUploadExtension
{
    public static WebApplicationBuilder ConfigureFileUploadLimits(
        this WebApplicationBuilder builder)
    {
        builder.Services.Configure<FormOptions>(options =>
        {
            options.MultipartBodyLengthLimit = 104857600; // 100 MB
            options.ValueLengthLimit = int.MaxValue;
            options.MultipartHeadersLengthLimit = int.MaxValue;
        });

        builder.WebHost.ConfigureKestrel(options =>
        {
            options.Limits.MaxRequestBodySize = 104857600; // 100 MB
        });

        return builder;
    }
}

// File save helper (used in services)
public static async Task<string> SaveUploadedFile(IFormFile file, string folder, string wwwRoot)
{
    var uploadsPath = Path.Combine(wwwRoot, "Uploads", folder);
    Directory.CreateDirectory(uploadsPath);

    var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
    var filePath = Path.Combine(uploadsPath, fileName);

    using var stream = new FileStream(filePath, FileMode.Create);
    await file.CopyToAsync(stream);

    return $"/Uploads/{folder}/{fileName}"; // relative URL
}
```

---

## 8. RATE LIMITING MIDDLEWARE

```csharp
// Interfaces/Services/RateLimiting/IRateLimitService.cs
public interface IRateLimitService
{
    bool IsAllowed(string clientKey);
    void Reset(string clientKey);
}

// Services/RateLimiting/RateLimitService.cs
public class RateLimitService : IRateLimitService
{
    private readonly ConcurrentDictionary<string, (int Count, DateTime Window)> _clients = new();
    private const int MaxRequests = 100;
    private static readonly TimeSpan WindowDuration = TimeSpan.FromMinutes(1);

    public bool IsAllowed(string clientKey)
    {
        var now = DateTime.UtcNow;
        _clients.AddOrUpdate(clientKey,
            key => (1, now),
            (key, existing) =>
            {
                if (now - existing.Window > WindowDuration)
                    return (1, now); // Reset window
                return (existing.Count + 1, existing.Window);
            });

        return _clients[clientKey].Count <= MaxRequests;
    }

    public void Reset(string clientKey) => _clients.TryRemove(clientKey, out _);
}
```

---

## 9. LOCALIZATION MIDDLEWARE

```csharp
// Middleware/LocalizationMiddleware.cs
public class LocalizationMiddleware : IMiddleware
{
    private readonly IStringLocalizer _localizer;

    public LocalizationMiddleware(IStringLocalizer localizer)
    {
        _localizer = localizer;
    }

    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        var lang = context.Request.Headers["Accept-Language"].FirstOrDefault() ?? "en";
        // Set culture for this request
        var culture = new CultureInfo(lang.Split(',').First().Trim());
        CultureInfo.CurrentCulture = culture;
        CultureInfo.CurrentUICulture = culture;
        await next(context);
    }
}

// JSON-based localizer (reads from Resources/{lang}.json)
public class JsonStringLocalizer : IStringLocalizer
{
    private readonly Dictionary<string, Dictionary<string, string>> _cache = new();

    public LocalizedString this[string name]
    {
        get
        {
            var lang = CultureInfo.CurrentUICulture.TwoLetterISOLanguageName;
            if (_cache.TryGetValue(lang, out var dict) && dict.TryGetValue(name, out var val))
                return new LocalizedString(name, val);
            return new LocalizedString(name, name); // fallback to key
        }
    }
}
```

---

## 10. WEBHOOK PATTERN

```csharp
// WebHooks/IWebHook.cs
public interface IWebHook
{
    Task SendAsync(string url, object payload, string? secret = null);
}

// WebHooks/WebHook.cs
public class WebHook : IWebHook
{
    private readonly HttpClient _httpClient;

    public WebHook(HttpClient httpClient) => _httpClient = httpClient;

    public async Task SendAsync(string url, object payload, string? secret = null)
    {
        var json = JsonConvert.SerializeObject(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        if (!string.IsNullOrEmpty(secret))
        {
            var signature = ComputeHmacSha256(json, secret);
            _httpClient.DefaultRequestHeaders.Add("X-Webhook-Signature", signature);
        }

        await _httpClient.PostAsync(url, content);
    }

    private static string ComputeHmacSha256(string payload, string secret)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return Convert.ToHexString(hash).ToLower();
    }
}
```

---

## 11. STANDARD ENDPOINT NAMING CONVENTION

```
GET    /api/course                          → GetAll (paginated)
GET    /api/course/{courseKey:guid}         → GetById
POST   /api/course                          → Create
PUT    /api/course/{courseKey:guid}         → Update (full)
PATCH  /api/course/{courseKey:guid}         → Update (partial)
DELETE /api/course/{courseKey:guid}         → Soft delete
GET    /api/course/{courseKey:guid}/lessons → GetRelated
POST   /api/course/{courseKey:guid}/enroll  → Action
GET    /api/course/public                   → AllowAnonymous list
GET    /api/course/search?q={term}          → Search
```

---

## 12. SWAGGER OPERATION FILTER (hide internal fields)

```csharp
// Filters/SwaggerIgnoreSchemaFilter.cs
public class SwaggerIgnoreSchemaFilter : ISchemaFilter
{
    public void Apply(OpenApiSchema schema, SchemaFilterContext context)
    {
        if (schema?.Properties == null || context.Type == null) return;

        var ignoredProperties = context.Type
            .GetProperties()
            .Where(p => p.GetCustomAttribute<SwaggerIgnoreAttribute>() != null)
            .Select(p => char.ToLower(p.Name[0]) + p.Name[1..]);

        foreach (var prop in ignoredProperties)
            schema.Properties.Remove(prop);
    }
}

// Usage on DTO property
[SwaggerIgnore]
public string InternalField { get; set; }
```
