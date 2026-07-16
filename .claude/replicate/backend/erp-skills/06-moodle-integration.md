# SKILL 06: MOODLE INTEGRATION
## Complete Moodle Web Services Integration for any .NET 8 ERP Backend
## Extracted from production LmsService.cs — real working code

---

## WHAT THIS SKILL COVERS
- Moodle setup and configuration
- User provisioning (create / update / lookup)
- Course enrollment (check + auto-enroll)
- SSO auto-login URL generation
- Grade and completion retrieval
- IOMAD multi-company mode
- Complete error handling and timeout management

---

## PART 1: MOODLE SERVER SETUP (Do this in Moodle admin FIRST)

```
1. Site Admin → Advanced Features → ☑ Enable web services
2. Site Admin → Plugins → Web services → Manage protocols → Enable: REST
3. Site Admin → Users → Create user "erp_integration" (keep credentials)
4. Site Admin → Plugins → Web services → External services → Add new service:
      Name: ERP Integration Service
      Enabled: ✓
      Authorized users only: ✓
5. Add functions to the service (click "Functions" → "Add functions"):
      core_user_get_users
      core_user_create_users
      core_user_update_users
      core_enrol_get_users_courses
      enrol_manual_enrol_users
      core_course_get_courses
      gradereport_user_get_grade_items
      core_completion_get_course_completion_status
6. Add the erp_integration user as Authorized User for this service
7. Site Admin → Plugins → Web services → Manage tokens
      → Add token for erp_integration user + ERP Integration Service
      → Copy the generated token
```

---

## PART 2: CONFIGURATION

### appsettings.json
```json
{
  "Moodle": {
    "Url": "https://your-moodle-site.com",
    "Login": "/login/index.php?username=@name@&password=@password@&wantsurl=/course/view.php?id=@cid@"
  },
  "MoodleWebService": {
    "Url": "https://your-moodle-site.com/webservice/rest/server.php",
    "Token": "YOUR_MOODLE_WS_TOKEN_HERE",
    "GetUserRequestUrl": "https://your-moodle-site.com/webservice/rest/server.php?wstoken=TOKEN&wsfunction=core_user_get_users&moodlewsrestformat=json&criteria[0][key]=username&criteria[0][value]=",
    "CreateUserUrl": "https://your-moodle-site.com/webservice/rest/server.php?wstoken=TOKEN&wsfunction=core_user_create_users&moodlewsrestformat=json",
    "UpdateUserUrl": "https://your-moodle-site.com/webservice/rest/server.php?wstoken=TOKEN&wsfunction=core_user_update_users&moodlewsrestformat=json",
    "EnrolUserUrl": "https://your-moodle-site.com/webservice/rest/server.php?wstoken=TOKEN&wsfunction=enrol_manual_enrol_users&moodlewsrestformat=json"
  },
  "MySqlSettings": {
    "IsIOMAD": "false"
  }
}
```

### Strongly-typed configuration classes
```csharp
// Domain/Constants/AppSettingsDto.cs additions:
public class MoodleSettingsDto
{
    public string Url { get; set; } = string.Empty;
    // Template: /login/index.php?username=@name@&password=@password@&wantsurl=/course/view.php?id=@cid@
    public string Login { get; set; } = string.Empty;
}

public class MoodleWebServiceDto
{
    public string Url { get; set; } = string.Empty;            // REST endpoint
    public string Token { get; set; } = string.Empty;          // wstoken
    public string GetUserRequestUrl { get; set; } = string.Empty; // GET user by username
    public string CreateUserUrl { get; set; } = string.Empty;  // core_user_create_users
    public string UpdateUserUrl { get; set; } = string.Empty;  // core_user_update_users
    public string EnrolUserUrl { get; set; } = string.Empty;   // enrol_manual_enrol_users
}

public class MySqlSettingsDto
{
    // "true" = IOMAD multi-company mode; "false" = standard Moodle
    public string IsIOMAD { get; set; } = "false";
}
```

---

## PART 3: DTOs

