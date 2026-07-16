# SKILL 07: EXTERNAL INTEGRATIONS
## WhatsApp, PayFast, Azure, AI/GenAI, Email SMTP — Complete Implementation Patterns

---

## INTEGRATION 1: WHATSAPP BUSINESS API

### What it handles
- Course content delivery step-by-step via WhatsApp chat
- User onboarding flows via bot
- Notification broadcasts
- Purchase flows via WhatsApp catalog

### Configuration
```json
{
  "WhatsApp": {
    "ApiUrl": "https://graph.facebook.com/v18.0",
    "AccessToken": "YOUR_META_ACCESS_TOKEN",
    "PhoneNumberId": "YOUR_PHONE_NUMBER_ID",
    "WebhookVerifyToken": "YOUR_VERIFY_TOKEN",
    "BusinessAccountId": "YOUR_WABA_ID"
  }
}
```

### DTO models
```csharp
// ServiceDtos/WhatsApp/WhatsAppMessageDto.cs
public class WhatsAppSendMessageDto
{
    public string To { get; set; } = string.Empty;           // E.164 format: +27821234567
    public string MessageType { get; set; } = "text";        // text | template | interactive | image
    public string? TextBody { get; set; }
    public string? TemplateName { get; set; }
    public string? Language { get; set; } = "en_US";
    public List<WhatsAppTemplateParameter>? Parameters { get; set; }
}

public class WhatsAppTemplateParameter
{
    public string Type { get; set; } = "text";
    public string Text { get; set; } = string.Empty;
}

public class WhatsAppWebhookDto
{
    public string Object { get; set; } = string.Empty;
    public List<WhatsAppWebhookEntry> Entry { get; set; } = new();
}

public class WhatsAppWebhookEntry
{
    public string Id { get; set; } = string.Empty;
    public List<WhatsAppWebhookChange> Changes { get; set; } = new();
}

public class WhatsAppWebhookChange
{
    public WhatsAppWebhookValue Value { get; set; } = new();
}

public class WhatsAppWebhookValue
{
    public List<WhatsAppIncomingMessage>? Messages { get; set; }
    public List<WhatsAppMessageStatus>? Statuses { get; set; }
}

public class WhatsAppIncomingMessage
{
    public string From { get; set; } = string.Empty;      // Sender phone number
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;      // text | image | audio
    public WhatsAppTextContent? Text { get; set; }
    public long Timestamp { get; set; }
}

public class WhatsAppTextContent { public string Body { get; set; } = string.Empty; }
```

