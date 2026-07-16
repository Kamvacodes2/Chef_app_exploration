# Skill: Replicate Speccon_TAP_Ext Backend Codebase

## Purpose
This skill creates an exact one-to-one copy of the `Speccon_TAP_Ext` backend codebase. When executed, it produces a perfect mirror of every file, directory, and binary asset from the source — preserving structure, timestamps, and content integrity.

## Source Codebase
- **Location**: `C:\ERP_System\Backend\April\17th\Speccon_TAP_Ext`
- **Type**: ASP.NET Core / .NET backend solution (Speccon TAP ERP system)
- **Projects**: Speccon.Tap.Api, Speccon.Tap.Crm, Speccon.Tap.Enterprise, Speccon.Tap.Functions, Speccon.Tap.GenAI, Speccon.Tap.Kanban, Speccon.Tap.Reporting, Speccon.Tap.Scheduler, Speccon.Tap.WhatsApp, Speccon.Tap.Domain, Speccon.Tap.Data, Speccon.Tap.Services, and related test projects
- **Scale**: ~5,700+ source files, ~107 MB (excluding build artifacts)

## How to Use This Skill

### Step 1: Run the Replication Script
Execute the PowerShell replication script to create the copy:

```powershell
powershell -ExecutionPolicy Bypass -File "C:\ERP_System\Backend\April\17th\.claude\replicate\backend\replicate-backend.ps1"
```

**Parameters:**
- `-SourcePath` (optional): Override the source directory. Default: `C:\ERP_System\Backend\April\17th\Speccon_TAP_Ext`
- `-DestinationPath` (required): The target directory where the replica will be created.
- `-IncludeBuildArtifacts` (switch): Include `bin/`, `obj/`, `.vs/` directories. Default: excluded.
- `-ExcludeGit` (switch): Exclude `.git/` directory. Default: excluded.

**Example — replicate to a custom location:**
```powershell
powershell -ExecutionPolicy Bypass -File "C:\ERP_System\Backend\April\17th\.claude\replicate\backend\replicate-backend.ps1" -DestinationPath "D:\Backup\Speccon_TAP_Ext_Copy"
```

**Example — include everything (build artifacts + git):**
```powershell
powershell -ExecutionPolicy Bypass -File "C:\ERP_System\Backend\April\17th\.claude\replicate\backend\replicate-backend.ps1" -DestinationPath "D:\Backup\Full_Copy" -IncludeBuildArtifacts
```

### Step 2: Verify the Replication
Run the verification script to confirm the copy is identical:

```powershell
powershell -ExecutionPolicy Bypass -File "C:\ERP_System\Backend\April\17th\.claude\replicate\backend\verify-replication.ps1" -SourcePath "C:\ERP_System\Backend\April\17th\Speccon_TAP_Ext" -ReplicaPath "<YOUR_DESTINATION_PATH>"
```

This will:
1. Compare file counts between source and replica
2. Verify every file exists in both locations
3. Compare file sizes byte-for-byte
4. Compute and compare SHA256 hashes for content integrity
5. Output a PASS/FAIL report

## Architecture Overview (for manual recreation reference)

```
Speccon_TAP_Ext/
├── Speccon_Tap.sln                    # Main solution file
├── Speccon_Tap.csproj                 # Root MVC project
├── Program.cs                         # Root entry point
├── appsettings.json                   # Root app settings
├── appsettings.Development.json       # Dev settings
├── nuget.config                       # NuGet configuration
├── Azure_KeyVault_Guide.md            # Azure KV documentation
├── .gitignore                         # Git ignore rules
│
├── Controllers/                       # Root MVC controllers
│   └── HomeController.cs
├── Models/                            # Root MVC models
│   └── ErrorViewModel.cs
├── Views/                             # Root MVC views
│   ├── Home/ (Index, Privacy)
│   ├── Shared/ (Layout, Error, Validation)
│   ├── _ViewImports.cshtml
│   └── _ViewStart.cshtml
├── Properties/
│   └── launchSettings.json
├── wwwroot/                           # Static assets
│   ├── css/site.css
│   ├── js/site.js
│   ├── favicon.ico
│   ├── login_background.jpg
│   └── lib/ (bootstrap, jquery, jquery-validation)
│
├── scripts/                           # Utility scripts
│   └── testing-centre-playwright-install.sh
├── sql/queries/                       # SQL scripts
│   └── CheckQuestionData.sql
│
├── azure-*.yml                        # Azure DevOps pipelines
│                                      # (dev/uat/prod for each service)
│
├── src-tap/                           # ── CORE APPLICATION ──
│   ├── Domain/
│   │   └── Speccon.Tap.Domain/        # Domain entities, enums, constants, helpers
│   │
│   ├── Infrastructure/
│   │   └── Data/
│   │       └── Speccon.Tap.Data/      # Data access layer, repositories, DbContext
│   │
│   ├── Presentation/                  # API/Web projects
│   │   ├── Speccon.Tap.Api/           # Main REST API
│   │   ├── Speccon.Tap.Crm/          # CRM module
│   │   ├── Speccon.Tap.Enterprise/   # Enterprise module
│   │   ├── Speccon.Tap.Functions/    # Azure Functions
│   │   ├── Speccon.Tap.GenAI/        # Generative AI module
│   │   ├── Speccon.Tap.Kanban/       # Kanban board module
│   │   ├── Speccon.Tap.Reporting/    # DevExpress Reporting
│   │   ├── Speccon.Tap.Scheduler/    # Task scheduler (Quartz)
│   │   └── Speccon.Tap.WhatsApp/     # WhatsApp integration
│   │
│   ├── Services/                      # Business logic layer
│   │   ├── Speccon.Tap.Services/
│   │   ├── Speccon.Tap.Services.Interfaces/
│   │   ├── Speccon.Tap.Services.Test/
│   │   ├── Speccon.Tap.Services.EeTests/
│   │   └── Speccon.Tap.LibraryIap.Services.Test/
│   │
│   └── tools/                         # Dev tools
│       └── patch_crm_baseconstructors.py
```

## What Gets Copied

| Category | Included | Notes |
|----------|----------|-------|
| Source code (.cs, .cshtml, .json, .csproj, .sln) | ✅ | All source files |
| Configuration (appsettings, nuget.config) | ✅ | All environments |
| Azure pipelines (.yml) | ✅ | Dev, UAT, Prod |
| SQL scripts | ✅ | All queries |
| Static assets (wwwroot) | ✅ | CSS, JS, images, libs |
| Documentation (.md) | ✅ | All markdown files |
| Scripts (.sh, .py, .ps1, .bat) | ✅ | All utility scripts |
| .gitignore | ✅ | Git configuration |
| Build artifacts (bin/, obj/) | ❌ | Excluded by default |
| .git/ directory | ❌ | Excluded by default |
| .vs/ directory | ❌ | Excluded by default |

## Notes
- The replication uses Windows `robocopy` with `/MIR` flag for exact mirroring
- File timestamps are preserved using `/DCOPY:T /COPY:DAT`
- Binary files (images, .ico, .deb, .map) are copied byte-for-byte
- The verification script uses SHA256 hashing to confirm content integrity
- Build artifacts are excluded by default since they can be regenerated with `dotnet build`
