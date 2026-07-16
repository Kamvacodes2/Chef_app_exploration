# SKILL: Recreate Speccon TAP Backend with Moodle Integration

> **For any LLM:** Read this document top-to-bottom before writing a single line of code.
> It contains every architectural decision, pattern, configuration value, and code contract
> needed to recreate a fully functional .NET backend that integrates with open-source Moodle.

---

## SECTION 1: WHAT YOU ARE BUILDING

You are recreating the **Speccon TAP ERP backend** — a multi-project ASP.NET Core 8 solution
that acts as the central platform for:
- User management (employees, learners, companies)
- Learning Management System (LMS) — courses, enrollments, completion tracking
- **Moodle integration** — syncing users, enrollments, and grades with an external Moodle instance
- CRM, HR, WhatsApp notifications, AI/GenAI, scheduling, reporting

The Moodle integration is the bridge between this ERP backend and the open-source Moodle LMS.
Users are provisioned in both systems; course enrollments and completions flow both ways.

---

## SECTION 2: SOLUTION ARCHITECTURE

### Project Layout
```
Speccon_TAP_Ext/
├── Speccon_Tap.sln                        # Master solution
├── Speccon_Tap.csproj                     # Root MVC shell (login page, health check)
│
└── src-tap/
    ├── Domain/
    │   └── Speccon.Tap.Domain/            # Entities, Enums, Constants, Helpers
    │
    ├── Infrastructure/
    │   └── Data/
    │       └── Speccon.Tap.Data/          # EF Core DbContext, Repositories, Migrations
    │
    ├── Services/
    │   ├── Speccon.Tap.Services/          # Business logic (the bulk of the app)
    │   ├── Speccon.Tap.Services.Interfaces/  # Service + Repository interfaces
    │   ├── Speccon.Tap.Services.Test/     # Unit tests
    │   └── Speccon.Tap.Services.EeTests/  # E2E tests
    │
    └── Presentation/
        ├── Speccon.Tap.Api/               # Main REST API (JWT auth, Quartz scheduler)
        ├── Speccon.Tap.Crm/               # CRM module API
        ├── Speccon.Tap.Enterprise/        # Enterprise tenant API
        ├── Speccon.Tap.Functions/         # Azure Functions (background jobs)
        ├── Speccon.Tap.GenAI/             # Generative AI endpoints
        ├── Speccon.Tap.Kanban/            # Kanban board API
        ├── Speccon.Tap.Reporting/         # DevExpress reporting API
        ├── Speccon.Tap.Scheduler/         # Quartz.NET scheduler
        └── Speccon.Tap.WhatsApp/          # WhatsApp Business API integration
```

### Dependency Direction (Clean Architecture)
```
Presentation → Services.Interfaces ← Services
Presentation → Data (for DI registration only)
Services     → Domain
Data         → Domain
```

---

## SECTION 3: TECH STACK & NUGET PACKAGES

### Runtime
- **.NET 8** (`net8.0`)
- **ASP.NET Core 8** (Web API, MVC)
- **Entity Framework Core 8** (SQL Server)

### Core NuGet Packages (Speccon.Tap.Api.csproj)
```xml
<PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="8.0.11" />
<PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="8.0.11" />
<PackageReference Include="Quartz" Version="3.11.0" />
<PackageReference Include="Quartz.Extensions.Hosting" Version="3.11.0" />
<PackageReference Include="Quartz.Serialization.SystemTextJson" Version="3.11.0" />
<PackageReference Include="QuestPDF" Version="2025.1.5" />
<PackageReference Include="Serilog.AspNetCore" Version="8.0.1" />
<PackageReference Include="Serilog.Sinks.MSSqlServer" Version="6.6.0" />
<PackageReference Include="Swashbuckle.AspNetCore" Version="6.5.0" />
<PackageReference Include="FluentValidation" Version="12.0.0" />
<PackageReference Include="FluentValidation.AspNetCore" Version="11.3.1" />
<PackageReference Include="DotNetEnv" Version="3.1.1" />
<PackageReference Include="Microsoft.ApplicationInsights.AspNetCore" Version="2.22.0" />
<PackageReference Include="System.IdentityModel.Tokens.Jwt" Version="7.4.1" />
<PackageReference Include="ExcelDataReader" Version="3.6.0" />
<PackageReference Include="Ical.Net" Version="4.2.0" />
<PackageReference Include="SkiaSharp" Version="3.119.0" />
```

### LMS/Moodle-specific packages (Speccon.Tap.Services.csproj)
```xml
<PackageReference Include="CryptSharp.Standard" Version="2.1.0" />  <!-- Blowfish password hashing -->
<PackageReference Include="Newtonsoft.Json" Version="13.0.3" />      <!-- JSON parsing for Moodle responses -->
<PackageReference Include="Microsoft.Extensions.Http" Version="8.0.0" />
```

---

## SECTION 4: CONFIGURATION SCHEMA

### appsettings.json structure (Speccon.Tap.Api)
Every secret is pulled from **Azure Key Vault** in production. In development, use `.env` file.

