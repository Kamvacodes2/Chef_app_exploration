# SKILL 05: SERVICE PATTERNS
## Business Logic Layer — Services, DTOs, Error Handling, Email, PDF, Scheduling

---

## 1. STANDARD SERVICE PATTERN

Every service follows this exact structure — copy it for any new service:

```csharp
// Services/Courses/CourseService.cs
public class CourseService : ICourseService
{
    // ── Dependencies injected via constructor ─────────────────────────
    private readonly IGenericRepository<Course> _courseRepository;
    private readonly IGenericRepository<UserCourse> _userCourseRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ISystemErrorLogService _errorLog;
    private readonly IOptions<AppSettingsDto> _appSettings;

    public CourseService(
        IGenericRepository<Course> courseRepository,
        IGenericRepository<UserCourse> userCourseRepository,
        IUnitOfWork unitOfWork,
        ISystemErrorLogService errorLog,
        IOptions<AppSettingsDto> appSettings)
    {
        _courseRepository = courseRepository;
        _userCourseRepository = userCourseRepository;
        _unitOfWork = unitOfWork;
        _errorLog = errorLog;
        _appSettings = appSettings;
    }

    // ── READ: single record ────────────────────────────────────────────
    public async Task<CourseDto> GetCourseByKey(Guid courseKey)
    {
        try
        {
            var course = await _courseRepository.GetByCondition(
                x => x.CourseKey == courseKey
                  && x.RecordStatusId == Constants.ActiveRecordStatusID,
                tracking: false);

            return course?.ToDto() ?? throw new KeyNotFoundException($"Course {courseKey} not found");
        }
        catch (Exception ex)
        {
            _errorLog.LogSystemError(courseKey.ToString(), ex.ToString(),
                "Service", nameof(CourseService), nameof(GetCourseByKey), Guid.Empty, string.Empty);
            throw;
        }
    }

    // ── READ: paginated list ───────────────────────────────────────────
    public async Task<PagedResponseDto<CourseDto>> GetCoursesPaginated(
        RequestDto request, string? search = null)
    {
        try
        {
            var result = await _courseRepository.GetAllPagingAsync(
                expression: a => a.RecordStatusId == Constants.ActiveRecordStatusID
                    && (string.IsNullOrEmpty(search)
                        || a.CourseName.ToLower().Contains(search.ToLower())),
                include: null,
                orderByExpression: x => x.CourseName,
                orderByDescending: false,
                page: request.Page,
                pageSize: request.PageSize,
                trackChanges: false);

            if (result?.Results == null || !result.Results.Any())
                return new PagedResponseDto<CourseDto> { Items = [], TotalCount = 0 };

            var items = await result.Results.Select(x => x.ToDto()).ToListAsync();
            return new PagedResponseDto<CourseDto> { Items = items, TotalCount = result.RowCount };
        }
        catch (Exception ex)
        {
            _errorLog.LogSystemError(
                System.Text.Json.JsonSerializer.Serialize(request),
                ex.ToString(), "Service", nameof(CourseService),
                nameof(GetCoursesPaginated), Guid.Empty, string.Empty);
            throw;
        }
    }

    // ── CREATE ─────────────────────────────────────────────────────────
    public async Task<CourseDto> CreateCourse(CreateCourseDto dto)
    {
        try
        {
            var course = new Course
            {
                CourseKey = Guid.NewGuid(),
                CourseName = dto.CourseName.Trim(),
                Description = dto.Description,
                Price = dto.Price,
                CategoryId = dto.CategoryId,
                RecordStatusId = Constants.ActiveRecordStatusID,
                CreatedDate = DateTime.UtcNow,
                ModifiedDate = DateTime.UtcNow
            };

            course = await _courseRepository.AddAsync(course);
            await _unitOfWork.SaveChangesAsync();
            return course.ToDto();
        }
        catch (Exception ex)
        {
            _errorLog.LogSystemError(
                Newtonsoft.Json.JsonConvert.SerializeObject(dto),
                ex.ToString(), "Service", nameof(CourseService),
                nameof(CreateCourse), Guid.Empty, string.Empty);
            throw;
        }
    }

    // ── UPDATE ─────────────────────────────────────────────────────────
    public async Task<CourseDto> UpdateCourse(UpdateCourseDto dto)
    {
        try
        {
            var course = await _courseRepository.GetByCondition(
                x => x.CourseKey == dto.CourseKey);

            if (course == null) throw new KeyNotFoundException("Course not found");

            course.CourseName = dto.CourseName.Trim();
            course.Description = dto.Description;
            course.Price = dto.Price;
            course.ModifiedDate = DateTime.UtcNow;

            course = await _courseRepository.UpdateAsync(course);
            await _unitOfWork.SaveChangesAsync();
            _unitOfWork.Detach(course); // prevent tracking issues
            return course.ToDto();
        }
        catch (Exception ex)
        {
            _errorLog.LogSystemError(
                Newtonsoft.Json.JsonConvert.SerializeObject(dto),
                ex.ToString(), "Service", nameof(CourseService),
                nameof(UpdateCourse), Guid.Empty, string.Empty);
            throw;
        }
    }

    // ── SOFT DELETE ────────────────────────────────────────────────────
    public async Task<bool> DisableCourse(Guid courseKey)
    {
        try
        {
            var course = await _courseRepository.GetByCondition(
                x => x.CourseKey == courseKey);

            if (course == null) return false;

            course.RecordStatusId = Constants.InactiveRecordStatusID;
            course.ModifiedDate = DateTime.UtcNow;

            await _courseRepository.UpdateAsync(course);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _errorLog.LogSystemError(courseKey.ToString(), ex.ToString(),
                "Service", nameof(CourseService), nameof(DisableCourse), Guid.Empty, string.Empty);
            throw;
        }
    }
}
```