### Service implementation
```csharp
// Services/WhatsApp/WhatsAppService.cs
public class WhatsAppService : IWhatsAppService
{
    private readonly HttpClient _httpClient;
    private readonly IOptions<AppSettingsDto> _settings;
    private readonly ISystemErrorLogService _errorLog;

    public async Task<bool> SendTextMessage(string phoneNumber, string message)
    {
        try
        {
            var payload = new
            {
                messaging_product = "whatsapp",
                recipient_type = "individual",
                to = phoneNumber,
                type = "text",
                text = new { preview_url = false, body = message }
            };

            var url = $"{_settings.Value.WhatsApp.ApiUrl}/{_settings.Value.WhatsApp.PhoneNumberId}/messages";
            _httpClient.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue(
                    "Bearer", _settings.Value.WhatsApp.AccessToken);

            var response = await _httpClient.PostAsJsonAsync(url, payload);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _errorLog.LogSystemError(phoneNumber, ex.ToString(),
                "Service", nameof(WhatsAppService), nameof(SendTextMessage), Guid.Empty, string.Empty);
            return false;
        }
    }

    public async Task<bool> SendTemplateMessage(string phoneNumber, string templateName,
        List<string> parameters, string language = "en_US")
    {
        var components = parameters.Any()
            ? new[]
            {
                new
                {
                    type = "body",
                    parameters = parameters.Select(p => new { type = "text", text = p }).ToArray()
                }
            }
            : null;

        var payload = new
        {
            messaging_product = "whatsapp",
            to = phoneNumber,
            type = "template",
            template = new
            {
                name = templateName,
                language = new { code = language },
                components
            }
        };

        var url = $"{_settings.Value.WhatsApp.ApiUrl}/{_settings.Value.WhatsApp.PhoneNumberId}/messages";
        _httpClient.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue(
                "Bearer", _settings.Value.WhatsApp.AccessToken);

        var response = await _httpClient.PostAsJsonAsync(url, payload);
        return response.IsSuccessStatusCode;
    }

    public async Task<bool> SendImageMessage(string phoneNumber, string imageUrl, string caption)
    {
        var payload = new
        {
            messaging_product = "whatsapp",
            to = phoneNumber,
            type = "image",
            image = new { link = imageUrl, caption }
        };

        var url = $"{_settings.Value.WhatsApp.ApiUrl}/{_settings.Value.WhatsApp.PhoneNumberId}/messages";
        _httpClient.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue(
                "Bearer", _settings.Value.WhatsApp.AccessToken);

        var response = await _httpClient.PostAsJsonAsync(url, payload);
        return response.IsSuccessStatusCode;
    }

    // Handle incoming webhook message — route to course step or user context
    public async Task ProcessIncomingMessage(WhatsAppIncomingMessage message)
    {
        var phoneNumber = message.From;
        var userInput = message.Text?.Body?.Trim() ?? string.Empty;

        // Look up user context (current step in course/flow)
        // var context = await _contextRepo.GetByCondition(x => x.PhoneNumber == phoneNumber);
        // Route to appropriate handler based on context.CurrentState
    }
}

// Controller for WhatsApp webhook
[ApiController]
[Route("api/whatsapp")]
public class WhatsAppWebhookController : ControllerBase
{
    private readonly IWhatsAppService _whatsAppService;
    private readonly string _verifyToken;

    // GET: Webhook verification challenge from Meta
    [HttpGet("webhook")]
    [AllowAnonymous]
    public IActionResult Verify([FromQuery(Name = "hub.mode")] string mode,
        [FromQuery(Name = "hub.verify_token")] string token,
        [FromQuery(Name = "hub.challenge")] string challenge)
    {
        if (mode == "subscribe" && token == _verifyToken)
            return Ok(challenge);
        return Forbid();
    }

    // POST: Receive incoming messages
    [HttpPost("webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> Receive([FromBody] WhatsAppWebhookDto payload)
    {
        foreach (var entry in payload.Entry)
            foreach (var change in entry.Changes)
                if (change.Value.Messages != null)
                    foreach (var msg in change.Value.Messages)
                        await _whatsAppService.ProcessIncomingMessage(msg);

        return Ok(); // Always return 200 to Meta or they'll retry
    }
}
```

---

## INTEGRATION 2: PAYFAST (Payment Gateway)

### What it handles
- Initiate payment (redirect to PayFast hosted page)
- Instant Payment Notification (IPN) callback
- Subscription billing
- Refunds

### Configuration
```json
{
  "PayFast": {
    "MerchantId": "YOUR_MERCHANT_ID",
    "MerchantKey": "YOUR_MERCHANT_KEY",
    "PassPhrase": "YOUR_PASSPHRASE",
    "BaseUrl": "https://www.payfast.co.za/eng/process",
    "SandboxUrl": "https://sandbox.payfast.co.za/eng/process",
    "NotifyUrl": "https://yourapi.com/api/payment/notify",
    "ReturnUrl": "https://yourapp.com/payment/success",
    "CancelUrl": "https://yourapp.com/payment/cancelled",
    "IsSandbox": "true"
  }
}
```