```csharp
// ServiceDtos/Lms/LmsUserDto.cs
public class LmsUserDto
{
    public string username { get; set; } = string.Empty;     // UserKey GUID as string
    public string firstname { get; set; } = string.Empty;
    public string surname { get; set; } = string.Empty;
    public string email { get; set; } = string.Empty;
    public string citizenID { get; set; } = string.Empty;   // idnumber in Moodle
    public string password { get; set; } = string.Empty;    // LmsKey GUID without dashes
    public int MoodleUserID { get; set; }                   // Moodle's internal ID
    public int moodlecourseID { get; set; }                 // Moodle's course ID
    public int moodleCompanyId { get; set; }                // IOMAD: department/company
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
    public string ReturnUrl { get; set; } = string.Empty;  // Full Moodle auto-login URL
}
```

---

## PART 4: SERVICE INTERFACE

```csharp
// Interfaces/Services/Lms/ILmsService.cs
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

---

## PART 5: COMPLETE SERVICE IMPLEMENTATION

```csharp
// Services/Lms/LmsService.cs
// NuGet: CryptSharp.Standard (for Blowfish password hash)
using CryptSharp;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.Net;
using System.Text;

public class LmsService : ILmsService
{
    private readonly IGenericRepository<Course> _courseRepository;
    private readonly IGenericRepository<User> _userRepository;
    private readonly IGenericRepository<UserCourse> _userCourseRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly HttpClient _httpClient;
    private readonly ISystemErrorLogService _errorLog;
    private readonly IUserService _userService;
    private readonly AppSettingsDto _appSettings;
    private const int MoodleCallTimeoutSeconds = 30;

    public LmsService(
        IGenericRepository<Course> courseRepository,
        IGenericRepository<User> userRepository,
        IGenericRepository<UserCourse> userCourseRepository,
        IUnitOfWork unitOfWork,
        HttpClient httpClient,
        ISystemErrorLogService errorLog,
        IUserService userService,
        IOptions<AppSettingsDto> appSettings)
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

    // ── PASSWORD HASH ─────────────────────────────────────────────────────
    // Moodle uses Blowfish/bcrypt. CryptSharp provides this for .NET.
    public string password_hash(string password)
    {
        return Crypter.Blowfish.Crypt(password, new CrypterOptions()
        {
            { CrypterOption.Variant, BlowfishCrypterVariant.Corrected },
            { CrypterOption.Rounds, 10 }
        });
    }