---

## 2. DTO PATTERN

### Input DTOs (request body)
```csharp
// ServiceDtos/Courses/CreateCourseDto.cs
public class CreateCourseDto
{
    public string CourseName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int CategoryId { get; set; }
    public bool IsFeatured { get; set; }
    public List<int>? TagIds { get; set; }
}

// ServiceDtos/Courses/UpdateCourseDto.cs
public class UpdateCourseDto : CreateCourseDto
{
    public Guid CourseKey { get; set; }  // Set from route param
}
```

### Output DTOs (response body)
```csharp
// ServiceDtos/Courses/CourseDto.cs
public class CourseDto
{
    public Guid CourseKey { get; set; }    // NEVER expose int PK externally
    public string CourseName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public bool IsPublished { get; set; }
    public int EnrollmentCount { get; set; }
    public DateTime CreatedDate { get; set; }
}
```

### Mapping extensions (entity → DTO)
```csharp
// Domain/Extensions/CourseExtensions.cs
public static class CourseExtensions
{
    public static CourseDto ToDto(this Course course)
        => new()
        {
            CourseKey = course.CourseKey,
            CourseName = course.CourseName,
            Description = course.Description,
            Price = course.Price,
            IsPublished = course.IsPublished,
            CreatedDate = course.CreatedDate
        };

    public static Course ToEntity(this CreateCourseDto dto)
        => new()
        {
            CourseKey = Guid.NewGuid(),
            CourseName = dto.CourseName.Trim(),
            Description = dto.Description,
            Price = dto.Price,
            RecordStatusId = Constants.ActiveRecordStatusID
        };
}
```

---

## 3. SYSTEM ERROR LOG SERVICE

```csharp
// Interface
public interface ISystemErrorLogService
{
    void LogSystemError(string parameters, string errorMessage, string layer,
        string className, string methodName, Guid userKey, string additionalContext);
    Task<IList<SystemErrorLogDto>> GetRecentErrors(int count = 100);
}

// Implementation
public class SystemErrorLogService : ISystemErrorLogService
{
    private readonly IGenericRepository<SystemErrorLog> _errorLogRepository;
    private readonly IUnitOfWork _unitOfWork;

    public void LogSystemError(string parameters, string errorMessage, string layer,
        string className, string methodName, Guid userKey, string additionalContext)
    {
        try
        {
            var log = new SystemErrorLog
            {
                Parameters = parameters?.Length > 4000 ? parameters[..4000] : parameters,
                ErrorMessage = errorMessage?.Length > 8000 ? errorMessage[..8000] : errorMessage,
                Layer = layer,
                ClassName = className,
                MethodName = methodName,
                UserKey = userKey == Guid.Empty ? null : userKey,
                AdditionalContext = additionalContext,
                Timestamp = DateTime.UtcNow
            };

            // Fire-and-forget: don't let error logging block the main flow
            Task.Run(async () =>
            {
                await _errorLogRepository.AddAsync(log);
                await _unitOfWork.SaveChangesAsync();
            });
        }
        catch { /* Swallow — never let logging crash the app */ }
    }
}
```