```json
{
  "ConnectionStrings": {
    "AppDb": "Server=...;Database=SpecconTap;..."
  },
  "CORSSettings": {
    "AllowedOrigins": ["https://app.yourdomain.com", "http://localhost:3000"]
  },
  "ApplicationInsights": {
    "ConnectionString": ""
  },
  "RateLimiting": {
    "Enabled": "0"
  },
  "Moodle": {
    "Url": "https://your-moodle-site.com",
    "Login": "/login/index.php?username=@name@&password=@password@&wantsurl=/course/view.php?id=@cid@"
  },
  "MoodleWebService": {
    "Url": "https://your-moodle-site.com/webservice/rest/server.php",
    "Token": "YOUR_MOODLE_WS_TOKEN",
    "GetUserRequestUrl": "https://your-moodle-site.com/webservice/rest/server.php?wstoken=TOKEN&wsfunction=core_user_get_users&moodlewsrestformat=json&criteria[0][key]=username&criteria[0][value]=",
    "CreateUserUrl": "https://your-moodle-site.com/webservice/rest/server.php?wstoken=TOKEN&wsfunction=core_user_create_users&moodlewsrestformat=json",
    "UpdateUserUrl": "https://your-moodle-site.com/webservice/rest/server.php?wstoken=TOKEN&wsfunction=core_user_update_users&moodlewsrestformat=json",
    "EnrolUserUrl": "https://your-moodle-site.com/webservice/rest/server.php?wstoken=TOKEN&wsfunction=enrol_manual_enrol_users&moodlewsrestformat=json"
  },
  "MySqlSettings": {
    "IsIOMAD": "false"
  },
  "AuthorizationSettings": {
    "AuthKey": "YOUR_JWT_SECRET_KEY_MIN_32_CHARS"
  }
}
```

### KeyvaultAppConfigurationDto (the strongly-typed settings class)
```csharp
// Domain/Constants/KeyvaultAppConfigurationDto.cs
public class KeyvaultAppConfigurationDto
{
    public ConnectionStringsDto ConnectionStrings { get; set; }
    public MoodleSettingsDto Moodle { get; set; }
    public MoodleWebServiceDto MoodleWebService { get; set; }
    public MySqlSettingsDto MySqlSettings { get; set; }
    public AuthorizationSettingsDto AuthorizationSettings { get; set; }
}

public class MoodleSettingsDto
{
    public string Url { get; set; }
    public string Login { get; set; }  // Template: /login/index.php?username=@name@&password=@password@&wantsurl=/course/view.php?id=@cid@
}

public class MoodleWebServiceDto
{
    public string Url { get; set; }              // REST endpoint
    public string Token { get; set; }            // wstoken
    public string GetUserRequestUrl { get; set; } // core_user_get_users by username
    public string CreateUserUrl { get; set; }    // core_user_create_users
    public string UpdateUserUrl { get; set; }    // core_user_update_users
    public string EnrolUserUrl { get; set; }     // enrol_manual_enrol_users
}

public class MySqlSettingsDto
{
    public string IsIOMAD { get; set; }  // "true" = IOMAD multi-company mode
}
```

---

## SECTION 5: MOODLE INTEGRATION — COMPLETE IMPLEMENTATION

### 5.1 How Moodle Web Services Work

Moodle exposes a REST API at:
```
POST/GET https://{moodle-site}/webservice/rest/server.php
```

Every request requires:
- `wstoken` — the API token generated in Moodle admin
- `wsfunction` — the function name (e.g. `core_user_create_users`)
- `moodlewsrestformat=json` — response format

**Moodle setup steps required:**
1. Site Admin → Advanced Features → Enable web services ✓
2. Site Admin → Plugins → Web services → Manage protocols → Enable REST ✓
3. Create a dedicated integration user with `moodle/webservice:createtoken` capability
4. Site Admin → Plugins → Web services → External services → Add new service
5. Add these functions to the service:
   - `core_user_get_users`
   - `core_user_create_users`
   - `core_user_update_users`
   - `core_enrol_get_users_courses`
   - `enrol_manual_enrol_users`
   - `core_course_get_courses`
   - `gradereport_user_get_grade_items`
6. Manage tokens → Generate token for the integration user

### 5.2 Password Hashing for Moodle

Moodle uses **Blowfish/bcrypt** password hashing. Use `CryptSharp`:

```csharp
using CryptSharp;

public string HashPasswordForMoodle(string plainPassword)
{
    return Crypter.Blowfish.Crypt(plainPassword, new CrypterOptions()
    {
        { CrypterOption.Variant, BlowfishCrypterVariant.Corrected },
        { CrypterOption.Rounds, 10 }
    });
}
```

**IMPORTANT:** The Moodle password must be at least 8 chars, contain a digit and a lowercase letter.
The system auto-generates a valid password from the user's `LmsKey` (a GUID with dashes removed).

### 5.3 User Lifecycle in Moodle

```
ERP User Created/Updated
        │
        ▼
Does Moodle user exist? (core_user_get_users by username=UserKey GUID)
        │
   NO ──┼── YES
        │         │
        ▼         ▼
  CreateMoodleUser   UpdateMoodleUser
  (core_user_create_users)  (core_user_update_users)
        │         │
        └────┬────┘
             ▼
   CheckCourseEnrollment
   (core_enrol_get_users_courses)
             │
    Not enrolled? → EnrolUser
    (enrol_manual_enrol_users, roleId=5 [student])
```