    // ── GET MOODLE USER (full object + sync) ─────────────────────────────
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
                        int moodleUserId = (int)jsonResponse["users"]![0]!["id"]!;
                        moodleReturnDto.MoodleUserID = moodleUserId;
                        moodleReturnDto.Success = true;
                        lmsUserDto.MoodleUserID = moodleUserId;
                        await UpdateMoodleUser(lmsUserDto); // keep Moodle in sync
                    }
                    else
                    {
                        moodleReturnDto.Success = false;
                        moodleReturnDto.ErrorMessage = "User not found in Moodle";
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _errorLog.LogSystemError(JsonConvert.SerializeObject(lmsUserDto.username),
                ex.ToString(), "Service", nameof(LmsService), nameof(GetMoodleUser),
                Guid.Empty, string.Empty);
            throw;
        }
        return moodleReturnDto;
    }

    // ── GET MOODLE USER ID ONLY (lightweight) ────────────────────────────
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
                        return (int)jsonResponse["users"]![0]!["id"]!;
                }
            }
        }
        catch (Exception ex)
        {
            _errorLog.LogSystemError(username, ex.ToString(),
                "Service", nameof(LmsService), nameof(GetMoodleUserId), Guid.Empty, string.Empty);
            throw;
        }
        return 0;
    }

    // ── CREATE OR UPDATE MOODLE USER ─────────────────────────────────────
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

        // MOODLE PASSWORD POLICY: 8+ chars, contains digit AND lowercase
        if (password.Length < 8 || !password.Any(char.IsDigit) || !password.Any(char.IsLower))
        {
            // Auto-regenerate from a new LmsKey GUID (e.g. "a1b2c3d4e5f6...")
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
            // USER DOES NOT EXIST IN MOODLE — CREATE
            bool isIOMAD = Convert.ToBoolean(_appSettings.MySqlSettings.IsIOMAD);
            string postData;

            if (isIOMAD)
            {
                // IOMAD: include department field (company ID)
                postData =
                    $"users[0][auth]=manual" +
                    $"users[0][username]={Uri.EscapeDataString(lmsUserDto.username)}" +
                    $"users[0][password]={Uri.EscapeDataString(password_hash(password))}" +
                    $"users[0][firstname]={Uri.EscapeDataString(lmsUserDto.firstname)}" +
                    $"users[0][email]={Uri.EscapeDataString(lmsUserDto.email)}" +
                    $"users[0][idnumber]={Uri.EscapeDataString(lmsUserDto.citizenID)}" +
                    $"users[0][lastname]={Uri.EscapeDataString(lmsUserDto.surname)}" +
                    $"users[0][department]={Uri.EscapeDataString(lmsUserDto.moodleCompanyId.ToString())}";
            }
            else
            {
                // Standard Moodle
                postData =
                    $"users[0][auth]=manual&" +
                    $"users[0][username]={Uri.EscapeDataString(lmsUserDto.username)}&" +
                    $"users[0][password]={Uri.EscapeDataString(password_hash(password))}&" +
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

                // CRITICAL: Moodle returns HTTP 200 even on errors — check JSON for exception key
                if (token is JObject obj && (obj["exception"] != null || obj["message"] != null))
                {
                    returnUserDto.ErrorMessage = obj["message"]?.ToString()
                        ?? obj["exception"]?.ToString()
                        ?? "Moodle returned an error (username or email may already exist)";
                    _errorLog.LogSystemError(JsonConvert.SerializeObject(lmsUserDto),
                        returnUserDto.ErrorMessage!, "Service", nameof(LmsService),
                        nameof(CreateMoodleUser), Guid.Empty, string.Empty);
                    return returnUserDto;
                }

                var userId = (token as JArray)?.First?["id"]?.Value<int>();
                if (userId.HasValue)
                    returnUserDto.MoodleUserID = userId.Value;
                else
                    returnUserDto.ErrorMessage = string.IsNullOrWhiteSpace(result)
                        ? "Moodle did not return a user ID." : result;
            }
            else
            {
                returnUserDto.ErrorMessage = $"Moodle create user failed: HTTP {(int)response.StatusCode}. {result}";
            }
        }
        else
        {
            // USER EXISTS — UPDATE THEIR PROFILE
            returnUserDto.MoodleUserID = moodleResponse.MoodleUserID;
            lmsUserDto.MoodleUserID = moodleResponse.MoodleUserID;
            await UpdateMoodleUser(lmsUserDto);
        }

        // AUTO-ENROLL IN COURSE if a Moodle course ID was provided
        if (returnUserDto.MoodleUserID > 0 && lmsUserDto.moodlecourseID != 0)
        {
            Guid userKey = Guid.Parse(lmsUserDto.username);
            await CheckCourseEnrollment(userKey, lmsUserDto.moodlecourseID);
        }

        return returnUserDto;
    }

    // ── UPDATE MOODLE USER PROFILE ────────────────────────────────────────
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
                ex.ToString(), "Service", nameof(LmsService), nameof(UpdateMoodleUser),
                Guid.Empty, string.Empty);
            throw;
        }
        return moodleReturnDto;
    }

    // ── CHECK ENROLLMENT & AUTO-ENROLL IF MISSING ─────────────────────────
    public async Task<LmsReturnDto> CheckCourseEnrollment(Guid userKey, int moodleCourseId)
    {
        var moodleReturnDto = new LmsReturnDto { Success = true };

        try
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(MoodleCallTimeoutSeconds));
            var ct = cts.Token;

            int moodleUserId = await GetMoodleUserId(userKey.ToString());
            bool isEnrolled = false;

            // STEP 1: Check current enrollments
            var checkParams = new StringContent(
                $"wstoken={_appSettings.MoodleWebService.Token}" +
                $"&wsfunction=core_enrol_get_users_courses" +
                $"&moodlewsrestformat=json" +
                $"&userid={moodleUserId}" +
                $"&returnusercount=0",
                Encoding.UTF8, "application/x-www-form-urlencoded");

            try
            {
                var checkResponse = await _httpClient.PostAsync(
                    _appSettings.MoodleWebService.Url, checkParams, ct);

                if (checkResponse.IsSuccessStatusCode)
                {
                    string json = await checkResponse.Content.ReadAsStringAsync(ct);
                    var root = JToken.Parse(json);

                    if (root is JObject errObj && errObj["exception"] != null)
                    {
                        moodleReturnDto.Success = false;
                        moodleReturnDto.ErrorMessage = errObj["message"]?.ToString()
                            ?? "Moodle enrollment check failed.";
                        return moodleReturnDto;
                    }

                    if (root is JArray courses)
                        isEnrolled = courses.Any(c => c["id"]?.Value<int>() == moodleCourseId);
                }
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                moodleReturnDto.Success = false;
                moodleReturnDto.ErrorMessage = "Moodle enrollment check timed out (30s).";
                return moodleReturnDto;
            }

            // STEP 2: Enroll if not already enrolled
            if (!isEnrolled)
            {
                int roleId = 5; // 5 = Student role in Moodle
                int timeNow = (int)(DateTime.UtcNow - new DateTime(1970, 1, 1)).TotalSeconds - 360;
                int timeEnd = timeNow + 60 * 60 * 24 * 365; // 1 year enrollment

                string enrolData =
                    $"enrolments[0][roleid]={roleId}&" +
                    $"enrolments[0][userid]={moodleUserId}&" +
                    $"enrolments[0][courseid]={moodleCourseId}&" +
                    $"enrolments[0][timestart]={timeNow}&" +
                    $"enrolments[0][timeend]={timeEnd}&";

                try
                {
                    var enrolContent = new StringContent(
                        enrolData, Encoding.UTF8, "application/x-www-form-urlencoded");
                    var enrolResponse = await _httpClient.PostAsync(
                        _appSettings.MoodleWebService.EnrolUserUrl, enrolContent, ct);
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
            _errorLog.LogSystemError($"{userKey},{moodleCourseId}", ex.ToString(),
                "Service", nameof(LmsService), nameof(CheckCourseEnrollment),
                Guid.Empty, string.Empty);
        }
        return moodleReturnDto;
    }

    // ── AUTO-LOGIN REDIRECT URL ───────────────────────────────────────────
    // Generates a URL that logs the user into Moodle and opens their course.
    // Moodle must have "Allow login via URL" enabled for this to work.
    public async Task<LoginDto> Login(Guid userKey, Guid courseKey)
    {
        var user = await _userRepository.GetByCondition(x => x.UserKey == userKey, false);
        var course = await _courseRepository.GetByCondition(a => a.CourseKey == courseKey, false);

        var userCourse = await _userCourseRepository.GetByCondition(
            x => x.UserId == user.UserId
              && x.CourseId == course.CourseId
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

        // Password = LmsKey GUID without dashes
        string password = user.LmsKey.ToString().Replace("-", string.Empty);

        // Ensure enrolled before redirecting
        if (course?.MoodleCourseId > 0)
            await CheckCourseEnrollment(userKey, course.MoodleCourseId);

        string url = _appSettings.Moodle.Url
            + _appSettings.Moodle.Login
                .Replace("@name@", user.UserKey.ToString())
                .Replace("@password@", password)
                .Replace("@cid@", course!.MoodleCourseId.ToString());

        return new LoginDto { ReturnUrl = url };
    }
}
```

---

## PART 6: DI REGISTRATION

```csharp
// In DependencyInjectionExtensions.cs:
services.AddScoped<ILmsService, LmsService>();
services.AddScoped<ILmsConfigurationService, LmsConfigurationService>();
services.AddHttpClient<ILmsService, LmsService>(); // IHttpClientFactory for Moodle calls
```

---

## PART 7: API CONTROLLER

```csharp
[ApiController]
[Route("api/lms")]
[Authorize]
public class LmsController : BaseController
{
    private readonly ILmsService _lmsService;