### Service implementation
```csharp
// Services/Payments/PayFastService.cs
public class PayFastService : IPayFastService
{
    private readonly IOptions<AppSettingsDto> _settings;
    private readonly IGenericRepository<PaymentTransaction> _transactionRepo;
    private readonly IUnitOfWork _unitOfWork;

    // Build the payment URL to redirect user to PayFast
    public string BuildPaymentUrl(PayFastPaymentDto payment)
    {
        var data = new Dictionary<string, string>
        {
            ["merchant_id"]  = _settings.Value.PayFast.MerchantId,
            ["merchant_key"] = _settings.Value.PayFast.MerchantKey,
            ["return_url"]   = _settings.Value.PayFast.ReturnUrl,
            ["cancel_url"]   = _settings.Value.PayFast.CancelUrl,
            ["notify_url"]   = _settings.Value.PayFast.NotifyUrl,
            ["name_first"]   = payment.FirstName,
            ["name_last"]    = payment.LastName,
            ["email_address"]= payment.Email,
            ["m_payment_id"] = payment.InternalPaymentId.ToString(),
            ["amount"]       = payment.Amount.ToString("F2"),
            ["item_name"]    = payment.ItemName,
            ["item_description"] = payment.ItemDescription ?? string.Empty,
        };

        // Generate signature
        data["signature"] = GenerateSignature(data, _settings.Value.PayFast.PassPhrase);

        var queryString = string.Join("&",
            data.Select(kv => $"{kv.Key}={Uri.EscapeDataString(kv.Value)}"));

        var baseUrl = _settings.Value.PayFast.IsSandbox == "true"
            ? _settings.Value.PayFast.SandboxUrl
            : _settings.Value.PayFast.BaseUrl;

        return $"{baseUrl}?{queryString}";
    }

    // Validate IPN callback from PayFast
    public async Task<bool> ValidateIPN(IFormCollection form)
    {
        // 1. Verify signature
        var data = form.ToDictionary(k => k.Key, v => v.Value.ToString());
        data.Remove("signature");
        var expectedSig = GenerateSignature(data, _settings.Value.PayFast.PassPhrase);
        if (form["signature"].ToString() != expectedSig) return false;

        // 2. Verify with PayFast servers
        using var client = new HttpClient();
        var content = new FormUrlEncodedContent(form.Select(x =>
            new KeyValuePair<string, string>(x.Key, x.Value!)));
        var response = await client.PostAsync("https://www.payfast.co.za/eng/query/validate", content);
        var result = await response.Content.ReadAsStringAsync();
        return result.Trim() == "VALID";
    }

    // Update transaction status after IPN validation
    public async Task ProcessSuccessfulPayment(string internalPaymentId, string payFastPaymentId)
    {
        if (!Guid.TryParse(internalPaymentId, out var txKey)) return;

        var tx = await _transactionRepo.GetByCondition(x => x.TransactionKey == txKey);
        if (tx == null) return;

        tx.PaymentStatus = "complete";
        tx.PayFastPaymentId = payFastPaymentId;
        tx.CompletedDate = DateTime.UtcNow;

        await _transactionRepo.UpdateAsync(tx);
        await _unitOfWork.SaveChangesAsync();

        // Trigger enrollment / access grant
    }

    private static string GenerateSignature(Dictionary<string, string> data, string passphrase)
    {
        var pairs = data
            .Where(x => !string.IsNullOrEmpty(x.Value))
            .OrderBy(x => x.Key)
            .Select(x => $"{x.Key}={Uri.EscapeDataString(x.Value).Replace("+", "%20")}");

        var str = string.Join("&", pairs);
        if (!string.IsNullOrEmpty(passphrase))
            str += $"&passphrase={Uri.EscapeDataString(passphrase)}";

        using var md5 = System.Security.Cryptography.MD5.Create();
        var hash = md5.ComputeHash(System.Text.Encoding.UTF8.GetBytes(str));
        return Convert.ToHexString(hash).ToLower();
    }
}

// PayFast controller
[ApiController]
[Route("api/payment")]
public class PayFastController : BaseController
{
    [HttpPost("initiate")]
    public async Task<IActionResult> Initiate([FromBody] InitiatePaymentDto dto)
    {
        var url = _payFastService.BuildPaymentUrl(new PayFastPaymentDto
        {
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Email = dto.Email,
            Amount = dto.Amount,
            ItemName = dto.CourseName,
            InternalPaymentId = Guid.NewGuid()
        });
        return Ok(new { paymentUrl = url });
    }

    [HttpPost("notify")]
    [AllowAnonymous]
    public async Task<IActionResult> Notify([FromForm] IFormCollection form)
    {
        var isValid = await _payFastService.ValidateIPN(form);
        if (!isValid) return BadRequest();

        if (form["payment_status"] == "COMPLETE")
            await _payFastService.ProcessSuccessfulPayment(
                form["m_payment_id"]!, form["pf_payment_id"]!);

        return Ok();
    }
}
```

---

## INTEGRATION 3: AZURE KEY VAULT

### Configuration extension
```csharp
// Extension/AzureKeyVaultExtension.cs
public static class AzureKeyVaultExtension
{
    // Production Key Vault
    public static IConfigurationBuilder AddAzureKeyVaultConfiguration(
        this IConfigurationBuilder builder)
    {
        var vaultUri = Environment.GetEnvironmentVariable("AZURE_KEYVAULT_URI")
                    ?? builder.Build()["Azure:KeyVault:Uri"]!;

        builder.AddAzureKeyVault(
            new Uri(vaultUri),
            new DefaultAzureCredential());

        return builder;
    }

    // Developer Key Vault (uses user's logged-in Azure identity)
    public static IConfigurationBuilder AddAzureDeveloperKeyVaultConfiguration(
        this IConfigurationBuilder builder)
    {
        var vaultUri = builder.Build()["Azure:DeveloperKeyVault:Uri"];
        if (string.IsNullOrEmpty(vaultUri)) return builder;

        builder.AddAzureKeyVault(new Uri(vaultUri), new DefaultAzureCredential());
        return builder;
    }
}

// NuGet required:
// Azure.Extensions.AspNetCore.Configuration.Secrets
// Azure.Identity
```