### 5.4 LmsService — Complete Production Code

```csharp
// src-tap/Services/Speccon.Tap.Services/Services/Lms/LmsService.cs
using CryptSharp;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.Net;
using System.Text;

namespace Speccon.Tap.Services.Services.Lms
{
    public class LmsService : ILmsService
    {
        private readonly IGenericRepository<Course> _courseRepository;
        private readonly IGenericRepository<User> _userRepository;
        private readonly IGenericRepository<UserCourse> _userCourseRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly HttpClient _httpClient;
        private readonly ISystemErrorLogService _errorLog;
        private readonly IUserService _userService;
        private readonly KeyvaultAppConfigurationDto _appSettings;
        private const int MoodleCallTimeoutSeconds = 30;

        public LmsService(
            IGenericRepository<Course> courseRepository,
            IGenericRepository<User> userRepository,
            IGenericRepository<UserCourse> userCourseRepository,
            IUnitOfWork unitOfWork,
            HttpClient httpClient,
            ISystemErrorLogService errorLog,
            IUserService userService,
            IOptions<KeyvaultAppConfigurationDto> appSettings)
        {
            _courseRepository = courseRepository;
            _userRepository = userRepository;
            _userCourseRepository = userCourseRepository;
            _unitOfWork = unitOfWork;
            _httpClient = httpClient;
            _errorLog = errorLog;
            _userService = userService;
            _appSettings = appSettings.Value;
        }

        // Blowfish hash — required by Moodle's password format
        public string password_hash(string password)
        {
            return Crypter.Blowfish.Crypt(password, new CrypterOptions()
            {
                { CrypterOption.Variant, BlowfishCrypterVariant.Corrected },
                { CrypterOption.Rounds, 10 }
            });
        }

        // GET user from Moodle by username (username = UserKey GUID string)
        public async Task<LmsReturnDto> GetMoodleUser(LmsUserDto lmsUserDto)
        {
            var moodleReturnDto = new LmsReturnDto();
            var requestUri = _appSettings.MoodleWebService.GetUserRequestUrl + lmsUserDto.username;

            try
            {
                using var client = new HttpClient();
                var response = await client.GetAsync(requestUri);
                if (response.StatusCode == HttpStatusCode.OK)
                {
                    string responseBody = await response.Content.ReadAsStringAsync();
                    if (!string.IsNullOrEmpty(responseBody))
                    {
                        var jsonResponse = JObject.Parse(responseBody);
                        if (jsonResponse["users"]?.HasValues == true)
                        {
                            int moodleUserId = (int)jsonResponse["users"][0]["id"];
                            moodleReturnDto.MoodleUserID = moodleUserId;
                            moodleReturnDto.Success = true;
                            lmsUserDto.MoodleUserID = moodleUserId;
                            await UpdateMoodleUser(lmsUserDto);
                        }
                        else
                        {
                            moodleReturnDto.Success = false;
                            moodleReturnDto.ErrorMessage = "User not found";
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _errorLog.LogSystemError(JsonConvert.SerializeObject(lmsUserDto.username),
                    ex.ToString(), nameof(Services), nameof(LmsService), nameof(GetMoodleUser), Guid.Empty, string.Empty);
                throw;
            }
            return moodleReturnDto;
        }

        // GET only the Moodle user ID (lightweight lookup)
        public async Task<int> GetMoodleUserId(string username)
        {
            var requestUri = _appSettings.MoodleWebService.GetUserRequestUrl + username;
            try
            {
                using var client = new HttpClient();
                var response = await client.GetAsync(requestUri);
                if (response.StatusCode == HttpStatusCode.OK)
                {
                    string responseBody = await response.Content.ReadAsStringAsync();
                    if (!string.IsNullOrEmpty(responseBody))
                    {
                        var jsonResponse = JObject.Parse(responseBody);
                        if (jsonResponse["users"]?.HasValues == true)
                            return (int)jsonResponse["users"][0]["id"];
                    }
                }
            }
            catch (Exception ex)
            {
                _errorLog.LogSystemError(JsonConvert.SerializeObject(username),
                    ex.ToString(), nameof(Services), nameof(LmsService), nameof(GetMoodleUserId), Guid.Empty, string.Empty);
                throw;
            }
            return 0;
        }

        // Create or update user, then check enrollment
        public async Task<LmsUserDto> CreateMoodleUser(LmsUserDto lmsUserDto)
        {
            var returnUserDto = new LmsUserDto
            {
                username = lmsUserDto.username,
                citizenID = lmsUserDto.citizenID,
                email = lmsUserDto.email,
                firstname = lmsUserDto.firstname
            };

            string password = lmsUserDto.password;

            // Validate password meets Moodle policy: 8+ chars, digit, lowercase
            if (password.Length < 8 || !password.Any(char.IsDigit) || !password.Any(char.IsLower))
            {
                Guid userKey = Guid.Parse(lmsUserDto.username);
                var user = await _userRepository.GetByCondition(x => x.UserKey == userKey);
                user.LmsKey = Guid.NewGuid();
                var resultUser = await _userService.UpdateUser(user);
                password = resultUser.LmsKey.ToString().Replace("-", string.Empty);
                lmsUserDto.password = password;
            }

            var moodleResponse = await GetMoodleUser(lmsUserDto);

            if (moodleResponse.MoodleUserID == 0)
            {
                // User does not exist in Moodle — create them
                string postData;
                bool isIOMAD = Convert.ToBoolean(_appSettings.MySqlSettings.IsIOMAD);

                if (isIOMAD)
                {
                    // IOMAD mode: include department (company ID)
                    postData =
                        $"users[0][auth]=manual" +
                        $"users[0][username]={Uri.EscapeDataString(lmsUserDto.username)}" +
                        $"users[0][password]={Uri.EscapeDataString(password_hash(lmsUserDto.password))}" +
                        $"users[0][firstname]={Uri.EscapeDataString(lmsUserDto.firstname)}" +
                        $"users[0][email]={Uri.EscapeDataString(lmsUserDto.email)}" +
                        $"users[0][idnumber]={Uri.EscapeDataString(lmsUserDto.citizenID)}" +
                        $"users[0][lastname]={Uri.EscapeDataString(lmsUserDto.surname)}" +
                        $"users[0][department]={Uri.EscapeDataString(lmsUserDto.moodleCompanyId.ToString())}";
                }
                else
                {
                    postData =
                        $"users[0][auth]=manual&" +
                        $"users[0][username]={Uri.EscapeDataString(lmsUserDto.username)}&" +
                        $"users[0][password]={Uri.EscapeDataString(password_hash(lmsUserDto.password))}&" +
                        $"users[0][firstname]={Uri.EscapeDataString(lmsUserDto.firstname)}&" +
                        $"users[0][email]={Uri.EscapeDataString(lmsUserDto.email)}&" +
                        $"users[0][idnumber]={Uri.EscapeDataString(lmsUserDto.citizenID)}&" +
                        $"users[0][lastname]={Uri.EscapeDataString(lmsUserDto.surname)}";
                }

                var content = new StringContent(postData, Encoding.UTF8, "application/x-www-form-urlencoded");
                var response = await _httpClient.PostAsync(_appSettings.MoodleWebService.CreateUserUrl, content);
                var result = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    var token = JToken.Parse(result);
                    // Moodle returns JObject with "exception"/"message" on error
                    if (token is JObject obj && (obj["exception"] != null || obj["message"] != null))
                    {
                        returnUserDto.ErrorMessage = obj["message"]?.ToString()
                            ?? obj["exception"]?.ToString()
                            ?? "Moodle returned an error.";
                        return returnUserDto;
                    }

                    var userId = (token as JArray)?.First?["id"]?.Value<int>();
                    if (userId.HasValue)
                        returnUserDto.MoodleUserID = userId.Value;
                    else
                        returnUserDto.ErrorMessage = string.IsNullOrWhiteSpace(result)
                            ? "Moodle did not return a user id." : result;
                }
                else
                {
                    returnUserDto.ErrorMessage = $"Moodle create user failed with HTTP {(int)response.StatusCode}.";
                }
            }
            else
            {
                // User already exists — update them
                returnUserDto.MoodleUserID = moodleResponse.MoodleUserID;
                lmsUserDto.MoodleUserID = moodleResponse.MoodleUserID;
                await UpdateMoodleUser(lmsUserDto);
            }

            // Enroll in course if moodlecourseID is set
            if (returnUserDto.MoodleUserID > 0 && lmsUserDto.moodlecourseID != 0)
            {
                Guid userKey = Guid.Parse(lmsUserDto.username);
                await CheckCourseEnrollment(userKey, lmsUserDto.moodlecourseID);
            }

            return returnUserDto;
        }

        // Update existing Moodle user profile
        public async Task<LmsReturnDto> UpdateMoodleUser(LmsUserDto lmsUserDbo)
        {
            var moodleReturnDto = new LmsReturnDto();
            string postData =
                $"users[0][id]={lmsUserDbo.MoodleUserID}&" +
                $"users[0][password]={lmsUserDbo.password}&" +
                $"users[0][firstname]={Uri.EscapeDataString(lmsUserDbo.firstname)}&" +
                $"users[0][email]={Uri.EscapeDataString(lmsUserDbo.email)}&" +
                $"users[0][idnumber]={Uri.EscapeDataString(lmsUserDbo.citizenID)}&" +
                $"users[0][lastname]={Uri.EscapeDataString(lmsUserDbo.surname)}&" +
                $"users[0][suspended]=0";

            try
            {
                using var client = new HttpClient();
                var content = new StringContent(postData, Encoding.UTF8, "application/x-www-form-urlencoded");
                var response = await client.PostAsync(_appSettings.MoodleWebService.UpdateUserUrl, content);
                moodleReturnDto.Success = response.IsSuccessStatusCode;
                moodleReturnDto.MoodleUserID = lmsUserDbo.MoodleUserID;
            }
            catch (Exception ex)
            {
                _errorLog.LogSystemError(JsonConvert.SerializeObject(lmsUserDbo),
                    ex.ToString(), nameof(Services), nameof(LmsService), nameof(UpdateMoodleUser), Guid.Empty, string.Empty);
                throw;
            }
            return moodleReturnDto;
        }

        // Check enrollment and auto-enroll if missing (roleId=5 = student)
        public async Task<LmsReturnDto> CheckCourseEnrollment(Guid userKey, int moodleCourseId)
        {
            var moodleReturnDto = new LmsReturnDto { Success = true };

            try
            {
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(MoodleCallTimeoutSeconds));
                var ct = cts.Token;

                int moodleUserId = await GetMoodleUserId(userKey.ToString());
                bool isEnrolled = false;

                // Check current enrollments
                var checkParams = new StringContent(
                    $"wstoken={_appSettings.MoodleWebService.Token}" +
                    $"&wsfunction=core_enrol_get_users_courses" +
                    $"&moodlewsrestformat=json" +
                    $"&userid={moodleUserId}" +
                    $"&returnusercount=0",
                    Encoding.UTF8, "application/x-www-form-urlencoded");

                try
                {
                    var checkResponse = await _httpClient.PostAsync(_appSettings.MoodleWebService.Url, checkParams, ct);
                    if (checkResponse.IsSuccessStatusCode)
                    {
                        string json = await checkResponse.Content.ReadAsStringAsync(ct);
                        var root = JToken.Parse(json);

                        if (root is JObject errObj && errObj["exception"] != null)
                        {
                            moodleReturnDto.Success = false;
                            moodleReturnDto.ErrorMessage = errObj["message"]?.ToString() ?? "Moodle enrollment check failed.";
                            return moodleReturnDto;
                        }

                        if (root is JArray courses)
                            isEnrolled = courses.Any(c => c["id"]?.Value<int>() == moodleCourseId);
                    }
                }
                catch (OperationCanceledException) when (ct.IsCancellationRequested)
                {
                    moodleReturnDto.Success = false;
                    moodleReturnDto.ErrorMessage = "Moodle enrollment check timed out.";
                    return moodleReturnDto;
                }

                if (!isEnrolled)
                {
                    int roleId = 5; // Student role
                    int timeNow = (int)(DateTime.UtcNow - new DateTime(1970, 1, 1)).TotalSeconds - 360;
                    int timeEnd = timeNow + 60 * 60 * 24 * 365; // 1 year

                    string enrolData =
                        $"enrolments[0][roleid]={roleId}&" +
                        $"enrolments[0][userid]={moodleUserId}&" +
                        $"enrolments[0][courseid]={moodleCourseId}&" +
                        $"enrolments[0][timestart]={timeNow}&" +
                        $"enrolments[0][timeend]={timeEnd}&";

                    try
                    {
                        var enrolContent = new StringContent(enrolData, Encoding.UTF8, "application/x-www-form-urlencoded");
                        var enrolResponse = await _httpClient.PostAsync(_appSettings.MoodleWebService.EnrolUserUrl, enrolContent, ct);
                        moodleReturnDto.Success = enrolResponse.IsSuccessStatusCode;
                    }
                    catch (OperationCanceledException) when (ct.IsCancellationRequested)
                    {
                        moodleReturnDto.Success = false;
                        moodleReturnDto.ErrorMessage = "Moodle enrollment request timed out.";
                        return moodleReturnDto;
                    }
                }
            }
            catch (Exception ex)
            {
                moodleReturnDto.Success = false;
                moodleReturnDto.ErrorMessage = ex is TaskCanceledException or TimeoutException
                    ? "Moodle request timed out." : ex.Message;
                _errorLog.LogSystemError($"{userKey},{moodleCourseId}",
                    ex.ToString(), nameof(Services), nameof(LmsService), nameof(CheckCourseEnrollment), Guid.Empty, string.Empty);
            }
            return moodleReturnDto;
        }

        // Auto-login: redirect URL with embedded credentials for SSO-style login
        public async Task<LoginDto> Login(Guid userKey, Guid courseKey)
        {
            var user = await _userRepository.GetByCondition(x => x.UserKey == userKey, false);
            var course = await _courseRepository.GetByCondition(a => a.CourseKey == courseKey, false);
            var userCourse = await _userCourseRepository.GetByCondition(
                x => x.UserId == user.UserId && x.CourseId == course.CourseId
                  && x.RecordStatusId == Constants.ActiveRecordStatusID
                  && x.WhatsAppUserCourseAssignmentId == 0);

            if (userCourse != null)
            {
                if (!userCourse.IsStarted)
                {
                    userCourse.IsStarted = true;
                    userCourse.StartDate = DateTime.Now;
                }
                userCourse.IsUpdateRequired = true;
                userCourse.IsOpen = true;
                await _userCourseRepository.UpdateAsync(userCourse);
                await _unitOfWork.SaveChangesAsync();
            }

            // Password is derived from LmsKey (GUID without dashes)
            string password = user.LmsKey.ToString().Replace("-", string.Empty);

            if (course?.MoodleCourseId > 0)
                await CheckCourseEnrollment(userKey, course.MoodleCourseId);

            string url = _appSettings.Moodle.Url
                + _appSettings.Moodle.Login
                    .Replace("@name@", user.UserKey.ToString())
                    .Replace("@password@", password)
                    .Replace("@cid@", course.MoodleCourseId.ToString());

            return new LoginDto { ReturnUrl = url };
        }
    }
}
```