    public LmsController(ILmsService lmsService) => _lmsService = lmsService;

    [HttpPost("create-user")]
    public async Task<IActionResult> CreateUser([FromBody] LmsUserDto dto)
    {
        var result = await _lmsService.CreateMoodleUser(dto);
        if (!string.IsNullOrEmpty(result.ErrorMessage))
            return BadRequest(new { error = result.ErrorMessage });
        return Ok(result);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LmsLoginRequestDto dto)
    {
        var result = await _lmsService.Login(dto.UserKey, dto.CourseKey);
        return Ok(result);
    }

    [HttpPost("check-enrollment")]
    public async Task<IActionResult> CheckEnrollment([FromBody] EnrollmentCheckDto dto)
    {
        var result = await _lmsService.CheckCourseEnrollment(dto.UserKey, dto.MoodleCourseId);
        return Ok(result);
    }

    [HttpGet("user/{username}")]
    public async Task<IActionResult> GetUser(string username)
    {
        var id = await _lmsService.GetMoodleUserId(username);
        return Ok(new { moodleUserId = id, found = id > 0 });
    }
}
```

---

## PART 8: MOODLE API QUICK REFERENCE

### All supported functions
| Function | Method | Purpose |
|----------|--------|---------|
| `core_user_get_users` | GET | Find user by username/email/id |
| `core_user_create_users` | POST | Create new Moodle user |
| `core_user_update_users` | POST | Update existing user profile |
| `core_enrol_get_users_courses` | POST | Get courses a user is enrolled in |
| `enrol_manual_enrol_users` | POST | Enroll user into course (roleId=5=student) |
| `core_course_get_courses` | POST | Get course metadata |
| `gradereport_user_get_grade_items` | POST | Get user grades for a course |
| `core_completion_get_course_completion_status` | POST | Check if user completed course |

### URL templates
```
GET user:
{MoodleUrl}/webservice/rest/server.php?wstoken={T}&wsfunction=core_user_get_users&moodlewsrestformat=json&criteria[0][key]=username&criteria[0][value]={USERNAME}