---

## 4. EMAIL SERVICE

```csharp
// Interfaces/Services/Emails/IEmailService.cs
public interface IEmailService
{
    Task SendAsync(string toEmail, string toName, string subject, string htmlBody);
    Task SendTemplateAsync(string toEmail, string templateName, Dictionary<string, string> variables);
    Task SendBulkAsync(IEnumerable<EmailRecipient> recipients, string subject, string htmlBody);
    Task QueueEmailAsync(EmailNotification notification);
}

// Services/Emails/EmailService.cs
public class EmailService : IEmailService
{
    private readonly IGenericRepository<EmailNotification> _emailRepository;
    private readonly IGenericRepository<EmailConfiguration> _smtpRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ISystemErrorLogService _errorLog;

    public async Task SendAsync(string toEmail, string toName, string subject, string htmlBody)
    {
        try
        {
            // Get SMTP config (global or per-client)
            var smtp = await _smtpRepository.GetByCondition(
                x => x.RecordStatusId == Constants.ActiveRecordStatusID);

            using var client = new SmtpClient(smtp.Host, smtp.Port)
            {
                Credentials = new NetworkCredential(smtp.Username, smtp.Password),
                EnableSsl = true
            };

            var message = new MailMessage
            {
                From = new MailAddress(smtp.FromEmail, smtp.SenderName),
                Subject = subject,
                Body = htmlBody,
                IsBodyHtml = true
            };
            message.To.Add(new MailAddress(toEmail, toName));

            await client.SendMailAsync(message);

            // Log the sent notification
            await QueueEmailAsync(new EmailNotification
            {
                RecipientEmail = toEmail,
                Subject = subject,
                Body = htmlBody,
                IsSent = true,
                SentDate = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _errorLog.LogSystemError(toEmail, ex.ToString(),
                "Service", nameof(EmailService), nameof(SendAsync), Guid.Empty, string.Empty);
            throw;
        }
    }

    public async Task SendTemplateAsync(string toEmail, string templateName,
        Dictionary<string, string> variables)
    {
        // Load template HTML file
        var templatePath = Path.Combine("EmailTemplates", $"{templateName}.html");
        var template = await File.ReadAllTextAsync(templatePath);

        // Replace all {{variable}} placeholders
        foreach (var (key, value) in variables)
            template = template.Replace($"{{{{{key}}}}}", value);

        var subject = variables.GetValueOrDefault("Subject", templateName);
        await SendAsync(toEmail, variables.GetValueOrDefault("Name", ""), subject, template);
    }

    public async Task QueueEmailAsync(EmailNotification notification)
    {
        await _emailRepository.AddAsync(notification);
        await _unitOfWork.SaveChangesAsync();
    }
}
```

---

## 5. PDF GENERATION (QuestPDF)