### 5.5 Service Interface

```csharp
// Speccon.Tap.Services.Interfaces/Services/Lms/ILmsService.cs
public interface ILmsService
{
    string password_hash(string password);
    Task<LmsReturnDto> GetMoodleUser(LmsUserDto lmsUserDto);
    Task<int> GetMoodleUserId(string username);
    Task<LmsUserDto> CreateMoodleUser(LmsUserDto lmsUserDto);
    Task<LmsReturnDto> UpdateMoodleUser(LmsUserDto lmsUserDto);
    Task<LmsReturnDto> CheckCourseEnrollment(Guid userKey, int moodleCourseId);
    Task<LoginDto> Login(Guid userKey, Guid courseKey);
}
```

### 5.6 DTOs for Moodle Operations

```csharp
// ServiceDtos/Lms/LmsUserDto.cs
public class LmsUserDto
{
    public string username { get; set; }       // UserKey GUID as string (Moodle username)
    public string firstname { get; set; }
    public string surname { get; set; }
    public string email { get; set; }
    public string citizenID { get; set; }      // idnumber in Moodle
    public string password { get; set; }       // LmsKey GUID without dashes
    public int MoodleUserID { get; set; }      // Moodle's internal user ID
    public int moodlecourseID { get; set; }    // Moodle's internal course ID
    public int moodleCompanyId { get; set; }   // For IOMAD: department/company
    public string? ErrorMessage { get; set; }
}

// ServiceDtos/Lms/LmsReturnDto.cs
public class LmsReturnDto
{
    public bool Success { get; set; }
    public int MoodleUserID { get; set; }
    public string? ErrorMessage { get; set; }
}

// ServiceDtos/Lms/LoginDto.cs
public class LoginDto
{
    public string ReturnUrl { get; set; }     // Full Moodle auto-login URL
}
```