### Secret naming convention in Key Vault
```
AppDb--ConnectionString          → ConnectionStrings:AppDb
AuthorizationSettings--AuthKey   → AuthorizationSettings:AuthKey
MoodleWebService--Token          → MoodleWebService:Token
PayFast--MerchantKey             → PayFast:MerchantKey
WhatsApp--AccessToken            → WhatsApp:AccessToken
```

---

## INTEGRATION 4: AZURE APPLICATION INSIGHTS

```csharp
// In Program.cs
builder.Services.AddApplicationInsightsTelemetry(options =>
{
    options.ConnectionString = builder.Configuration["ApplicationInsights:ConnectionString"];
});

// Custom telemetry in services
public class CourseService : ICourseService
{
    private readonly TelemetryClient _telemetry;

    public async Task<CourseDto> CreateCourse(CreateCourseDto dto)
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        try
        {
            var result = /* ... create course ... */;

            // Track successful creation
            _telemetry.TrackEvent("CourseCreated", new Dictionary<string, string>
            {
                ["CourseKey"] = result.CourseKey.ToString(),
                ["CourseName"] = result.CourseName
            });

            return result;
        }
        finally
        {
            sw.Stop();
            _telemetry.TrackMetric("CourseCreation.Duration", sw.ElapsedMilliseconds);
        }
    }
}
```

---

## INTEGRATION 5: AI / AZURE OPENAI

### Configuration
```json
{
  "AzureOpenAI": {
    "Endpoint": "https://yourresource.openai.azure.com/",
    "ApiKey": "YOUR_API_KEY",
    "DeploymentName": "gpt-4",
    "MaxTokens": 2000,
    "Temperature": 0.7
  }
}
```

### Service implementation
```csharp
// Services/GenAI/GenAIService.cs
public class GenAIService : IGenAIService
{
    private readonly HttpClient _httpClient;
    private readonly IOptions<AppSettingsDto> _settings;
    private readonly IGenericRepository<AIPromptTemplate> _promptRepo;
    private readonly ISystemErrorLogService _errorLog;

    // Call Azure OpenAI with a named prompt template
    public async Task<string> RunPromptAsync(string templateName, Dictionary<string, string> variables)
    {
        try
        {
            // Load prompt template from DB
            var template = await _promptRepo.GetByCondition(
                x => x.TemplateName == templateName && x.RecordStatusId == Constants.ActiveRecordStatusID,
                tracking: false);

            if (template == null) throw new KeyNotFoundException($"Prompt template '{templateName}' not found");

            // Replace variables in template
            var prompt = template.PromptBody;
            foreach (var (key, value) in variables)
                prompt = prompt.Replace($"{{{{{key}}}}}", value);

            return await CallOpenAIAsync(template.SystemPrompt, prompt);
        }
        catch (Exception ex)
        {
            _errorLog.LogSystemError(templateName, ex.ToString(),
                "Service", nameof(GenAIService), nameof(RunPromptAsync), Guid.Empty, string.Empty);
            throw;
        }
    }

    private async Task<string> CallOpenAIAsync(string systemPrompt, string userPrompt)
    {
        var cfg = _settings.Value.AzureOpenAI;
        var url = $"{cfg.Endpoint}openai/deployments/{cfg.DeploymentName}/chat/completions?api-version=2024-02-01";

        var payload = new
        {
            messages = new[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = userPrompt }
            },
            max_tokens = cfg.MaxTokens,
            temperature = cfg.Temperature
        };

        _httpClient.DefaultRequestHeaders.Clear();
        _httpClient.DefaultRequestHeaders.Add("api-key", cfg.ApiKey);

        var response = await _httpClient.PostAsJsonAsync(url, payload);
        var json = await response.Content.ReadAsStringAsync();
        var result = System.Text.Json.JsonDocument.Parse(json);
        return result.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString() ?? string.Empty;
    }

    // Score an assessment response using AI
    public async Task<AIScoreResult> ScoreAssessmentAsync(string submittedText, string rubric)
    {
        var prompt = $"Rubric:\n{rubric}\n\nStudent Response:\n{submittedText}\n\nProvide a score (0-100) and brief feedback in JSON format: {{\"score\": N, \"feedback\": \"...\"}}";
        var response = await CallOpenAIAsync("You are an expert educational assessor.", prompt);

        var jsonResult = System.Text.Json.JsonDocument.Parse(response);
        return new AIScoreResult
        {
            Score = jsonResult.RootElement.GetProperty("score").GetInt32(),
            Feedback = jsonResult.RootElement.GetProperty("feedback").GetString() ?? string.Empty
        };
    }
}
```