```csharp
// Services/Documents/PdfService.cs
public class PdfService : IPdfService
{
    public byte[] GenerateCertificate(CertificateData data)
    {
        QuestPDF.Settings.License = LicenseType.Professional;

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4.Landscape());
                page.Margin(40);
                page.Background().Image("wwwroot/Images/CertificateBackground.png");

                page.Content().Column(col =>
                {
                    col.Item().AlignCenter().Text("Certificate of Completion")
                        .FontFamily("roboto").FontSize(36).Bold();

                    col.Item().PaddingTop(20).AlignCenter()
                        .Text($"This certifies that {data.RecipientName}")
                        .FontSize(18);

                    col.Item().AlignCenter()
                        .Text($"has successfully completed {data.CourseName}")
                        .FontSize(16);

                    col.Item().PaddingTop(30).AlignCenter()
                        .Text($"Issued: {data.IssueDate:dd MMMM yyyy}")
                        .FontSize(12);
                });
            });
        });

        return document.GeneratePdf();
    }

    public byte[] GenerateReport(ReportData data)
    {
        // Use same QuestPDF pattern for any report type
        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(30);

                page.Header().Text(data.Title).FontSize(20).Bold();

                page.Content().Table(table =>
                {
                    table.ColumnsDefinition(cols =>
                    {
                        foreach (var col in data.Columns)
                            cols.RelativeColumn();
                    });

                    // Header row
                    foreach (var col in data.Columns)
                        table.Header().Cell().Text(col).Bold();

                    // Data rows
                    foreach (var row in data.Rows)
                        foreach (var cell in row)
                            table.Cell().Text(cell);
                });

                page.Footer().AlignRight()
                    .Text(x => { x.CurrentPageNumber(); x.Span(" of "); x.TotalPages(); });
            });
        });

        return document.GeneratePdf();
    }
}
```

---

## 6. QUARTZ.NET JOB PATTERN

```csharp
// Scheduler/Quartz/Jobs/SendEmailJob.cs
[DisallowConcurrentExecution]
public class SendEmailJob : IJob
{
    private readonly IEmailService _emailService;
    private readonly IGenericRepository<EmailNotification> _emailRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<SendEmailJob> _logger;

    public SendEmailJob(IEmailService emailService,
        IGenericRepository<EmailNotification> emailRepo,
        IUnitOfWork unitOfWork, ILogger<SendEmailJob> logger)
    {
        _emailService = emailService;
        _emailRepo = emailRepo;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task Execute(IJobExecutionContext context)
    {
        try
        {
            // Fetch all pending (queued) emails
            var pendingEmails = await _emailRepo.GetAllAsync(
                x => !x.IsSent && x.RecordStatusId == Constants.ActiveRecordStatusID);

            foreach (var email in pendingEmails)
            {
                try
                {
                    await _emailService.SendAsync(
                        email.RecipientEmail, email.RecipientName ?? "",
                        email.Subject, email.Body);

                    email.IsSent = true;
                    email.SentDate = DateTime.UtcNow;
                    await _emailRepo.UpdateAsync(email);
                }
                catch (Exception ex)
                {
                    email.ErrorMessage = ex.Message;
                    await _emailRepo.UpdateAsync(email);
                    _logger.LogError(ex, "Failed to send email {id}", email.NotificationId);
                }
            }

            await _unitOfWork.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SendEmailJob failed");
        }
    }
}

// Register job in Program.cs
builder.Services.AddQuartz(q =>
{
    q.UseMicrosoftDependencyInjectionJobFactory();
    q.SchedulerId = "Scheduler-Core";

    var sendEmailJobKey = new JobKey("SendEmailJob");
    q.AddJob<SendEmailJob>(opts => opts.WithIdentity(sendEmailJobKey));
    q.AddTrigger(opts => opts
        .ForJob(sendEmailJobKey)
        .WithIdentity("SendEmailJob-trigger")
        .WithCronSchedule("0 */5 * * * ?")); // Every 5 minutes
});
```

---

## 7. IN-PROCESS EVENT BUS

```csharp
// EventManager/IEventBus.cs
public interface IEventBus
{
    void Subscribe<T, TH>() where T : IntegrationEvent where TH : IIntegrationEventHandler<T>;
    Task Publish<T>(T @event) where T : IntegrationEvent;
}

// EventManager/IntegrationEvent.cs
public abstract class IntegrationEvent
{
    public Guid EventId { get; } = Guid.NewGuid();
    public DateTime OccurredOn { get; } = DateTime.UtcNow;
}

// Example event
public class CourseCompletedEvent : IntegrationEvent
{
    public Guid UserKey { get; set; }
    public Guid CourseKey { get; set; }
    public decimal Score { get; set; }
}

// Example handler
public class CourseCompletedEventHandler : IIntegrationEventHandler<CourseCompletedEvent>
{
    private readonly IEmailService _emailService;
    private readonly ICertificateService _certService;

    public async Task Handle(CourseCompletedEvent @event)
    {
        // Generate and email certificate when course is completed
        var cert = await _certService.GenerateCertificate(@event.UserKey, @event.CourseKey);
        await _emailService.SendAsync(@event.UserEmail, "Your Certificate", cert.HtmlContent);
    }
}

// Register in Program.cs
builder.Services.AddSingleton<IEventBus, EventBus>();
builder.Services.AddScoped<IIntegrationEventHandler<CourseCompletedEvent>, CourseCompletedEventHandler>();
```