---

## SECTION 6: DOMAIN ENTITIES (Moodle-related fields)

### User entity (ERP ↔ Moodle sync)
```csharp
// Domain/Entities/User.cs
public class User
{
    public int UserId { get; set; }
    public Guid UserKey { get; set; }          // Used as Moodle username
    public Guid LmsKey { get; set; }           // Password seed for Moodle (GUID without dashes)
    public int? MoodleUserId { get; set; }     // Moodle's internal ID (cached)
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string Email { get; set; }
    public string CitizenId { get; set; }
    public int RecordStatusId { get; set; }
    // ... other fields
}
```

### Course entity (Moodle course reference)
```csharp
// Domain/Entities/Course.cs
public class Course
{
    public int CourseId { get; set; }
    public Guid CourseKey { get; set; }
    public string CourseName { get; set; }
    public int MoodleCourseId { get; set; }   // The course ID in Moodle (0 = not on Moodle)
    public int RecordStatusId { get; set; }
    // ... other fields
}
```

### UserCourse entity (enrollment tracking)
```csharp
// Domain/Entities/UserCourse.cs
public class UserCourse
{
    public int UserCourseId { get; set; }
    public int UserId { get; set; }
    public int CourseId { get; set; }
    public bool IsStarted { get; set; }
    public bool IsOpen { get; set; }
    public bool IsUpdateRequired { get; set; }    // Flags sync needed with Moodle
    public DateTime? StartDate { get; set; }
    public int RecordStatusId { get; set; }
    public int WhatsAppUserCourseAssignmentId { get; set; }  // 0 = direct enrollment
    // ... other fields
}
```