---

## INTEGRATION 6: EMAIL SMTP (Per-Client Configuration)

```csharp
// Services/Emails/SmtpEmailSender.cs
public class SmtpEmailSender : ISmtpEmailSender
{
    private readonly IGenericRepository<ClientSmtpConfiguration> _smtpConfigRepo;

    public async Task SendAsync(int? clientId, string toEmail, string toName,
        string subject, string htmlBody)
    {
        // Load SMTP config: per-client first, then global fallback
        ClientSmtpConfiguration? smtp = null;

        if (clientId.HasValue)
            smtp = await _smtpConfigRepo.GetByCondition(
                x => x.ClientId == clientId && x.RecordStatusId == Constants.ActiveRecordStatusID,
                tracking: false);

        smtp ??= await _smtpConfigRepo.GetByCondition(
            x => x.ClientId == null && x.RecordStatusId == Constants.ActiveRecordStatusID,
            tracking: false);

        if (smtp == null) throw new InvalidOperationException("No SMTP configuration found");

        using var mailMessage = new MailMessage
        {
            From = new MailAddress(smtp.FromEmail, smtp.SenderName),
            Subject = subject,
            Body = htmlBody,
            IsBodyHtml = true
        };
        mailMessage.To.Add(new MailAddress(toEmail, toName));

        using var smtpClient = new SmtpClient(smtp.SmtpHost, smtp.Port)
        {
            Credentials = new NetworkCredential(smtp.Username, smtp.Password),
            EnableSsl = smtp.UseSsl,
            Timeout = 30000
        };

        await smtpClient.SendMailAsync(mailMessage);
    }
}
```

---

## INTEGRATION 7: IOMAD (Multi-Company Moodle Extension)

IOMAD is an open-source Moodle plugin for multi-company/multi-tenant Moodle.
Use it when each client needs their own isolated Moodle company.

```csharp
// Additional Moodle Web Service functions for IOMAD
// POST body format:

// Create company in IOMAD
var createCompanyData =
    $"companies[0][name]={Uri.EscapeDataString(companyName)}&" +
    $"companies[0][shortname]={Uri.EscapeDataString(shortName)}&" +
    $"companies[0][city]={Uri.EscapeDataString(city)}&" +
    $"companies[0][country]=ZA";
// wsfunction=block_iomad_company_admin_create_companies

// Assign user to company
var assignUserData =
    $"userlist[0][userid]={moodleUserId}&" +
    $"userlist[0][companyid]={iomadCompanyId}";
// wsfunction=block_iomad_company_admin_assign_users

// Enroll user in company course (uses IOMAD's license system)
var iomadEnrolData =
    $"enrolments[0][userid]={moodleUserId}&" +
    $"enrolments[0][courseid]={moodleCourseId}&" +
    $"enrolments[0][companyid]={iomadCompanyId}";
// wsfunction=block_iomad_company_admin_enrol_users
```

---

## INTEGRATION SUMMARY TABLE

| Integration | NuGet / Library | Config Section | Key Method |
|-------------|----------------|----------------|-----------|
| Moodle WS | Newtonsoft.Json, CryptSharp | `MoodleWebService.*` | See `06-moodle-integration.md` |
| WhatsApp | HttpClient (no lib) | `WhatsApp.*` | `SendTextMessage()`, `ProcessIncomingMessage()` |
| PayFast | HttpClient (no lib) | `PayFast.*` | `BuildPaymentUrl()`, `ValidateIPN()` |
| Azure Key Vault | `Azure.Extensions.AspNetCore.Configuration.Secrets`, `Azure.Identity` | `Azure.KeyVault.Uri` | `AddAzureKeyVaultConfiguration()` |
| Azure App Insights | `Microsoft.ApplicationInsights.AspNetCore` | `ApplicationInsights.*` | `TelemetryClient.TrackEvent()` |
| Azure OpenAI | HttpClient (no lib needed) | `AzureOpenAI.*` | `CallOpenAIAsync()` |
| SMTP Email | `System.Net.Mail` (built-in) | `ClientSmtpConfiguration` (DB) | `SmtpClient.SendMailAsync()` |
| IOMAD Moodle | Newtonsoft.Json | `MoodleWebService.*` | block_iomad_company_admin_* |