Create user (POST body):
wstoken={T}&wsfunction=core_user_create_users&moodlewsrestformat=json&users[0][auth]=manual&users[0][username]={U}&users[0][password]={P_HASHED}&users[0][firstname]={F}&users[0][lastname]={L}&users[0][email]={E}&users[0][idnumber]={ID}

Check enrollments (POST body):
wstoken={T}&wsfunction=core_enrol_get_users_courses&moodlewsrestformat=json&userid={MOODLE_USER_ID}&returnusercount=0

Enroll user (POST body):
wstoken={T}&wsfunction=enrol_manual_enrol_users&moodlewsrestformat=json&enrolments[0][roleid]=5&enrolments[0][userid]={MOODLE_USER_ID}&enrolments[0][courseid]={MOODLE_COURSE_ID}&enrolments[0][timestart]={UNIX}&enrolments[0][timeend]={UNIX}

Get grades (POST body):
wstoken={T}&wsfunction=gradereport_user_get_grade_items&moodlewsrestformat=json&courseid={COURSE_ID}&userid={MOODLE_USER_ID}

Auto-login redirect URL:
{MoodleUrl}/login/index.php?username={USER_KEY_GUID}&password={LMS_KEY_NO_DASHES}&wantsurl=/course/view.php?id={MOODLE_COURSE_ID}
```

---

## PART 9: KNOWN ISSUES & FIXES

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Moodle returns 200 with `{"exception":"..."}` | Moodle wraps errors in JSON even on HTTP 200 | Always check `obj["exception"] != null` before parsing result |
| Password rejected on create | Doesn't meet Moodle policy: 8+ chars, digit, lowercase | Validate before calling; regenerate from LmsKey GUID if needed |
| Enrollment check times out | Moodle can be slow under load | Use `CancellationTokenSource(30 seconds)` on every Moodle call |
| Duplicate user error | User already exists in Moodle | `GetMoodleUser` first; if MoodleUserID > 0 → UpdateMoodleUser instead |
| IOMAD mode — missing department | Standard mode post data sent to IOMAD instance | Check `IsIOMAD` config flag; include `users[0][department]` if true |
| `UserKey` vs `UserKey.ToString()` | Moodle username = GUID string; ERP PK = int | Always use `user.UserKey.ToString()` as Moodle username |
| Login URL not working | Moodle "Login via URL" feature not enabled | Enable: Site Admin → Security → HTTP security → Allow login via URL |