### LmsConfiguration entity (per-tenant LMS config)
```csharp
// Domain/Entities/LmsConfiguration.cs
public class LmsConfiguration
{
    public int LmsConfigurationId { get; set; }
    public Guid LmsConfigurationKey { get; set; }
    public string LmsName { get; set; }
    public string ConnectionString { get; set; }  // Direct DB connection string for Moodle DB
    public int RecordStatusId { get; set; }
}
```

---

## SECTION 7: REPOSITORY PATTERN

All data access goes through a generic repository:

```csharp
// Interfaces/AppRepositories/IGenericRepository.cs
public interface IGenericRepository<T> where T : class
{
    Task<T> GetByCondition(Expression<Func<T, bool>> expression, bool tracking = true);
    Task<IEnumerable<T>> GetAllAsync(Expression<Func<T, bool>> expression, ...);
    Task<PagedResult<T>> GetAllPagingAsync(...);
    Task<T> AddAsync(T entity);
    Task<T> UpdateAsync(T entity);
    Task DeleteAsync(T entity);
}

// Interfaces/UnitOfWork/IUnitOfWork.cs
public interface IUnitOfWork
{
    Task SaveChangesAsync();
    void Detach<T>(T entity) where T : class;
}
```

---

## SECTION 8: DI REGISTRATION PATTERN