---

## 8. CACHING PATTERN

```csharp
// Helper/CacheHelper.cs
public static class CacheHelper
{
    private static IMemoryCache? _cache;

    public static void Initialize(IMemoryCache cache) => _cache = cache;

    public static T? Get<T>(string key) where T : class
    {
        _cache?.TryGetValue(key, out T? value);
        return value;
    }

    public static void Set<T>(string key, T value, TimeSpan? expiry = null)
    {
        var options = new MemoryCacheEntryOptions();
        if (expiry.HasValue) options.AbsoluteExpirationRelativeToNow = expiry;
        else options.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30);
        _cache?.Set(key, value, options);
    }

    public static void Remove(string key) => _cache?.Remove(key);
}

// Usage in service
var cached = CacheHelper.Get<List<CourseDto>>("all_courses");
if (cached != null) return cached;

var courses = await _courseRepository.GetAllAsync(/* ... */);
var dtos = courses.Select(x => x.ToDto()).ToList();
CacheHelper.Set("all_courses", dtos, TimeSpan.FromHours(1));
return dtos;
```

---

## 9. CONFIGURATION HELPER

```csharp
// Helper/ConfigurationHelper.cs
public static class ConfigurationHelper
{
    public static IConfiguration config { get; private set; } = null!;

    public static void Initialize(IConfiguration configuration) => config = configuration;
}

// Usage anywhere (after initialized in Program.cs)
var apiKey = ConfigurationHelper.config["ExternalService:ApiKey"];
var isFeatureEnabled = Convert.ToBoolean(ConfigurationHelper.config["Features:NewDashboard"]);
```

---

## 10. BACKGROUND SERVICE (long-running IHostedService)

```csharp
// BackgroundServices/MoodleSyncBackgroundService.cs
public class MoodleSyncBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<MoodleSyncBackgroundService> _logger;
    private static readonly TimeSpan SyncInterval = TimeSpan.FromMinutes(15);

    public MoodleSyncBackgroundService(
        IServiceScopeFactory scopeFactory,
        ILogger<MoodleSyncBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var lmsService = scope.ServiceProvider.GetRequiredService<ILmsService>();
                // Sync Moodle completions, grades, etc.
                // await lmsService.SyncCompletions();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Moodle sync background service failed");
            }

            await Task.Delay(SyncInterval, stoppingToken);
        }
    }
}

// Register in Program.cs
builder.Services.AddHostedService<MoodleSyncBackgroundService>();
```

---

## 11. SOFT DELETE CONVENTION (ALL entities)

```
RULE: Never call DeleteAsync for user-facing data.
ALWAYS set RecordStatusId = Constants.InactiveRecordStatusID (2).
ALWAYS filter queries with: x.RecordStatusId == Constants.ActiveRecordStatusID (1)
```

```csharp
// ✅ CORRECT
entity.RecordStatusId = Constants.InactiveRecordStatusID;
await _repository.UpdateAsync(entity);
await _unitOfWork.SaveChangesAsync();

// ❌ WRONG — never do this for user data
await _repository.DeleteAsync(entity);
```

---

## 12. DETACH AFTER UPDATE (prevent tracking conflicts)

```csharp
// ✅ ALWAYS detach after update in services that re-fetch the entity later
var updated = await _repository.UpdateAsync(entity);
await _unitOfWork.SaveChangesAsync();
_unitOfWork.Detach(entity);  // ← Critical: prevents tracking conflict on next fetch
return updated.ToDto();
```