### Program.cs — Service Registration (Speccon.Tap.Api)
```csharp
// Extension/ServiceExtension.cs
public static class ServiceExtension
{
    public static IServiceCollection AddApplicationServices(
        this IServiceCollection services, IConfiguration configuration)
    {
        // Moodle / LMS
        services.AddScoped<ILmsService, LmsService>();
        services.AddScoped<ILmsConfigurationService, LmsConfigurationService>();
        services.AddScoped<IeLearningService, eLearningService>();

        // HttpClient for Moodle API calls
        services.AddHttpClient<ILmsService, LmsService>();

        // Other services...
        return services;
    }

    public static IServiceCollection AddApplicationDbContextAndRepositories(
        this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlServer(configuration.GetConnectionString("AppDb")));

        services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        return services;
    }
}
```

### Strongly-typed config binding in Program.cs
```csharp
builder.Services.Configure<KeyvaultAppConfigurationDto>(builder.Configuration);
// Then inject as: IOptions<KeyvaultAppConfigurationDto>
```

---

## SECTION 9: API CONTROLLER PATTERN

```csharp
// Controllers/LmsController.cs
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LmsController : ControllerBase
{
    private readonly ILmsService _lmsService;
    private readonly ISystemErrorLogService _errorLog;

    public LmsController(ILmsService lmsService, ISystemErrorLogService errorLog)
    {
        _lmsService = lmsService;
        _errorLog = errorLog;
    }

    // POST api/lms/create-user
    [HttpPost("create-user")]
    public async Task<IActionResult> CreateMoodleUser([FromBody] LmsUserDto dto)
    {
        var result = await _lmsService.CreateMoodleUser(dto);
        if (!string.IsNullOrEmpty(result.ErrorMessage))
            return BadRequest(new { error = result.ErrorMessage });
        return Ok(result);
    }

    // POST api/lms/login
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LmsLoginRequestDto dto)
    {
        var result = await _lmsService.Login(dto.UserKey, dto.CourseKey);
        return Ok(result);
    }

    // POST api/lms/check-enrollment
    [HttpPost("check-enrollment")]
    public async Task<IActionResult> CheckEnrollment([FromBody] EnrollmentCheckDto dto)
    {
        var result = await _lmsService.CheckCourseEnrollment(dto.UserKey, dto.MoodleCourseId);
        return Ok(result);
    }
}
```

---

## SECTION 10: MOODLE API FUNCTION REFERENCE

| Function | HTTP | Purpose | Key Parameters |
|----------|------|---------|----------------|
| `core_user_get_users` | GET/POST | Find user by username | `criteria[0][key]=username&criteria[0][value]={username}` |
| `core_user_create_users` | POST | Create new Moodle user | `users[0][username]`, `users[0][password]`, `users[0][firstname]`, `users[0][lastname]`, `users[0][email]`, `users[0][auth]=manual` |
| `core_user_update_users` | POST | Update existing user | `users[0][id]={moodleId}`, plus fields to update |
| `core_enrol_get_users_courses` | POST | Get all courses a user is enrolled in | `userid={moodleUserId}` |
| `enrol_manual_enrol_users` | POST | Enroll user into course | `enrolments[0][roleid]=5`, `enrolments[0][userid]`, `enrolments[0][courseid]`, `enrolments[0][timestart]`, `enrolments[0][timeend]` |
| `core_course_get_courses` | POST | Get course details | `options[ids][0]={courseId}` |
| `gradereport_user_get_grade_items` | POST | Get user grades for course | `courseid={id}&userid={id}` |

**IOMAD-specific** (multi-company Moodle):
| Function | Purpose |
|----------|---------|
| `block_iomad_company_admin_create_companies` | Create a company |
| `block_iomad_company_admin_assign_users` | Assign user to company |
| `block_iomad_company_admin_enrol_users` | Enroll user in company course |

---

## SECTION 11: ERROR HANDLING PATTERN

Every service method follows this pattern:
```csharp
try
{
    // ... business logic
}
catch (Exception ex)
{
    string parameterName = JsonConvert.SerializeObject(inputDto);
    _errorLog.LogSystemError(
        parameterName,           // serialized input
        ex.ToString(),           // full exception
        nameof(Services),        // layer
        nameof(LmsService),      // class
        nameof(MethodName),      // method
        Guid.Empty,              // user key (if available)
        string.Empty             // additional context
    );
    throw; // always re-throw so callers know it failed
}
```

---

## SECTION 12: COMPLETE SETUP CHECKLIST FOR LLM

When recreating this backend with Moodle integration, follow this order:

### Phase 1: Solution & Domain
- [ ] Create solution file with all project references
- [ ] Create `Speccon.Tap.Domain` with entities: `User`, `Course`, `UserCourse`, `LmsConfiguration`
- [ ] Add `MoodleCourseId` (int) to `Course`
- [ ] Add `LmsKey` (Guid) and `MoodleUserId` (int?) to `User`
- [ ] Add constants: `ActiveRecordStatusID = 1`, `InactiveRecordStatusID = 2`, `ZeroValue = 0`

### Phase 2: Data Layer
- [ ] Create `Speccon.Tap.Data` with EF Core `AppDbContext`
- [ ] Add `DbSet<>` for all entities
- [ ] Implement `IGenericRepository<T>` and `IUnitOfWork`
- [ ] Configure SQL Server connection string

### Phase 3: Service Interfaces
- [ ] Create `ILmsService` with all Moodle method signatures
- [ ] Create `ILmsConfigurationService`
- [ ] Create `ISystemErrorLogService` with `LogSystemError(...)` method
- [ ] Create `IUserService` with `UpdateUser(User user)` method
- [ ] Define all DTOs: `LmsUserDto`, `LmsReturnDto`, `LoginDto`
- [ ] Define `KeyvaultAppConfigurationDto` with `Moodle` and `MoodleWebService` nested classes

### Phase 4: Service Implementations
- [ ] Implement `LmsService` (full code in Section 5.4)
- [ ] Implement `LmsConfigurationService` (CRUD for LMS configs)
- [ ] Install NuGet: `CryptSharp.Standard` for Blowfish hashing
- [ ] Register `HttpClient` for `ILmsService` via `services.AddHttpClient<ILmsService, LmsService>()`

### Phase 5: API Layer
- [ ] Add JWT Bearer authentication
- [ ] Create `LmsController` with create-user, login, check-enrollment endpoints
- [ ] Register all services in DI container
- [ ] Bind `KeyvaultAppConfigurationDto` to configuration
- [ ] Add CORS, Swagger, FluentValidation

### Phase 6: Moodle Setup
- [ ] Install open-source Moodle (PHP 8.x, MySQL/MariaDB or PostgreSQL)
- [ ] Enable Web Services in Moodle admin
- [ ] Enable REST protocol
- [ ] Create integration service and add required functions (see Section 10)
- [ ] Generate API token
- [ ] Configure all `MoodleWebService.*` URLs in appsettings

### Phase 7: Verify Integration
- [ ] Test `core_user_get_users` — should return empty for new user
- [ ] Test `core_user_create_users` — verify user appears in Moodle
- [ ] Test `enrol_manual_enrol_users` — verify course enrollment
- [ ] Test login redirect URL — user should land in correct course
- [ ] Test error handling — duplicate email, invalid token, timeout

---

## SECTION 13: KNOWN GOTCHAS

| Issue | Cause | Fix |
|-------|-------|-----|
| Moodle returns 200 with `{"exception":"..."}` on errors | Moodle HTTP errors are wrapped in JSON | Always check for `exception` key in JObject response |
| `core_user_create_users` fails silently | Password doesn't meet Moodle policy | Enforce 8+ chars, digit, lowercase before calling |
| Long path issues on Windows | Deep service directory names | Use `robocopy /MIR` for file operations, not PowerShell `Remove-Item` |
| IOMAD vs standard Moodle | IOMAD uses `department` field for company | Check `IsIOMAD` config flag before building post data |
| Enrollment check timeout | Moodle can be slow under load | `CancellationTokenSource(30 seconds)` on all Moodle calls |
| Duplicate DI container (orphaned) | Calling `BuildServiceProvider()` before `builder.Build()` | Never call `BuildServiceProvider()` during startup — use the built app's services |
| `UserId` vs `UserKey` | UserId = DB int PK, UserKey = Guid (external ID / Moodle username) | Always use `UserKey.ToString()` as the Moodle `username` |

---

## SECTION 14: QUICK REFERENCE — URL TEMPLATES

```
# Get user by username (GET)
{MoodleUrl}/webservice/rest/server.php?wstoken={TOKEN}&wsfunction=core_user_get_users&moodlewsrestformat=json&criteria[0][key]=username&criteria[0][value]={USERNAME}

# Create user (POST body)
wstoken={TOKEN}&wsfunction=core_user_create_users&moodlewsrestformat=json&users[0][auth]=manual&users[0][username]={USERNAME}&users[0][password]={HASHED_PW}&users[0][firstname]={FNAME}&users[0][lastname]={LNAME}&users[0][email]={EMAIL}&users[0][idnumber]={CITIZEN_ID}

# Update user (POST body)
wstoken={TOKEN}&wsfunction=core_user_update_users&moodlewsrestformat=json&users[0][id]={MOODLE_USER_ID}&users[0][firstname]={FNAME}&...

# Get enrolled courses for user (POST body)
wstoken={TOKEN}&wsfunction=core_enrol_get_users_courses&moodlewsrestformat=json&userid={MOODLE_USER_ID}&returnusercount=0

# Enroll user in course (POST body)
wstoken={TOKEN}&wsfunction=enrol_manual_enrol_users&moodlewsrestformat=json&enrolments[0][roleid]=5&enrolments[0][userid]={MOODLE_USER_ID}&enrolments[0][courseid]={MOODLE_COURSE_ID}&enrolments[0][timestart]={UNIX_TIMESTAMP}&enrolments[0][timeend]={UNIX_TIMESTAMP}

# Auto-login redirect URL
{MoodleUrl}/login/index.php?username={USER_KEY_GUID}&password={LMS_KEY_NO_DASHES}&wantsurl=/course/view.php?id={MOODLE_COURSE_ID}
```
